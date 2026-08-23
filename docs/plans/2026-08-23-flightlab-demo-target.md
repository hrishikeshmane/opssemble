# FlightLab Fixture-Backed Demo Implementation Plan

> **For Codex:** Execute this plan task-by-task. Opssemble must behave like the real product. Only external data retrieval is replaced by deterministic fixture-backed provider adapters.

**Goal:** Build a minimal flight-booking victim app and three real GitHub PRs that demonstrate Opssemble's real planning, agent execution, release decision, reporting, Linear, and Codex repair workflows without requiring live CloudWatch, PostHog analytics, Stripe evidence, or AWS FIS data.

**Architecture:** FlightLab is a small Next.js app deployed on Vercel with static application data. Its repository contains provider-shaped observations whose timestamps are relative to the real PR merge time. Opssemble runs its normal mission engine and agents, but dependency injection selects fixture-backed read adapters instead of remote provider clients.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, GitHub, Vercel, Greptile, OpenAI Codex, JSON/NDJSON fixtures, Vitest, and Playwright.

---

## 1. Non-Negotiable Demo Boundary

Opssemble itself is not mocked.

### Real Product Behavior

The following must execute through normal product code:

- GitHub repository connection and PR import
- PR diff and repository analysis
- Greptile knowledge retrieval
- Watch Plan generation
- Custom monitoring prompt compilation
- Risk scoring and agent selection
- Watch Plan versioning and arming
- Actual GitHub PR merge
- GitHub webhook handling and mission creation
- Agent scheduling and state transitions
- Agent reasoning over returned observations
- Threshold evaluation
- Policy decision
- Report and postmortem generation
- Linear issue creation when configured
- Human approval
- Codex code modification and regression test
- Repair branch and GitHub PR creation
- Revalidation using the original Watch Plan

### Mocked Boundary

Only these provider read calls use local or GitHub-hosted files:

| Real-life provider call | Hackathon implementation |
|---|---|
| Query CloudWatch metrics | Read `cloudwatch/metrics.ndjson` |
| Query CloudWatch logs | Read `cloudwatch/logs.ndjson` |
| Query PostHog events or funnels | Read `posthog/events.ndjson` |
| List Stripe payment intents | Read `stripe/payment-intents.ndjson` |
| Read AWS FIS experiment state | Read `fis/experiments.ndjson` |

Vercel deployment, GitHub events, Greptile, Codex, and outgoing actions should remain live when practical.

### Fixtures Must Never Contain

- A generated Watch Plan
- Agent selection
- Agent status
- Agent findings or summaries
- PASS, FAIL, or UNKNOWN verdicts
- Policy decisions
- A generated report or postmortem
- Linear issue content
- A proposed code fix
- Mission UI events

Fixtures contain external observations only. Opssemble must derive everything else.

## 2. Minimal FlightLab Victim App

Create a sibling repository:

```text
/Users/ihrishi/personal/
  opssemble/
  flightlab/
```

FlightLab supports one usable journey:

```text
Search SFO -> JFK
  -> select a flight
  -> enter traveler details
  -> confirm a demo payment
  -> receive a booking reference
```

### Routes

| Route | Purpose |
|---|---|
| `/` | Search form and six static flight results |
| `/checkout/[flightId]` | Traveler form, fare summary, and seat-bundle slot |
| `/booking/[bookingId]` | Confirmation page |

No authentication, database, real airline API, or persistence is required.

### Static Flight Data

Use six records:

```ts
export const flights = [
  {
    id: "FL-204",
    origin: "SFO",
    destination: "JFK",
    departureAt: "2026-09-04T08:10:00-07:00",
    arrivalAt: "2026-09-04T16:41:00-04:00",
    stops: 0,
    fareCents: 42800,
  },
  // Five more records.
]
```

Create deterministic booking references:

```ts
export function createBookingReference(
  flightId: string,
  travelerEmail: string,
): string {
  // Stable hash of flightId and normalized email.
}
```

### Visual Scope

- Open directly into flight search.
- Use a compact booking layout rather than a landing page.
- Show routes, departure times, stops, duration, and fare.
- Label the checkout action `Complete demo booking`.
- Keep the flow keyboard accessible.
- Do not use real airline branding.

## 3. FlightLab Repository

