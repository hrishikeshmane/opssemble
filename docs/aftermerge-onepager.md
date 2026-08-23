# Opssemble

> **Product vision, not the hackathon execution plan.** The canonical four-hour,
> three-engineer scope is
> [`docs/plans/2026-08-23-three-engineer-hackathon-critical-path.md`](./plans/2026-08-23-three-engineer-hackathon-critical-path.md).
> This document intentionally describes the broader production direction,
> including integrations that are out of scope for the judged build.

**Autonomous release operations for teams shipping at agent speed.**

**Greptile deploys a swarm to review your code. Opssemble assembles a swarm to prove each release is safe to operate.**

## Problem

AI agents have dramatically reduced the cost of writing and reviewing software. But autonomy largely stops at merge.

The change still has to move through environments, deployment waves, and regions. It meets real traffic, degraded dependencies, capacity limits, malformed responses, and business workflows that tests cannot fully reproduce. Pre-merge validation is a rehearsal. The final question remains: **does this exact change survive real operating conditions without harming customers?**

Today, responsibility fragments across CI/CD, observability, security, SRE, product analytics, incident management, and ticket backlogs. Each tool sees one part of the system. Engineers still have to determine:

- What this change can affect.
- Which technical and product metrics matter.
- Which failure modes should be tested.
- Whether a canary should be promoted, held, or rejected.
- Which change caused a regression.
- How to turn the evidence into a fix and prevent a recurrence.

Most operational tooling is service-centric or incident-centric. Opssemble is **change-centric and event-triggered**: one system owns a merged change, deployment promotion, or feature-flag rollout until it is proven healthy, repaired, or rejected.

> **Merge is not the finish line.**

## Product

Every operational change creates a **Release Mission**: a durable contract describing what changed, what could break, how the change will be evaluated, and what evidence is required to continue.

```yaml
trigger: merge
change: checkout retry implementation
stages: [sandbox, canary, eu, north-america]

dependencies:
  - stripe
  - orders-table
  - fulfillment-queue

objectives:
  payment_success_rate: ">= 99%"
  duplicate_payment_attempts: 0
  checkout_p99: "<= 2s"
  recovery_time: "<= 60s"

decision:
  promote: all critical checks pass
  hold: any critical result is unknown
  reject: duplicate payment or sustained conversion decline
```

Opssemble builds a **Release Graph** that connects:

```text
commit or configuration -> code path -> service -> dependency -> endpoint
                        -> infrastructure -> metric -> customer journey -> region
```

The graph combines the diff, Greptile Knowledge Base, deployment topology, telemetry, product analytics, prior experiments, and historical reverts. An orchestrator selects the agents appropriate for the release risk. Agents return structured evidence, not just prose.

## Agent Swarm

| Agent | Responsibility |
|---|---|
| **Impact** | Maps the diff to services, dependencies, customer journeys, deployment stages, and historical reverts. |
| **Resilience** | Injects dependency latency, packet loss, lost responses, resource stress, and recovery scenarios with explicit hypotheses and stop conditions. |
| **Performance** | Runs the current production deployment and candidate Vercel deployment under identical traffic, then attributes p50, p99, throughput, saturation, and error-rate changes to the release. |
| **Product Health** | Measures signup, checkout, payment, and other business outcomes by release, candidate deployment, feature variant, experiment, and region. |
| **Security** | Runs targeted authorization, dependency, API, and penetration checks selected from the changed attack surface. |
| **Deployment** | Tracks release stages and recommends promote, hold, reject, or rollback from the combined evidence. |
| **Investigation and Repair** | Correlates the diff, experiments, logs, traces, and metrics, then dispatches a bounded repair task to Codex. |
| **Operations** | Produces the release report, postmortem, runbook updates, Greptile context, and Linear backlog. |

Not every agent runs for every change. A documentation edit may require no runtime experiment. A payment retry change should trigger Impact, Resilience, Performance, Product Health, and Deployment agents.

