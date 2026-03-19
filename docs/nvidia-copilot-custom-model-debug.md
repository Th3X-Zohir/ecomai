# NVIDIA Custom Model Integration Debug Notes

## Summary
This document explains why custom NVIDIA-hosted OpenAI-compatible models initially failed in VS Code Insiders Copilot Chat, and how the issue was fixed.

## Symptoms
- Models appeared under Language Models.
- Models were selectable in chat picker.
- Every chat request failed with a 500 error in Copilot UI.
- Error stack included `dz_provideLanguageModelResponse` in Copilot Chat extension.

## Root Cause
Copilot custom model requests were not consistently sending an Authorization bearer header to the upstream endpoint in this environment.

The NVIDIA endpoint requires:
- `Authorization: Bearer <token>`

Without that header, requests fail server-side and Copilot reports a generic 500.

## Evidence Collected
1. Direct NVIDIA API calls from terminal with Bearer auth worked.
2. Copilot logs showed repeated server 500 failures.
3. Extension logs contained explicit auth-related backend failure text indicating missing authorization context.
4. A local test to NVIDIA with `x-api-key` only failed (401, authorization header missing), confirming Bearer auth is mandatory.

## Implemented Fix
A local proxy was introduced to inject Bearer auth before forwarding requests to NVIDIA.

### Components
- Proxy script: [scripts/nvidia_auth_proxy.py](../scripts/nvidia_auth_proxy.py)
- Model diagnostics script: [scripts/debug_nvidia_models.py](../scripts/debug_nvidia_models.py)
- Probe output report: [debug/nvidia_model_probe_results.json](../debug/nvidia_model_probe_results.json)

### Proxy Behavior
1. Copilot sends requests to localhost endpoint.
2. Proxy forwards request to `https://integrate.api.nvidia.com`.
3. Proxy injects `Authorization: Bearer <NVIDIA_API_KEY>`.
4. NVIDIA returns valid model output.

## Model Configuration
User model config file:
- `%APPDATA%/Code - Insiders/User/chatLanguageModels.json`

Configured models through proxy endpoint:
- `moonshotai/kimi-k2.5`
- `z-ai/glm5`
- `minimaxai/minimax-m2.5`

All three are routed via:
- `http://127.0.0.1:8787/v1/chat/completions`

## Why Kimi Behaved Differently
Probe results showed Kimi often emits reasoning-only responses with `content: null` under low completion token budgets, while GLM-5 was more consistently content-complete.

This explains why Kimi may appear less stable in some chat flows even after auth is fixed.

## How To Run
Start proxy:

```powershell
py scripts/nvidia_auth_proxy.py --api-key "<YOUR_NVIDIA_API_KEY>"
```

Then reload VS Code window:
- `Developer: Reload Window`

## Operational Notes
- If proxy is not running, custom NVIDIA models will fail.
- If machine restarts, restart proxy.
- Prefer GLM-5 or MiniMax for baseline stability if Kimi response shape causes intermittent issues.

## Next Improvements (Optional)
1. Run proxy as a background startup task/service.
2. Move API key to environment variable and pass it securely.
3. Add health endpoint checks before opening chat.
