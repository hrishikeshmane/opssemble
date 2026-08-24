# Opssemble Agent Runtime

This directory contains Opssemble's server-only Vercel AI SDK runtime. Read
`AGENTS.md`, the relevant Next.js 16 docs under `node_modules/next/dist/docs/`,
and the installed AI SDK docs under `node_modules/ai/docs/` before changing it.
Verify APIs against the installed package versions.

## Architecture

- `model-provider.ts` is the only Bedrock-specific boundary.
- `pr-orchestration.ts` defines the PR orchestrator and specialist agents.
- `observability-mcp.ts` exposes only the reviewed read-only MCP tools.
- `claude-memory.ts` provides project-scoped shared context under
  `~/.opssemble/claude-mem/`.
- `tools.ts` provides confined, read-only repository tools.
- `pull-request-context.ts` loads and bounds PR metadata and diffs.
- `pr-orchestration-service.ts` wires Turso project validation, PR loading,
  memory, MCP, and the model.
- `app/api/agents/pr-orchestrate/route.ts` is the authenticated local endpoint.

The main agent receives only delegation tools. It decides which specialists a
PR needs:

1. `impact-analysis` writes a blast-radius report.
2. `stress-test` runs one deterministic simulated stress tool and reports it.
3. `chaos-test` runs one deterministic simulated chaos tool and reports it.
4. `watch-arm` writes deployment watch items and receives optional user
   instructions.

Every specialist receives the same bounded repository tools, four observation
MCP tools, and read-only memory tools. Stress and chaos results are fixtures;
they must never be described as real traffic or fault injection.

## Adding An Agent

1. Add a stable ID and serializable result types in `pr-orchestration.ts`.
2. Give the agent narrowly scoped instructions and the minimum tool set.
3. Add a delegation tool to the main agent. Do not give the main agent direct
   repository, MCP, shell, or mutation tools.
4. Reuse `ToolExecutionBudget`, `isStepCount`, the parent `AbortSignal`, and the
   total timeout.
5. Create MCP clients per specialist and close providers in `finally`.
6. Keep provider-specific code behind `model-provider.ts`.
7. Normalize failures with `normalizeAgentError`; never return provider
   payloads, environment values, tokens, URLs with credentials, or raw stderr.
8. Add deterministic `MockLanguageModelV4` tests that prove selection, tool
   visibility, limits, cleanup, and error normalization.

Do not add arbitrary command execution, writes, checkout, reset, clean, delete,
or process-wide `cwd` mutation. Repository paths must remain inside the
Turso-authorized managed checkout. Memory mutations are separate opt-in tools;
specialists receive read/search only.

## Local Invocation

Start the fake MCP service and Next.js app, then call:

```bash
curl --fail-with-body http://127.0.0.1:3002/api/agents/pr-orchestrate \
  --header "Authorization: Bearer $OPSSEMBLE_AGENT_LOCAL_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "projectId": "00000000-0000-4000-8000-000000000000",
    "pullRequestNumber": 1,
    "demoSessionId": "demo-1",
    "customInstructions": "Watch deployment error rate."
  }'
```

Required model and MCP variables are documented in `.env.example`. Never commit
`.env.local` or real credentials.

## Verification

```bash
npm test
npx next typegen
npm run typecheck
npm run lint
npm run build
uv run pytest -q
```

Next.js 16 generates global `PageProps`, `LayoutProps`, and `RouteContext`
helpers during `next typegen`, `next dev`, or `next build`. Run type generation
before standalone TypeScript checks after route changes.
