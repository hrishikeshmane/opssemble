/**
 * Mock data for the Opssemble UI. Everything on screen is derived from this
 * module so a single edit propagates to every surface. There is no network or
 * persistence layer -- this is a design mock.
 */

export type Status =
  | "ok"
  | "warn"
  | "fail"
  | "running"
  | "queued"
  | "idle"
  | "brand"

export type Risk = "low" | "medium" | "high"

export type PlanState =
  | "not-required"
  | "draft"
  | "needs-input"
  | "ready"
  | "armed"

export type Verdict = "pass" | "fail" | "running" | "queued" | "hold"

export type Selection = "required" | "proposed" | "excluded"

/* ------------------------------------------------------------------ repo --- */

export const repo = {
  org: "acme",
  name: "checkout-lab",
  slug: "acme/checkout-lab",
  defaultBranch: "main",
  syncedSecondsAgo: 8,
  productionDeployment: "dpl_7FT9",
  productionUrl: "checkout-lab.vercel.app",
} as const

/* --------------------------------------------------------------- changes --- */

export type ChangeFile = {
  path: string
  added: number
  removed: number
  language: string
  hunks: DiffHunk[]
}

export type DiffHunk = {
  header: string
  lines: DiffLine[]
}

export type DiffLine = {
  kind: "add" | "del" | "ctx" | "meta"
  oldNo: number | null
  newNo: number | null
  text: string
}

export type Change = {
  id: string
  number: number
  title: string
  branch: string
  baseBranch: string
  sha: string
  risk: Risk
  planState: PlanState
  contractVersion: number
  trigger: string
  agentSummary: string
  updated: string
  author: { name: string; handle: string; initials: string }
  filesChanged: number
  additions: number
  deletions: number
  body: string
  impact: { headline: string; detail: string }
  riskReasons: string[]
  sources: { label: string; detail: string }[]
  files: ChangeFile[]
}

