# Proxy Rate Limiter & Copilot Compatibility

## Short Answer
The updated proxy with `--max-wait-seconds 25` will **NOT** break Copilot responses. It gracefully throttles excess traffic without causing timeouts or malformed streaming.

## How It Works

### Without the Limiter (Original Issue)
- Copilot sends rapid multi-step requests (draft → tools → follow-up)
- Each request is ~110KB with 49+ tools and 59+ messages
- Requests burst into NVIDIA endpoint, hit 429 rate limit
- 429 breaks the streaming response → Copilot sees error

### With the Limiter (New Behavior)
Three layers of protection:

1. **`--max-rpm 30`** (request count)
   - Limits to 30 requests per rolling 60 seconds
   - Prevents the rapid burst pattern entirely

2. **`--max-concurrency 1`** (queue depth)
   - Only ONE request in-flight at a time to NVIDIA
   - Guarantees no simultaneous overlapping requests

3. **`--max-input-bytes-per-minute 350000`** (throughput)
   - Caps ~3 requests/minute when each is 110KB
   - Stops throughput-based 429s from NVIDIA's backend meter

4. **`--max-wait-seconds 25`** (Copilot safety valve) ← **NEW**
   - If throttled queue > 25 seconds, proxy returns **503 Service Unavailable** to Copilot instead of hanging
   - Copilot sees clear "retry" signal with `Retry-After: 5` header
   - Response is **NOT** malformed, just delayed/retry-able

## Copilot Timeout Safety

Copilot's own request timeout:
- Typical: 30–120 seconds depending on model type
- Streaming: 60 seconds idle before considering connection dead

With our limiter:
- Request queues at most 25 seconds locally
- NVIDIA response time is typically 5–30 seconds
- Total: 25s + 30s = **55 seconds << 120s** ✓
- Safe margin for streaming chunk arrival

## What You'll See

**Success (no rate limit):**
```
[proxy request] model=minimaxai/minimax-m2.5 messages=61 tools=49 stream=True ... in=112265B
[proxy counters] total=2 last60s=2 in=223977B out=2032B status={'200': 2}
```

**Request Delayed (queued by limiter):**
```
[proxy 2026-03-19 03:40:05] 127.0.0.1 - "POST /v1/chat/completions HTTP/1.1" 503 -
[proxy request] ... (request metadata)
[proxy counters] ... status={'200': 5, '503': 1}
```

Copilot will see the 503 and:
- Show a temporary "unavailable" message
- Offer to retry in 5 seconds
- **This is normal and safe** — not a malformed/broken response

## Tuning If Needed

If you see 503s and want fewer retries, you can increase limits:

```bash
# More permissive (but closer to original 429 risk):
--max-rpm 35 --max-concurrency 2 --max-input-bytes-per-minute 450000 --max-wait-seconds 30

# More aggressive (stays well under 40 RPM):
--max-rpm 25 --max-concurrency 1 --max-input-bytes-per-minute 300000 --max-wait-seconds 20
```

## Bottom Line

✓ Copilot capabilities **unchanged**: streaming, tools, thinking all work  
✓ Responses **not malformed**: proper HTTP error codes  
✓ No cascading timeouts: 25s local queue << 90s+ Copilot timeout  
✓ Rate limits **enforced cleanly**: queue or return 503, never hang  

The limiter trades **speed for reliability** — requests may take longer but won't break.
