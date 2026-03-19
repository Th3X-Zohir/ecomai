import json
import urllib.request

KEY = "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"

payload = {
    "model": "minimaxai/minimax-m2.5",
    "messages": [
        {
            "role": "user",
            "content": "Use replace_string_in_file to update c:/Users/JihaN/test/index.html."
        }
    ],
    "tools": [
        {
            "type": "function",
            "function": {
                "name": "replace_string_in_file",
                "description": "Replace string in file",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "filePath": {"type": "string"},
                        "oldString": {"type": "string"},
                        "newString": {"type": "string"},
                    },
                    "required": ["filePath", "oldString", "newString"],
                },
            },
        }
    ],
    "tool_choice": {
        "type": "function",
        "function": {
            "name": "replace_string_in_file"
        }
    },
    "max_tokens": 1200,
    "stream": True,
}


def read_stream(url: str, headers: dict[str, str], label: str) -> None:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    print(f"\n=== {label} ===")
    with urllib.request.urlopen(req, timeout=120) as res:
        print("status", res.status, "ctype", res.headers.get("Content-Type"))
        idx = 0
        while True:
            line = res.readline()
            if not line:
                break
            s = line.decode("utf-8", errors="replace").strip()
            if not s or not s.startswith("data:"):
                continue
            if s == "data: [DONE]":
                print("DONE")
                break
            obj = json.loads(s[5:].strip())
            choices = obj.get("choices") or []
            if not choices:
                continue
            delta = (choices[0].get("delta") or {})
            if "tool_calls" in delta:
                print(f"tool_chunk_{idx}:", json.dumps(delta["tool_calls"], ensure_ascii=False)[:700])
                idx += 1


if __name__ == "__main__":
    read_stream(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        {"Content-Type": "application/json", "Authorization": f"Bearer {KEY}"},
        "direct_nvidia",
    )
    read_stream(
        "http://127.0.0.1:8787/v1/chat/completions",
        {"Content-Type": "application/json"},
        "proxy_local",
    )