```text
flightlab/
  app/
    page.tsx
    checkout/[flightId]/page.tsx
    booking/[bookingId]/page.tsx
  components/
    search-form.tsx
    flight-card.tsx
    traveler-form.tsx
    fare-summary.tsx
    seat-bundle-offer.tsx
    flexible-date-strip.tsx
  data/
    flights.ts
  lib/
    search.ts
    booking.ts
    seat-scoring.ts
  demo-data/
    README.md
    schema/
      scenario.schema.json
      observation.schema.json
    scenarios/
      smart-seat-bundles/
        manifest.json
        cloudwatch/
          metrics.ndjson
          logs.ndjson
        posthog/
          events.ndjson
      flexible-date-search/
        manifest.json
        cloudwatch/
          metrics.ndjson
          logs.ndjson
        posthog/
          events.ndjson
      booking-timeout-retry/
        manifest.json
        cloudwatch/
          metrics.ndjson
          logs.ndjson
        posthog/
          events.ndjson
        stripe/
          payment-intents.ndjson
        fis/
          experiments.ndjson
        repair/
          cloudwatch/
            metrics.ndjson
            logs.ndjson
          posthog/
            events.ndjson
          stripe/
            payment-intents.ndjson
          fis/
            experiments.ndjson
  docs/
    ARCHITECTURE.md
    RUNBOOK.md
    PRODUCT_METRICS.md
    INCIDENT-001-duplicate-booking.md
  .opssemble/
    demo.yaml
  tests/
    booking.test.ts
    search.test.ts
    demo-data.test.ts
  package.json
  README.md
```

There is deliberately no `timeline.ndjson` containing mission states. Timing belongs on individual provider observations.

## 4. Fixture Data Contract

### Scenario Manifest

Each scenario maps a real branch to fixture-backed provider reads:

```json
{
  "schemaVersion": 1,
  "scenarioId": "booking-timeout-retry",
  "match": {
    "headBranch": "feat/booking-timeout-retry"
  },
  "anchor": {
    "type": "github_pull_request_merged"
  },
  "observationWindowMs": 45000,
  "providers": {
    "cloudwatch": "fixture",
    "posthog": "fixture",
    "stripe": "fixture",
    "fis": "fixture",
    "vercel": "live"
  }
}
```

Match by branch or scenario ID, not hard-coded PR number.

### Observation Envelope

Every NDJSON line represents one external observation:

```json
{
  "availableAfterMs": 18000,
  "provider": "cloudwatch",
  "kind": "metric",
  "source": "AWS/FlightLab",
  "name": "BookingLatencyP99",
  "dimensions": {
    "route": "/api/book",
    "releaseSha": "{{HEAD_SHA}}"
  },
  "value": 2280,
  "unit": "Milliseconds"
}
```

Supported placeholders:

```text
{{OWNER}}
{{REPOSITORY}}
{{PR_NUMBER}}
{{HEAD_SHA}}
{{MERGED_AT}}
{{MISSION_ID}}
```

### Merge-Relative Availability

The actual GitHub `merged_at` value is `T0`.

When an agent queries a provider:

```text
elapsed = current time - T0
visible observations = records where availableAfterMs <= elapsed
```

The fixture adapter must then apply the agent's requested:

- Time range
- Metric or event name
- Dimensions
- Release SHA
- Route
- Operation ID
- Feature-flag variant

This makes the data appear gradually while preserving normal provider-query behavior.

### No Scripted Mission Outcome

The observation window ends after the configured duration, but that does not complete the mission automatically.

The real mission engine decides completion based on:

- Required agents reaching a terminal state
- Agent observation windows ending
- Required evidence being present or missing
- Policy evaluation completing

The same fixture data may produce a different explanation if agent logic changes. That is acceptable and proves the product is actually running.

### Planner Isolation

Before merge:

- The planner may read code, diffs, docs, and `.opssemble/demo.yaml`.
- The planner may know which provider capabilities exist.
- The planner must not read provider fixture values.

After mission creation:

- Only provider adapters may load scenario observations.
- Agents receive observations through the normal tool interface.
- Agents cannot read observations whose `availableAfterMs` is in the future.

## 5. Provider Adapter Design

Opssemble should use the same interfaces for fixture and future live implementations.

