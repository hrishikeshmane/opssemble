# Opssemble Fake Operations MCP Requirements

> **Status:** Hackathon requirements
>
> **Implementation:** Python FastMCP server
>
> **Purpose:** Replace every external demo integration with one deterministic
> MCP server while keeping Opssemble's planning, agent analysis, policy, and
> workflow behavior real.

## 1. Decision

The hackathon demo will use a single **Fake Operations MCP** as the external
world seen by Opssemble.

The MCP will provide:

- Pull request and repository context
- Deployment state
- Metrics
- Logs
- Traces
- Product events and funnel observations
- Payment and reservation observations
- Fault-experiment state
- Feature-flag state and simulated mutations
- Simulated issue creation
- Simulated repair execution and repair status
- Explicit demo scenario selection

No live CloudWatch, PostHog, Stripe, AWS FIS, Vercel, GitHub, Greptile, Linear,
or Codex credentials are required for the core demo.

This changes the integration boundary from the earlier FlightLab plan. The
complete external environment is simulated through MCP, not only observability
reads. The Opssemble product behavior on top of that boundary must remain real.

## 2. Product Boundary

### The MCP Owns

- Deterministic external records for the active demo scenario
- Querying and filtering those records
- Cross-provider correlation identifiers
- Simulated external state, such as a rollout percentage
- Simulated action receipts
- Idempotency for external actions
- Resetting the external world between demo runs
- Honest source labeling on every response

### Opssemble Owns

- Change risk analysis
- Watch Plan generation
- Custom monitoring requirement compilation
- Agent selection and skip reasons
- Thresholds, observation requirements, and stop conditions
- Watch Plan versioning and arming
- Mission creation and lifecycle
- Agent scheduling
- Tool selection and provider queries
- Evidence correlation
- Findings, root-cause hypotheses, and verdicts
- `PASS`, `FAIL`, and `UNKNOWN` decisions from individual agents
- Deterministic policy evaluation
- Report and postmortem generation
- Issue title, description, and acceptance criteria
- Repair instructions and approval
- Revalidation against the unchanged Watch Plan

The MCP supplies facts and executes requested simulated actions. It must not
decide what those facts mean.

## 3. Core Invariant

```text
Fake Operations MCP
  -> returns simulated external facts

Real Opssemble
  -> plans monitoring
  -> selects agents
  -> queries MCP tools
  -> correlates evidence
  -> creates findings and verdicts
  -> applies deterministic policy
  -> generates reports and action requests

Fake Operations MCP
  -> records and simulates explicitly requested external actions
```

If changing one fixture field can directly set an agent verdict, policy result,
root cause, report, or repair instruction, the boundary is wrong.

## 4. Operating Model

### 4.1 Demo Sessions

Every tool call must include a `demo_session_id`.

A session isolates:

- The active scenario
- Feature-flag state
- Deployment state
- Created issues
- Repair requests
- Action-ledger entries

This prevents two browser sessions or test runs from changing each other's
demo state.

The server may keep session state in memory for the hackathon. Restarting the
server may clear all sessions.

### 4.2 Scenario Selection

The demo controller selects the external world explicitly:

```text
set_scenario(
  demo_session_id: string,
  scenario_id: string
)
```

`set_scenario` makes the complete scenario dataset available immediately.
There is no simulated clock, delayed record release, background scheduler, or
polling requirement for the MVP.

The mission UI can still feel live because agents call different tools and
publish their own state transitions as they work.

### 4.3 Tool Access Profiles

One FastMCP server may expose all tools, but Opssemble must pass only the
appropriate subset to each caller:

| Profile      | Caller                             | Tool access                                                  |
| ------------ | ---------------------------------- | ------------------------------------------------------------ |
| Demo control | Demo operator or test harness      | Scenario selection and reset                                 |
| Planner      | Watch Plan compiler                | Change, diff, repository context, deployment metadata        |
| Agent        | Specialist agents                  | Metrics, logs, traces, product events, payments, experiments |
| Actions      | Orchestrator after policy/approval | Flag, deployment, issue, and repair mutations                |