const retryDiff: ChangeFile[] = [
  {
    path: "src/payments/stripe-client.ts",
    added: 46,
    removed: 18,
    language: "ts",
    hunks: [
      {
        header: "@@ -18,11 +18,26 @@ export class StripeClient",
        lines: [
          {
            kind: "ctx",
            oldNo: 18,
            newNo: 18,
            text: "  async createPaymentIntent(input: PaymentIntentInput) {",
          },
          {
            kind: "del",
            oldNo: 19,
            newNo: null,
            text: "    return this.http.post('/v1/payment_intents', input)",
          },
          {
            kind: "add",
            oldNo: null,
            newNo: 19,
            text: "    return this.withRetry(() =>",
          },
          {
            kind: "add",
            oldNo: null,
            newNo: 20,
            text: "      this.http.post('/v1/payment_intents', input)",
          },
          { kind: "add", oldNo: null, newNo: 21, text: "    )" },
          { kind: "ctx", oldNo: 20, newNo: 22, text: "  }" },
          { kind: "ctx", oldNo: 21, newNo: 23, text: "" },
          {
            kind: "add",
            oldNo: null,
            newNo: 24,
            text: "  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {",
          },
          {
            kind: "add",
            oldNo: null,
            newNo: 25,
            text: "    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {",
          },
          {
            kind: "add",
            oldNo: null,
            newNo: 26,
            text: "      try {",
          },
          {
            kind: "add",
            oldNo: null,
            newNo: 27,
            text: "        return await fn()",
          },
          {
            kind: "add",
            oldNo: null,
            newNo: 28,
            text: "      } catch (error) {",
          },
          {
            kind: "add",
            oldNo: null,
            newNo: 29,
            text: "        if (!isRetryable(error)) throw error",
          },
          {
            kind: "add",
            oldNo: null,
            newNo: 30,
            text: "        await sleep(backoff(attempt))",
          },
          { kind: "add", oldNo: null, newNo: 31, text: "      }" },
          { kind: "add", oldNo: null, newNo: 32, text: "    }" },
          {
            kind: "add",
            oldNo: null,
            newNo: 33,
            text: "    throw new PaymentRetryExhausted()",
          },
          { kind: "add", oldNo: null, newNo: 34, text: "  }" },
        ],
      },
    ],
  },
  {
    path: "src/payments/idempotency.ts",
    added: 31,
    removed: 4,
    language: "ts",
    hunks: [
      {
        header: "@@ -1,8 +1,12 @@",
        lines: [
          {
            kind: "del",
            oldNo: 1,
            newNo: null,
            text: "export function idempotencyKey() {",
          },
          {
            kind: "del",
            oldNo: 2,
            newNo: null,
            text: "  return crypto.randomUUID()",
          },
          {
            kind: "add",
            oldNo: null,
            newNo: 1,
            text: "export function idempotencyKey(attempt: number) {",
          },
          {
            kind: "add",
            oldNo: null,
            newNo: 2,
            text: "  // NOTE: regenerated per attempt",
          },
          {
            kind: "add",
            oldNo: null,
            newNo: 3,
            text: "  return `${crypto.randomUUID()}-${attempt}`",
          },
          { kind: "ctx", oldNo: 3, newNo: 4, text: "}" },
        ],
      },
    ],
  },
  {
    path: "src/checkout/route.ts",
    added: 22,
    removed: 9,
    language: "ts",
    hunks: [
      {
        header: "@@ -44,7 +44,9 @@ export async function POST(request: Request)",
        lines: [
          {
            kind: "ctx",
            oldNo: 44,
            newNo: 44,
            text: "  const flag = await flags.get('smart-payment-retry-v2')",
          },
          {
            kind: "del",
            oldNo: 45,
            newNo: null,
            text: "  const timeout = 3_000",
          },
          {
            kind: "add",
            oldNo: null,
            newNo: 45,
            text: "  const timeout = flag.enabled ? 12_000 : 3_000",
          },
          {
            kind: "ctx",
            oldNo: 46,
            newNo: 46,
            text: "  return charge({ ...payload, timeout })",
          },
        ],
      },
    ],
  },
  {
    path: "src/orders/fulfillment.ts",
    added: 11,
    removed: 6,
    language: "ts",
    hunks: [],
  },
  {
    path: "src/lib/backoff.ts",
    added: 8,
    removed: 0,
    language: "ts",
    hunks: [],
  },
  {
    path: "tests/payments/retry.test.ts",
    added: 0,
    removed: 5,
    language: "ts",
    hunks: [],
  },
  {
    path: "RUNBOOK.md",
    added: 0,
    removed: 0,
    language: "md",
    hunks: [],
  },
]