```ts
export interface Observation {
  observedAt: string
  provider: string
  kind: string
  name: string
  attributes: Record<string, unknown>
  sourceMode: "live" | "fixture"
}

export interface ProviderQuery {
  startTime: string
  endTime: string
  names: string[]
  filters: Record<string, string>
}

export interface ObservationProvider {
  query(input: ProviderQuery): Promise<Observation[]>
}
```

Implement:

```text
FixtureCloudWatchProvider
FixturePostHogProvider
FixtureStripeProvider
FixtureFisProvider
```

Keep these live:

```text
GitHubProvider
GreptileProvider
CodexProvider
VercelProvider
LinearAction
PostHogFlagAction
```

`LinearAction` and `PostHogFlagAction` may be disabled when credentials are unavailable. Do not fabricate a successful external action. Show `Not configured` and keep the primary PR #3 demo usable.

### Provider Registry

```ts
const provider = providerRegistry.resolve({
  provider: "cloudwatch",
  source: repositoryConfig.dataSources.cloudwatch,
})
```

Agents must not contain fixture-specific branches. They ask the registry for a provider and operate on returned observations exactly as they would in production.

### Source Labeling

Every observation card shows:

```text
Source: CloudWatch
Data mode: Fixture
Window: T+10s to T+30s
```

This label describes the data source only. The mission, agents, analysis, and verdict remain real.

## 6. Real End-to-End Product Flow

The primary demo must execute this sequence:

1. User connects the real FlightLab GitHub repository.
2. Opssemble imports the real PRs.
3. The planner reads the real diff and Greptile context.
4. Opssemble generates a real Watch Plan.
5. User adds a custom monitoring requirement.
6. Opssemble compiles it into structured clauses.
7. User arms the Watch Plan.
8. Presenter opens GitHub and merges PR #3.
9. A real GitHub webhook reaches Opssemble.
10. The real merged SHA and timestamp create one mission.
11. The real Vercel deployment is linked to the mission.
12. Real agents are scheduled.
13. Agents query their normal provider tools.
14. Fixture providers return only currently available observations.
15. Agents produce their own findings and verdicts.
16. The real policy engine combines required-agent results.
17. Opssemble generates the report and postmortem.
18. Opssemble creates a real Linear issue when configured.
19. User approves `Repair with Codex`.
20. Codex changes real FlightLab code and adds a real regression test.
21. Codex opens a real repair PR.
22. The same Watch Plan runs against the repair commit.
23. Fixture adapters select the repair observation profile.
24. Agents independently conclude that the repair passes.

No fixture file dictates steps 3 through 7 or steps 12 through 24.

## 7. PR Portfolio

## PR #1: Smart Seat Bundles

### Git State

```text
Branch: feat/smart-seat-bundles
Demo start: merged
Trigger: PostHog feature dial-up
Expected product behavior: detect degradation and restore prior rollout
```

### Real Code Diff

Add:

- `components/seat-bundle-offer.tsx`
- `lib/seat-scoring.ts`
- Checkout integration

Use a sequential scoring loop over static seat options. The diff gives the planner a real reason to select Performance and Product Health monitoring.

### Fixture Observations

```text
T+8s   PostHog seat_bundle_viewed events increase
T+15s  CloudWatch checkout p95 is 1,280ms
T+22s  PostHog checkout completion is 59% versus 72% baseline
T+32s  CloudWatch checkout p95 remains above threshold
T+42s  Recovery profile shows checkout p95 back near baseline
```

The files do not say the feature failed. Performance and Product Health agents must compare values to the real Watch Plan thresholds.

### Expected Watch Plan

```yaml
trigger:
  type: feature_flag_dial_up
  flag: smart-seat-bundles
  from: 10
  to: 50

agents:
  impact: required
  performance: required
  product_health: required
  resilience: skipped
  security: skipped

thresholds:
  checkout_p95_ms:
    max: 800
  checkout_completion_relative_drop:
    max_percent: 8

on_failure:
  restore_previous_rollout: true
```

Use a real PostHog flag mutation when configured. The downstream PostHog and CloudWatch reads remain fixture-backed.

## PR #2: Flexible-Date Search

### Git State

```text
Branch: feat/flexible-date-search
Demo start: open
Trigger: merge and Vercel deployment
Expected product behavior: pass as the healthy control
```

### Real Code Diff

Add:

- `components/flexible-date-strip.tsx`
- Seven-day aggregation in `lib/search.ts`
- Search-page integration

Implement this feature correctly.

### Fixture Observations

```text
T+8s   Search traffic begins
T+18s  Search p95 is 430ms
T+25s  Zero-result rate differs from baseline by 1.2%
T+32s  Flight-selection rate differs from baseline by 0.8%
```

Opssemble should select Impact, Performance, and Product Health. Resilience and Security should be skipped.

## PR #3: Booking Timeout Retry

### Git State

```text
Branch: feat/booking-timeout-retry
Demo start: open
Demo action: merge from the real GitHub PR page
Trigger: actual GitHub merge webhook
Expected product behavior: reject, report, repair, and revalidate
```

### Real Code Diff

Modify `lib/booking.ts`:

```ts
try {
  return await completeBooking(input)
} catch (error) {
  if (error instanceof TimeoutError) {
    return completeBooking(input)
  }
  throw error
}
```

This retries payment and reservation side effects without a stable idempotency key.

### Custom Monitoring Prompt

Enter during the demo:

```text
Make sure a timeout after the reservation is committed cannot create a
second reservation or payment. Keep booking p99 under 1.5 seconds and
stop if completion drops by more than 5%.
```

The real prompt compiler should produce:

```text
reservations_per_operation <= 1
payment_intents_per_operation <= 1
booking_p99_ms <= 1500
booking_completion_relative_drop <= 5%
```

### Failure Observations

```text
T+5s   FIS experiment state becomes running
T+12s  CloudWatch log: reservation committed for operation op-204
T+15s  CloudWatch log: provider response timed out
T+17s  CloudWatch log: caller retries operation op-204
T+19s  Stripe returns two payment intents for operation op-204
T+22s  CloudWatch logs contain two reservation IDs for operation op-204
T+26s  Booking p99 is 2,280ms
T+30s  PostHog booking completion is 11% below baseline
T+36s  FIS experiment state becomes completed
```

These are observations, not findings. The agents must correlate the shared operation ID and determine which clauses fail.

### Expected Agent Selection

```text
Impact:         required
Resilience:     required
Performance:    required
Product Health: required
Security:       skipped
```

### Real Codex Repair

Codex should independently determine a fix equivalent to:

1. Generate one stable `bookingOperationId`.
2. Reuse it across retries.
3. Use it as the payment idempotency key.
4. Make reservation creation idempotent by operation ID.
5. Retry only the response boundary.
6. Add a commit-then-timeout regression test.
7. Open a repair PR.

### Repair Observations

The repair profile contains:

```text
one payment intent for operation op-204
one reservation ID for operation op-204
booking p99 of 920ms
booking completion within 2% of baseline
completed FIS experiment
```

The repair fixture does not contain `PASS`. The rerun agents must reach that result.

## 8. Expected Opssemble Behavior

### Repository Import

1. Import open and recently merged FlightLab PRs.
2. Display title, number, author, branch, head SHA, merge state, risk, and Watch Plan state.
3. Detect `.opssemble/demo.yaml`.
4. Display `Fixture data configured` in repository settings.
5. Do not load provider observations during planning.

### Watch Plan Generation

For each new head SHA:

1. Read the real diff.
2. Query Greptile for affected code, architecture, runbooks, and incidents.
3. Identify impacted journeys and dependencies.
4. Select agents with a reason for every selection and skip.
5. Generate signals, thresholds, windows, and stop conditions.
6. Compile custom text into structured clauses.
7. Require explicit arming.

Expected states:

```text
Analyzing
Needs input
Ready
Armed
Superseded
```

A new commit supersedes the old Watch Plan version.

### Actual Merge Trigger

```text
presenter clicks Merge pull request in GitHub
  -> GitHub sends pull_request.closed with merged=true
  -> Opssemble validates installation and signature
  -> Opssemble records PR number, head SHA, merge SHA, actor, and merged_at
  -> Opssemble creates one normal release mission
  -> provider registry selects fixture read adapters from repository config
  -> real agents begin
```

Duplicate webhooks must create one mission.

### Agent Execution

Agents use their normal lifecycle:

```text
queued
running
waiting_for_evidence
succeeded
failed
skipped
```

Each agent:

