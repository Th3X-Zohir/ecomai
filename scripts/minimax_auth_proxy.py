#!/usr/bin/env python3
"""Local auth-injecting proxy for MiniMax OpenAI-compatible endpoint.

Why: Copilot customoai may not inject Authorization header consistently.
This proxy accepts local requests without auth and forwards them to MiniMax with
`Authorization: Bearer <api_key>`.
"""

from __future__ import annotations

import argparse
from collections import deque
import json
import os
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


def _read_body(handler: BaseHTTPRequestHandler) -> bytes:
    length = int(handler.headers.get("Content-Length", "0"))
    return handler.rfile.read(length) if length > 0 else b""


class ProxyStats:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.started_at = time.time()
        self.total_requests = 0
        self.bytes_in = 0
        self.bytes_out = 0
        self.status_counts: dict[str, int] = {}
        self.request_timestamps = deque()

    def record(self, *, status_code: int, bytes_in: int, bytes_out: int, now: float | None = None) -> None:
        ts = time.time() if now is None else now
        cutoff = ts - 60.0
        with self._lock:
            self.total_requests += 1
            self.bytes_in += max(bytes_in, 0)
            self.bytes_out += max(bytes_out, 0)
            key = str(status_code)
            self.status_counts[key] = self.status_counts.get(key, 0) + 1
            self.request_timestamps.append(ts)
            while self.request_timestamps and self.request_timestamps[0] < cutoff:
                self.request_timestamps.popleft()

    def snapshot(self, now: float | None = None) -> dict:
        ts = time.time() if now is None else now
        cutoff = ts - 60.0
        with self._lock:
            while self.request_timestamps and self.request_timestamps[0] < cutoff:
                self.request_timestamps.popleft()

            uptime = max(ts - self.started_at, 0.0)
            avg_rps = (self.total_requests / uptime) if uptime > 0 else 0.0
            return {
                "uptime_seconds": round(uptime, 3),
                "total_requests": self.total_requests,
                "requests_last_60s": len(self.request_timestamps),
                "avg_requests_per_second": round(avg_rps, 4),
                "bytes_in": self.bytes_in,
                "bytes_out": self.bytes_out,
                "status_counts": dict(sorted(self.status_counts.items(), key=lambda kv: int(kv[0]))),
            }


class RequestGate:
    def __init__(
        self,
        *,
        max_rpm: int = 0,
        max_concurrency: int = 0,
        max_input_bytes_per_minute: int = 0,
        max_wait_seconds: float = 30.0,
    ) -> None:
        self.max_rpm = max(0, int(max_rpm))
        self.max_concurrency = max(0, int(max_concurrency))
        self.max_input_bytes_per_minute = max(0, int(max_input_bytes_per_minute))
        self.max_wait_seconds = max(0.1, float(max_wait_seconds))
        self._lock = threading.Lock()
        self._cond = threading.Condition(self._lock)
        self._timestamps = deque()
        self._byte_windows = deque()
        self._bytes_last_minute = 0
        self._in_flight = 0

    def acquire(self, request_bytes: int) -> None:
        if self.max_rpm <= 0 and self.max_concurrency <= 0 and self.max_input_bytes_per_minute <= 0:
            return

        req_bytes = max(0, int(request_bytes))
        start_wait = time.time()
        with self._cond:
            while True:
                now = time.time()
                elapsed = now - start_wait
                if elapsed > self.max_wait_seconds:
                    raise RuntimeError(
                        f"Rate limit queue exceeded max_wait_seconds={self.max_wait_seconds} "
                        f"(waited {elapsed:.1f}s). Check --max-rpm, --max-concurrency, --max-input-bytes-per-minute settings."
                    )

                cutoff = now - 60.0
                while self._timestamps and self._timestamps[0] < cutoff:
                    self._timestamps.popleft()
                while self._byte_windows and self._byte_windows[0][0] < cutoff:
                    _, old_bytes = self._byte_windows.popleft()
                    self._bytes_last_minute = max(0, self._bytes_last_minute - old_bytes)

                rate_ok = self.max_rpm <= 0 or len(self._timestamps) < self.max_rpm
                conc_ok = self.max_concurrency <= 0 or self._in_flight < self.max_concurrency
                bytes_ok = (
                    self.max_input_bytes_per_minute <= 0
                    or (self._bytes_last_minute + req_bytes) <= self.max_input_bytes_per_minute
                )

                if rate_ok and conc_ok and bytes_ok:
                    self._in_flight += 1
                    if self.max_rpm > 0:
                        self._timestamps.append(now)
                    if self.max_input_bytes_per_minute > 0:
                        self._byte_windows.append((now, req_bytes))
                        self._bytes_last_minute += req_bytes
                    return

                wait_for_rate = None
                if not rate_ok and self._timestamps:
                    wait_for_rate = max(0.01, (self._timestamps[0] + 60.0) - now)

                wait_for_bytes = None
                if not bytes_ok and self._byte_windows:
                    wait_for_bytes = max(0.01, (self._byte_windows[0][0] + 60.0) - now)

                wait_for_conc = 0.25 if not conc_ok else None

                waits = [w for w in (wait_for_rate, wait_for_bytes, wait_for_conc) if w is not None]
                timeout = min(waits) if waits else 0.25
                remaining = max(0.001, self.max_wait_seconds - elapsed)
                self._cond.wait(timeout=min(timeout, remaining))

    def release(self) -> None:
        if self.max_rpm <= 0 and self.max_concurrency <= 0 and self.max_input_bytes_per_minute <= 0:
            return

        with self._cond:
            if self._in_flight > 0:
                self._in_flight -= 1
            self._cond.notify_all()