## How Decisions Work

The language model proposes hypotheses and actions; it does not directly authorize production changes.

- Every agent returns a verdict, confidence, measurements, and evidence links.
- Missing telemetry is `UNKNOWN`, never `PASS`.
- Conflicting critical verdicts hold the release.
- Destructive experiments require a defined target, blast radius, duration, stop condition, and recovery check.
- Rollback capability is verified before a fault experiment begins.
- A deterministic policy engine authorizes promote, hold, reject, repair, and rollback actions.
- Every observation, credential scope, command, decision, and human approval is recorded.

## End-to-End Lifecycle

1. **Change detected:** A merge, deployment promotion, or feature-flag rollout creates a Release Mission.
2. **Context assembled:** Opssemble reads the diff, Greptile Knowledge Base, prior reverts, infrastructure, telemetry, and product metrics.
3. **Plan generated:** Codex proposes risks, experiments, success criteria, stop conditions, and rollback thresholds.
4. **Pre-release rehearsal:** TREX or an isolated runtime executes targeted behavioral and security checks.
5. **Candidate ready:** Vercel produces an immutable deployment URL for the merged commit while the current production deployment remains the baseline.
6. **Runtime validation:** Signed fault controls, Modal load runners, Vercel runtime evidence, CloudWatch, Stripe, and PostHog provide evidence.
7. **Decision:** The policy engine promotes the Vercel candidate, holds it, rejects it, or restores a previous production deployment.
8. **Repair:** Codex receives a bounded task with the reproduction and evidence, then opens a fix PR with regression coverage.
9. **Revalidation:** The swarm reruns the Release Mission against the repaired change.
10. **Learning:** Opssemble stores the operational result and publishes validated recurring rules back into future review and backlog workflows.

For a feature-flag-only mission, candidate validation becomes baseline capture and an approved percentage change. The release record links the originating PR, flag configuration, and operational evidence into one timeline.

## Positioning

| Product category | Primary job |
|---|---|
| **Greptile / TREX** | Understand and validate code before merge. |
| **Preman** | Test, monitor, and repair API endpoints. |
| **Observability and incident tools** | Report service health and coordinate incidents. |
| **AWS FIS and load tools** | Execute infrastructure faults and traffic. |
| **Opssemble** | Coordinate specialist agents around a release, combine technical and business evidence, control deployment progression, and close the loop with repair and learning. |

Opssemble is not another dashboard and not a generic chaos runner. Its unit of ownership is the **release**, and its output is an evidence-backed operational decision.

## Hackathon Proof: `checkout-lab`

The hackathon demo uses a deliberately fragile mini-SaaS rather than a generic sample API. It supports signup, checkout, payment, order persistence, and fulfillment so one release can produce code, infrastructure, dependency, and business signals.

Two repositories keep the product separate from the system it evaluates:

```text
opssemble/
  dashboard/
  orchestrator/
  agents/
  integrations/
  evidence/

checkout-lab/
  app/
  app/api/checkout/
  app/api/experiments/faults/
  lib/payments/
  lib/posthog/
  worker/
  infrastructure/
  experiments/
```

### Demo Topology

```text
                    Vercel
          +-------------------------+
          |                         |
Current production URL       Candidate deployment URL
      (baseline)                  (new commit)
          |                         |
          +-----------+-------------+
                      |
             Next.js mini-SaaS
          storefront + API routes
                      |
          +-----------+------------+
          |                        |
   Stripe test mode         DynamoDB orders
                                   |
                              SQS queue
                                   |
                         Lambda fulfillment worker

PostHog <---- signup, checkout, payment, and order events
Vercel <---- request latency, errors, and runtime logs
CloudWatch <---- DynamoDB, SQS, Lambda, and business metrics
Modal/k6 ----> identical synthetic traffic to both URLs
```

`checkout-lab` is the Vercel application. For the demo, Vercel's production branch is `release`, while PRs merge into `main`. A merge to `main` therefore creates an immutable candidate deployment without replacing production. Opssemble treats the current production URL as the baseline and sends equivalent synthetic traffic to both URLs.