export const changes: Change[] = [
  {
    id: "184",
    number: 184,
    title: "Harden Stripe retry semantics",
    branch: "retry-safety",
    baseBranch: "main",
    sha: "a17c92e",
    risk: "high",
    planState: "draft",
    contractVersion: 2,
    trigger: "Candidate ready",
    agentSummary: "4 proposed",
    updated: "8s",
    author: { name: "Dana Whitfield", handle: "dwhitfield", initials: "DW" },
    filesChanged: 7,
    additions: 118,
    deletions: 42,
    body: "Adds bounded retries around the Stripe payment intent call and widens the checkout timeout when smart-payment-retry-v2 is enabled. Follows up on the reverted #121.",
    impact: {
      headline: "Checkout payment and fulfillment path",
      detail:
        "Stripe retry logic changed on the checkout hot path. Orders, fulfillment, and the smart-payment-retry-v2 flag are downstream.",
    },
    riskReasons: [
      "External payment side effect",
      "Retry and timeout behavior changed",
      "Feature flag controls exposure",
      "Previous retry change was reverted",
    ],
    sources: [
      { label: "GitHub diff", detail: "7 files · +118 / -42" },
      {
        label: "Greptile knowledge",
        detail: "ARCHITECTURE.md, RUNBOOK.md, reverted PR #121",
      },
    ],
    files: retryDiff,
  },
  {
    id: "183",
    number: 183,
    title: "Add tax-region fallback",
    branch: "tax-fallback",
    baseBranch: "main",
    sha: "b83dc11",
    risk: "medium",
    planState: "needs-input",
    contractVersion: 1,
    trigger: "Merge",
    agentSummary: "3 proposed",
    updated: "7m",
    author: { name: "Ravi Menon", handle: "rmenon", initials: "RM" },
    filesChanged: 4,
    additions: 63,
    deletions: 12,
    body: "Falls back to the account country when a tax region cannot be resolved from the shipping address.",
    impact: {
      headline: "Tax resolution and order totals",
      detail:
        "Tax region resolution changed. Order totals and invoice generation are downstream.",
    },
    riskReasons: [
      "Order total calculation changed",
      "No provider metric resolved for tax accuracy",
    ],
    sources: [{ label: "GitHub diff", detail: "4 files · +63 / -12" }],
    files: [],
  },
  {
    id: "181",
    number: 181,
    title: "Reduce checkout payload",
    branch: "smaller-payload",
    baseBranch: "main",
    sha: "820bc44",
    risk: "medium",
    planState: "armed",
    contractVersion: 1,
    trigger: "Candidate ready",
    agentSummary: "3 selected",
    updated: "32m",
    author: { name: "Ines Barros", handle: "ibarros", initials: "IB" },
    filesChanged: 9,
    additions: 41,
    deletions: 210,
    body: "Trims unused fields from the checkout bootstrap response.",
    impact: {
      headline: "Checkout bootstrap response",
      detail: "Payload shape changed. Client hydration is downstream.",
    },
    riskReasons: ["Response contract changed", "Hot path payload size changed"],
    sources: [{ label: "GitHub diff", detail: "9 files · +41 / -210" }],
    files: [],
  },
  {
    id: "179",
    number: 179,
    title: "Update receipt email copy",
    branch: "receipt-copy",
    baseBranch: "main",
    sha: "f012ad9",
    risk: "low",
    planState: "not-required",
    contractVersion: 0,
    trigger: "None",
    agentSummary: "0 selected",
    updated: "2h",
    author: { name: "Tom Alvarez", handle: "talvarez", initials: "TA" },
    filesChanged: 2,
    additions: 14,
    deletions: 14,
    body: "Copy-only change to the receipt email template.",
    impact: {
      headline: "Transactional email copy",
      detail: "No runtime behavior changed.",
    },
    riskReasons: ["Copy only", "No external side effect"],
    sources: [{ label: "GitHub diff", detail: "2 files · +14 / -14" }],
    files: [],
  },
]

export const changeStats = {
  open: 7,
  merged: 18,
  needsInput: 2,
  armed: 3,
  readyForTrigger: 3,
  needsDecision: 2,
}

export function getChange(id: string) {
  return changes.find((change) => change.id === id)
}

/* ---------------------------------------------------------------- agents --- */

export type AgentKey =
  | "impact"
  | "resilience"
  | "performance"
  | "product-health"
  | "repair"

export type Agent = {
  key: AgentKey
  name: string
  purpose: string
  selectedWhen: string
  tools: string[]
  health: Status
  runs: number
  medianDuration: string
}

