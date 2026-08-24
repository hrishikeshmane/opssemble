# Merge-driven monitoring service

This Python 3.12 service is the authoritative home for FlightLab demo scenarios, generated observations, replay state, GitHub snapshots, and the MCP boundary. FlightLab owns only real application code, real HTTP execution, deployment metadata, and signed neutral runtime envelopes.

## Run locally

```bash
cp .env.example .env
UV_CACHE_DIR=/tmp/opssemble-uv-cache uv sync --group dev
UV_CACHE_DIR=/tmp/opssemble-uv-cache uv run uvicorn monitoring.app:app --reload
```

The generated evidence is deterministic:

```bash
uv run python -m monitoring generate
uv run python -m monitoring generate --check
```

The ASGI process exposes GitHub webhook and runtime ingress endpoints, replay SSE, current visible Prometheus metrics, health/readiness probes, and four bearer-protected FastMCP 3.4.7 endpoints:

```text
POST /integrations/github/webhook
POST /monitoring/v1/ingest/runtime
GET  /monitoring/v1/sessions/{id}/events
GET  /metrics
GET  /healthz
GET  /readyz
POST /mcp/control/
POST /mcp/planner/
POST /mcp/agent/
POST /mcp/actions/
```

`GITHUB_WEBHOOK_SECRET`, `OPSSEMBLE_INGEST_SECRET`, and `MCP_TOKEN` are separate trust boundaries. The GitHub token is used only for live PR/check/doc snapshots. Planner responses remove routing labels and internal scenario identifiers. Generated observations are marked `dataMode: simulated`; GitHub and deployment context is `dataMode: live` (checked-in PR snapshots say `snapshot`).

Sessions live only in process memory, are capped at 100 by default, and expire after two hours. Run exactly one replica: there is no shared replay, delivery-deduplication, or action ledger across replicas. Visibility is calculated from elapsed time, so no telemetry scheduler is required. Deployment, trigger, or exercise failures leave an explicit incomplete session and never start a fabricated stream.

## Containers and rehearsal

`docker compose up --build monitoring` runs the service alone. `docker compose --profile prometheus up --build` also starts the optional pinned Prometheus viewer at port 9090; it is never the source of replay truth.

The real PR portfolio and guarded branch/PR/revert scripts are in [`flightlab-prs`](./flightlab-prs/README.md). Opening, merging, or reverting GitHub PRs is always a separate operator action; no rehearsal script force-pushes or rewrites FlightLab history.
