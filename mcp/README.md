# MCP compatibility

The four FastMCP 3.4.7 servers are implemented in `opssemble_mcp` so this repository does not shadow the upstream Python `mcp` SDK imported by FastMCP. `ai-sdk-smoke.mjs` uses the installed `@ai-sdk/mcp` `createMCPClient` over Streamable HTTP and verifies the exact tool allowlist exposed by each bearer-protected profile.

With the monitoring service running:

```bash
MCP_BASE_URL=http://127.0.0.1:8000 MCP_TOKEN=your-token npm run smoke:mcp
```
