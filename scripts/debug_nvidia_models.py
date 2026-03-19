#!/usr/bin/env python3
"""Probe NVIDIA OpenAI-compatible chat models and save structured diagnostics.

This script reads model definitions from Code Insiders chatLanguageModels.json by default,
executes several test scenarios for each model, and writes results to a JSON report file.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional


DEFAULT_CONFIG = Path(os.environ.get("APPDATA", "")) / "Code - Insiders" / "User" / "chatLanguageModels.json"
DEFAULT_OUTPUT = Path("debug") / "nvidia_model_probe_results.json"


def load_config(config_path: Path) -> List[Dict[str, Any]]:
    if not config_path.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")
    text = config_path.read_text(encoding="utf-8-sig")
    data = json.loads(text)
    if not isinstance(data, list):
        raise ValueError("Config root must be a JSON array")
    return data


def find_provider_group(groups: List[Dict[str, Any]], vendor: str, name: Optional[str]) -> Dict[str, Any]:
    matches = [g for g in groups if g.get("vendor") == vendor]
    if name:
        matches = [g for g in matches if g.get("name") == name]
    if not matches:
        raise ValueError(f"No provider group found for vendor={vendor!r} name={name!r}")
    return matches[0]


def post_json(url: str, api_key: str, payload: Dict[str, Any], timeout_sec: int) -> Dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    started = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout_sec) as res:
            raw = res.read().decode("utf-8", errors="replace")
            elapsed_ms = int((time.time() - started) * 1000)
            parsed = json.loads(raw)
            return {
                "ok": True,
                "status": int(res.status),
                "elapsedMs": elapsed_ms,
                "json": parsed,
            }
    except urllib.error.HTTPError as exc:
        err_body = exc.read().decode("utf-8", errors="replace") if exc.fp else ""
        elapsed_ms = int((time.time() - started) * 1000)
        try:
            err_json = json.loads(err_body) if err_body else None
        except json.JSONDecodeError:
            err_json = None
        return {
            "ok": False,
            "status": int(exc.code),
            "elapsedMs": elapsed_ms,
            "error": str(exc),
            "errorBody": err_body[:4000],
            "errorJson": err_json,
        }
    except Exception as exc:  # noqa: BLE001
        elapsed_ms = int((time.time() - started) * 1000)
        return {
            "ok": False,
            "status": None,
            "elapsedMs": elapsed_ms,
            "error": str(exc),
            "errorBody": "",
            "errorJson": None,
        }


def summarize_response(result: Dict[str, Any]) -> Dict[str, Any]:
    if not result.get("ok"):
        return {
            "ok": False,
            "status": result.get("status"),
            "elapsedMs": result.get("elapsedMs"),
            "error": result.get("error"),
            "errorJson": result.get("errorJson"),
        }

    data = result.get("json") or {}
    choices = data.get("choices") or []
    choice0 = choices[0] if choices else {}
    msg = choice0.get("message") or {}
    content = msg.get("content")
    reasoning = msg.get("reasoning")
    tool_calls = msg.get("tool_calls") or []

    summary = {
        "ok": True,
        "status": result.get("status"),
        "elapsedMs": result.get("elapsedMs"),
        "model": data.get("model"),
        "finishReason": choice0.get("finish_reason"),
        "contentIsNull": content is None,
        "contentPreview": (content[:300] if isinstance(content, str) else None),
        "reasoningPresent": isinstance(reasoning, str) and len(reasoning) > 0,
        "toolCallsCount": len(tool_calls),
        "usage": data.get("usage"),
    }
    return summary


def scenario_payloads(model_id: str) -> List[Dict[str, Any]]:
    return [
        {
            "name": "basic_short",
            "payload": {
                "model": model_id,
                "messages": [{"role": "user", "content": "hi how are you?"}],
                "temperature": 0.2,
                "max_tokens": 64,
            },
        },
        {
            "name": "basic_long",
            "payload": {
                "model": model_id,
                "messages": [{"role": "user", "content": "hi how are you?"}],
                "temperature": 0.2,
                "max_tokens": 512,
            },
        },
        {
            "name": "tools_auto",
            "payload": {
                "model": model_id,
                "messages": [{"role": "user", "content": "What is 2+2? Use tool if needed."}],
                "tools": [
                    {
                        "type": "function",
                        "function": {
                            "name": "calc",
                            "description": "Simple calculator",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "expression": {"type": "string"}
                                },
                                "required": ["expression"],
                            },
                        },
                    }
                ],
                "tool_choice": "auto",
                "max_tokens": 128,
            },
        },
    ]


def probe_model(api_key: str, model: Dict[str, Any], timeout_sec: int) -> Dict[str, Any]:
    model_id = str(model.get("id", ""))
    model_name = str(model.get("name", model_id))
    url = str(model.get("url", "")).strip()
    if not url:
        url = "https://integrate.api.nvidia.com/v1/chat/completions"

    results: List[Dict[str, Any]] = []
    for scenario in scenario_payloads(model_id):
        raw = post_json(url=url, api_key=api_key, payload=scenario["payload"], timeout_sec=timeout_sec)
        summary = summarize_response(raw)
        results.append(
            {
                "scenario": scenario["name"],
                "summary": summary,
                "raw": raw if not raw.get("ok") else {
                    "ok": True,
                    "status": raw.get("status"),
                    "elapsedMs": raw.get("elapsedMs"),
                    "json": raw.get("json"),
                },
            }
        )

    return {
        "id": model_id,
        "name": model_name,
        "url": url,
        "configured": {
            "toolCalling": model.get("toolCalling"),
            "vision": model.get("vision"),
            "thinking": model.get("thinking"),
            "maxInputTokens": model.get("maxInputTokens"),
            "maxOutputTokens": model.get("maxOutputTokens"),
            "streaming": model.get("streaming"),
        },
        "tests": results,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Debug NVIDIA OpenAI-compatible models")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG, help="Path to chatLanguageModels.json")
    parser.add_argument("--vendor", default="customoai", help="Vendor name to select")
    parser.add_argument("--group", default="NVIDIA", help="Provider group name to select")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Output JSON report file")
    parser.add_argument("--timeout", type=int, default=30, help="HTTP timeout in seconds")
    args = parser.parse_args()

    groups = load_config(args.config)
    group = find_provider_group(groups, vendor=args.vendor, name=args.group)
    api_key = str(group.get("apiKey", "")).strip() or os.environ.get("NVIDIA_API_KEY", "").strip()
    if not api_key:
        raise ValueError("No API key found in provider group and NVIDIA_API_KEY is empty")

    models = group.get("models") or []
    if not isinstance(models, list) or not models:
        raise ValueError("No models found in selected provider group")

    report = {
        "timestamp": int(time.time()),
        "configPath": str(args.config),
        "vendor": args.vendor,
        "group": args.group,
        "modelCount": len(models),
        "results": [],
    }

    for model in models:
        report["results"].append(probe_model(api_key=api_key, model=model, timeout_sec=args.timeout))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"Wrote report: {args.output}")
    for model in report["results"]:
        print(f"- {model['name']} ({model['id']})")
        for test in model["tests"]:
            s = test["summary"]
            print(
                f"  * {test['scenario']}: ok={s.get('ok')} status={s.get('status')} "
                f"finish={s.get('finishReason')} contentIsNull={s.get('contentIsNull')} "
                f"toolCalls={s.get('toolCallsCount')}"
            )

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