The candidate exposes signed, preview-only experiment controls for Stripe latency, lost responses, and bounded application failures. Production deployments reject these controls. Automated traffic uses a Vercel deployment-protection bypass secret rather than making previews public.

When the mission passes, Opssemble promotes the candidate deployment. When it fails, the current production deployment remains unchanged. If a regression is discovered after promotion, Opssemble can restore the previous Vercel production deployment.

AWS remains real downstream infrastructure: DynamoDB stores orders, SQS carries fulfillment work, Lambda processes it, and CloudWatch provides infrastructure evidence. Modal runs agent workloads and repeatable traffic generation; it is no longer the application-hosting fallback.

### Product Events

PostHog receives:

```text
signup_started
signup_completed
checkout_started
payment_attempted
payment_succeeded
order_confirmed
```

Every event includes:

```text
release_sha
variant
region
experiment_id
order_id
feature_flag
flag_variant
rollout_percentage
vercel_deployment_id
deployment_url
```

The demo reports **synthetic checkout completion** and duplicate payment attempts. Stripe test mode supplies real payment API behavior, but it is not presented as real customer conversion data.

### Greptile Knowledge Base Setup

`checkout-lab` includes:

- `ARCHITECTURE.md` describing the payment and fulfillment path.
- `RUNBOOK.md` documenting expected timeout, retry, idempotency, and recovery behavior.
- A previous commit that introduced a broken payment retry and was reverted.
- Clear ownership boundaries between checkout, payment adapter, persistence, and fulfillment.

Greptile supplies code memory: how the service works and what was reverted. Claude-Mem supplies operational memory: previous baselines, experiments, verdicts, and effective repairs. Opssemble combines them when planning the next Release Mission.

## Demo A: Merge and Failure Injection

The demo PR modifies checkout retry behavior:

```text
- removes the Stripe idempotency key
- retries after a timeout
- has no overall request deadline
```

The candidate deployment allows the first Stripe request to complete but delays or loses the response before returning to the client. The candidate retries without a stable idempotency key and creates a duplicate payment attempt.

The swarm should produce one correlated result:

```text
Impact:       Stripe, orders, fulfillment, and checkout journey affected
Resilience:   FAILED - lost response caused an unsafe retry
Performance:  FAILED - checkout p99 exceeded the release objective
Product:      FAILED - synthetic checkout completion declined
Decision:     REJECT CANDIDATE
Root cause:   unbounded retry without a stable idempotency key
```

The Operations agent creates a Linear issue containing the reproduction, graphs, affected components, and acceptance criteria. Codex adds a request deadline, bounded retry behavior, a stable idempotency key, and regression coverage. Vercel creates a new candidate from the fix PR, the swarm reruns the same Release Mission, and Opssemble promotes it only after the verdict turns green.

## Demo B: PostHog Feature Dial-Up Guard

A release does not end when its code reaches production. Teams continue changing exposure through feature flags, often without creating a new PR or deployment. Opssemble treats a rollout-percentage change as another Release Mission.

The checkout service contains a PostHog flag:

```text
smart-payment-retry-v2
```

The control path performs one bounded payment attempt. The flagged path contains the new retry implementation. At 10% exposure, the additional load and failures remain below aggregate alert thresholds. Increasing exposure to 50% amplifies Stripe calls, increases Vercel function latency, and reduces synthetic checkout completion.

### Dial-Up Contract

```yaml
trigger:
  type: posthog_feature_flag_rollout
  flag: smart-payment-retry-v2
  previous_percentage: 10
  requested_percentage: 50

evaluation:
  baseline_window: 5m
  observation_window: 30s
  minimum_checkout_samples: 200
  consecutive_failed_windows: 2

guardrails:
  checkout_completion_delta: ">= -3 percentage points"
  payment_success_delta: ">= -1 percentage point"
  checkout_p99_delta: "<= 20%"
  duplicate_payment_attempts: 0

action:
  pass: keep at 50%
  fail: return to 10%
  unknown: restore the previous configuration and require review
```

