# Opssemble Three-Engineer Hackathon Critical Path

> Superseded for implementation by [`monitoring/README.md`](../../monitoring/README.md). The merge/deploy/exercise lifecycle replaces the fixture-copy workflow described below.

> **For Codex:** This is the canonical hackathon execution plan. Broader product and FlightLab documents are reference material only.

**Goal:** In four hacking hours, demonstrate one real Opssemble Release Mission from a real or simulated GitHub merge through fixture-backed observations, concurrent agent analysis, deterministic policy, a generated report, and a Codex repair handoff.

**Architecture:** Run Opssemble as one long-lived local Next.js process. Persist contracts, missions, agent runs, and events to local JSON/NDJSON files. Expose only a small GitHub webhook relay through a tunnel. Use one FlightLab retry PR and fixture-backed CloudWatch, PostHog, and Stripe reads; all Opssemble planning, agents, policy, reporting, and repair orchestration execute normally.

**Tech Stack:** Existing Next.js 16 application, TypeScript, Bun, Vercel AI SDK, shadcn/ui, local file persistence, GitHub REST/webhooks, Greptile when available, OpenAI/Codex, Vitest, and a minimal Vercel-hosted FlightLab.

---

## 1. Fixed Decisions

These decisions are closed for the hackathon:

| Decision | Choice |
|---|---|
| Product name | **Opssemble** |
| Team | One Opssemble owner, one FlightLab owner, one integration/demo owner |
| Hacking window | Four hours |
| Opssemble runtime | Local long-lived Node/Next.js process |
| Persistence | File-backed JSON state plus append-only NDJSON events |
| Public exposure | Tunnel the webhook relay only; keep the dashboard local |
| Package manager | Bun |
| Demo scenarios | One: booking timeout retry |
| Pull requests | One judged PR plus two identical spare PRs |
| Specialist agents | Resilience, Performance, Product Health |
| Policy | Deterministic code |
| Provider data | Fixture-backed CloudWatch, PostHog, and Stripe reads |
| FIS | No separate adapter; represent experiment state as fixture observations |
| Codex repair | Live attempt with a prepared checkpoint and recording |
| Linear/PostHog actions | Stretch only |
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
- Simulated merge using the same normalized event as GitHub
- Fixture-backed provider tools
- Three concurrent specialist analyses
- Deterministic aggregation and policy
- Failure report and evidence view
- Codex repair task with prepared fallback
- Repair rerun against the same thresholds

### Add Only After the Full Loop Works

- Actual GitHub webhook through a tunnel
- Greptile live retrieval
- Real Vercel deployment link
- Real Codex execution
- Linear issue creation

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
- Merge-event ingestion and fallback button
- Fixture provider registry
- Deterministic measurements
- Generic concurrent agent runner with three agent configurations
- Policy evaluation and report generation
- Mission detail UI
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
- One live PR and two spare PRs
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
- Codex repair prompt
- Prepared Codex repair checkpoint
- Spare-PR reset instructions
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
  scenarioId: "booking-timeout-retry"
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
  agent: "resilience" | "performance" | "product-health"
  state: "succeeded" | "failed"
  verdict: "pass" | "fail" | "unknown"
  summary: string
  measurements: Measurement[]
  evidenceIds: string[]
}
```

The UI may render additional presentation fields, but it must not redefine these objects.

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
contract.armed
mission.created
mission.started
agent.started
observation.received
agent.completed
policy.evaluated
report.generated
repair.requested
repair.linked
mission.completed
```

Use atomic writes:

1. Write the new state to `state.json.tmp`.
2. Rename it to `state.json`.
3. Append the event to `events.ndjson`.

The mission idempotency key is:

```text
repository + pullRequestNumber + mergeSha + contractVersion
```

A unique lookup in `state.json` prevents duplicate webhook missions.

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

It creates the same `NormalizedMergeEvent` using the selected PR and calls `ingestMergeEvent`. The resulting mission must be indistinguishable except for:

```text
triggerSource: simulated
```

Build and verify this fallback before attempting the tunnel.

## 8. Fixture Corrections

### Raw Baseline

Fixtures contain raw counts and values, not deltas:

```json
{"availableAfterMs":0,"provider":"posthog","kind":"metric","name":"checkout_started","value":100,"dimensions":{"window":"baseline"}}
{"availableAfterMs":0,"provider":"posthog","kind":"metric","name":"booking_confirmed","value":72,"dimensions":{"window":"baseline"}}
{"availableAfterMs":18000,"provider":"posthog","kind":"metric","name":"checkout_started","value":100,"dimensions":{"window":"candidate"}}
{"availableAfterMs":18000,"provider":"posthog","kind":"metric","name":"booking_confirmed","value":61,"dimensions":{"window":"candidate"}}
```

Opssemble computes:

```text
baseline completion = 72 / 100
candidate completion = 61 / 100
relative drop = 15.3%
```

### Clock Anchor

Use `mission.startedAt` as fixture `T0`. This avoids webhook and deployment delays affecting the demonstration.

### Fixture Loading

At mission creation:

1. Resolve the local FlightLab fixture path.
2. Validate every record.
3. Copy the selected profile into `.data/fixture-snapshots/<mission-id>/`.
4. Serve all later provider queries from that immutable snapshot.

Do not fetch GitHub contents per agent query.

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