`set_scenario`, `reset_demo_session`, and other control tools must never be
available to an LLM agent. Tool restriction can be enforced in the Opssemble
MCP client even if the FastMCP server exposes the tools on one transport.

### 4.4 Complete Data, Real Queries

The active scenario contains complete data, but observation tools must still
apply their inputs:

- Metric name
- Time range
- Service or route
- Release SHA
- Deployment ID
- Region
- Variant
- Operation ID
- Trace ID
- Event name

A query with no matches returns an empty result with an explicit reason. It
must not silently return unrelated records.

## 5. Common Data Contract

Every non-control response must include:

```ts
interface McpResponse<T> {
  dataMode: "simulated"
  provider: string
  requestId: string
  demoSessionId: string
  items: T[]
  itemCount: number
  query: Record<string, unknown>
  warnings: string[]
}
```

Every observation must include:

```ts
interface EvidenceObservation {
  evidenceId: string
  observedAt: string
  provider: string
  kind: string
  releaseSha?: string
  deploymentId?: string
  service?: string
  route?: string
  operationId?: string
  traceId?: string
  region?: string
  attributes: Record<string, unknown>
}
```

Requirements:

- `evidenceId` is stable across repeated identical queries.
- IDs used across metrics, logs, traces, payments, and events must correlate.
- Timestamps use ISO 8601 UTC.
- Numeric values remain numeric.
- Units are always explicit.
- Every response is labeled `dataMode: "simulated"`.
- Agent-facing responses must not expose the internal scenario ID.
- Agent-facing responses must not use outcome words such as `failed`,
  `healthy`, `unsafe`, or `repaired` as hidden hints.

## 6. Required MCP Tools

The MVP must expose only this compact tool surface:

| Tool                 | Purpose                                                                    | Allowed caller               |
| -------------------- | -------------------------------------------------------------------------- | ---------------------------- |
| `list_scenarios`     | Discover controller-visible demo scenarios                                 | Demo controller              |
| `set_scenario`       | Select and reset the external world                                        | Demo controller              |
| `get_demo_state`     | Inspect controller-visible mutable state                                   | Demo controller              |
| `reset_demo_session` | Clear one demo session                                                     | Demo controller              |
| `list_changes`       | Populate the FlightLab change inbox                                        | Planner and application      |
| `get_change_context` | Read change metadata, diff, repository context, deployment, and flag state | Planner and application      |
| `get_metrics`        | Query metric observations                                                  | Specialist agents            |
| `get_logs`           | Query structured logs                                                      | Specialist agents            |
| `get_traces`         | Query request and dependency traces                                        | Specialist agents            |
| `get_events`         | Query product, payment, reservation, and experiment events                 | Specialist agents            |
| `execute_action`     | Simulate an approved flag, deployment, issue, or repair action             | Orchestrator                 |
| `get_action_status`  | Read a previously requested action and its artifacts                       | Orchestrator and application |

Inputs and outputs must use typed FastMCP schemas rather than unstructured JSON
strings.

The subsections below describe required logical capabilities. Do not create one
tool for every logical capability. Implement them through the consolidated
tools above:

```text
get_change_context
  -> change, diff, repository context, deployment, feature flag

get_events
  -> product event, payment, reservation, fault experiment

execute_action
  -> flag rollout, flag restore, deployment action, issue, repair
```

### 6.1 Demo Control Tools

These tools are controller-only.

#### `list_scenarios`

Returns the available scenario IDs, display names, supported demo, and initial
external state. It may include presenter notes because agents cannot access it.

#### `set_scenario`

Input:

```ts
{
  demoSessionId: string
  scenarioId: string
}
```

Behavior:

- Validates the scenario ID.
- Replaces the active external dataset for the session.
- Resets scenario-specific mutable state to its declared initial value.
- Does not generate any Opssemble mission, verdict, or report.
- Returns the selected scenario and reset-state summary to the controller.

#### `get_demo_state`

Returns controller-visible state:

