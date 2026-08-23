/**
 * Mock data for the Opssemble UI. Everything on screen is derived from this
 * module so a single edit propagates to every surface. There is no network or
 * persistence layer -- this is a design mock.
 */

export type Status =
  "ok" | "warn" | "fail" | "running" | "queued" | "idle" | "brand"

export type Risk = "low" | "medium" | "high"

export type PlanState =
  "not-required" | "draft" | "needs-input" | "ready" | "armed"

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
        header:
          "@@ -44,7 +44,9 @@ export async function POST(request: Request)",
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
  "impact" | "resilience" | "performance" | "product-health" | "repair"

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

/* ------------------------------------------------------ blast radius report --- */

export type BlastRadiusFactor = {
  id: string
  label: string
  score: number
  weight: number
  rationale: string
}

export type BlastRadiusLayer = {
  id: "changed-code" | "direct-dependencies" | "customer-operations"
  label: string
  detail: string
  surfaces: {
    id: string
    name: string
    detail: string
  }[]
}

export type BlastRadiusFinding = {
  id: string
  risk: Risk
  title: string
  detail: string
  evidence: string
}

export type BlastRadiusEvidence = {
  id: string
  kind: "diff" | "architecture" | "runbook" | "history"
  label: string
  reference: string
  detail: string
}