## 9. Deterministic Measurements

Do not ask an LLM to count log records.

Implement only:

```ts
countDistinct(records, field, filters)
ratio(numerator, denominator)
percentChange(current, baseline)
maxValue(records, name, filters)
```

Required measurements:

| Measurement | Computation |
|---|---|
| `payment_intents_per_operation` | Distinct payment-intent IDs grouped by operation ID |
| `reservations_per_operation` | Distinct reservation IDs grouped by operation ID |
| `booking_p99_ms` | Maximum supplied p99 observation for candidate window |
| `booking_completion_drop` | Baseline versus candidate event ratio |

The three agents receive:

- Raw observations
- Deterministically computed measurements
- Watch Plan clauses

Agents explain the operational meaning and causal relationship. The policy engine authorizes the result from measurements and required-agent completion.

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
- Provider queries happen before the model call.
- If a model call fails, the agent returns `unknown`.

The policy is:

```text
required failure -> reject
required unknown -> hold
all required pass -> pass
```

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
docs/INCIDENT-duplicate-booking.md
```

Create three identical bad-retry PRs:

```text
demo/bad-retry-rehearsal-1
demo/bad-retry-rehearsal-2
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

## 13. Five Required Tests

Add Vitest and run only:

1. Fixtures reject `verdict`, `agentResult`, `policyDecision`, and report fields.
2. Planner context cannot access fixture loaders or provider registry.
3. Future observations remain hidden until `availableAfterMs`.
4. Deterministic aggregation and policy flip when one raw observation changes.
5. Repeated merge events create exactly one mission.

Use Bun only:

```bash
bun run typecheck
bun run test
bun run build
```

Remove `package-lock.json` after the team confirms Bun installation.

## 14. Four-Hour Schedule

### 1:00-1:15: Contract Freeze

All engineers:

- Commit current UI work.
- Agree on the shared TypeScript contracts.
- Confirm the FlightLab fixture and integration-harness payloads match those contracts.
- Confirm one pinned model and credentials.
- Confirm FlightLab repository and live PR names.

Exit condition:

```text
Opssemble, FlightLab fixtures, and the integration relay agree on one event and observation shape.
```

### 1:15-2:00: Parallel Foundation

You:

- File store
- Fixture snapshot loader
- Measurements
- Policy
- Simulated merge ingestion
- Bind the existing Changes and Mission UI to the shared runtime contracts

FlightLab engineer:

- Minimal FlightLab
- Failure and repair raw fixtures
- Live and spare PRs

Integration engineer:

- Signed webhook relay
- Tunnel setup
- Greptile connectivity probe
- Codex repair prompt and prepared checkpoint

**2:00 abandon point:** If the store and simulated merge do not create a mission, stop GitHub, Greptile, Vercel, and Codex integration work. All engineers finish the local loop.

### 2:00-3:00: Full Local Loop

You:

- Concurrent agents
- Policy and report
- Runtime tests
- Wire mission polling to runtime
- Evidence and decision UI
- Fixture-source labels

FlightLab engineer:

- Validate raw baselines and candidate observations
- Validate failure and repair fixture profiles
- Confirm all three PRs can merge cleanly

Integration engineer:

- Verify the relay produces the agreed normalized merge event
- Verify Greptile or cached fallback output
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
- Add demo observation editor or flip control
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

### 3:35-4:00: Freeze and Rehearse

All engineers:

- Run the exact five-minute script three times.
- Use a fresh spare PR for each real-merge rehearsal.
- Record a clean backup run.
- Verify the fallback merge button.
- Verify the prepared repair checkpoint.
- Stop editing product code after the second clean run.

## 15. Five-Minute Demo

1. **0:00-0:10:** Open FlightLab and click one demo booking.
2. **0:10-0:40:** Show the real bad-retry PR in Opssemble.
3. **0:40-1:15:** Show the generated Watch Plan, add the duplicate-side-effect requirement, and arm it.
4. **1:15-1:35:** Merge the PR in GitHub. Use `Simulate merge` only if the webhook does not arrive within five seconds.
5. **1:35-2:40:** Show three agents querying raw fixture observations and producing independent findings.
6. **2:40-3:10:** Show deterministic measurements, rejection, and generated report.
7. **3:10-4:10:** Start Codex repair; use the prepared checkpoint if necessary.
8. **4:10-4:40:** Rerun the unchanged contract against the repair profile.
9. **4:40-5:00:** Change duplicate payment intents from `2` to `1`, rerun measurement, and show the verdict flip.

Prepared answer to “is the data fake?”:

> The provider reads are deterministic fixtures so the demo does not depend on generating production traffic. The Watch Plan, agents, measurements, policy, report, and repair workflow are running normally. Changing one raw provider observation changes the verdict, which is why the outcome is derived rather than scripted.

## 16. Final Acceptance Gate

Do not present the full demo unless all are true:

- One mission survives browser refresh.
- Repeated merge events create one mission.
- Fixture files contain raw observations only.
- Baseline and candidate deltas are computed at runtime.
- Three agents complete concurrently or return explicit `unknown`.
- Policy rejects the failure profile.
- The same policy passes the repair profile.
- Simulated merge works.
- Actual merge has worked at least twice or is disabled.
- Prepared Codex repair works.
- A backup recording exists.