class ProxyHandler(BaseHTTPRequestHandler):
    server_version = "MiniMaxAuthProxy/1.0"
    protocol_version = "HTTP/1.1"

    @staticmethod
    def _is_streaming_response(content_type: str) -> bool:
        return "text/event-stream" in (content_type or "").lower()

    @staticmethod
    def _strip_think_block_text(text: str) -> str:
        # Remove <think>...</think> blocks from plain text responses.
        out: list[str] = []
        i = 0
        while i < len(text):
            open_idx = text.find("<think>", i)
            if open_idx == -1:
                out.append(text[i:])
                break

            out.append(text[i:open_idx])
            close_idx = text.find("</think>", open_idx + len("<think>"))
            if close_idx == -1:
                break

            i = close_idx + len("</think>")

        return "".join(out)

    @staticmethod
    def _strip_think_block_incremental(text: str, in_think: bool) -> tuple[str, bool]:
        # Best-effort streaming-safe removal for chunks containing think tags.
        out: list[str] = []
        i = 0
        while i < len(text):
            if in_think:
                close_idx = text.find("</think>", i)
                if close_idx == -1:
                    return "".join(out), True
                i = close_idx + len("</think>")
                in_think = False
                continue

            open_idx = text.find("<think>", i)
            if open_idx == -1:
                out.append(text[i:])
                break

            out.append(text[i:open_idx])
            i = open_idx + len("<think>")
            in_think = True

        return "".join(out), in_think

    def _sanitize_json_payload(self, payload: bytes) -> bytes:
        try:
            data = json.loads(payload.decode("utf-8", errors="replace"))
        except Exception:  # noqa: BLE001
            return payload

        changed = False
        for choice in data.get("choices") or []:
            message = choice.get("message")
            if isinstance(message, dict):
                if "reasoning" in message:
                    message.pop("reasoning", None)
                    changed = True
                if isinstance(message.get("content"), str):
                    clean = self._strip_think_block_text(message["content"])
                    if clean != message["content"]:
                        message["content"] = clean
                        changed = True

        if not changed:
            return payload

        return json.dumps(data, ensure_ascii=False).encode("utf-8")

    @staticmethod
    def _request_meta(request_json: dict | None) -> dict[str, object]:
        if not isinstance(request_json, dict):
            return {
                "model": None,
                "messages": 0,
                "tools": 0,
                "stream": None,
                "tool_choice": None,
            }

        messages = request_json.get("messages")
        tools = request_json.get("tools")
        return {
            "model": request_json.get("model"),
            "messages": len(messages) if isinstance(messages, list) else 0,
            "tools": len(tools) if isinstance(tools, list) else 0,
            "stream": request_json.get("stream"),
            "tool_choice": request_json.get("tool_choice"),
        }

    @staticmethod
    def _load_json_payload(payload: bytes) -> dict | None:
        try:
            obj = json.loads(payload.decode("utf-8", errors="replace"))
            return obj if isinstance(obj, dict) else None
        except Exception:  # noqa: BLE001
            return None

    @staticmethod
    def _to_sse_line(event: dict) -> bytes:
        return f"data: {json.dumps(event, ensure_ascii=False)}\n\n".encode("utf-8")

    def _emit_synthetic_sse_from_completion(self, completion: dict) -> None:
        choice0 = (completion.get("choices") or [{}])[0]
        message = choice0.get("message") or {}
        finish_reason = choice0.get("finish_reason")
        model = completion.get("model")
        created = completion.get("created") or int(time.time())
        completion_id = completion.get("id") or f"chatcmpl-proxy-{created}"

        # 1) Initial chunk with role and any immediate content/tool calls.
        delta: dict = {"role": "assistant"}
        content = message.get("content")
        if isinstance(content, str) and content:
            delta["content"] = content

        tool_calls = message.get("tool_calls")
        if isinstance(tool_calls, list) and tool_calls:
            delta["tool_calls"] = tool_calls

        first_event = {
            "id": completion_id,
            "object": "chat.completion.chunk",
            "created": created,
            "model": model,
            "choices": [
                {
                    "index": 0,
                    "delta": delta,
                    "logprobs": None,
                    "finish_reason": None,
                }
            ],
        }
        self.wfile.write(self._to_sse_line(first_event))
        self.wfile.flush()

        # 2) Finish chunk.
        finish_event = {
            "id": completion_id,
            "object": "chat.completion.chunk",
            "created": created,
            "model": model,
            "choices": [
                {
                    "index": 0,
                    "delta": {},
                    "logprobs": None,
                    "finish_reason": finish_reason,
                }
            ],
        }
        self.wfile.write(self._to_sse_line(finish_event))
        self.wfile.flush()

        # 3) Usage chunk if present.
        usage = completion.get("usage")
        if isinstance(usage, dict):
            usage_event = {
                "id": completion_id,
                "object": "chat.completion.chunk",
                "created": created,
                "model": model,
                "choices": [],
                "usage": usage,
            }
            self.wfile.write(self._to_sse_line(usage_event))
            self.wfile.flush()

        # 4) Stream terminator.
        self.wfile.write(b"data: [DONE]\n\n")
        self.wfile.flush()

    def _sanitize_sse_line(self, line: bytes, in_think: bool) -> tuple[bytes | None, bool]:
        if line.strip() == b"":
            return line, in_think

        try:
            text = line.decode("utf-8", errors="replace")
        except Exception:  # noqa: BLE001
            return line, in_think

        if not text.startswith("data:"):
            return line, in_think

        data_text = text[len("data:"):].strip()
        if data_text == "[DONE]":
            return line, in_think

        try:
            event = json.loads(data_text)
        except Exception:  # noqa: BLE001
            return line, in_think

        choices = event.get("choices") or []
        new_choices = []
        for choice in choices:
            delta = choice.get("delta")
            if isinstance(delta, dict):
                delta.pop("reasoning", None)

                if isinstance(delta.get("content"), str):
                    clean, in_think = self._strip_think_block_incremental(delta["content"], in_think)
                    if clean:
                        delta["content"] = clean
                    else:
                        delta.pop("content", None)

                # Drop pure-reasoning empty deltas to avoid leaking thoughts.
                if not delta and choice.get("finish_reason") is None:
                    continue

            new_choices.append(choice)

        event["choices"] = new_choices
        if not new_choices and "usage" not in event:
            return None, in_think

        out = f"data: {json.dumps(event, ensure_ascii=False)}\n\n".encode("utf-8")
        return out, in_think

    def _forward_response_headers(self, upstream_headers, *, streaming: bool) -> None:
        skip = {"content-length", "transfer-encoding", "connection"}
        for key, value in upstream_headers.items():
            if key.lower() in skip:
                continue
            self.send_header(key, value)

        if streaming:
            # Streaming has no fixed size; closing the socket marks end-of-body.
            self.send_header("Connection", "close")

    def _forward(self) -> None:
        api_key = self.server.api_key  # type: ignore[attr-defined]
        target_base = self.server.target_base.rstrip("/")  # type: ignore[attr-defined]
        target_url = f"{target_base}{self.path}"
        stats: ProxyStats = self.server.stats  # type: ignore[attr-defined]
        gate: RequestGate = self.server.gate  # type: ignore[attr-defined]

        body = _read_body(self)
        request_bytes = len(body)
        response_bytes = 0
        status_code = 502
        gate_acquired = False

        def write_counted(data: bytes) -> None:
            nonlocal response_bytes
            self.wfile.write(data)
            response_bytes += len(data)

        req_json = self._load_json_payload(body)
        req_meta = self._request_meta(req_json)
        if req_json is not None and not bool(req_json.get("stream")):
            req_json.pop("stream_options", None)

        if req_json is not None:
            body = json.dumps(req_json, ensure_ascii=False).encode("utf-8")

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": self.headers.get("Content-Type", "application/json"),
        }

        try:
            gate.acquire(request_bytes)
            gate_acquired = True
        except RuntimeError as e:
            gate_acquired = False
            msg = json.dumps({"error": f"Rate limiter: {str(e)}"}).encode("utf-8")
            self.send_response(503)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(msg)))
            self.send_header("Retry-After", "5")
            self.end_headers()
            self.wfile.write(msg)
            stats.record(status_code=503, bytes_in=request_bytes, bytes_out=len(msg))
            print(
                "[minimax-proxy request] "
                f"model={req_meta['model']} "
                f"messages={req_meta['messages']} "
                f"tools={req_meta['tools']} "
                f"stream={req_meta['stream']} "
                f"tool_choice={req_meta['tool_choice']} "
                f"in={request_bytes}B"
            )
            snap = stats.snapshot()
            print(
                "[minimax-proxy counters] "
                f"total={snap['total_requests']} "
                f"last60s={snap['requests_last_60s']} "
                f"in={snap['bytes_in']}B "
                f"out={snap['bytes_out']}B "
                f"status={snap['status_counts']}"
            )
            return

        req = urllib.request.Request(target_url, data=body, headers=headers, method=self.command)

        try:
            with urllib.request.urlopen(req, timeout=120) as res:
                content_type = res.headers.get("Content-Type", "application/json")
                streaming = self._is_streaming_response(content_type)
                sanitize = bool(self.server.sanitize_thinking)  # type: ignore[attr-defined]

                status_code = res.status
                self.send_response(status_code)
                self._forward_response_headers(res.headers, streaming=streaming)

                if not streaming:
                    payload = res.read()
                    if sanitize and "application/json" in (content_type or "").lower():
                        payload = self._sanitize_json_payload(payload)
                    self.send_header("Content-Length", str(len(payload)))
                self.end_headers()

                if streaming:
                    in_think = False
                    if sanitize:
                        while True:
                            line = res.readline()
                            if not line:
                                break
                            out_line, in_think = self._sanitize_sse_line(line, in_think)
                            if out_line is None:
                                continue
                            write_counted(out_line)
                            self.wfile.flush()
                    else:
                        while True:
                            chunk = res.read(4096)
                            if not chunk:
                                break
                            write_counted(chunk)
                            self.wfile.flush()
                else:
                    write_counted(payload)
        except urllib.error.HTTPError as exc:
            payload = exc.read() if exc.fp else b""
            status_code = exc.code
            self.send_response(status_code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            if payload:
                write_counted(payload)
        except Exception as exc:  # noqa: BLE001
            msg = json.dumps({"error": str(exc)}).encode("utf-8")
            status_code = 502
            self.send_response(status_code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(msg)))
            self.end_headers()
            write_counted(msg)
        finally:
            if gate_acquired:
                gate.release()
            stats.record(status_code=status_code, bytes_in=request_bytes, bytes_out=response_bytes)
            print(
                "[minimax-proxy request] "
                f"model={req_meta['model']} "
                f"messages={req_meta['messages']} "
                f"tools={req_meta['tools']} "
                f"stream={req_meta['stream']} "
                f"tool_choice={req_meta['tool_choice']} "
                f"in={request_bytes}B"
            )
            snap = stats.snapshot()
            print(
                "[minimax-proxy counters] "
                f"total={snap['total_requests']} "
                f"last60s={snap['requests_last_60s']} "
                f"in={snap['bytes_in']}B "
                f"out={snap['bytes_out']}B "
                f"status={snap['status_counts']}"
            )

    def _handle_stats(self) -> None:
        stats: ProxyStats = self.server.stats  # type: ignore[attr-defined]
        snapshot = stats.snapshot()
        payload = json.dumps(snapshot, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_POST(self) -> None:  # noqa: N802
        self._forward()

    def do_GET(self) -> None:  # noqa: N802
        if self.path in {"/_proxy/stats", "/_proxy/stats.json"}:
            self._handle_stats()
            return
        # Support /v1/models and health checks via passthrough.
        self._forward()

    def log_message(self, fmt: str, *args) -> None:
        # Keep logs concise in terminal.
        ts = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        print(f"[minimax-proxy {ts}] {self.address_string()} - {fmt % args}")


def _stats_reporter(server: ThreadingHTTPServer, interval_seconds: float) -> None:
    while True:
        time.sleep(interval_seconds)
        stats: ProxyStats = server.stats  # type: ignore[attr-defined]
        snap = stats.snapshot()
        print(
            "[minimax-proxy stats] "
            f"total={snap['total_requests']} "
            f"last60s={snap['requests_last_60s']} "
            f"in={snap['bytes_in']}B "
            f"out={snap['bytes_out']}B "
            f"status={snap['status_counts']}"
        )


def main() -> int:
    parser = argparse.ArgumentParser(description="MiniMax auth proxy")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8789)
    parser.add_argument("--target-base", default="https://api.minimax.io")
    parser.add_argument("--api-key", default=os.environ.get("MINIMAX_API_KEY", ""))
    parser.add_argument(
        "--max-rpm",
        type=int,
        default=0,
        help="Local rolling 60s request cap (0 disables local RPM limiting).",
    )
    parser.add_argument(
        "--max-concurrency",
        type=int,
        default=0,
        help="Local max in-flight upstream requests (0 disables local concurrency limiting).",
    )
    parser.add_argument(
        "--max-input-bytes-per-minute",
        type=int,
        default=0,
        help="Local rolling 60s cap for request body bytes (0 disables local throughput limiting).",
    )
    parser.add_argument(
        "--max-wait-seconds",
        type=float,
        default=120.0,
        help="Max seconds to queue a request before returning 503 (prevents Copilot timeout).",
    )
    parser.add_argument(
        "--stats-interval",
        type=float,
        default=0.0,
        help="Print periodic stats every N seconds (0 disables periodic printing).",
    )
    parser.add_argument(
        "--sanitize-thinking",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Strip <think> blocks and reasoning deltas from responses.",
    )
    args = parser.parse_args()

    if not args.api_key:
        raise SystemExit("Missing API key. Pass --api-key or set MINIMAX_API_KEY.")

    server = ThreadingHTTPServer((args.host, args.port), ProxyHandler)
    server.api_key = args.api_key  # type: ignore[attr-defined]
    server.target_base = args.target_base  # type: ignore[attr-defined]
    server.sanitize_thinking = args.sanitize_thinking  # type: ignore[attr-defined]
    server.stats = ProxyStats()  # type: ignore[attr-defined]
    server.gate = RequestGate(
        max_rpm=args.max_rpm,
        max_concurrency=args.max_concurrency,
        max_input_bytes_per_minute=args.max_input_bytes_per_minute,
        max_wait_seconds=args.max_wait_seconds,
    )  # type: ignore[attr-defined]

    if args.stats_interval > 0:
        reporter = threading.Thread(target=_stats_reporter, args=(server, args.stats_interval), daemon=True)
        reporter.start()

    print(f"MiniMax auth proxy listening on http://{args.host}:{args.port}")
    print(f"Forwarding to {args.target_base}")
    print(f"Sanitize thinking output: {args.sanitize_thinking}")
    print(
        "Local limiter: "
        f"max_rpm={args.max_rpm} "
        f"max_concurrency={args.max_concurrency} "
        f"max_input_bytes_per_minute={args.max_input_bytes_per_minute} "
        f"max_wait_seconds={args.max_wait_seconds}"
    )
    if args.stats_interval > 0:
        print(f"Stats interval: every {args.stats_interval} seconds")
    print("Stats endpoint: GET /_proxy/stats")
    server.serve_forever()


if __name__ == "__main__":
    raise SystemExit(main())