export const agents: Agent[] = [
  {
    key: "impact",
    name: "Impact",
    purpose: "Maps changed code to dependencies and customer journeys",
    selectedWhen: "Every code-backed contract",
    tools: ["GitHub", "Greptile"],
    health: "ok",
    runs: 214,
    medianDuration: "38s",
  },
  {
    key: "resilience",
    name: "Resilience",
    purpose: "Proves recovery behavior under injected failure",
    selectedWhen: "External call, queue, retry, recovery",
    tools: ["Faults", "AWS FIS", "Modal"],
    health: "ok",
    runs: 96,
    medianDuration: "3m 04s",
  },
  {
    key: "performance",
    name: "Performance",
    purpose: "Compares candidate and baseline under equivalent load",
    selectedWhen: "Hot path or resource behavior",
    tools: ["k6", "Vercel", "AWS"],
    health: "ok",
    runs: 131,
    medianDuration: "5m 22s",
  },
  {
    key: "product-health",
    name: "Product Health",
    purpose: "Watches funnel and journey completion",
    selectedWhen: "Journey or flag exposure",
    tools: ["PostHog", "Stripe"],
    health: "ok",
    runs: 88,
    medianDuration: "6m 10s",
  },
  {
    key: "repair",
    name: "Repair",
    purpose: "Opens a bounded fix PR from reproducible failure evidence",
    selectedWhen: "Bounded reproducible failure",
    tools: ["Codex", "GitHub"],
    health: "ok",
    runs: 27,
    medianDuration: "8m 45s",
  },
]

/* ------------------------------------------------------------ watch plan --- */

export type PlanAgent = {
  key: AgentKey
  name: string
  selection: Selection
  reason: string
}

export type Signal = {
  id: string
  name: string
  provider: string
  threshold: string
  condition: string
  origin: "policy" | "inferred" | "requested"
}

export const watchPlan = {
  changeId: "184",
  contractVersion: 3,
  previousVersion: 2,
  trigger: "Vercel candidate ready after merge",
  triggerDetail: "Fires once per deployment for commit a17c92e",
  requirementDraft:
    "Also monitor EU checkout completion and duplicate Stripe attempts.",
  agents: [
    {
      key: "impact",
      name: "Impact",
      selection: "required",
      reason: "Maps changed code to dependencies and journeys",
    },
    {
      key: "resilience",
      name: "Resilience",
      selection: "required",
      reason: "Retry and external side effect changed",
    },
    {
      key: "performance",
      name: "Performance",
      selection: "proposed",
      reason: "Checkout hot path changed",
    },
    {
      key: "product-health",
      name: "Product Health",
      selection: "proposed",
      reason: "Flagged checkout journey affected",
    },
  ] satisfies PlanAgent[],
  existingSignals: [
    {
      id: "p99",
      name: "Checkout p99",
      provider: "Vercel",
      threshold: "<= 2s",
      condition: "Fail above 2s for 2 windows",
      origin: "policy",
    },
    {
      id: "success",
      name: "Payment success rate",
      provider: "Stripe",
      threshold: ">= 99%",
      condition: "Fail below 99% for 2 windows",
      origin: "policy",
    },
  ] satisfies Signal[],
  compiledSignals: [
    {
      id: "eu-completion",
      name: "EU checkout completion",
      provider: "PostHog",
      threshold: ">= -3pp",
      condition: "Fail below -3pp for 2 windows",
      origin: "requested",
    },
    {
      id: "dupes",
      name: "Duplicate payment attempts",
      provider: "Stripe",
      threshold: "= 0",
      condition: "Fail above 0",
      origin: "requested",
    },
  ] satisfies Signal[],
  compilation: {
    resolved: 2,
    unresolved: 0,
    coverage: "Policy coverage complete",
    onFailure:
      "Hold candidate, preserve production, and offer a bounded Codex repair.",
  },
} as const

/* -------------------------------------------------------------- missions --- */

export type MissionStageKey =
  | "context"
  | "plan"
  | "execute"
  | "evaluate"
  | "decision"

export type MissionStage = {
  key: MissionStageKey
  index: number
  label: string
  value: string
  status: Status
}

export type ToolCall = {
  id: string
  name: string
  status: "completed" | "running" | "queued" | "failed"
  duration: string
  summary: string
  input?: string
  output?: string
}

