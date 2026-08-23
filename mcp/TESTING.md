# Testing the Opssemble MCP

This guide covers two development flows:

1. **Offline tests** — no server, GitHub, FlightLab, credentials, or network calls.
2. **Local HTTP tests** — runs the real ASGI/FastMCP server and connects with the AI SDK.

Both flows use checked-in FlightLab PR snapshots and generated monitoring evidence. The full live merge/deployment workflow is not required.

## Prerequisites

- Python 3.12+
- [`uv`](https://docs.astral.sh/uv/)
- Node.js 22+ and npm for the local AI SDK smoke test

Install dependencies once:

```bash
cd /Users/kartikpatil/hackathon/opssemble
UV_CACHE_DIR=/tmp/opssemble-uv-cache uv sync --group dev
npm install
```

After dependencies are installed, the offline flow does not require network access.

## Flow 1: Offline in-process tests

This is the fastest test path. FastMCP clients connect directly to the four server objects in process, so no port or environment variables are required.

Run the MCP contract suite:

```bash
cd /Users/kartikpatil/hackathon/opssemble
UV_CACHE_DIR=/tmp/opssemble-uv-cache \
  uv run --group dev pytest tests/test_mcp.py -q
```

The suite verifies:

- The exact twelve-tool contract and profile isolation.
- Controller selection of checked-in scenarios.
- Planner access to redacted PR snapshots.
- Cursor-based telemetry batches and invalid-cursor rejection.
- Repair task creation and idempotency.
- Shared bearer authentication on the HTTP mounts.
- Repair PR association, check tracking, merge gating, and revalidation.

Run only the offline scenario-to-evidence test:

```bash
UV_CACHE_DIR=/tmp/opssemble-uv-cache \
  uv run --group dev pytest \
  tests/test_mcp.py::test_controller_snapshot_flows_to_redacted_planner_and_cursor_agent_batches \
  -q
```

Run all monitoring tests and verify the checked-in generated evidence:

```bash
UV_CACHE_DIR=/tmp/opssemble-uv-cache uv run --group dev pytest -q
UV_CACHE_DIR=/tmp/opssemble-uv-cache uv run python -m monitoring generate --check
```

## Flow 2: Local HTTP MCP server

This flow exercises the real bearer-protected HTTP endpoints. For local snapshot testing, only one setting is required: `MCP_TOKEN`.

### 1. Choose a token

For a disposable local test, use `test-mcp-token`. To generate a stronger token:

```bash
openssl rand -hex 32
```

The server and client must use the same value.

### 2. Start the server

In terminal 1:

```bash
cd /Users/kartikpatil/hackathon/opssemble

MCP_TOKEN=test-mcp-token REPLAY_SPEED=100 \
  UV_CACHE_DIR=/tmp/opssemble-uv-cache \
  uv run uvicorn monitoring.app:app \
  --host 127.0.0.1 \
  --port 8000
```

`REPLAY_SPEED=100` reduces a 45-second evidence replay to approximately 450 milliseconds.

No FlightLab or GitHub variables are needed for this local snapshot flow. `/readyz` returns `503` because live integrations are intentionally unconfigured; `/healthz` and the MCP endpoints still operate.

### 3. Check server health and authentication

In terminal 2:

```bash
curl -s http://127.0.0.1:8000/healthz
```

Expected response:

```json
{"status":"ok"}
```

Confirm that MCP requires authentication:

```bash
curl -i http://127.0.0.1:8000/mcp/control/
```

Expected status: `401 Unauthorized`.

### 4. Run the AI SDK smoke test

The smoke script defaults to `http://127.0.0.1:8000` and `test-mcp-token`, so no additional variables are needed:

```bash
cd /Users/kartikpatil/hackathon/opssemble
npm run smoke:mcp
```

Expected output:

```text
AI SDK createMCPClient smoke passed for all four profiles
```

It verifies these HTTP tool catalogs:

| Endpoint | Tools |
| --- | --- |
| `/mcp/control/` | `list_scenarios`, `set_scenario`, `get_demo_state`, `reset_demo_session` |
| `/mcp/planner/` | `list_changes`, `get_change_context` |
| `/mcp/agent/` | `get_metrics`, `get_logs`, `get_traces`, `get_events` |
| `/mcp/actions/` | `execute_action`, `get_action_status` |

If you generated a different token, pass it to the smoke client:

```bash
MCP_TOKEN="your-generated-token" npm run smoke:mcp
```

If the server uses a different port:

```bash
MCP_BASE_URL=http://127.0.0.1:9000 \
MCP_TOKEN="your-generated-token" \
npm run smoke:mcp
```

## Manual local scenario walkthrough

Connect an MCP client or MCP Inspector to each endpoint with this header:

```text
Authorization: Bearer test-mcp-token
```

The endpoint URLs include a trailing slash.

### 1. Select the offline booking scenario

Endpoint: `http://127.0.0.1:8000/mcp/control/`

Tool: `set_scenario`

```json
{
  "demoSessionId": "local-booking",
  "scenarioId": "booking-timeout-retry-candidate"
}
```

### 2. Read the PR snapshot

Endpoint: `http://127.0.0.1:8000/mcp/planner/`

Tool: `list_changes`

```json
{
  "demoSessionId": "local-booking"
}
```

Then call `get_change_context`:

```json
{
  "demoSessionId": "local-booking",
  "changeId": "snapshot-pr-booking-timeout-retry"
}
```

The planner response contains the PR diff, changed files, repository documentation, checks, and deployment context. It does not expose the internal routing label or scenario ID.

### 3. Query replayed evidence

Endpoint: `http://127.0.0.1:8000/mcp/agent/`

Tool: `get_logs`

```json
{
  "demoSessionId": "local-booking",
  "query": {
    "operationId": "op-204"
  },
  "waitMs": 1000,
  "limit": 50
}
```

Repeat with `get_metrics`, `get_traces`, and `get_events`. Responses use `dataMode: "simulated"` and include a `stream.cursor`. A cursor is valid only for the same session, tool, and query.

### 4. Request a repair handoff

Endpoint: `http://127.0.0.1:8000/mcp/actions/`

Tool: `execute_action`

```json
{
  "demoSessionId": "local-booking",
  "type": "request_repair"
}
```

The result starts in `awaiting_agent` and includes the repository, base and faulty SHAs, approved scope, acceptance criteria, reproduction command, branch convention, and required PR body marker.

Use the returned `actionId` with `get_action_status`:

```json
{
  "actionId": "action-id-from-the-previous-response"
}
```

## Stopping and resetting

- Stop the local server with `Ctrl+C`.
- Restarting the process clears all sessions because the demo store is intentionally in memory.
- While the server is running, `reset_demo_session` clears one selected session and its related action state.

## Troubleshooting

### `401 Unauthorized`

The client token does not match the server's `MCP_TOKEN`, or the `Authorization: Bearer ...` header is missing.

### `/readyz` returns `503`

This is expected in the minimal local snapshot flow. Live GitHub, FlightLab, and runtime-ingress settings are not configured. Use `/healthz` to check the process.

### `INVALID_CURSOR`

Do not reuse a cursor with a different session, telemetry tool, or query.

### No telemetry items appear immediately

Wait briefly or use `waitMs`. Ensure the server was started with `REPLAY_SPEED=100` for a fast local replay.

### Port 8000 is already in use

Start the server on another port and provide the matching `MCP_BASE_URL` to the smoke test.