1. Reads its Watch Plan assignment.
2. Constructs provider queries.
3. Polls through the standard tool interface.
4. Receives observations available at that time.
5. Correlates observations.
6. Compares measurements with thresholds.
7. Produces its own verdict, explanation, and evidence references.

Missing required observations result in `UNKNOWN`, never an inferred pass.

### Policy

The real policy engine evaluates:

```text
Any required agent FAIL    -> FAIL
Any required agent UNKNOWN -> HOLD
All required agents PASS   -> PASS
```

The model may explain the policy output but cannot override it.

### Report, Postmortem, and Backlog

After failure, Opssemble generates from actual agent output:

- Executive summary
- Customer and business impact
- Timeline reconstructed from observations and agent activity
- Failed Watch Plan clauses
- Root-cause hypothesis
- Recommended mitigation
- Proposed follow-up work
- Linear issue title, description, evidence, and acceptance criteria

No report content is stored in FlightLab fixtures.

### Repair

1. User approves `Repair with Codex`.
2. Codex receives the repository, failed clauses, agent evidence, and acceptance criteria.
3. Codex changes real code and tests.
4. Codex opens a real GitHub PR.
5. Opssemble links it to the original mission.
6. The same Watch Plan and thresholds run against the repair commit.

## 9. `.opssemble/demo.yaml`

```yaml
version: 1

service:
  name: flightlab
  tier: 1

deployment:
  provider: vercel
  source: live

data_sources:
  cloudwatch: fixture
  posthog: fixture
  stripe: fixture
  fis: fixture

actions:
  posthog_flags: live_optional
  linear: live_optional

scenarios:
  - id: smart-seat-bundles
    branch: feat/smart-seat-bundles
    trigger: feature_flag_dial_up

  - id: flexible-date-search
    branch: feat/flexible-date-search
    trigger: github_pull_request_merged

  - id: booking-timeout-retry
    branch: feat/booking-timeout-retry
    trigger: github_pull_request_merged
```

The planner may read provider capabilities but not scenario observations.

## 10. Opssemble Implementation Shape

```text
opssemble/
  lib/
    providers/
      types.ts
      registry.ts
      fixture-loader.ts
      fixture-clock.ts
      fixture-cloudwatch.ts
      fixture-posthog.ts
      fixture-stripe.ts
      fixture-fis.ts
    integrations/
      github.ts
      vercel.ts
      greptile.ts
      linear.ts
      posthog-flags.ts
    missions/
      planner.ts
      runner.ts
      policy.ts
      report.ts
    agents/
      impact.ts
      resilience.ts
      performance.ts
      product-health.ts
  app/
    api/
      webhooks/
        github/route.ts
  components/
    missions/
      mission-timeline.tsx
      agent-status-rail.tsx
      observation-card.tsx
      policy-decision.tsx
  tests/
    providers/
      fixture-providers.test.ts
      fixture-clock.test.ts
    missions/
      runner.test.ts
      policy.test.ts
    agents/
      fixture-evidence.test.ts
```

Do not create a separate demo mission runner. Configure the normal mission runner with fixture providers.

Before implementing Next.js routes, read the installed guides under:

```text
node_modules/next/dist/docs/
```

## 11. Implementation Tasks

### Task 1: Build Minimal FlightLab

**Files:**

- Create: `flightlab/app/page.tsx`
- Create: `flightlab/app/checkout/[flightId]/page.tsx`
- Create: `flightlab/app/booking/[bookingId]/page.tsx`
- Create: `flightlab/data/flights.ts`
- Create: `flightlab/lib/search.ts`
- Create: `flightlab/lib/booking.ts`
- Test: `flightlab/tests/search.test.ts`
- Test: `flightlab/tests/booking.test.ts`

**Steps:**

1. Scaffold the Next.js app.
2. Add six static flights.
3. Add deterministic search and booking functions.
4. Build the three-page flow.
5. Run tests and production build.
6. Deploy to Vercel.
7. Commit: `feat: add FlightLab demo booking flow`.

### Task 2: Define Fixture Observation Schemas

**Files:**

- Create: `flightlab/demo-data/README.md`
- Create: `flightlab/demo-data/schema/scenario.schema.json`
- Create: `flightlab/demo-data/schema/observation.schema.json`
- Create: `flightlab/.opssemble/demo.yaml`
- Test: `flightlab/tests/demo-data.test.ts`

