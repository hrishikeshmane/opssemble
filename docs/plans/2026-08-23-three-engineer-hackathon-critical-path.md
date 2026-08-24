# Opssemble Three-Engineer Hackathon Critical Path

> **For Codex:** This is the canonical hackathon execution plan. Broader product and FlightLab documents are reference material only.

**Goal:** In four hacking hours, demonstrate one real Opssemble Release Mission from a real or simulated GitHub merge through fixture-backed observations, concurrent agent analysis, deterministic policy, a generated report, and a Codex repair handoff.

**Architecture:** Run Opssemble as one long-lived local Next.js process. Serialize every state mutation through one event writer, treat append-only NDJSON events as the source of truth, and rebuild JSON state as a derived cache. Keep runtime contracts numeric and evidence-backed, then adapt them into the existing mock UI's presentation types. Expose only a small GitHub webhook relay through a tunnel. Use one FlightLab retry PR and fixture-backed CloudWatch, PostHog, and Stripe reads; all Opssemble planning, agents, policy, reporting, and repair orchestration execute normally.

**Tech Stack:** Existing Next.js 16 application, TypeScript, npm, Vercel AI SDK, shadcn/ui, local file persistence, GitHub REST/webhooks, Greptile when available, OpenAI/Codex, Vitest, and a minimal Vercel-hosted FlightLab.

---

## 1. Fixed Decisions

These decisions are closed for the hackathon:

| Decision | Choice |
|---|---|
| Product name | **Opssemble** |
| Team | One Opssemble owner, one FlightLab owner, one integration/demo owner |
| Hacking window | Four hours |
| Opssemble runtime | Local long-lived Node/Next.js process |
| Persistence | Serialized NDJSON event log plus derived JSON state cache |
| Public exposure | Tunnel the webhook relay only; keep the dashboard local |
| Package manager | npm |
| Judged repository identity | FlightLab everywhere; no `checkout-lab` or PR `#184` placeholders |
| Demo scenarios | One: booking timeout retry |
| Pull requests | One judged PR plus four identical spare PRs |
| Specialist agents | Resilience, Performance, Product Health |
| Impact analysis | Watch Plan/planner context, not a fourth mission agent |
| Policy | Deterministic code |
| Provider data | Fixture-backed CloudWatch, PostHog, and Stripe reads |
| FIS | No separate adapter; represent experiment state as fixture observations |
| Codex repair | Live attempt with a prepared checkpoint and recording |
| Watch Plan | Generated before rehearsal, persisted by PR SHA, and reused during judging |
| Report | Deterministic template; optional bounded LLM paragraph |
| Linear/PostHog actions | Stretch only |
| Stretch gate | Core acceptance passes twice and a backup recording exists |
| Database/Workflow | No Neon, Drizzle, or Vercel Workflow |
| Authentication | No public Opssemble dashboard; signed webhook relay only |

## 2. Judged Product Story

The five-minute demo proves:

```text
real GitHub PR
  -> real Watch Plan generation
  -> developer adds one monitoring requirement
  -> contract is armed
  -> real GitHub merge or identical fallback event
  -> one normal Release Mission
  -> three concurrent agents query fixture-backed provider tools
  -> deterministic measurements and policy reject the release
  -> Opssemble generates a report
  -> Codex receives a bounded repair task
  -> repaired observations pass the unchanged contract
```

Only provider reads are mocked. Fixtures cannot contain an agent verdict, policy result, report, or repair.

## 3. Scope Cut

### Must Ship

- Existing Opssemble application shell
- Changes list containing the FlightLab PR
- One Change detail screen with generated Watch Plan
- Custom monitoring requirement compilation
- Explicit `Arm Watch Plan`
- One mission detail screen
- Local persistent mission state
- Runtime-to-UI adapter for agent runs, measurements, evidence, and decisions
- Explicit `unknown` agent verdict and separate `held` mission state
- Simulated merge using the same normalized event as GitHub
- Fixture-backed provider tools
- Three concurrent specialist analyses
- Visible `waiting_for_evidence` state while fixture windows open
- Deterministic aggregation and policy
- Failure report and evidence view
- Visible fixture-source label
- Codex repair task with prepared fallback
- Repair rerun against the same thresholds
- Event-sourced one-value observation override plus undo that reruns
  measurements and policy without an LLM
- `demo:reset` command and clean judged-run seed

### Add Only After the Full Loop Works

- Actual GitHub webhook through a tunnel
- Greptile live retrieval
- Real Vercel deployment link
- Real Codex execution
- Linear issue creation
- Codex plugin control surface
- Executable sandbox experiments

### Do Not Build

- PR #1 smart seat bundles
- PR #2 flexible-date search
- PostHog dial-up demo
- AWS infrastructure
- AWS FIS adapter
- Real Stripe payments
- CloudWatch API integration
- Neon, Drizzle, or Vercel Workflow
- Authentication or multi-tenancy
- Generic provider configuration UI
- Full postmortem system
- Playwright test suite
- Rewriting the seven-screen mock UI from scratch

## 4. Team Ownership

Use strict ownership. The other engineers should hand you stable artifacts rather
than editing Opssemble core while you are working.

### You: Complete Opssemble Vertical Slice

You own the entire Opssemble application:

```text
app/(app)/
app/api/
components/opssemble/
lib/contracts/
lib/view-models/
lib/store/
lib/providers/
lib/measurements/
lib/missions/
lib/policy/
lib/agents/
tests/runtime/
```

You deliver:

- Changes inbox using the current `moc-ui` foundation
- Watch Plan workspace and custom requirement compilation
- Arm interaction
- File-backed store and event log
- Serialized event writer and startup replay
- Merge-event ingestion and fallback button
- Fixture provider registry
- Deterministic measurements
- Generic concurrent agent runner with three agent configurations
- Runtime-to-presentation adapters for the existing UI
- Policy evaluation and report generation
- Mission detail UI
- Single mission JSON endpoint and one polling client island
- Codex repair action and repair rerun

Your UI scope is limited to three judged surfaces:

```text
/changes
/changes/[id]
/missions/[id]
```

Agent registry, policies, integrations, and mission-list pages may remain static
or incomplete. Do not spend critical-path time making them functional.

### Engineer 2: FlightLab Owner

Owns only the sibling FlightLab repository:

```text
../flightlab/
```

Delivers:

- Minimal two-screen flight booking app
- Baseline booking implementation
- Bad timeout-retry commit
- One live PR and four spare PRs
- Failure and repair raw observation sets
- `RUNBOOK.md` and duplicate-booking incident history
- Vercel deployment

The FlightLab engineer hands you:

```text
repository URL
PR numbers and SHAs
local fixture-directory path
Vercel URL
scenario label
```

They do not edit Opssemble provider, mission, policy, or UI code.

### Engineer 3: Integration and Demo Owner

Owns external setup and isolated harnesses:

```text
scripts/demo/
scripts/integrations/
external account and webhook configuration
demo recordings and reset instructions
```

Delivers:

- GitHub token and repository webhook configuration
- Standalone signed webhook relay
- Cloudflare tunnel command and verified callback URL
- Greptile connectivity probe and cached-context fallback
- Local-docs knowledge fallback using the FlightLab checkout
- Codex repair prompt
- Prepared Codex repair checkpoint
- Spare-PR reset instructions
- `scripts/demo/reset.mjs`
- Backup screen recording

The integration engineer must not edit:

```text
app/(app)/
components/opssemble/
lib/missions/
lib/policy/
lib/agents/
```

They expose integration results as documented JSON or HTTP contracts. You decide
when and how those contracts enter Opssemble.

## 5. Shared Runtime Contracts

You create and commit these first. The other engineers build their handoff
artifacts against them.

```ts
export type MissionState =
  | "queued"
  | "running"
  | "waiting_for_evidence"
  | "evaluating"
  | "rejected"
  | "passed"
  | "held"

export interface NormalizedMergeEvent {
  repository: string
  pullRequestNumber: number
  headSha: string
  mergeSha: string
  mergedAt: string
  actor: string
  labels: string[]
  triggerSource: "github" | "simulated"
}

export type MissionTrigger =
  | {
      kind: "merge"
      repository: string
      pullRequestNumber: number
      mergeSha: string
      contractVersion: number
    }
  | {
      kind: "repair-rerun"
      parentMissionId: string
      scenarioPhase: "repair"
      contractVersion: number
    }

export type AgentRunState =
  | "queued"
  | "waiting_for_evidence"
  | "analyzing"
  | "succeeded"
  | "failed"

export interface ScenarioSelection {
  scenarioId: string
  scenarioPhase: "failure" | "repair"
}

export type AgentKey = "resilience" | "performance" | "product-health"

export type ClauseKey =
  | "max_reservations_per_operation"
  | "booking_p99_ms"
  | "booking_completion_relative_drop"

export interface ReleaseContract {
  version: number
  scenarioId: string
  evaluationWindowMs: number
  agents: {
    key: AgentKey
    required: boolean
  }[]
  clauses: {
    key: ClauseKey
    agent: AgentKey
    operator: "lte" | "gte" | "eq"
    threshold: number
  }[]
}

export interface Observation {
  id: string
  availableAfterMs: number
  provider: "cloudwatch" | "posthog" | "stripe"
  kind: "metric" | "log" | "event" | "record"
  name: string
  dimensions: Record<string, string>
  value?: number
  unit?: string
  payload?: Record<string, unknown>
}

export interface Measurement {
  key: string
  value: number
  baseline?: number
  threshold: number
  operator: "lte" | "gte" | "eq"
  passed: boolean
  evidenceIds: string[]
}

export interface AgentResult {
  agent: AgentKey
  state: "succeeded" | "failed"
  verdict: "pass" | "fail" | "unknown"
  narrativeStatus: "generated" | "unavailable"
  summary: string
  measurements: Measurement[]
  evidenceIds: string[]
}

export type ObservationOverrideEvent =
  | {
      type: "observation.overridden"
      missionId: string
      observationId: string
      path: string
      previousValue: string | number
      newValue: string | number
      actor: string
      reason: string
    }
  | {
      type: "observation.override_cleared"
      missionId: string
      observationId: string
      path: string
      actor: string
    }
```

Derive `scenarioId` from exactly one PR label with the prefix
`opssemble-scenario:`. Reject missing or duplicate scenario labels instead of
hardcoding a literal into `NormalizedMergeEvent`.

The demo contract is frozen as:

```ts
const demoContract: ReleaseContract = {
  version: 3,
  scenarioId: "booking-timeout-retry",
  evaluationWindowMs: 36_000,
  agents: [
    { key: "resilience", required: true },
    { key: "performance", required: true },
    { key: "product-health", required: true },
  ],
  clauses: [
    {
      key: "max_reservations_per_operation",
      agent: "resilience",
      operator: "lte",
      threshold: 1,
    },
    {
      key: "booking_p99_ms",
      agent: "performance",
      operator: "lte",
      threshold: 1500,
    },
    {
      key: "booking_completion_relative_drop",
      agent: "product-health",
      operator: "lte",
      threshold: 5,
    },
  ],
}
```