export type AgentRun = {
  key: AgentKey
  name: string
  verdict: Verdict
  headline: string
  detail: string
  latestTool?: string
  hypothesis?: string
  toolCalls: ToolCall[]
  observations: { label: string; value: string; status: Status }[]
}

export type Mission = {
  id: string
  changeId: string
  changeNumber: number
  title: string
  contractVersion: number
  candidate: string
  sha: string
  stage: string
  state: "running" | "hold" | "pass" | "fail"
  risk: Risk
  startedAgo: string
  elapsed: string
  updated: string
  agentsComplete: number
  agentsTotal: number
  hypothesis: string
  runs: AgentRun[]
}

export const missionStages: MissionStage[] = [
  { key: "context", index: 1, label: "Context", value: "Complete", status: "ok" },
  { key: "plan", index: 2, label: "Plan", value: "Contract v3", status: "ok" },
  {
    key: "execute",
    index: 3,
    label: "Execute",
    value: "Running",
    status: "running",
  },
  {
    key: "evaluate",
    index: 4,
    label: "Evaluate",
    value: "Pending",
    status: "idle",
  },
  {
    key: "decision",
    index: 5,
    label: "Decision",
    value: "Pending",
    status: "idle",
  },
]

export const missionRuns: AgentRun[] = [
  {
    key: "impact",
    name: "Impact agent",
    verdict: "pass",
    headline: "Mapped Stripe, orders, fulfillment, and EU flag exposure",
    detail:
      "Five downstream surfaces reached from the changed retry path. No unmapped external dependency.",
    hypothesis: "The change reaches the payment and fulfillment path.",
    toolCalls: [
      {
        id: "impact-1",
        name: "resolve_dependency_graph",
        status: "completed",
        duration: "11s",
        summary: "Walked imports from the changed files to service boundaries.",
        input: "{ entry: 'src/payments/stripe-client.ts', depth: 4 }",
        output: "5 downstream services · 1 feature flag",
      },
      {
        id: "impact-2",
        name: "query_greptile_context",
        status: "completed",
        duration: "9s",
        summary: "Read architecture notes and the payment runbook.",
        output: "ARCHITECTURE.md, RUNBOOK.md, PR #121 (reverted)",
      },
    ],
    observations: [
      { label: "Downstream services", value: "5", status: "idle" },
      { label: "Feature flags reached", value: "1", status: "warn" },
      { label: "Unmapped dependencies", value: "0", status: "ok" },
    ],
  },
  {
    key: "resilience",
    name: "Resilience agent",
    verdict: "running",
    headline: "Injecting a lost Stripe response with a 60s stop condition",
    detail:
      "Delays the first response after Stripe accepts the request, then watches for a duplicate attempt.",
    latestTool: "run_candidate_fault_profile · 24s",
    hypothesis: "A lost Stripe response causes a second payment attempt.",
    toolCalls: [
      {
        id: "res-1",
        name: "query_greptile_context",
        status: "completed",
        duration: "8s",
        summary: "Found a reverted retry change and payment runbook rules.",
        output: "PR #121 reverted · RUNBOOK.md §payments",
      },
      {
        id: "res-2",
        name: "verify_rollback_target",
        status: "completed",
        duration: "4s",
        summary: "Production deployment dpl_7FT9 remains healthy.",
        output: "healthy · 0 alarms",
      },
      {
        id: "res-3",
        name: "run_candidate_fault_profile",
        status: "running",
        duration: "24s",
        summary: "Delay the first response after Stripe accepts the request.",
        input: "{ profile: 'lost_response', target: 'dpl_8KL2', ceiling: '60s' }",
      },
    ],
    observations: [
      { label: "Payment attempts", value: "2", status: "fail" },
      { label: "Checkout p99", value: "3.64s", status: "fail" },
      { label: "Recovery", value: "Pending", status: "idle" },
    ],
  },
  {
    key: "performance",
    name: "Performance agent",
    verdict: "queued",
    headline: "Comparing baseline and candidate traffic windows",
    detail: "Waiting for equivalent load on both deployments.",
    toolCalls: [
      {
        id: "perf-1",
        name: "await_traffic_window",
        status: "queued",
        duration: "--",
        summary: "Needs 3 minutes of comparable traffic.",
      },
    ],
    observations: [
      { label: "Baseline p99", value: "1.84s", status: "ok" },
      { label: "Candidate p99", value: "--", status: "idle" },
    ],
  },
  {
    key: "product-health",
    name: "Product Health agent",
    verdict: "queued",
    headline: "Waiting for 200 EU synthetic checkout samples",
    detail: "PostHog funnel comparison starts once the sample floor is met.",
    toolCalls: [
      {
        id: "ph-1",
        name: "collect_synthetic_journeys",
        status: "queued",
        duration: "--",
        summary: "62 of 200 EU samples collected.",
      },
    ],
    observations: [
      { label: "Samples", value: "62 / 200", status: "idle" },
      { label: "EU completion", value: "--", status: "idle" },
    ],
  },
]