**Steps:**

1. Write a test that validates every manifest.
2. Write a test that validates every NDJSON observation.
3. Reject forbidden fields such as `verdict`, `agent`, and `policyDecision`.
4. Add branch-to-scenario mappings.
5. Document merge-relative timing.
6. Commit: `test: define fixture observation contract`.

### Task 3: Implement Fixture Provider Adapters

**Files:**

- Create: `lib/providers/types.ts`
- Create: `lib/providers/registry.ts`
- Create: `lib/providers/fixture-loader.ts`
- Create: `lib/providers/fixture-clock.ts`
- Create: `lib/providers/fixture-cloudwatch.ts`
- Create: `lib/providers/fixture-posthog.ts`
- Create: `lib/providers/fixture-stripe.ts`
- Create: `lib/providers/fixture-fis.ts`
- Test: `tests/providers/fixture-providers.test.ts`
- Test: `tests/providers/fixture-clock.test.ts`

**Steps:**

1. Test that future observations remain hidden.
2. Test filtering by metric, dimension, SHA, route, and operation ID.
3. Test placeholder replacement using actual mission metadata.
4. Implement the common provider interfaces.
5. Register fixture providers from `.opssemble/demo.yaml`.
6. Mark returned observations `sourceMode: fixture`.
7. Commit: `feat: add fixture-backed provider adapters`.

### Task 4: Wire Fixtures Into the Normal Mission Engine

**Files:**

- Modify: `lib/missions/runner.ts`
- Modify: `lib/missions/planner.ts`
- Modify: `lib/missions/policy.ts`
- Test: `tests/missions/runner.test.ts`
- Test: `tests/missions/policy.test.ts`

**Steps:**

1. Verify planning cannot access fixture observations.
2. Create a mission from a real GitHub merged event.
3. Resolve providers using repository configuration.
4. Run the real agents.
5. Let agents poll until their observation windows close.
6. Evaluate actual agent verdicts with the real policy engine.
7. Verify missing fixture data produces HOLD.
8. Commit: `feat: support fixture data in release missions`.

### Task 5: Build Mission UI

**Files:**

- Create: `components/missions/mission-timeline.tsx`
- Create: `components/missions/agent-status-rail.tsx`
- Create: `components/missions/observation-card.tsx`
- Create: `components/missions/policy-decision.tsx`
- Modify: the mission detail page

**Steps:**

1. Render actual agent status events.
2. Render observation cards as provider queries return data.
3. Label only those cards `Fixture data`.
4. Render agent-generated findings separately from provider observations.
5. Render the real policy output.
6. Add report, Linear, and Codex actions.
7. Commit: `feat: add release mission workspace`.

### Task 6: Create PR #1

**Files:**

- Create: `flightlab/components/seat-bundle-offer.tsx`
- Create: `flightlab/lib/seat-scoring.ts`
- Modify: `flightlab/app/checkout/[flightId]/page.tsx`
- Create: `flightlab/demo-data/scenarios/smart-seat-bundles/**`

**Steps:**

1. Create `feat/smart-seat-bundles`.
2. Implement the feature.
3. Add only provider observations.
4. Open and merge the PR.
5. Verify Opssemble generates its Watch Plan without reading observations.
6. Verify agents derive the degradation from provider queries.

### Task 7: Create PR #2

**Files:**

- Create: `flightlab/components/flexible-date-strip.tsx`
- Modify: `flightlab/lib/search.ts`
- Modify: `flightlab/app/page.tsx`
- Create: `flightlab/demo-data/scenarios/flexible-date-search/**`

**Steps:**

1. Create `feat/flexible-date-search`.
2. Implement the healthy feature.
3. Add healthy provider observations.
4. Open the PR and leave it open.
5. Verify selective agent routing.

### Task 8: Create PR #3

**Files:**

- Modify: `flightlab/lib/booking.ts`
- Create: `flightlab/demo-data/scenarios/booking-timeout-retry/**`
- Create: `flightlab/docs/INCIDENT-001-duplicate-booking.md`
- Create: `flightlab/docs/RUNBOOK.md`

**Steps:**