- Active scenario
- Current feature flags
- Current deployments
- Recorded external actions
- Created mock issues
- Repair request status

#### `reset_demo_session`

Clears the selected scenario, mutable external state, and action ledger for one
session. Repeated calls are safe.

### 6.2 Change and Context Tools

These tools support planning without revealing observability outcomes.

`get_change_context` accepts:

```ts
{
  demoSessionId: string
  changeId: string
  include: Array<
    "metadata" | "diff" | "repository" | "deployment" | "feature_flag"
  >
}
```

Its response keeps each requested view in a separate typed field.

#### `list_changes`

Returns the three FlightLab changes with:

- Change ID
- PR number
- Title
- Author
- Branch
- Head SHA
- Merge state
- Updated time

It must not return risk, selected agents, Watch Plan state, or expected outcome.
Opssemble derives those fields.

#### `get_change_context`: Change Metadata

Returns one change's metadata and changed-file summary.

#### `get_change_context`: Diff

Returns a deterministic unified diff for the requested change.

Required changes:

1. Smart Seat Bundles
2. Flexible-Date Search
3. Booking Timeout Retry
4. The Booking Timeout Retry repair change after repair is requested

#### `get_change_context`: Repository Context

Input may select:

- Architecture
- Runbook
- Product metrics
- Historical incident
- Ownership

For the booking retry change, context should describe expected idempotency,
timeout, and recovery behavior and the historical duplicate-booking incident.
It must not contain a generated Watch Plan or tell the agent the current
scenario outcome.

#### `get_change_context`: Deployment

Returns:

- Deployment ID
- Release SHA
- Environment
- Candidate or baseline role
- Status
- Created time
- URL
- Previous deployment ID

The tool returns deployment facts, not a promote or reject recommendation.

### 6.3 Observation Tools

These tools are available to specialist agents after a mission starts.

`get_events` accepts:

```ts
{
  demoSessionId: string
  sources: Array<"product" | "payment" | "reservation" | "experiment">
  names?: string[]
  startTime?: string
  endTime?: string
  filters?: {
    releaseSha?: string
    deploymentId?: string
    operationId?: string
    traceId?: string
    featureFlag?: string
    variant?: string
    region?: string
    status?: string
  }
}
```

#### `get_metrics`

Input:

```ts
{
  demoSessionId: string
  names: string[]
  startTime?: string
  endTime?: string
  filters?: {
    service?: string
    route?: string
    releaseSha?: string
    deploymentId?: string
    region?: string
    variant?: string
    operationId?: string
  }
}
```

Each returned series includes:

- Metric name
- Timestamp
- Value
- Unit
- Dimensions
- Statistic such as `p95`, `p99`, `sum`, or `rate`
- Evidence ID

The MCP may return baseline and candidate series when both match the query, but
it must not calculate an Opssemble verdict.

#### `get_logs`

Input:

```ts
{
  demoSessionId: string
  query?: string
  startTime?: string
  endTime?: string
  filters?: {
    service?: string
    releaseSha?: string
    deploymentId?: string
    operationId?: string
    traceId?: string
    level?: string
  }
  limit?: number
}
```

For the MVP, `query` may be case-insensitive text matching. A full CloudWatch
Logs Insights parser is explicitly out of scope.

Each record includes timestamp, level, service, message, structured fields,
and correlation IDs.

#### `get_traces`

Input filters:

- Trace ID
- Operation ID
- Route
- Release SHA
- Deployment ID

Each trace includes:

- Root operation
- Ordered spans
- Parent-child relationships
- Duration
- Status
- Dependency name
- Request attempt number
- Correlated log and payment IDs

The Booking Timeout Retry scenario must show the first committed operation,
the lost or timed-out response boundary, and the second attempt.

#### `get_events`: Product Events

Input filters:

- Event names
- Release SHA
- Deployment ID
- Feature-flag key
- Variant
- Region
- Operation ID

Results may contain raw events or provider-style aggregates such as:

- Event count
- Funnel denominator
- Funnel numerator
- Completion rate
- Cohort or variant

The tool may return baseline and candidate observations. It must not label a
delta as passing or failing.