export const blastRadiusReport = {
  changeId: "184",
  score: 8.2,
  maxScore: 10,
  risk: "high" as Risk,
  surfaceCount: 9,
  headline: "High blast radius across checkout payment completion",
  detail:
    "The retry now surrounds an irreversible payment side effect while generating a new idempotency key for every attempt. A lost Stripe response can therefore become a duplicate charge, and the longer deadline keeps checkout workers occupied during provider degradation.",
  candidate: {
    branch: "retry-safety",
    sha: "a17c92e",
  },
  baseline: {
    branch: "main",
    sha: "9d31bc2",
  },
  contextSummary:
    "GitHub diff, dependency graph, ARCHITECTURE.md, RUNBOOK.md, and reverted PR #121",
  method:
    "Composite average of five equally weighted factors from 0 isolated to 10 system-wide",
  generatedAt: "Aug 23, 18:03 UTC",
  duration: "38s",
  agent: "Impact agent",
  factors: [
    {
      id: "customer-criticality",
      label: "Customer criticality",
      score: 10,
      weight: 20,
      rationale:
        "Runs in checkout before payment confirmation and gates order completion.",
    },
    {
      id: "state-mutation",
      label: "State mutation",
      score: 9,
      weight: 20,
      rationale:
        "A retry can repeat Stripe Payment Intent creation after the first request succeeds.",
    },
    {
      id: "dependency-fan-out",
      label: "Dependency fan-out",
      score: 8,
      weight: 20,
      rationale:
        "The changed path reaches Stripe, order persistence, fulfillment, and cohort tracking.",
    },
    {
      id: "recovery-sensitivity",
      label: "Recovery sensitivity",
      score: 8,
      weight: 20,
      rationale:
        "Longer deadlines hold checkout workers and slow recovery during provider degradation.",
    },
    {
      id: "exposure-breadth",
      label: "Exposure breadth",
      score: 6,
      weight: 20,
      rationale:
        "A feature flag limits initial exposure, but its enabled cohort spans EU checkout traffic.",
    },
  ] satisfies BlastRadiusFactor[],
  layers: [
    {
      id: "changed-code",
      label: "Changed code",
      detail: "Symbols and behavior introduced by this diff.",
      surfaces: [
        {
          id: "with-retry",
          name: "StripeClient.withRetry",
          detail: "Retries createPaymentIntent up to MAX_ATTEMPTS.",
        },
        {
          id: "idempotency-key",
          name: "idempotencyKey(attempt)",
          detail: "Generates a fresh key for each retry attempt.",
        },
        {
          id: "checkout-timeout",
          name: "Checkout POST timeout",
          detail: "Expands the deadline from 3s to 12s behind the flag.",
        },
      ],
    },
    {
      id: "direct-dependencies",
      label: "Direct dependencies",
      detail: "Service boundaries and state reached immediately.",
      surfaces: [
        {
          id: "stripe-payment-intents",
          name: "Stripe Payment Intents",
          detail:
            "The external side effect can succeed before the client sees a response.",
        },
        {
          id: "order-persistence",
          name: "Order persistence",
          detail:
            "The payment result controls whether the order becomes payable.",
        },
        {
          id: "retry-flag",
          name: "smart-payment-retry-v2",
          detail: "The flag controls the longer deadline and retry exposure.",
        },
      ],
    },
    {
      id: "customer-operations",
      label: "Customer and operations",
      detail: "Journeys and operational paths that inherit the behavior.",
      surfaces: [
        {
          id: "payment-success",
          name: "Payment success",
          detail:
            "Duplicate or ambiguous attempts can block checkout completion.",
        },
        {
          id: "fulfillment-dispatch",
          name: "Fulfillment dispatch",
          detail:
            "Order state can advance from a payment outcome observed more than once.",
        },
        {
          id: "eu-checkout",
          name: "EU checkout completion",
          detail:
            "The flagged cohort is the widest monitored customer journey.",
        },
      ],
    },
  ] satisfies BlastRadiusLayer[],
  findings: [
    {
      id: "retry-side-effect",
      risk: "high",
      title: "Retry surrounds an irreversible payment side effect",
      detail:
        "Stripe may accept the first request before its response is lost, so the retry cannot assume the operation failed.",
      evidence: "src/payments/stripe-client.ts:19 · RUNBOOK.md payment retries",
    },
    {
      id: "rotating-key",
      risk: "high",
      title: "Idempotency key rotates on every attempt",
      detail:
        "A fresh key defeats Stripe de-duplication and lets two attempts create distinct Payment Intents for one checkout.",
      evidence: "src/payments/idempotency.ts:1 · reverted PR #121",
    },
    {
      id: "timeout-expansion",
      risk: "medium",
      title: "Flagged timeout quadruples checkout occupancy",
      detail:
        "The 3s to 12s deadline expansion keeps workers attached to degraded Stripe calls and raises saturation risk.",
      evidence: "src/checkout/route.ts:45 · ARCHITECTURE.md checkout workers",
    },
    {
      id: "coverage-reduction",
      risk: "medium",
      title: "Retry regression coverage was reduced",
      detail:
        "Five retry assertions were removed while the retry contract and idempotency behavior both changed.",
      evidence: "tests/payments/retry.test.ts · GitHub diff",
    },
  ] satisfies BlastRadiusFinding[],
  evidence: [
    {
      id: "github-diff",
      kind: "diff",
      label: "GitHub diff",
      reference: "PR #184 · a17c92e",
      detail:
        "Seven files change the retry loop, idempotency key, checkout deadline, fulfillment path, and regression coverage.",
    },
    {
      id: "architecture",
      kind: "architecture",
      label: "Architecture map",
      reference: "ARCHITECTURE.md · Checkout request path",
      detail:
        "Stripe outcome gates order persistence, payment completion, and fulfillment dispatch.",
    },
    {
      id: "runbook",
      kind: "runbook",
      label: "Payment runbook",
      reference: "RUNBOOK.md · Payment retries",
      detail:
        "One stable idempotency key is required for the lifetime of a checkout attempt.",
    },
    {
      id: "history",
      kind: "history",
      label: "Reverted history",
      reference: "PR #121",
      detail:
        "An earlier retry change was rolled back after duplicate payment attempts.",
    },
  ] satisfies BlastRadiusEvidence[],
} as const

/* --------------------------------------------------------- stress tests --- */

export type StressMetric = "throughput" | "latency" | "cpu"

export type StressPoint = {
  minute: number
  finishedTps: number
  succeededTps: number
  failedTps: number
  p50Ms: number
  p99Ms: number
  cpuPercent: number
}

export type StressRun = {
  role: "Baseline" | "Feature sandbox"
  branch: string
  sha: string
  sandbox: string
  breakingPointTps: number
  peakSucceededTps: number
  recoverySeconds: number
  points: StressPoint[]
}

