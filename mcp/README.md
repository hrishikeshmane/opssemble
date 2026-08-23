# MCP compatibility

The four FastMCP 3.4.7 servers are implemented in `opssemble_mcp` so this repository does not shadow the upstream Python `mcp` SDK imported by FastMCP. `ai-sdk-smoke.mjs` uses the installed `@ai-sdk/mcp` `createMCPClient` over Streamable HTTP and verifies the exact tool allowlist exposed by each bearer-protected profile.

For the zero-configuration offline bad-payment rehearsal and live dashboard:

```bash
UV_CACHE_DIR=/tmp/opssemble-uv-cache uv run python mcp/offline_flow.py
```

This uses the checked-in PR snapshot and monitoring-generated simulated telemetry, then captures the responses from real in-process FastMCP calls. See [TESTING.md](TESTING.md) for the walkthrough and the separate local HTTP flow.

With the monitoring service running:

```bash
MCP_BASE_URL=http://127.0.0.1:8000 MCP_TOKEN=your-token npm run smoke:mcp
```