The reset seed contains this deliberately incomplete draft:

```ts
const draftWatchPlanV2: ReleaseContract = {
  version: 2,
  scenarioId: "booking-timeout-retry",
  evaluationWindowMs: 36_000,
  agents: [{ key: "performance", required: true }],
  clauses: [
    {
      key: "booking_p99_ms",
      agent: "performance",
      operator: "lte",
      threshold: 1500,
    },
  ],
}
```

The developer's custom requirement visibly adds the Resilience and Product
Health agents plus `max_reservations_per_operation` and
`booking_completion_relative_drop`. Arming that compiled plan creates the frozen
v3 contract above. The requirement interaction must therefore change the plan;
v2 must not already contain either requested clause.

### Runtime-to-UI Boundary

The runtime contracts above are authoritative. Keep the existing display-focused
`AgentRun`, formatted strings, status colors, and timeline rows as view models.
Create one adapter layer:

```text
lib/view-models/mission.ts
  toAgentRunView(agentRun, observations)
  toDecisionView(policyDecision, agentResults)
  toMissionView(missionProjection)
```

The adapter must:

- Format numeric `Measurement` values and thresholds for display.
- Preserve `evidenceIds` on every rendered measurement row.
- Map `queued` to `queued`.
- Map `waiting_for_evidence` and `analyzing` to `running`.
- Map a completed result to `pass`, `fail`, or `unknown`.
- Never map a mission hold to an agent verdict.

Make only these vocabulary corrections to the mock presentation types:

```ts
export type Verdict = "pass" | "fail" | "unknown" | "running" | "queued"
export type MissionDisplayState =
  | "queued"
  | "running"
  | "evaluating"
  | "rejected"
  | "passed"
  | "held"
```

`unknown` renders as `Unknown` with an amber warning treatment. `held` renders
through mission-state presentation, never through `VerdictPill`.

The judged mission page renders exactly three specialist cards. Fold the current
Impact agent content into the Watch Plan's impact/context section. Do not render
Impact as a fourth mission agent.

The static `/agents` screen must also be truthful. Remove `Faults`, `AWS FIS`,
`Modal`, and any configured fault-injection claim from the core demo. Either
omit those tools or render them as `Not configured`. The Resilience agent's
configured tools are fixture observation reads, knowledge lookup, and
deterministic aggregation. Remove `run_candidate_fault_profile` from the judged
mission view; executable faults belong only to the sandbox stretch goal. Do not
navigate to `/agents` during judging unless this reconciliation is complete.

Refactor the two existing components at the boundary:

```text
components/opssemble/missions/agent-run-card.tsx
  receives an adapted AgentRun view

components/opssemble/missions/decision-panel.tsx
  receives a DecisionView prop
  does not import the global mock decision
```

Add:

```text
components/opssemble/missions/data-source-label.tsx
```

It must visibly render `Fixture data` plus the provider names for this demo.

## 6. Local Persistence

Use:

```text
.data/
  state.json
  events.ndjson
  fixture-snapshots/
    <mission-id>/
```

`state.json` stores:

- Watch Plan versions
- Armed contract
- Missions
- Agent runs
- Decisions
- Repair linkage

`events.ndjson` stores append-only transitions:

```text
watch_plan.generated
contract.armed
mission.created
mission.started
agent.started
agent.waiting_for_evidence
observation.received
observation.overridden
observation.override_cleared
agent.completed
policy.evaluated
report.generated
repair.requested
repair.linked
mission.completed
```

`events.ndjson` is the source of truth. `state.json` is only a projection cache.
Implement:

```text
lib/store/write-queue.ts
lib/store/reducer.ts
lib/store/replay.ts
```

Every mutation must call one `commitEvent(event)` function. That function uses a
module-level promise queue as an async mutex and performs this critical section:

1. Append one complete JSON line to `events.ndjson`.
2. Reduce the event into the in-memory projection.
3. Write the projection to `state.json.tmp`.
4. Rename `state.json.tmp` to `state.json`.

No agent may read, modify, and write `state.json` directly. On process startup,
replay `events.ndjson` and rewrite `state.json`; this makes a crash between steps
1 and 4 recoverable and prevents concurrent agent completions from overwriting
one another.

Use trigger-specific idempotency keys:

```text
merge:<repository>:<pullRequestNumber>:<mergeSha>:v<contractVersion>
repair:<parentMissionId>:repair:v<contractVersion>
```

Deduplicate against the replayed event projection, not a best-effort read of
`state.json`.

Fixture snapshots remain immutable after mission creation. Observation edits are
stored in the event projection as an override map keyed by mission and
observation ID. Provider queries apply that overlay after reading the snapshot.
`observation.overridden` records the field path, previous value, new value,
actor, and reason. `observation.override_cleared` removes the overlay and is the
undo operation. Replay must reproduce both the overridden verdict and its undo.

## 7. Webhook and Fallback

Both triggers call one function:

```ts
ingestMergeEvent(event: NormalizedMergeEvent)
```

### Primary

```text
GitHub repository webhook
  -> webhook relay verifies X-Hub-Signature-256
  -> relay forwards normalized event to localhost Opssemble
  -> ingestMergeEvent
```

Expose only the relay:

```bash
cloudflared tunnel --url http://localhost:3001
```

### Fallback

The Changes UI includes `Simulate merge`.