export type StressPhaseResult = {
  id: "breaking-point" | "increased-load" | "recovery" | "regression"
  label: string
  window: string
  verdict: Verdict
  baseline: string
  candidate: string
  delta: string
  detail: string
}

const baselineStressPoints: StressPoint[] = [
  {
    minute: 0,
    finishedTps: 84,
    succeededTps: 84,
    failedTps: 0,
    p50Ms: 92,
    p99Ms: 180,
    cpuPercent: 31,
  },
  {
    minute: 2,
    finishedTps: 110,
    succeededTps: 110,
    failedTps: 0,
    p50Ms: 98,
    p99Ms: 190,
    cpuPercent: 36,
  },
  {
    minute: 4,
    finishedTps: 150,
    succeededTps: 150,
    failedTps: 0,
    p50Ms: 112,
    p99Ms: 230,
    cpuPercent: 43,
  },
  {
    minute: 6,
    finishedTps: 196,
    succeededTps: 196,
    failedTps: 0,
    p50Ms: 126,
    p99Ms: 300,
    cpuPercent: 52,
  },
  {
    minute: 8,
    finishedTps: 208,
    succeededTps: 207,
    failedTps: 1,
    p50Ms: 138,
    p99Ms: 340,
    cpuPercent: 57,
  },
  {
    minute: 10,
    finishedTps: 300,
    succeededTps: 299,
    failedTps: 1,
    p50Ms: 151,
    p99Ms: 390,
    cpuPercent: 64,
  },
  {
    minute: 12,
    finishedTps: 410,
    succeededTps: 408,
    failedTps: 2,
    p50Ms: 168,
    p99Ms: 450,
    cpuPercent: 70,
  },
  {
    minute: 14,
    finishedTps: 500,
    succeededTps: 497,
    failedTps: 3,
    p50Ms: 184,
    p99Ms: 520,
    cpuPercent: 76,
  },
  {
    minute: 18,
    finishedTps: 520,
    succeededTps: 516,
    failedTps: 4,
    p50Ms: 196,
    p99Ms: 580,
    cpuPercent: 80,
  },
  {
    minute: 22,
    finishedTps: 535,
    succeededTps: 531,
    failedTps: 4,
    p50Ms: 204,
    p99Ms: 620,
    cpuPercent: 83,
  },
  {
    minute: 26,
    finishedTps: 548,
    succeededTps: 543,
    failedTps: 5,
    p50Ms: 212,
    p99Ms: 650,
    cpuPercent: 85,
  },
  {
    minute: 30,
    finishedTps: 562,
    succeededTps: 558,
    failedTps: 4,
    p50Ms: 221,
    p99Ms: 680,
    cpuPercent: 87,
  },
  {
    minute: 34,
    finishedTps: 550,
    succeededTps: 546,
    failedTps: 4,
    p50Ms: 217,
    p99Ms: 700,
    cpuPercent: 88,
  },
  {
    minute: 36,
    finishedTps: 282,
    succeededTps: 281,
    failedTps: 1,
    p50Ms: 148,
    p99Ms: 420,
    cpuPercent: 62,
  },
  {
    minute: 38,
    finishedTps: 266,
    succeededTps: 266,
    failedTps: 0,
    p50Ms: 132,
    p99Ms: 350,
    cpuPercent: 54,
  },
  {
    minute: 40,
    finishedTps: 270,
    succeededTps: 270,
    failedTps: 0,
    p50Ms: 124,
    p99Ms: 310,
    cpuPercent: 49,
  },
  {
    minute: 42,
    finishedTps: 265,
    succeededTps: 265,
    failedTps: 0,
    p50Ms: 117,
    p99Ms: 280,
    cpuPercent: 45,
  },
  {
    minute: 44,
    finishedTps: 72,
    succeededTps: 72,
    failedTps: 0,
    p50Ms: 101,
    p99Ms: 200,
    cpuPercent: 32,
  },
  {
    minute: 46,
    finishedTps: 0,
    succeededTps: 0,
    failedTps: 0,
    p50Ms: 88,
    p99Ms: 170,
    cpuPercent: 24,
  },
]

