import json
import urllib.request

msgs = [
    {"role": "user", "content": "What do you see in the index html file?"},
    {
        "role": "assistant",
        "tool_calls": [
            {
                "id": "call_read_1",
                "type": "function",
                "function": {
                    "name": "read_file",
                    "arguments": '{"path":"index.html"}',
                },
            }
        ],
    },
    {
        "role": "tool",
        "tool_call_id": "call_read_1",
        "name": "read_file",
        "content": "<html><body><h1>Coffee Shop</h1><p>Fresh beans daily</p></body></html>",
    },
]

payload = {
    "model": "minimaxai/minimax-m2.5",
    "messages": msgs,
    "max_tokens": 512,
}

req = urllib.request.Request(
    "http://127.0.0.1:8787/v1/chat/completions",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST",
)

with urllib.request.urlopen(req, timeout=60) as res:
    obj = json.loads(res.read().decode("utf-8", errors="replace"))

msg = ((obj.get("choices") or [{}])[0].get("message") or {})
content = msg.get("content")
print("status=200")
print("content_len=", 0 if content is None else len(content))
print("content_preview=", (content or "")[:400].replace("\n", "\\n"))