export const missionRunsComplete: AgentRun[] = [
  {
    ...missionRuns[0],
    verdict: "pass",
    headline: "Stripe, orders, fulfillment, and EU checkout affected",
  },
  {
    ...missionRuns[1],
    verdict: "fail",
    headline: "Lost response produced a second payment attempt",
    latestTool: undefined,
    toolCalls: [
      ...missionRuns[1].toolCalls.slice(0, 2),
      {
        id: "res-3",
        name: "run_candidate_fault_profile",
        status: "completed",
        duration: "1m 12s",
        summary: "Duplicate attempt observed 2.1s after the lost response.",
        output: "attempts=2 · first=succeeded · second=succeeded",
      },
      {
        id: "res-4",
        name: "correlate_stripe_attempts",
        status: "completed",
        duration: "6s",
        summary: "Two distinct idempotency keys for one checkout session.",
        output: "pi_3Q1a...  pi_3Q1b...",
      },
    ],
    observations: [
      { label: "Payment attempts", value: "2", status: "fail" },
      { label: "Checkout p99", value: "3.64s", status: "fail" },
      { label: "Recovery", value: "4m 12s", status: "fail" },
    ],
  },
  {
    ...missionRuns[2],
    verdict: "fail",
    headline: "Candidate latency diverged under equivalent load",
    observations: [
      { label: "Baseline p99", value: "1.84s", status: "ok" },
      { label: "Candidate p99", value: "3.35s", status: "fail" },
      { label: "Delta", value: "+82%", status: "fail" },
    ],
  },
  {
    ...missionRuns[3],
    verdict: "fail",
    headline: "EU synthetic checkout completion fell 8.6 points",
    observations: [
      { label: "Samples", value: "200 / 200", status: "ok" },
      { label: "EU completion", value: "-8.6pp", status: "fail" },
    ],
  },
]

export const missions: Mission[] = [
  {
    id: "m-184-candidate",
    changeId: "184",
    changeNumber: 184,
    title: "Harden Stripe retry semantics",
    contractVersion: 3,
    candidate: "dpl_8KL2",
    sha: "a17c92e",
    stage: "Candidate",
    state: "running",
    risk: "high",
    startedAgo: "1m ago",
    elapsed: "1m 18s",
    updated: "8s",
    agentsComplete: 2,
    agentsTotal: 4,
    hypothesis: "Lost responses cause an unsafe payment retry",
    runs: missionRuns,
  },
  {
    id: "m-flag-dialup",
    changeId: "184",
    changeNumber: 184,
    title: "smart-payment-retry-v2",
    contractVersion: 3,
    candidate: "flag 10% -> 50%",
    sha: "a17c92e",
    stage: "Production",
    state: "hold",
    risk: "high",
    startedAgo: "1m ago",
    elapsed: "12m 04s",
    updated: "1m",
    agentsComplete: 4,
    agentsTotal: 4,
    hypothesis: "Increased exposure amplifies the duplicate attempt defect",
    runs: missionRunsComplete,
  },
  {
    id: "m-181-release",
    changeId: "181",
    changeNumber: 181,
    title: "Reduce checkout payload",
    contractVersion: 1,
    candidate: "820bc44",
    sha: "820bc44",
    stage: "NA 100%",
    state: "pass",
    risk: "medium",
    startedAgo: "2h ago",
    elapsed: "7m 41s",
    updated: "2h",
    agentsComplete: 3,
    agentsTotal: 3,
    hypothesis: "Smaller payload does not regress hydration",
    runs: [],
  },
]

