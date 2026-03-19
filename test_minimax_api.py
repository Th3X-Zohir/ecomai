#!/usr/bin/env python3
"""Quick test to see what MiniMax API returns."""

import json
import urllib.request

api_key = "sk-cp-xkeqrGd7UyFjQPkkfo4pMAfY-qfj9Z3lXfCiNhQP1w57NhV7urMUL_8yj_e7r6e9fuTEj2U9r0NeRT_rNLR1p-bQD35I5QazhAZ7tbqXNm_dD2LhN1Zcjy8"
url = "https://api.minimax.io/v1/chat/completions"

payload = {
    "model": "MiniMax-M2.7",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": False,
    "temperature": 0.5,
}

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
}

req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)

try:
    with urllib.request.urlopen(req, timeout=10) as res:
        body = res.read().decode("utf-8")
        print(f"Status: {res.status}")
        print(f"Response: {body}")
except Exception as e:
    print(f"Error: {e}")
    if hasattr(e, 'read'):
        print(f"Body: {e.read().decode('utf-8')}")