1. Create `feat/booking-timeout-retry`.
2. Add the unsafe retry.
3. Keep ordinary tests green.
4. Add failure and repair observation profiles.
5. Open the PR and leave it open.
6. Verify Greptile provides the runbook and incident context.
7. Enter and compile the custom prompt.
8. Arm the Watch Plan.

### Task 9: Rehearse the Real Workflow

1. Open PR #3 in GitHub.
2. Click `Merge pull request`.
3. Verify the real webhook creates exactly one mission.
4. Verify the real Vercel deployment is linked.
5. Observe agents polling fixture-backed providers.
6. Confirm agents independently fail the expected clauses.
7. Confirm the policy rejects the candidate.
8. Generate the report and postmortem.
9. Create the Linear issue when configured.
10. Approve `Repair with Codex`.
11. Verify Codex changes code and adds a failing-then-passing regression test.
12. Verify Codex opens a real repair PR.
13. Run the same Watch Plan against repair observations.
14. Confirm agents independently pass.

## 12. Required Tests

From FlightLab:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

From Opssemble:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

Critical tests:

```text
fixtures reject agent or verdict fields
planner cannot read fixture observations
future observations remain hidden
provider queries apply real filters
actual merge metadata anchors observation time
duplicate GitHub webhooks create one mission
agents run through normal execution paths
missing observations yield UNKNOWN
policy consumes actual agent verdicts
report is generated from agent results
repair rerun retains original thresholds
```

## 13. Five-Minute Demo

1. **0:00-0:30:** Complete a booking in the real FlightLab Vercel app.
2. **0:30-1:05:** Show the three real imported GitHub PRs and generated Watch Plans.
3. **1:05-1:35:** Open PR #3, enter the custom monitoring prompt, and arm the plan.
4. **1:35-1:55:** Switch to GitHub and actually merge PR #3.
5. **1:55-2:15:** Show the real webhook, mission, and linked Vercel deployment.
6. **2:15-3:10:** Watch real agents query fixture-backed providers and derive findings.
7. **3:10-3:35:** Show the real policy decision, report, postmortem, and Linear action.
8. **3:35-4:20:** Approve Codex and show the real code and regression-test repair.
9. **4:20-5:00:** Run the unchanged Watch Plan against repair observations and finish green.

Optional dial-up demo:

1. Open merged PR #1.
2. Change the real PostHog flag from 10% to 50% when configured.
3. Let agents query fixture-backed PostHog and CloudWatch data.
4. Allow the real policy workflow to restore the prior flag value.

## 14. Acceptance Criteria

### FlightLab

- The three-page booking journey works on Vercel.
- It uses static application data.
- GitHub contains three real PRs with meaningful diffs.
- Provider observations are valid and merge-relative.
- Fixture files contain no agent or policy output.

### Opssemble

- Repository import, analysis, Watch Plans, agents, and policy are real.
- The primary demo includes an actual GitHub merge.
- A normal mission is created from the real webhook.
- Agents use standard provider interfaces.
- Only provider reads are fixture-backed.
- Findings and verdicts are generated at runtime.
- Reports and postmortems are generated at runtime.
- Linear and PostHog actions are real when configured.
- Codex creates a real code repair and GitHub PR.
- Revalidation uses the original Watch Plan.

### Reliability

- No CloudWatch, PostHog analytics, Stripe evidence, or FIS credentials are required.
- The primary PR #3 flow does not depend on optional PostHog or Linear credentials.
- The same observations appear deterministically at the same merge-relative offsets.
- Missing fixture data fails safely as UNKNOWN.

## 15. Non-Goals

- Live CloudWatch or FIS integration
- Real production traffic
- Real payment processing
- Scripted agent verdicts
- Scripted policy decisions
- Prewritten incident reports
- A complete travel product
- A generic fixture-authoring platform

## 16. Final Invariant

```text
REAL OPSSEMBLE
GitHub PR and merge
  -> planning
  -> Watch Plan
  -> mission creation
  -> agent execution

MOCKED DATA PULLING ONLY
  -> CloudWatch observations
  -> PostHog observations
  -> Stripe observations
  -> FIS observations

REAL OPSSEMBLE
  -> agent findings
  -> policy decision
  -> report and postmortem
  -> Linear action
  -> Codex repair
  -> repair PR
  -> revalidation
```

If changing a fixture can directly set an agent verdict, policy result, report, or repair, the boundary is wrong.