It creates the same `NormalizedMergeEvent`, including the real FlightLab
scenario label, using the selected PR and calls `ingestMergeEvent`. The resulting
mission must be indistinguishable except for:

```text
triggerSource: simulated
```

Build and verify this fallback before attempting the tunnel.

## 8. Fixture Corrections

### Canonical Demo Identity

The judged UI, runtime event, fixtures, report, and repair prompt all represent
FlightLab. During contract freeze, replace the current mock values as one
mechanical pass:

```text
acme/checkout-lab                 -> actual <owner>/flightlab slug
#184                              -> actual live FlightLab PR number
Harden Stripe retry semantics     -> Retry timed-out booking requests
src/payments/**                   -> lib/booking.ts and app/api/bookings/**
Stripe retry root cause           -> booking retry without a stable operation ID
```

The faulty retry may still produce Stripe and reservation evidence, but the
changed code and product identity shown on screen must be FlightLab. The actual
repository slug, PR number, SHAs, and Vercel URL come from Engineer 2's handoff;
do not leave mock identifiers on any judged screen.

### Exact Failure and Repair Profiles

Fixtures contain raw counts and records, not deltas or findings. Engineer 2 must
use these exact values.

Failure profile:

```json
{"id":"ph-baseline-started","availableAfterMs":0,"provider":"posthog","kind":"metric","name":"booking_started","value":100,"dimensions":{"window":"baseline"}}
{"id":"ph-baseline-confirmed","availableAfterMs":0,"provider":"posthog","kind":"metric","name":"booking_confirmed","value":72,"dimensions":{"window":"baseline"}}
{"id":"cw-reservation-1","availableAfterMs":12000,"provider":"cloudwatch","kind":"log","name":"reservation_committed","dimensions":{"operationId":"op-204","reservationId":"rsv-204-a"}}
{"id":"stripe-intent-1","availableAfterMs":15000,"provider":"stripe","kind":"record","name":"payment_intent","dimensions":{"operationId":"op-204","paymentIntentId":"pi-204-a"}}
{"id":"cw-reservation-2","availableAfterMs":22000,"provider":"cloudwatch","kind":"log","name":"reservation_committed","dimensions":{"operationId":"op-204","reservationId":"rsv-204-b"}}
{"id":"stripe-intent-2","availableAfterMs":24000,"provider":"stripe","kind":"record","name":"payment_intent","dimensions":{"operationId":"op-204","paymentIntentId":"pi-204-b"}}
{"id":"perf-candidate-p99","availableAfterMs":26000,"provider":"cloudwatch","kind":"metric","name":"booking_p99_ms","value":2280,"unit":"ms","dimensions":{"window":"candidate"}}
{"id":"ph-candidate-started","availableAfterMs":30000,"provider":"posthog","kind":"metric","name":"booking_started","value":100,"dimensions":{"window":"candidate"}}
{"id":"ph-candidate-confirmed","availableAfterMs":30000,"provider":"posthog","kind":"metric","name":"booking_confirmed","value":61,"dimensions":{"window":"candidate"}}
```

Expected failure measurements:

```text
max_reservations_per_operation = 2 > 1
booking_p99_ms = 2280 > 1500
booking_completion_relative_drop = ((72% - 61%) / 72%) * 100 = 15.3% > 5%
```

All three required clauses fail. Stripe's two payment intents are supporting
Resilience evidence, not a fourth required contract clause.

Repair profile:

```json
{"id":"ph-baseline-started","availableAfterMs":0,"provider":"posthog","kind":"metric","name":"booking_started","value":100,"dimensions":{"window":"baseline"}}
{"id":"ph-baseline-confirmed","availableAfterMs":0,"provider":"posthog","kind":"metric","name":"booking_confirmed","value":72,"dimensions":{"window":"baseline"}}
{"id":"cw-repair-reservation-1","availableAfterMs":2000,"provider":"cloudwatch","kind":"log","name":"reservation_committed","dimensions":{"operationId":"op-204","reservationId":"rsv-204-a"}}
{"id":"cw-repair-reservation-control","availableAfterMs":3000,"provider":"cloudwatch","kind":"log","name":"reservation_committed","dimensions":{"operationId":"op-205","reservationId":"rsv-205-a"}}
{"id":"stripe-repair-intent-1","availableAfterMs":4000,"provider":"stripe","kind":"record","name":"payment_intent","dimensions":{"operationId":"op-204","paymentIntentId":"pi-204-a"}}
{"id":"perf-repair-p99","availableAfterMs":6000,"provider":"cloudwatch","kind":"metric","name":"booking_p99_ms","value":920,"unit":"ms","dimensions":{"window":"candidate"}}
{"id":"ph-repair-started","availableAfterMs":8000,"provider":"posthog","kind":"metric","name":"booking_started","value":100,"dimensions":{"window":"candidate"}}
{"id":"ph-repair-confirmed","availableAfterMs":8000,"provider":"posthog","kind":"metric","name":"booking_confirmed","value":71,"dimensions":{"window":"candidate"}}
```

Expected repair measurements:

```text
max_reservations_per_operation = 1 <= 1
booking_p99_ms = 920 <= 1500
booking_completion_relative_drop = ((72% - 71%) / 72%) * 100 = 1.4% <= 5%
```

All three required clauses pass.

### Clock Anchor

Use `mission.startedAt` as fixture `T0`. This avoids webhook and deployment delays affecting the demonstration.

### Fixture Loading

At mission creation:

1. Resolve the local FlightLab fixture path.
2. Validate every record.
3. Copy the selected profile into `.data/fixture-snapshots/<mission-id>/`.
4. Serve all later provider queries from that immutable snapshot.

