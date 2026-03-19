#!/usr/bin/env python3
"""Test different MiniMax model ID formats."""

import json
import urllib.request

api_key = "sk-cp-xkeqrGd7UyFjQPkkfo4pMAfY-qfj9Z3lXfCiNhQP1w57NhV7urMUL_8yj_e7r6e9fuTEj2U9r0NeRT_rNLR1p-bQD35I5QazhAZ7tbqXNm_dD2LhN1Zcjy8"
base_url = "https://api.minimax.io/v1/chat/completions"

# Test different model ID formats
models = [
    "MiniMax-M2.7",
    "minimax-m2.7",
    "m2.7",
    "minimax-m2.7-high-speed",
    "MiniMax-M2.5",  # Try M2.5 to see if it works
]

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
}

for model in models:
    print(f"\n=== Testing model: {model} ===")
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": "Hello"}],
        "stream": False,
        "temperature": 0.5,
    }
    
    req = urllib.request.Request(base_url, data=json.dumps(payload).encode("utf-8"), headers=headers)
    
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            body = res.read().decode("utf-8")
            data = json.loads(body)
            print(f"Status: {res.status}")
            print(f"Choices: {data.get('choices')}")
            if data.get('base_resp'):
                print(f"Base resp: {data['base_resp']}")
    except Exception as e:
        print(f"Error: {e}")