#### `get_events`: Payments and Reservations

Input filters:

- Operation ID
- Release SHA
- Deployment ID
- Payment status

Each payment record includes:

- Payment intent ID
- Operation ID
- Idempotency key, when present
- Attempt number
- Amount
- Status
- Created time

Payment and reservation events replace Stripe and application-database reads
for the demo.

#### `get_events`: Fault Experiments

Input filters:

- Experiment ID
- Mission correlation ID
- Release SHA

Returns:

- Experiment ID
- Target
- Fault type
- Start and end times
- State
- Stop condition
- Recovery observation

It reports experiment state only. It does not report whether the release
passed the resilience requirement.

### 6.4 External Action Tools

These tools are available only after Opssemble policy and any required human
approval. They simulate external effects and return receipts.

`execute_action` accepts:

```ts
{
  demoSessionId: string
  idempotencyKey: string
  requestedBy: string
  reason: string
  actionType:
    | "set_flag_rollout"
    | "restore_flag"
    | "promote_deployment"
    | "reject_deployment"
    | "restore_deployment"
    | "create_issue"
    | "request_repair"
  payload: Record<string, unknown>
}
```

Repeated calls with the same idempotency key return the original receipt and
must not apply the action twice.

`get_action_status` accepts a `demoSessionId` and `actionId`. It returns the
stored request, current state, receipt, and any action-specific artifacts.

#### `get_change_context`: Feature Flag State

Returns the current key, variant definitions, rollout percentage, and last
known state for a feature flag.

#### `execute_action`: Set Feature-Flag Rollout

Sets a simulated rollout percentage and returns before/after state.

It must not decide when a rollout should be changed.

#### `execute_action`: Restore Feature Flag

Restores the exact previously captured configuration and returns a receipt.

#### `execute_action`: Deployment Action

Supported actions:

- `promote`
- `reject`
- `restore_previous`

The MCP records the action and updates simulated deployment state. Opssemble
must supply the decision and authorization.

#### `execute_action`: Create Issue

Input includes the title, description, evidence IDs, and acceptance criteria
generated by Opssemble.

The MCP stores exactly that request and returns a simulated issue ID and URL.
It must not supply prewritten incident analysis.

#### `execute_action`: Request Repair

Input includes:

- Repository and change ID
- Failed Watch Plan clauses
- Evidence IDs
- Opssemble-generated diagnosis
- Acceptance criteria
- Approved scope

The required hackathon implementation may return a deterministic simulated
repair branch and PR containing:

- Stable booking operation ID
- Stable payment idempotency key
- Idempotent reservation creation
- Bounded retry at the response boundary
- Commit-then-timeout regression coverage

The response and UI must say `Simulated repair`. It must not be presented as a
real Codex run. A later implementation may replace this tool body with a real
Codex call without changing the Opssemble contract.

#### `get_action_status`: Repair Status

Returns:

- Repair request ID
- State
- Branch
- PR number and URL
- Changed files
- Test command and result
- Repair release SHA

Requesting a repair must not automatically change the active scenario.
The controller explicitly selects the repair-candidate scenario before
revalidation.

## 7. Required Scenario Catalog

The fixture files may use these scenario IDs internally. Observation responses
must not reveal the IDs to agents.

### 7.1 `smart-seat-bundles-baseline`

Supports the pre-dial-up state for PR #1.

Required external facts:

- Feature flag `smart-seat-bundles` at 10%
- Checkout p95 near 600 ms
- Checkout completion near 72%
- Normal seat-bundle event volume
- No elevated error records

### 7.2 `smart-seat-bundles-rollout-50`

Supports the degraded 50% feature rollout.

Required external facts:

- Feature flag at 50%
- Increased `seat_bundle_viewed` events
- Checkout p95 of 1,280 ms
- Checkout completion of 59% versus a 72% baseline
- Repeated high-latency observations
- Trace spans showing sequential seat-scoring work

Expected Opssemble behavior, not fixture content:

- Select Performance and Product Health
- Compare observations with the Watch Plan
- Fail the applicable thresholds
- Request restoration to 10%

### 7.3 `smart-seat-bundles-restored`

Supports recovery verification after the rollout is restored.

Required external facts:

- Feature flag back at 10%
- Checkout latency near baseline
- Checkout completion recovering near baseline
- No continuing saturation signal

### 7.4 `flexible-date-search-candidate`

Supports the healthy control flow for PR #2.

Required external facts:

- Search p95 of 430 ms
- Zero-result-rate delta of 1.2%
- Flight-selection-rate delta of 0.8%
- Traces showing bounded seven-day aggregation
- No relevant errors

Expected Opssemble behavior:

- Select Impact, Performance, and Product Health
- Skip Resilience and Security with reasons
- Derive a passing policy result from observations

### 7.5 `booking-timeout-retry-candidate`

Supports the primary failed demo for PR #3.

All records must correlate through operation ID `op-204`.

Required external facts:

- Fault experiment starts and later completes
- Reservation `res-204-a` is committed
- The provider response times out after the commit
- The caller retries the same user operation
- A second reservation `res-204-b` is committed
- Two payment intents exist for `op-204`
- The two attempts do not share a stable idempotency key
- Booking p99 is 2,280 ms
- Booking completion is 11% below baseline
- Traces connect both attempts to the response timeout

The custom monitoring requirement from the FlightLab plan remains:

```text
Make sure a timeout after the reservation is committed cannot create a
second reservation or payment. Keep booking p99 under 1.5 seconds and
stop if completion drops by more than 5%.
```

Opssemble, not the MCP, must compile it into conditions equivalent to:

```text
reservations_per_operation <= 1
payment_intents_per_operation <= 1
booking_p99_ms <= 1500
booking_completion_relative_drop <= 5%
```

### 7.6 `booking-timeout-retry-repair-candidate`

Supports revalidation after the simulated repair.

The same fault must still be present. The scenario must not simply turn the
fault off.

Required external facts:

- The reservation commits before the simulated response timeout
- A retry occurs at the response boundary
- One reservation exists for `op-204`
- One payment intent exists for `op-204`
- Both attempts use the same stable idempotency key
- Booking p99 is 920 ms
- Booking completion is within 2% of baseline
- The fault experiment completes

Opssemble reruns the exact original Watch Plan and independently derives the
new result.

### 7.7 `booking-timeout-retry-telemetry-gap`

Supports fail-safe behavior.

Required external facts:

- Fault experiment and timeout logs exist
- Payment observations are absent
- Booking latency is absent or incomplete

Expected Opssemble behavior:

- Required agents return `UNKNOWN` where evidence is insufficient
- Policy holds the release
- Missing evidence never becomes `PASS`

## 8. Fixture Format

Store fixtures as ordinary JSON or NDJSON outside tool implementation code.

Recommended layout:

```text
mcp/fake-operations/
  pyproject.toml
  src/fake_operations_mcp/
    server.py
    state.py
    models.py
    tools/
      control.py
      changes.py
      observations.py
      actions.py
    fixtures/
      smart-seat-bundles-baseline/
      smart-seat-bundles-rollout-50/
      smart-seat-bundles-restored/
      flexible-date-search-candidate/
      booking-timeout-retry-candidate/
      booking-timeout-retry-repair-candidate/
      booking-timeout-retry-telemetry-gap/
  tests/
```

Each scenario should have provider-shaped files:

```text
scenario.json
changes.json
repository-context.json
deployments.json
metrics.json
logs.json
traces.json
product-events.json
payments.json
experiments.json
feature-flags.json
repair.json
```

Empty providers use an empty array. Missing files are configuration errors,
not empty successful responses.

## 9. What Fixtures Must Not Contain

Fixtures and observation tool responses must not contain:

- Generated Watch Plans
- Agent selection
- Agent skip reasons
- Agent findings
- Root-cause summaries
- `PASS`, `FAIL`, `WARN`, or `UNKNOWN`
- Policy decisions
- Promote, reject, hold, or restore recommendations
- Generated reports or postmortems
- Prewritten issue content
- Opssemble acceptance criteria
- Model prompts
- Mission UI events