Do not fetch GitHub contents per agent query.

For the provenance finale, operate on the passing repair mission. Emit an
`observation.overridden` event that changes
`cw-repair-reservation-control.dimensions.operationId` from `op-205` to
`op-204`. That single raw-observation change makes
`max_reservations_per_operation` move from `1` to `2` and flips policy from
passed to rejected. Emit `observation.override_cleared` to undo it.

### Repair Selection

The original mission stores:

```text
scenarioId: booking-timeout-retry
scenarioPhase: failure
```

The repair task and linked repair PR store:

```text
parentMissionId
scenarioId: booking-timeout-retry
scenarioPhase: repair
```

Selection never depends on the repair branch name.

The repair rerun calls mission ingestion with a `repair-rerun` trigger and uses
`parentMissionId + scenarioPhase` for identity. It does not invent a merge SHA.

## 9. Deterministic Measurements

Do not ask an LLM to count log records.

Implement only:

```ts
countDistinct(records, field, filters)
maxDistinctCountByGroup(records, groupField, distinctField, filters)
ratio(numerator, denominator)
percentChange(current, baseline)
maxValue(records, name, filters)
```

`maxDistinctCountByGroup` returns the largest distinct count across all groups,
the winning group key, and the evidence IDs contributing to that group. The
scalar maximum is the `Measurement.value`; do not select the first operation or
return an unspecified map.

Required measurements:

| Measurement | Computation |
|---|---|
| `max_payment_intents_per_operation` | Maximum distinct payment-intent count across operation IDs; supporting evidence only |
| `max_reservations_per_operation` | Maximum distinct reservation count across operation IDs; required Resilience clause |
| `booking_p99_ms` | Maximum supplied p99 observation for candidate window |
| `booking_completion_relative_drop` | Baseline versus candidate event ratio |

The three agents receive:

- Raw observations
- Deterministically computed measurements
- Watch Plan clauses

Agents explain the operational meaning and causal relationship. The policy engine authorizes the result from measurements and required-agent completion.

The demo observation editor emits `observation.overridden`, rebuilds the
effective observation set from snapshot plus event-sourced overlays, and reruns
only deterministic measurement and policy code. It must not mutate the snapshot,
rerun an agent, or make a model call. Undo emits
`observation.override_cleared`.

After either override event, emit a new `policy.evaluated` event with
`reason: "observation_override"` or `reason: "observation_override_cleared"`.
Retain the original agent results and visibly label the decision as a
post-analysis evidence recomputation; do not imply the agents reran.

## 10. Agent Runtime

Run three agents concurrently:

```text
Resilience
Performance
Product Health
```

Constraints:

- Pin one model ID in environment configuration.
- One model call per agent.
- Structured output only.
- Maximum 20-second timeout per agent.
- No recursive tools or open-ended loops.
- All three agents start concurrently.
- Each agent enters `waiting_for_evidence` and polls its provider queries every
  second.
- Treat `evaluationWindowMs: 36000` as a maximum deadline, not a mandatory
  sleep.
- Close an agent's evidence window as soon as every required clause owned by
  that agent has enough observations to compute its measurement, or when
  `evaluationWindowMs` elapses.
- Provider adapters continue enforcing `availableAfterMs <= mission elapsed`.
- Compute measurements and the deterministic clause verdict immediately when
  the window closes, before calling the model.
- If required evidence is still absent at the maximum deadline, return
  `state: "succeeded"` and `verdict: "unknown"`.
- If the model call times out but measurements are complete, retain the
  deterministic `pass` or `fail`, set `state: "succeeded"` and
  `narrativeStatus: "unavailable"`, and render `Narrative unavailable`.
- Use `state: "failed"` only when the runner crashes before producing a
  deterministic result.

The policy is:

```text
required measurement failure -> reject
required evidence absent at deadline -> hold
all required measurements pass -> pass
```

Policy never consumes model-authored prose or an LLM-selected verdict. The
failure profile closes near T+30s and has up to 20 seconds for narratives,
fitting its 65-second beat. The repair profile has all required evidence by
T+8s and therefore has up to 20 seconds for narratives, fitting its 30-second
beat without changing the contract.

### Bounded Planner, Compiler, and Report

Agents are not the only model callers. Put every model-backed surface behind a
timeout and deterministic fallback:

| Surface | Judged behavior | Timeout/fallback |
|---|---|---|
| Base Watch Plan | Read a real plan generated during rehearsal and persisted by repository, PR number, and head SHA | Regenerate only on explicit action |
| Custom requirement compiler | Try the model, then compile the known FlightLab phrase deterministically | 8 seconds |
| Three agents | One structured call after the observation window | 20 seconds each |
| Report | Render measurements, failed clauses, evidence links, and agent summaries in code | Optional 8-second LLM summary paragraph |

The compiler fallback lowercases and tokenizes the input. It activates when the
tokens contain `completion` and either `duplicate`, `reservation`, or
`reservations`; it must not require one exact sentence. The prepared judged
requirement is:

```text
Also monitor booking completion and duplicate reservations.
```

It produces explicit clauses for
`booking_completion_relative_drop` and `max_reservations_per_operation`.

The presenter pastes the prepared phrase rather than typing it live.

Report generation is successful when the deterministic report exists. An LLM
paragraph timing out must not block the decision or report screen.

### Greptile Knowledge Fallback

Both Greptile and the local checkout implement:

```ts
interface KnowledgeProvider {
  getContext(input: {
    repository: string
    headSha: string
    changedFiles: string[]
  }): Promise<KnowledgeContext>
}
```