const candidateStressPoints: StressPoint[] = [
  {
    minute: 0,
    finishedTps: 84,
    succeededTps: 84,
    failedTps: 0,
    p50Ms: 96,
    p99Ms: 190,
    cpuPercent: 33,
  },
  {
    minute: 2,
    finishedTps: 108,
    succeededTps: 108,
    failedTps: 0,
    p50Ms: 112,
    p99Ms: 220,
    cpuPercent: 39,
  },
  {
    minute: 4,
    finishedTps: 150,
    succeededTps: 149,
    failedTps: 1,
    p50Ms: 148,
    p99Ms: 310,
    cpuPercent: 49,
  },
  {
    minute: 6,
    finishedTps: 167,
    succeededTps: 164,
    failedTps: 3,
    p50Ms: 236,
    p99Ms: 620,
    cpuPercent: 61,
  },
  {
    minute: 8,
    finishedTps: 190,
    succeededTps: 184,
    failedTps: 6,
    p50Ms: 340,
    p99Ms: 910,
    cpuPercent: 72,
  },
  {
    minute: 10,
    finishedTps: 260,
    succeededTps: 244,
    failedTps: 16,
    p50Ms: 480,
    p99Ms: 1240,
    cpuPercent: 82,
  },
  {
    minute: 12,
    finishedTps: 330,
    succeededTps: 302,
    failedTps: 28,
    p50Ms: 566,
    p99Ms: 1450,
    cpuPercent: 89,
  },
  {
    minute: 14,
    finishedTps: 390,
    succeededTps: 347,
    failedTps: 43,
    p50Ms: 640,
    p99Ms: 1660,
    cpuPercent: 94,
  },
  {
    minute: 18,
    finishedTps: 430,
    succeededTps: 370,
    failedTps: 60,
    p50Ms: 712,
    p99Ms: 1810,
    cpuPercent: 97,
  },
  {
    minute: 22,
    finishedTps: 448,
    succeededTps: 380,
    failedTps: 68,
    p50Ms: 756,
    p99Ms: 1940,
    cpuPercent: 99,
  },
  {
    minute: 26,
    finishedTps: 438,
    succeededTps: 362,
    failedTps: 76,
    p50Ms: 782,
    p99Ms: 2000,
    cpuPercent: 99,
  },
  {
    minute: 30,
    finishedTps: 420,
    succeededTps: 338,
    failedTps: 82,
    p50Ms: 748,
    p99Ms: 1920,
    cpuPercent: 98,
  },
  {
    minute: 34,
    finishedTps: 400,
    succeededTps: 316,
    failedTps: 84,
    p50Ms: 690,
    p99Ms: 1840,
    cpuPercent: 96,
  },
  {
    minute: 36,
    finishedTps: 216,
    succeededTps: 205,
    failedTps: 11,
    p50Ms: 410,
    p99Ms: 980,
    cpuPercent: 76,
  },
  {
    minute: 38,
    finishedTps: 188,
    succeededTps: 184,
    failedTps: 4,
    p50Ms: 284,
    p99Ms: 740,
    cpuPercent: 63,
  },
  {
    minute: 40,
    finishedTps: 180,
    succeededTps: 178,
    failedTps: 2,
    p50Ms: 214,
    p99Ms: 540,
    cpuPercent: 55,
  },
  {
    minute: 42,
    finishedTps: 174,
    succeededTps: 173,
    failedTps: 1,
    p50Ms: 166,
    p99Ms: 390,
    cpuPercent: 48,
  },
  {
    minute: 44,
    finishedTps: 64,
    succeededTps: 64,
    failedTps: 0,
    p50Ms: 121,
    p99Ms: 250,
    cpuPercent: 35,
  },
  {
    minute: 46,
    finishedTps: 0,
    succeededTps: 0,
    failedTps: 0,
    p50Ms: 94,
    p99Ms: 180,
    cpuPercent: 26,
  },
]