Controller-only metadata may describe what a scenario is intended to
demonstrate, but that metadata must never be returned by agent-facing tools.

## 10. Cross-Tool Consistency Requirements

The server must make a scenario internally coherent:

- A release SHA is identical across deployment, metric, log, trace, event, and
  payment records.
- `op-204` identifies the same booking operation everywhere.
- Trace span timestamps agree with related logs.
- Payment attempt timestamps agree with retry spans.
- Product-event cohorts use the same release and variant labels as metrics.
- Baseline values are stable across repeated calls.
- The repair release uses a new SHA but the same Watch Plan correlation data.
- A restored flag returns to the exact captured configuration, not merely the
  same percentage.

No tool may inject randomness into values, IDs, ordering, or timestamps.

## 11. Error Semantics

Use structured MCP errors for:

- Unknown scenario
- Session without an active scenario
- Invalid query filters
- Missing fixture file
- Unsupported metric or event name
- Unknown change, deployment, experiment, or repair request
- Unauthorized access to controller tools
- Duplicate mutation with conflicting payload under the same idempotency key

Valid queries with no matching observations return:

```ts
{
  dataMode: "simulated",
  items: [],
  itemCount: 0,
  warnings: ["No observations matched the supplied filters"]
}
```

The MCP must distinguish "no matching observations" from a server failure so
Opssemble can produce `UNKNOWN` correctly.

## 12. Opssemble Integration Requirements

Opssemble uses one MCP client configured through:

```text
OPSSEMBLE_FAKE_MCP_URL
OPSSEMBLE_FAKE_MCP_TOKEN
OPSSEMBLE_DEMO_SESSION_ID
```

For local development, FastMCP stdio transport is acceptable. For a deployed
Opssemble instance, use an authenticated network transport supported by the
selected FastMCP version.

The integration layer must:

1. Connect and run a health check.
2. Discover the required tools.
3. Fail startup if required tool contracts are missing.
4. Bind only planner tools during Watch Plan generation.
5. Bind only observation tools to specialist agents.
6. Keep control tools outside all model tool lists.
7. Invoke action tools only after policy and approval checks.
8. Persist MCP request IDs and returned evidence IDs in mission events.
9. Display `Simulated data` on MCP evidence and action receipts.
10. Treat empty required observations as missing evidence, not success.

## 13. Demo Workflows

### Demo A: Smart Seat Bundle Dial-Up

```text
controller: set_scenario(smart-seat-bundles-baseline)
Opssemble: import PR #1 and arm its Watch Plan
Opssemble: get_change_context(feature_flag) -> 10%
Opssemble: execute_action(set_flag_rollout) -> 50%
controller: set_scenario(smart-seat-bundles-rollout-50)
agents: query metrics, traces, and product events
Opssemble: derive failed thresholds
policy: authorize restoration
Opssemble: execute_action(restore_flag)
controller: set_scenario(smart-seat-bundles-restored)
agents: verify recovery
```

### Demo B: Healthy Flexible-Date Search

```text
controller: set_scenario(flexible-date-search-candidate)
Opssemble: import PR #2 and generate a Watch Plan
agents: query change context, metrics, traces, and product events
Opssemble: derive passing agent verdicts
policy: permit promotion
Opssemble: execute_action(promote_deployment)
```

### Demo C: Booking Timeout Retry and Repair

```text
controller: set_scenario(booking-timeout-retry-candidate)
Opssemble: import PR #3
Opssemble: compile the custom monitoring requirement
operator: arm the Watch Plan
agents: query experiment, logs, traces, payments, metrics, and product events
Opssemble: correlate op-204 and derive findings
policy: reject candidate
Opssemble: generate report, issue content, and repair request
Opssemble: execute_action(create_issue)
operator: approve repair
Opssemble: execute_action(request_repair)
controller: set_scenario(booking-timeout-retry-repair-candidate)
Opssemble: rerun the unchanged Watch Plan
agents: query the same evidence categories
Opssemble: independently derive passing verdicts
policy: permit promotion
```