Use this chain:

```text
GreptileKnowledgeProvider
  -> on timeout/auth/error
LocalDocsKnowledgeProvider
```

`LocalDocsKnowledgeProvider` reads only:

```text
docs/RUNBOOK.md
docs/INCIDENT-001-duplicate-booking.md
```

It returns the same structured `KnowledgeContext`, including source paths, that
the planner consumes. Cache the successful context with the persisted Watch
Plan so the judged flow never waits on Greptile.

### Mission Live Updates

Expose:

```text
GET /api/missions/[id]
```

The endpoint returns one adapted `MissionView`. The server-rendered mission page
passes its initial view to one client island:

```text
components/opssemble/missions/mission-live.tsx
```

That island polls the JSON endpoint once per second while the mission is
nonterminal. Do not refresh or rerender the full app tree every second.

## 11. FlightLab Scope

FlightLab is one small Vercel app:

```text
/
  six mock flights
  one Book button

/booking
  traveler email
  Complete demo booking
```

The repository contains:

```text
lib/booking.ts
demo-data/booking-timeout-retry/failure/
demo-data/booking-timeout-retry/repair/
docs/RUNBOOK.md
docs/INCIDENT-001-duplicate-booking.md
```

Create five identical bad-retry PRs:

```text
demo/bad-retry-rehearsal-1
demo/bad-retry-rehearsal-2
demo/bad-retry-rehearsal-3
demo/bad-retry-emergency
demo/bad-retry-live
```

Apply the label:

```text
opssemble-scenario:booking-timeout-retry
```

Only the live PR appears in the judged flow.

## 12. Codex Repair Safety

The live action sends Codex:

- Repository and repair branch
- Failed clauses
- Raw evidence references
- Deterministic measurements
- Expected files
- Regression-test requirement
- No deployment credentials

Before the event:

1. Run the repair successfully once with Codex.
2. Save the successful patch as a hidden checkpoint branch.
3. Record the Codex session.
4. Keep a prepared repair PR closed or in a separate private fork.

During judging:

1. Start the real Codex repair.
2. If it finishes within the demo beat, show the live PR.
3. Otherwise select `Resume prepared repair`, clearly label it as a prepared Codex checkpoint, and continue.

## 13. Eight Required Tests

Add Vitest and run only:

1. Fixtures reject `verdict`, `agentResult`, `policyDecision`, and report fields.
2. Planner context cannot access fixture loaders or provider registry.
3. Future observations remain hidden; an agent closes early when all owned
   clauses are computable, while missing required evidence waits until
   `evaluationWindowMs` and becomes `unknown`.
4. Three concurrent `agent.completed` events preserve all three results after
   replay.
5. The exact failure profile fails all three clauses and the exact repair profile
   passes all three clauses.
6. An `observation.overridden` event changes the repair mission from passed to
   rejected after replay; `observation.override_cleared` restores passed, with no
   model call.
7. A model timeout preserves a deterministic failed measurement result with
   `state: "succeeded"` and `narrativeStatus: "unavailable"`; it does not produce
   HOLD.
8. Repeated merge events create one mission, while a repair rerun uses its
   separate `parentMissionId + scenarioPhase` identity.

Make the repository match the commands before relying on them:

```bash
npm install --save-dev vitest
```

Add:

```json
{
  "scripts": {
    "lint": "eslint app components/opssemble lib",
    "test": "vitest run --passWithNoTests",
    "demo:reset": "node scripts/demo/reset.mjs"
  }
}
```

Add `/.data/` to `.gitignore`. Keep `package-lock.json`; `bun.lock` has been
removed and must not return. npm is the fixed package manager.

`scripts/demo/reset.mjs` must:

1. Refuse to run unless the current package name is `opssemble`.
2. Remove `.data/`.
3. Recreate `.data/fixture-snapshots/`.
4. Copy a seed `events.ndjson` containing the rehearsed
   `watch_plan.generated` event for draft Watch Plan v2 and its cached knowledge
   context.
5. Replay the seed so `state.json` is derived with an empty mission list and
   `nextContractVersion = 3`.
6. Clear every observation override and fixture snapshot.
7. Print the live PR number, draft Watch Plan v2, next contract v3, and empty
   mission count.

Every rehearsal therefore starts from draft v2, and clicking `Arm Watch Plan`
always creates contract v3.

Run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run demo:reset
```

## 14. Four-Hour Schedule

### Before 1:00: Required Preparation

Complete outside the hacking window:

- Add `/.data/` to `.gitignore`.
- Install Vitest and add working `test` and `demo:reset` npm scripts.
- Remove `bun.lock` and retain `package-lock.json`.
- Replace checkout-lab, PR `#184`, payment-only paths, policy scopes, decision
  copy, integration rows, and unsupported agent tools with the FlightLab demo
  identity.
- Put direct canonical-profile pointers on stale fixture sections in the
  FlightLab reference plan.
- Generate and persist draft Watch Plan v2 for the judged PR SHA.

Do not defer any of these edits to contract freeze.

### 1:00-1:15: Contract Freeze

All engineers:

- Commit current UI work.
- Agree on the shared TypeScript contracts.
- Confirm the FlightLab fixture and integration-harness payloads match those contracts.
- Confirm one pinned model and credentials.
- Confirm FlightLab repository and live PR names.
- Verify the already-completed FlightLab identity pass against the real live PR
  number and SHA.
