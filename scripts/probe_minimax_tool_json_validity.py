import json
import urllib.request

payload = {
    "model": "minimaxai/minimax-m2.5",
    "messages": [
        {"role": "user", "content": "Use replace_string_in_file to update c:/Users/JihaN/test/index.html."}
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
    "tool_choice": {"type": "function", "function": {"name": "replace_string_in_file"}},
    "max_tokens": 1200,
    "stream": True,
}

req = urllib.request.Request(
    "http://127.0.0.1:8787/v1/chat/completions",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST",
)

with urllib.request.urlopen(req, timeout=120) as res:
    print("status", res.status, "ctype", res.headers.get("Content-Type"))
    chunks = 0
    args_seen = 0
    while True:
        line = res.readline()
        if not line:
            break
        s = line.decode("utf-8", errors="replace").strip()
        if not s or not s.startswith("data:"):
            continue
        if s == "data: [DONE]":
            print("done")
            break

        obj = json.loads(s[5:].strip())
        choices = obj.get("choices") or []
        if not choices:
            continue

        chunks += 1
        delta = choices[0].get("delta") or {}
        tc = delta.get("tool_calls") or []
        for item in tc:
            fn = item.get("function") or {}
            args = fn.get("arguments")
            if isinstance(args, str):
                args_seen += 1
                try:
                    json.loads(args)
                except Exception as exc:  # noqa: BLE001
                    print("INVALID_ARGS_JSON", exc)
                    print(args[:800])
                    raise

    print("chunks", chunks)
    print("args_seen", args_seen)
    print("all_tool_args_json_valid=true")
