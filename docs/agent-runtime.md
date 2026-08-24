# Agent Runtime Foundation

Opssemble uses Vercel AI SDK `ToolLoopAgent` as its agent runtime. The first
agent is a read-only repository analysis agent backed by Amazon Bedrock's
Mantle Responses API through `@ai-sdk/amazon-bedrock/mantle`. It can also read
simulated observations from the fake operations MCP service. PR orchestration
adds a main decision agent that delegates bounded analysis to four read-only
specialists.

## Runtime Boundaries

- Vercel AI SDK owns model calls, the tool loop, stop conditions, usage, and
  provider-neutral results.
- `lib/agents/model-provider.ts` is the only provider-specific boundary.
- `lib/agents/observability-mcp.ts` is the server-only fake observability MCP
  boundary.
- `lib/agents/pr-orchestration-service.ts` composes project resolution, bounded
  pull request loading, the core orchestration service, and project-scoped
  Claude-memory retrieval.
- Turso remains the source of truth for project authorization and metadata.
- Repository access remains local. The initial tools use Node filesystem APIs
  and a fixed-argument `git status`; no arbitrary command surface exists.
- Each project repository must be the `repo` directory of one direct child
  under `~/.opssemble/projects/`. The Turso `clonePath` is canonicalized and
  checked before a run.
- Runs and tools do not mutate process-wide `cwd`.

## Bedrock Configuration

The intended model is GPT-5.6 Terra in AWS account `760561616756`.

```dotenv
OPSSEMBLE_AI_PROVIDER=amazon-bedrock
OPSSEMBLE_AI_MODEL=openai.gpt-5.6-terra
OPSSEMBLE_BEDROCK_REGION=us-east-2
OPSSEMBLE_BEDROCK_BASE_URL=https://bedrock-mantle.us-east-2.api.aws/openai/v1
AWS_PROFILE=codex-fable
```

On the intended local development host, `codex-fable` resolves to account
`760561616756`. Any standard AWS credential-chain source that resolves to the
intended account can be used. Bedrock bearer-token authentication through
`AWS_BEARER_TOKEN_BEDROCK` is also supported by the adapter. Credentials must
not be added to `.env.example` or committed.

Terra is exposed through Mantle's Codex-compatible OpenAI namespace. The
installed adapter otherwise defaults to `/v1`, where Terra rejects both
Responses and Chat Completions requests. Keep the `/openai/v1` base URL for
this model.

Model, region, retry count, output tokens, step limit, tool-call limit, and
timeout are environment-configured. Per-run limits may only lower the
configured ceilings.

## Fake Observability MCP Configuration

Fake observability is optional. Repository-only runs remain available when
both variables are absent:

```dotenv
OPSSEMBLE_FAKE_MCP_URL=http://127.0.0.1:8000/mcp/agent/
OPSSEMBLE_FAKE_MCP_TOKEN=replace-with-a-local-token
```

The variables must be configured together. The URL must end in
`/mcp/agent/`, must not contain credentials, a query string, or a fragment, and
must use HTTPS except for loopback HTTP. The token and URL remain inside the
server-only provider and are never included in normalized run errors.

## Local Route

`POST /api/agents/runs` is a Node.js Route Handler protected by a local bearer
token. Generate a token with `openssl rand -hex 32`, place it in
`OPSSEMBLE_AGENT_LOCAL_TOKEN`, and invoke:

```bash
curl --fail-with-body http://localhost:3000/api/agents/runs \
  --header "Authorization: Bearer $OPSSEMBLE_AGENT_LOCAL_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "projectId": "00000000-0000-4000-8000-000000000000",
    "prompt": "Summarize the repository structure and current git status."
  }'
```

The response is a serializable `AgentRunResponse` containing status, text,
usage, limits, tool invocations/results, and a normalized error when
applicable. Unknown provider and tool errors are never returned verbatim.

To verify the Bedrock model and the four observation tools together, use the
bounded smoke endpoint:

```bash
curl --fail-with-body http://localhost:3000/api/agents/mcp-test \
  --header "Authorization: Bearer $OPSSEMBLE_AGENT_LOCAL_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{"demoSessionId":"demo-1"}'
```

`POST /api/agents/mcp-test` always requests `get_metrics`; callers can only set
the demo session, bounded query, result limit, and timeout. The response reports
the configured and in-context tool names plus sanitized execution summaries.

## PR Orchestration

`POST /api/agents/pr-orchestrate` loads bounded PR metadata and diff context,
then asks the main decision agent to select zero to four relevant specialists.
Each selected specialist returns a report, and the main agent synthesizes the
reports into one summary. The exact specialist IDs are:

1. `impact-analysis`
2. `stress-test`
3. `chaos-test`
4. `watch-arm`

Every specialist receives the same project-confined repository tools, the four
read-only observability MCP tools, and project-scoped read-only Claude-memory
tools (`readMemory` and `searchMemory`). The core service uses the shared model
provider and observability MCP configuration. Each specialist owns and closes
its MCP client; memory mutations are not exposed.

`stress-test` and `chaos-test` run deterministic local simulations. Stress
results do not represent generated traffic, and chaos results do not represent
injected faults or changed resources. Their reports and the final summary must
retain those simulated-data disclaimers.

`customInstructions` may refine the requested analysis. For `watch-arm`, use it
to specify signals, thresholds, rollback symptoms, or an observation window.
It does not authorize the specialist to arm monitoring or mutate a provider.

```bash
curl --fail-with-body http://localhost:3000/api/agents/pr-orchestrate \
  --header "Authorization: Bearer $OPSSEMBLE_AGENT_LOCAL_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "projectId": "00000000-0000-4000-8000-000000000000",
    "pullRequestNumber": 42,
    "demoSessionId": "demo-1",
    "customInstructions": "Watch error rate for 30 minutes after deployment."
  }'
```

The request body is limited to 16 KiB and strictly validated. `projectId` must
be a UUID; `pullRequestNumber` a positive integer; `demoSessionId` at most 128
characters; and `customInstructions` at most 4096 characters. An optional
`timeoutMs` is bounded from 1000 to 300000 ms and defaults to 120000 ms. The
route passes request cancellation through to the service and always returns
`Cache-Control: no-store`.

The main agent is limited to 6 steps. Each specialist is limited to 8 steps, 8
total tool calls across repository, MCP, memory, and simulation providers, and
2048 output tokens. Provider retries default to zero. Reports and the final
summary are capped at 24000 characters. These are core service limits rather
than environment settings, so no additional orchestration variables are
required in `.env`.

The core accepts the shared `AgentModelProvider`, the exact four-tool
observability MCP profile, and a `kind: "memory"` provider factory whose
context is the project ID plus the specialist's shared tool budget. The
integration supplies the read-only Claude-memory provider for that contract.

## Repository Tool Policy

The initial allowlist is:

1. `readProjectMetadata`
2. `listRepositoryFiles`
3. `readRepositoryFile`
4. `inspectGitStatus`

Paths are repository-relative, traversal and absolute paths are rejected, and
canonical targets must remain within the managed repository. Directory listing
does not follow symlinks. File reads reject symlinks that resolve outside the
repository, non-UTF-8 data, and oversized output. The git tool has no command
input and cannot perform checkout, reset, clean, deletion, or writes.

When fake observability is configured, the agent also receives exactly:

1. `get_metrics`
2. `get_logs`
3. `get_traces`
4. `get_events`

The MCP catalog must match those four names exactly before any tool is exposed.
Missing tools, extra tools, pagination, and privileged control, planner, or
action tools fail discovery. Inputs use local bounded Zod schemas rather than
the server's dynamic schemas: session IDs, cursors, query keys, query values,
and query lists are length-limited; `waitMs` is at most 5000 and `limit` is at
most 100.

## Tool Provider Contract

`AgentToolProvider<CONTEXT, TOOLS>` is the extension boundary. A provider has a
stable ID, a kind (`local`, `mcp`, or `memory`), a `createTools` method, and an
optional `close` lifecycle method. Agent composition must explicitly add each
provider's tools to the allowlist and include them in the shared tool budget.

### MCP Observability

Fake log, metric, trace, and event access is implemented through
`@ai-sdk/mcp`. Each agent execution creates one HTTP MCP client, discovers and
converts the reviewed tools, and closes the client in `finally`. This includes
successful runs, model or tool failures, timeout, and caller abort. Close
failures do not replace a successful result or the primary failure.

Repository and MCP tools claim from the same `ToolExecutionBudget`, so
`maxToolCalls` is an agent-wide ceiling. The existing step stop condition,
tool-call stop condition, total timeout, and `AbortSignal` apply to MCP calls.
Connection, discovery, and call failures become a generic `TOOL_ERROR`; raw
provider errors, response text, endpoint URLs, and credentials are not exposed.
The transport rejects redirects and disables MCP call retries.

### Claude-mem-Compatible Context

Shared context uses a local `memory` tool provider rooted by default at:

```text
~/.opssemble/claude-mem/
```

Records carry a project scope, and path construction uses the same canonical
confinement principles as repository tools. PR specialists receive only
`readMemory` and `searchMemory`; create, update, and delete tools are excluded.