- Freeze the runtime-to-UI adapter and keep runtime objects numeric.
- Freeze the `ReleaseContract`, including its three exact clauses and 36-second
  evidence window.
- Confirm three mission agents; Impact remains planner context.
- Confirm all model timeouts.

Exit condition:

```text
Opssemble, the mock adapter, FlightLab fixtures, and the integration relay agree
on one identity, event shape, observation shape, and state vocabulary.
```

### 1:15-2:00: Parallel Foundation

You:

- Serialized event writer, replay, and derived state cache
- Fixture snapshot loader
- Measurements
- Policy
- Simulated merge ingestion
- Runtime-to-UI adapter, including `unknown`
- Bind one judged FlightLab change to the Changes and Mission UI

FlightLab engineer:

- Minimal FlightLab
- Failure and repair raw fixtures
- One live and four spare PRs
- Exact repository/PR/SHA/path/Vercel handoff

Integration engineer:

- Signed webhook relay
- Tunnel setup
- Greptile connectivity probe
- Local-docs knowledge fallback
- Codex repair prompt and prepared checkpoint
- Demo reset script and clean seed

**2:00 abandon point:** If the store and simulated merge do not create a mission, stop GitHub, Greptile, Vercel, and Codex integration work. All engineers finish the local loop.

### 2:00-3:00: Full Local Loop

You:

- Concurrent agents that wait for the evidence window
- Policy and report
- Runtime tests
- Mission JSON endpoint and one polling client island
- Evidence and decision UI
- Fixture-source labels
- Persisted Watch Plan, compiler fallback, and templated report
- Three specialist cards only

FlightLab engineer:

- Validate raw baselines and candidate observations
- Validate failure and repair fixture profiles
- Confirm all five PRs can merge cleanly
- Confirm the exact failure values produce three failed clauses
- Confirm the exact repair values produce three passed clauses

Integration engineer:

- Verify the relay produces the agreed normalized merge event
- Verify Greptile and local-docs fallback produce the same context shape
- Finish the prepared Codex checkpoint and recording
- Do not wait for Opssemble integration

Exit condition:

```text
Simulate merge -> mission -> three agent results -> reject -> repair profile -> pass
```

**3:00 abandon point:** If this loop is not green, freeze all external integrations and debug only the loop.

### 3:00-3:35: Add Reality

You:

- Finalize idempotency and event persistence
- Add actual versus simulated trigger source
- Add event-sourced observation override, undo, and policy flip control
- Connect only integration artifacts that have already been demonstrated independently

FlightLab engineer:

- Keep the live and spare PRs ready
- Verify the Vercel app and fixture paths
- Assist with fixture defects only

Integration engineer:

- Connect GitHub webhook and tunnel
- Add Greptile if already authenticated
- Start live Codex repair if reliable

**3:35 abandon point:** External integration that has not worked twice is disabled for judging.

### 3:35-4:05: Stabilize the Core

All engineers:

- Run `npm run demo:reset`.
- Complete one full simulated-merge run.
- Verify concurrent results survive a restart and event replay.
- Verify `unknown`, fixture-source labeling, report generation, and the
  repair-mission pass-to-reject override.
- Verify clearing the override restores passed after replay.
- Fix only blockers to the five-minute flow.

**4:05 freeze point:** The core path is feature-frozen. Do not begin a stretch
goal unless the acceptance gate has passed twice and a backup recording exists.

### 4:05-4:40: Rehearse and Record

All engineers:

- Run `npm run demo:reset` before each rehearsal.
- Run the exact five-minute script three times.
- Use a fresh spare PR for each real-merge rehearsal.
- Record a clean backup run.
- Verify the fallback merge button.
- Verify the prepared repair checkpoint.
- Stop editing product code after the second clean run.

Keep `demo/bad-retry-live` untouched for judging and retain
`demo/bad-retry-emergency` as the unused final fallback.

### 4:40-5:00: Final Reset

All engineers:

- Run `npm run demo:reset`.
- Start Opssemble, the relay, and the FlightLab tabs in presentation order.
- Verify credentials without mutating the live PR.
- Disable any external integration that is not already proven twice.
- Make no product-code changes.

## 15. Five-Minute Demo

1. **0:00-0:10:** Open FlightLab and click one demo booking.
2. **0:10-0:40:** Show the real bad-retry PR in Opssemble.
3. **0:40-1:15:** Show the real, rehearsed Watch Plan for the same PR SHA,
   display its AI-generated provenance, paste `Also monitor booking completion and
   duplicate reservations`, and arm it.
4. **1:15-1:35:** Merge the PR in GitHub. Use `Simulate merge` only if the webhook does not arrive within five seconds.
5. **1:35-2:40:** Show exactly three agents in
   `waiting_for_evidence`, raw fixture observations appearing over time, then
   independent findings.
6. **2:40-3:10:** Show deterministic measurements, rejection, and generated report.
7. **3:10-4:10:** Start Codex repair. This is the compressible beat: if the
   running total is behind schedule or the live run is not complete promptly,
   go directly to the prepared Codex PR.
8. **4:10-4:40:** Rerun the unchanged contract against the repair profile and
   show all three clauses pass.
9. **4:40-5:00:** On the passing repair mission, override
   `cw-repair-reservation-control.dimensions.operationId` from `op-205` to
   `op-204`. Show `max_reservations_per_operation` move from `1` to `2` and the
   policy flip from passed to rejected without an agent or model call. Use Undo
   to emit `observation.override_cleared` and restore passed.

Step 9 is protected. Do not consume its 20 seconds with a slow Codex run or
extra report narration.

Prepared answer to “is the data fake?”:

> The provider reads are deterministic fixtures so the demo does not depend on generating production traffic. The Watch Plan, agents, measurements, policy, report, and repair workflow are running normally. Changing one raw provider observation changes the verdict, which is why the outcome is derived rather than scripted.

Prepared answer to “was the Watch Plan generated live?”:

> It was generated by this same planner and model path during rehearsal, then persisted by repository, PR number, and head SHA so judging does not depend on model latency. The requirement compilation, version change from v2 to v3, arming, mission, measurements, policy, and report are running now.

## 16. Final Acceptance Gate

Do not present the full demo unless all are true:

- One mission survives browser refresh.
- Three concurrent agent completions survive event replay without lost state.
- Repeated merge events create one mission.
- Repair rerun identity does not require a merge SHA.
- Fixture files contain raw observations only.
- Every judged screen identifies the repository and change as FlightLab.
- The mission page shows exactly three specialist agents.
- `unknown` renders distinctly from a held mission.
- The mission page labels fixture data and providers.
- Baseline and candidate deltas are computed at runtime.
- Agents close when all owned clause evidence is available or the 36-second
  maximum expires.
- Three agents complete concurrently or return explicit `unknown`.
- A narrative model timeout cannot change a deterministic failure into HOLD.
- Resilience, Performance, and Product Health each fail their exact clause on
  the failure profile.
- The same three clauses pass on the repair profile.
- An event-sourced repair observation override flips policy from passed to
  rejected without a model call.
- Replay preserves the override, and Undo restores passed.
- The deterministic report renders even if its optional LLM summary times out.
- The persisted Watch Plan and local-docs knowledge fallback load after reset.
- Reset restores draft Watch Plan v2 and makes the next arm contract v3.
- Draft v2 contains only `booking_p99_ms`; the pasted requirement visibly adds
  the Resilience and Product Health clauses before arming v3.
- `/agents` and mission tool activity do not claim AWS FIS, Modal, or fault
  injection is configured.
- `npm run lint`, `typecheck`, `test`, `build`, and `demo:reset` pass.
- Simulated merge works.
- Actual merge has worked at least twice or is disabled.
- Prepared Codex repair works.
- A backup recording exists.

## 17. Stretch Goal Backlog

Do not start this section until the complete acceptance gate has passed twice
and the backup recording exists. Stretch work must consume the same Opssemble
contracts and APIs; it must not fork mission logic.

### Stretch 1: Codex Plugin

**User outcome:** A developer can inspect and operate Opssemble from the Codex
app without switching to the dashboard.

Package a repository-scoped Codex plugin containing:

```text
plugins/opssemble/
  .codex-plugin/plugin.json
  skills/opssemble/SKILL.md
  .mcp.json
  mcp-server/
```

The plugin is a thin client over existing Opssemble HTTP APIs. Expose only:

```text
list_changes
get_watch_plan
arm_watch_plan
get_mission
get_mission_evidence
request_codex_repair
rerun_repair_contract
```

Rules:

- Read tools may run directly.
- `arm_watch_plan`, `request_codex_repair`, and reruns require explicit user
  confirmation.
- The plugin never reads fixture files, evaluates policy, or mutates the event
  log directly.
- Configure `OPSSEMBLE_BASE_URL` and a short-lived local token.
- Reuse the same runtime response schemas and view links as the web app.

**Minimum demo:** In Codex, ask `Why is the FlightLab release held?`; the plugin
fetches the mission, failed clause, measurement, and evidence IDs, then offers
the existing repair action.

**Kill condition:** If the MCP server cannot connect to the already-running
Opssemble API within 20 minutes, keep the manifest and skill description but do
not show it during judging.

### Stretch 2: Executable Sandbox Experiments

**User outcome:** Opssemble agents can validate a release by running bounded
chaos and stress experiments, not only by reading telemetry.

Add a provider boundary:

```ts
interface SandboxProvider {
  prepare(plan: ExperimentPlan): Promise<PreparedExperiment>
  run(experimentId: string): Promise<void>
  status(experimentId: string): Promise<ExperimentStatus>
  stop(experimentId: string): Promise<void>
  collect(experimentId: string): Promise<Observation[]>
}

interface ExperimentPlan {
  target: string
  recipe: "latency" | "packet-loss" | "stress"
  durationMs: number
  blastRadius: number
  stopConditions: StopCondition[]
  cleanup: CleanupAction[]
}
```

Safety rules:

- The model proposes an `ExperimentPlan`; deterministic code validates and runs
  it.
- Use allowlisted recipes only. Do not expose arbitrary shell execution to an
  agent.
- Require an explicit human approval before `run`.
- Target only a sandbox or preview deployment.
- Enforce maximum duration, blast radius, stop conditions, and cleanup.
- Always provide a manual `Stop experiment` control.
- Normalize results into the existing `Observation` contract so measurement and
  policy code remain unchanged.

**Minimum demo:** Run one bounded latency recipe and one short stress recipe
against a preview target, stream status into the mission, collect observations,
and evaluate the unchanged Watch Plan.

**Kill condition:** If cleanup and stop behavior are not deterministic, keep the
provider interface and a prepared simulation only; do not execute the sandbox
live.

### Adding More Stretch Goals

Append each future idea using this template:

```text
Name:
User outcome:
Smallest demonstrable slice:
Existing contract/API reused:
New dependency:
Safety or reliability boundary:
Maximum implementation time:
Kill condition:
```

No stretch goal may change the core demo identity, contracts, fixture schema,
policy engine, or five-minute script.