export const missionStats = { all: 12, running: 3, needsDecision: 2, held: 1 }

export function getMission(id: string) {
  return missions.find((mission) => mission.id === id)
}

/* -------------------------------------------------------------- decision --- */

export const decision = {
  missionId: "m-184-candidate",
  outcome: "Do not promote this candidate",
  rationale: "Production remains on the last healthy deployment.",
  productionState: "Unchanged",
  metrics: [
    {
      label: "EU completion",
      value: "-8.6pp",
      limit: "limit -3pp",
      status: "fail" as Status,
    },
    {
      label: "Checkout p99",
      value: "+82%",
      limit: "limit +20%",
      status: "fail" as Status,
    },
    {
      label: "Payment attempts",
      value: "2",
      limit: "limit 1",
      status: "fail" as Status,
    },
    {
      label: "Recovery",
      value: "4m 12s",
      limit: "limit 60s",
      status: "fail" as Status,
    },
  ],
  rootCause: {
    title: "Retry without stable idempotency",
    detail:
      "The first request completed, its response was lost, and the candidate issued a second payment attempt.",
    evidence: [
      "Candidate request trace",
      "Stripe attempt pair",
      "PostHog funnel comparison",
    ],
  },
  repair: {
    scope: "acme/checkout-lab",
    guardrail:
      "Codex works only in the repository and opens a repair PR. It cannot deploy or read production credentials.",
    acceptance: [
      "Stable Stripe idempotency key across attempts",
      "Bounded retry count and total deadline",
      "Pass contract v3 without changing its thresholds",
    ],
  },
} as const

/* ---------------------------------------------------------- integrations --- */

export type Integration = {
  provider: string
  environment: string
  scope: string
  status: Status
  statusLabel: string
  lastEvent: string
  writeAccess: boolean
}

export const integrations: Integration[] = [
  {
    provider: "GitHub",
    environment: "checkout-lab",
    scope: "Read PRs and diffs; write checks and repair PRs",
    status: "ok",
    statusLabel: "Connected",
    lastEvent: "8s ago",
    writeAccess: true,
  },
  {
    provider: "Vercel",
    environment: "Demo team",
    scope: "Deployments, promote, restore",
    status: "ok",
    statusLabel: "Connected",
    lastEvent: "1m ago",
    writeAccess: true,
  },
  {
    provider: "PostHog",
    environment: "Demo project",
    scope: "Read funnels; edit one flag",
    status: "ok",
    statusLabel: "Connected",
    lastEvent: "22s ago",
    writeAccess: true,
  },
  {
    provider: "Stripe",
    environment: "Test mode",
    scope: "Read payment attempts",
    status: "ok",
    statusLabel: "Connected",
    lastEvent: "14s ago",
    writeAccess: false,
  },
  {
    provider: "AWS",
    environment: "Sandbox",
    scope: "CloudWatch read, bounded FIS",
    status: "ok",
    statusLabel: "Connected",
    lastEvent: "3m ago",
    writeAccess: true,
  },
  {
    provider: "Greptile",
    environment: "checkout-lab",
    scope: "Knowledge base read",
    status: "ok",
    statusLabel: "Connected",
    lastEvent: "9m ago",
    writeAccess: false,
  },
  {
    provider: "Linear",
    environment: "Checkout team",
    scope: "Create issues",
    status: "ok",
    statusLabel: "Connected",
    lastEvent: "1h ago",
    writeAccess: true,
  },
  {
    provider: "Codex",
    environment: "checkout-lab",
    scope: "Open repair PRs only",
    status: "ok",
    statusLabel: "Connected",
    lastEvent: "2h ago",
    writeAccess: true,
  },
]

