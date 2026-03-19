#!/usr/bin/env python3
"""Check available models on MiniMax."""

import json
import urllib.request

api_key = "sk-cp-xkeqrGd7UyFjQPkkfo4pMAfY-qfj9Z3lXfCiNhQP1w57NhV7urMUL_8yj_e7r6e9fuTEj2U9r0NeRT_rNLR1p-bQD35I5QazhAZ7tbqXNm_dD2LhN1Zcjy8"

# Try different endpoints to list models
endpoints = [
    "https://api.minimax.io/v1/models",
    "https://api.minimax.io/models",
]

headers = {
    "Authorization": f"Bearer {api_key}",
}

for url in endpoints:
    print(f"\n=== Trying: {url} ===")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as res:
            body = res.read().decode("utf-8")
            print(f"Status: {res.status}")
            data = json.loads(body)
            print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Error: {e}")
        if hasattr(e, 'read'):
            print(f"Body: {e.read().decode('utf-8')}")