export const stressTestAnalysis = {
  changeId: "184",
  evaluationId: "stx-a17c92e",
  verdict: "fail" as Verdict,
  headline: "Feature branch breaks 18% earlier than main",
  detail:
    "The new retry path saturates the checkout workers sooner, drops successful throughput under sustained load, and takes 33s longer to return to baseline.",
  startedAt: "Aug 23, 18:06 UTC",
  duration: "46m 10s",
  loadProfile: "checkout-hot-path-v3 · identical seed and traffic mix",
  stopCondition: "Stop above 10% errors or 2s p99 for 2 minutes",
  baseline: {
    role: "Baseline",
    branch: "main",
    sha: "9d31bc2",
    sandbox: "sbx-main-9d31bc2 · us-east-1 · 4 tasks",
    breakingPointTps: 206,
    peakSucceededTps: 558,
    recoverySeconds: 43,
    points: baselineStressPoints,
  } satisfies StressRun,
  candidate: {
    role: "Feature sandbox",
    branch: "retry-safety",
    sha: "a17c92e",
    sandbox: "sbx-pr184-a17c92e · us-east-1 · 4 tasks",
    breakingPointTps: 168,
    peakSucceededTps: 380,
    recoverySeconds: 76,
    points: candidateStressPoints,
  } satisfies StressRun,
  phaseBoundaries: {
    breakingPointEndsAt: 10,
    increasedLoadEndsAt: 34,
    runEndsAt: 46,
  },
  phases: [
    {
      id: "breaking-point",
      label: "Find Breaking Point",
      window: "0m - 10m",
      verdict: "fail",
      baseline: "206 TPS",
      candidate: "168 TPS",
      delta: "-18.4%",
      detail: "Regression limit is -5%.",
    },
    {
      id: "increased-load",
      label: "Increased Load",
      window: "10m - 34m",
      verdict: "fail",
      baseline: "558 TPS",
      candidate: "380 TPS",
      delta: "-31.9%",
      detail: "Successful peak throughput under the same traffic mix.",
    },
    {
      id: "recovery",
      label: "Stress Recovery",
      window: "34m - 46m",
      verdict: "pass",
      baseline: "43s",
      candidate: "76s",
      delta: "+33s",
      detail: "Both runs recovered inside the 90s guardrail.",
    },
    {
      id: "regression",
      label: "Regression Analysis",
      window: "3 comparable runs",
      verdict: "fail",
      baseline: "Stable",
      candidate: "Regressed",
      delta: "Hold",
      detail:
        "Breaking point and sustained success both crossed policy limits.",
    },
  ] satisfies StressPhaseResult[],
} as const

/* -------------------------------------------------------------- missions --- */

export type MissionStageKey =
  "context" | "plan" | "execute" | "evaluate" | "decision"

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
  stages: MissionStage[]
  runs: AgentRun[]
}

/**
 * Stage sets are per mission: a held mission has reached its decision, so it
 * must not render the running mission's rail.
 */
function buildStages(values: [string, Status][]): MissionStage[] {
  const labels = [
    ["context", "Context"],
    ["plan", "Plan"],
    ["execute", "Execute"],
    ["evaluate", "Evaluate"],
    ["decision", "Decision"],
  ] as const

  return labels.map(([key, label], index) => ({
    key: key as MissionStageKey,
    index: index + 1,
    label,
    value: values[index][0],
    status: values[index][1],
  }))
}

/** Rail for a mission still executing its agents. */
export const missionStages: MissionStage[] = buildStages([
  ["Complete", "ok"],
  ["Contract v3", "ok"],
  ["Running", "running"],
  ["Pending", "idle"],
  ["Pending", "idle"],
])

/** Rail for a mission whose evaluation failed and is now held. */
const heldStages: MissionStage[] = buildStages([
  ["Complete", "ok"],
  ["Contract v3", "ok"],
  ["Complete", "ok"],
  ["Failed", "fail"],
  ["Held", "warn"],
])

/** Rail for a mission that passed and was promoted. */
const passedStages: MissionStage[] = buildStages([
  ["Complete", "ok"],
  ["Contract v1", "ok"],
  ["Complete", "ok"],
  ["Passed", "ok"],
  ["Promoted", "ok"],
])

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
        input:
          "{ profile: 'lost_response', target: 'dpl_8KL2', ceiling: '60s' }",
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
    stages: missionStages,
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
    stages: heldStages,
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
    stages: passedStages,
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