### Dial-Up Flow

1. Opssemble snapshots the complete PostHog flag configuration and its last known-safe percentage.
2. The operator requests a rollout from 10% to 50%, or Opssemble performs the approved change through PostHog.
3. Stable synthetic users generate checkout traffic so cohort assignment remains consistent.
4. Product Health compares the control and flagged funnels by variant, release, and region.
5. Performance correlates PostHog funnel degradation with Vercel request latency, Stripe call volume, and CloudWatch fulfillment metrics.
6. The policy engine waits for the minimum sample count and two failed observation windows.
7. Opssemble returns the flag to 10%, then verifies that technical and product metrics recover.
8. Operations creates a Linear issue and release report. Codex receives the flag definition, changed code path, reproduction, graphs, and acceptance criteria.
9. After the fix, Opssemble repeats the 10% -> 50% dial-up and permits progression to 100% only after the Release Mission passes.

The visible result should be:

```text
Feature flag:  smart-payment-retry-v2
Rollout:       10% -> 50% -> 10%
Product:       FAILED - checkout completion fell 8.6 percentage points
Performance:   FAILED - checkout API p99 increased 47%
Decision:      RETURN TO LAST SAFE PERCENTAGE
Recovery:      PASSED - metrics returned to baseline
Next action:   Linear issue created; Codex repair dispatched
```

For the hackathon, Opssemble should initiate the flag change so it always knows the previous configuration and can safely restore it. Detecting feature-flag changes made directly in PostHog through activity-log webhooks is a production extension, not a demo dependency.

This scenario is the preferred add-on after Demo A works. It reuses the same application, traffic generator, PostHog events, dashboard, policy engine, Linear integration, and Codex repair loop. It can also replace the live infrastructure-fault path while preserving the broader post-merge story.

### Two-Minute Dial-Up Sequence

1. **0:00-0:20 - Establish the baseline.** Show the flag at 10%, healthy technical metrics, and a stable checkout funnel.
2. **0:20-0:30 - Request the dial-up.** Increase `smart-payment-retry-v2` from 10% to 50%. Opssemble displays the captured configuration, guardrails, and rollback target.
3. **0:30-1:30 - Detect the regression.** Two 30-second evaluation windows show the flagged cohort losing checkout completions while Performance correlates the decline with retry amplification and Vercel request latency.
4. **1:30-1:45 - Protect customers.** Opssemble restores 10% exposure and marks the rollout failed.
5. **1:45-2:00 - Close the loop.** The release report explains the causal chain, Linear receives the backlog item, and Codex receives the repair task. Recovery verification continues on the release timeline.

## Five-Minute Primary Demo

1. **0:00-0:30 - Establish the gap.** "Everyone here validates code before merge. Watch what happens after." Show Greptile/TREX on the left and Opssemble on the post-merge lifecycle.
2. **0:30-1:15 - Merge the flawed PR.** Vercel creates the candidate deployment and Opssemble creates the Release Mission. Greptile context raises scrutiny because the payment path has a prior reverted retry change.
3. **1:15-2:30 - Run the swarm.** Current production and the candidate receive identical traffic. Inject Stripe latency and a lost response into the candidate. The retry storm and p99 divergence appear live.
4. **2:30-3:30 - Show synthesis.** Lead with the customer outcome, then the technical cause. The policy engine rejects the candidate, leaves production unchanged, and creates a Linear issue with evidence.
5. **3:30-4:30 - Repair with Codex.** Codex adds the deadline, bounded retry, idempotency, and tests. The fix PR produces a new Vercel candidate.
6. **4:30-5:00 - Revalidate and promote.** Rerun the mission, show green verdicts, promote the candidate, and warm-boot from the prior operational record. Close with: **"Merge is not the finish line."**