export const safetyBoundary = [
  "Production fault injection is disabled",
  "Stripe is restricted to test mode",
  "AWS targets are restricted to the sandbox account",
  "Codex holds no deployment credentials",
]

/* -------------------------------------------------------------- policies --- */

export type Policy = {
  id: string
  name: string
  scope: string
  requires: string
  onFailure: string
  enabled: boolean
  lastEdited: string
}

export const policies: Policy[] = [
  {
    id: "pol-payment",
    name: "Payment side effects",
    scope: "Any change touching src/payments/**",
    requires: "Impact + Resilience agents, duplicate attempt signal",
    onFailure: "Hold candidate, preserve production",
    enabled: true,
    lastEdited: "3d ago",
  },
  {
    id: "pol-hot-path",
    name: "Checkout hot path",
    scope: "Any change touching src/checkout/**",
    requires: "Performance agent, p99 <= 2s",
    onFailure: "Hold candidate",
    enabled: true,
    lastEdited: "9d ago",
  },
  {
    id: "pol-flag",
    name: "Flag exposure increase",
    scope: "Feature flag rollout above 25%",
    requires: "Product Health agent, funnel signal",
    onFailure: "Restore previous flag value",
    enabled: true,
    lastEdited: "2w ago",
  },
  {
    id: "pol-repair",
    name: "Bounded repair authorization",
    scope: "Any failed mission with a reproduction",
    requires: "Human approval before Codex dispatch",
    onFailure: "No repair dispatched",
    enabled: true,
    lastEdited: "2w ago",
  },
  {
    id: "pol-copy",
    name: "Copy-only exemption",
    scope: "Changes limited to templates and copy",
    requires: "No agents",
    onFailure: "Not applicable",
    enabled: false,
    lastEdited: "1mo ago",
  },
]

/* -------------------------------------------------------------- activity --- */

export type TimelineEvent = {
  id: string
  at: string
  actor: string
  kind: "system" | "agent" | "human" | "policy"
  title: string
  detail?: string
}

export const changeTimeline: TimelineEvent[] = [
  {
    id: "t1",
    at: "12:04",
    actor: "Opssemble",
    kind: "system",
    title: "Detected PR #184",
    detail: "Pulled diff, branch, and commit a17c92e from GitHub",
  },
  {
    id: "t2",
    at: "12:04",
    actor: "Impact agent",
    kind: "agent",
    title: "Inferred high risk",
    detail: "External payment side effect and reverted history",
  },
  {
    id: "t3",
    at: "12:05",
    actor: "Payment side effects",
    kind: "policy",
    title: "Required Impact and Resilience",
    detail: "Policy match on src/payments/**",
  },
  {
    id: "t4",
    at: "12:07",
    actor: "dwhitfield",
    kind: "human",
    title: "Added a monitoring requirement",
    detail: "EU checkout completion and duplicate Stripe attempts",
  },
  {
    id: "t5",
    at: "12:07",
    actor: "Opssemble",
    kind: "system",
    title: "Compiled 2 phrases into signals",
    detail: "PostHog funnel and Stripe attempt count resolved",
  },
]

/* ------------------------------------------------------------------- nav --- */

export const navItems = [
  { href: "/changes", label: "Changes", badge: changeStats.open },
  { href: "/missions", label: "Missions", badge: missionStats.running },
  { href: "/agents", label: "Agents", badge: null },
  { href: "/policies", label: "Policies", badge: null },
  { href: "/integrations", label: "Integrations", badge: null },
] as const