## 14. What the MCP Should Do

- Be deterministic and fast.
- Return realistic provider-shaped facts.
- Apply query filters faithfully.
- Keep all providers correlated.
- Support complete demos without external credentials.
- Make simulated data obvious in every response.
- Keep control operations separate from agent tools.
- Record mutations with idempotency keys.
- Make reset and scenario selection explicit.
- Return enough raw evidence for agents to reason.
- Allow Opssemble behavior to change without rewriting expected verdicts.

## 15. What the MCP Should Not Do

- Do not generate agent conclusions.
- Do not return expected verdicts.
- Do not choose agents.
- Do not compile the Watch Plan.
- Do not authorize actions.
- Do not automatically promote, reject, restore, or repair.
- Do not switch scenarios because an agent queried a particular tool.
- Do not reveal controller scenario names to agents.
- Do not use randomness or real-time-dependent fixture release.
- Do not require real provider credentials.
- Do not make outbound production calls.
- Do not claim simulated GitHub, Linear, Vercel, or Codex actions are real.
- Do not hide missing evidence by returning an unrelated fallback record.
- Do not implement full provider query languages for the hackathon.

## 16. Required Tests

### Contract Tests

- Every required tool exists with the expected typed input.
- Every response includes simulation labeling.
- Controller tools are absent from agent tool profiles.
- Agent-facing responses do not expose scenario IDs or expected outcomes.
- Fixture files reject prohibited fields such as `verdict`,
  `policyDecision`, and `rootCause`.

### Query Tests

- Metrics filter by name, release, route, region, and variant.
- Logs filter by text, operation ID, trace ID, and level.
- Traces filter by operation and release.
- Product events filter by event, cohort, flag, and region.
- Payments filter by operation ID and status.
- Empty matches remain empty.

### State Tests

- Sessions are isolated.
- `set_scenario` resets mutable state.
- `reset_demo_session` is idempotent.
- Identical queries return identical evidence IDs and ordering.
- Duplicate actions with one idempotency key execute once.
- Conflicting reuse of an idempotency key returns an error.

### Scenario Tests

- Smart Seat Bundles contains baseline, rollout, and recovery observations.
- Flexible-Date Search contains the planned healthy values.
- Booking Timeout Retry correlates two reservations and two payments through
  `op-204`.
- The repair scenario keeps the timeout fault while returning one reservation
  and one payment.
- The telemetry-gap scenario omits required evidence intentionally.

### Opssemble End-to-End Tests

- Planner cannot access observation tools.
- Agent cannot access `set_scenario`.
- PR #1 leads Opssemble to restore the captured flag configuration.
- PR #2 leads Opssemble to a passing policy result.
- PR #3 leads Opssemble to reject, report, request repair, rerun, and promote.
- Missing required observations lead to `UNKNOWN` and a hold.
- The original Watch Plan conditions are unchanged during repair revalidation.

## 17. Acceptance Criteria

The Fake Operations MCP is ready when:

- All three FlightLab demos run without external provider credentials.
- The demo operator can select and reset every scenario through MCP.
- Opssemble gets all change context, observations, and simulated action
  receipts through MCP.
- Agents receive raw or provider-aggregated observations, not conclusions.
- Cross-provider evidence supports the planned causal chains.
- Opssemble generates its own Watch Plans, verdicts, policy decisions, reports,
  issue content, and repair requests.
- Simulated evidence and actions are labeled honestly in the UI.
- Repeated runs produce the same results.
- The complete Booking Timeout Retry failure and repair flow can be rehearsed
  reliably in under five minutes.

## 18. Deferred Work

- Live provider adapters
- Merge-relative fixture clocks
- Full CloudWatch Logs Insights syntax
- Real GitHub webhooks
- Real Vercel promotion
- Real PostHog mutations
- Real Linear issues
- Real Codex repair
- Authentication beyond a shared demo token
- Durable MCP state
- Multi-tenant isolation
- Generic fixture authoring UI