## Hackathon Scope

### Must Have

- `checkout-lab` with one deterministic payment failure.
- Merge webhook or reliable manual merge trigger.
- Diff and Greptile-context intake.
- Release Mission generation.
- Current-production and Vercel-candidate traffic comparison.
- Resilience, Performance, and Product Health agent verdicts.
- A combined release report linked from the PR.
- Codex-generated fix and a rerun to green.

### Stretch, in Order

1. PostHog feature dial-up guard with automatic return to the last safe percentage.
2. Greptile Knowledge Base and historical revert retrieval.
3. Linear backlog creation.
4. Claude-Mem warm boot and regression history.
5. AWS fault experiment against a downstream resource.
6. Security agent.
7. Greptile custom-context writeback.

### Explicitly Out

- General-purpose CI/CD replacement.
- Kubernetes and multi-cloud deployment support.
- Real production traffic or customer data.
- Multi-language support, authentication, billing, and multi-tenancy.
- Autonomous production fault injection without policy and human approval.

## Four-Hour Build Plan

- **Hour 1:** Team A builds and deploys the Vercel `checkout-lab` and Stripe flow. Team B builds the orchestrator and Release Mission. Team C wires Modal/k6, preview-only fault controls, CloudWatch, and PostHog. Team D builds the dashboard, PR output, and Codex repair prompt.
- **Hour 2:** Integrate merge -> Vercel deployment-ready event -> production/candidate URLs -> traffic -> evidence. Keep AWS downstream work outside the critical path.
- **Hour 3:** Complete the failure verdict and Codex fix loop. Add Linear only after the rerun turns green.
- **Hour 4:** Add the PostHog feature dial-up if the primary loop is green. Otherwise add Greptile/Claude-Mem depth, polish the synthesis view, run the demo three times, and record a backup screen capture.

**Fallback:** demonstrate Resilience + Performance + combined verdict linked to the PR. Keep the agent registry visible to communicate the platform without pretending unfinished agents are live.

## Before Doors Open

- Create and verify GitHub, Vercel, AWS, Stripe test, PostHog, Linear, Modal, and Claude-Mem accounts.
- Connect the GitHub repository to Vercel and verify preview deployments, deployment-ready events, promotion, and rollback.
- Configure an automation bypass secret for protected Vercel previews.
- Pre-provision the DynamoDB, SQS, Lambda, and CloudWatch downstream resources.
- Seed `checkout-lab` history with the reverted payment retry.
- Ask Greptile to enable Knowledge Base synthesis for the demo repository.
- Confirm TREX access and keep it outside the critical demo path.
- Claim Codex credits in a personal ChatGPT workspace.
- Rehearse the exact bad commit, experiment, repair, and green rerun.

## Sponsor and Integration Map

- **OpenAI Codex:** primary coding agent for change analysis, hypothesis generation, investigation, implementation, tests, and repair PR.
- **AWS:** DynamoDB orders, SQS/Lambda fulfillment, CloudWatch evidence, and optional downstream fault experiments.
- **Stripe:** realistic payment dependency, idempotency behavior, and test-mode payment evidence.
- **Greptile:** Knowledge Base context, historical reverts, TREX rehearsal, and future-review context.
- **Modal:** isolated agent execution and repeatable synthetic traffic generation.
- **Claude-Mem:** searchable operational history and warm boot across missions.
- **PostHog:** feature-flag control, release-attributed synthetic funnels, and product-health metrics.
- **Linear:** evidence-backed remediation and follow-up backlog.
- **Vercel:** mini-SaaS hosting, immutable candidate deployments, runtime evidence, promotion, and rollback.

## Product Outcome

Opssemble turns a merged change, deployment promotion, or feature rollout into a managed operational mission:

```text
understand -> experiment -> observe -> decide -> repair -> revalidate -> learn
```

Coding agents build the change. Greptile reviews it. CI verifies it. **Opssemble operates it until the intended customer outcome is proven.**
