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
  org: "hrishikeshmane",
  name: "flightlab",
  slug: "hrishikeshmane/flightlab",
  defaultBranch: "main",
  syncedSecondsAgo: 8,
  productionDeployment: "flightlab-prod",
  productionUrl: "flightlab.vercel.app",
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
    path: "lib/booking.ts",
    added: 46,
    removed: 18,
    language: "ts",
    hunks: [
      {
        header: "@@ -22,8 +22,17 @@ export async function completeBooking",
        lines: [
          {
            kind: "ctx",
            oldNo: 22,
            newNo: 22,
            text: "export async function completeBooking(input: BookingInput) {",
          },
          {
            kind: "add",
            oldNo: null,
            newNo: 23,
            text: "  try {",
          },
          {
            kind: "add",
            oldNo: null,
            newNo: 24,
            text: "    return await commitBooking({",
          },
          {
            kind: "add",
            oldNo: null,
            newNo: 25,
            text: "      ...input, operationId: crypto.randomUUID(),",
          },
          { kind: "add", oldNo: null, newNo: 26, text: "    })" },
          {
            kind: "add",
            oldNo: null,
            newNo: 27,
            text: "  } catch (error) {",
          },
          {
            kind: "add",
            oldNo: null,
            newNo: 28,
            text: "    if (!(error instanceof TimeoutError)) throw error",
          },
          {
            kind: "add",
            oldNo: null,
            newNo: 29,
            text: "    return commitBooking({",
          },
          {
            kind: "add",
            oldNo: null,
            newNo: 30,
            text: "      ...input, operationId: crypto.randomUUID(),",
          },
          { kind: "add", oldNo: null, newNo: 31, text: "    })" },
          { kind: "add", oldNo: null, newNo: 32, text: "  }" },
          { kind: "ctx", oldNo: 24, newNo: 33, text: "}" },
        ],
      },
    ],
  },
  {
    path: "lib/reservations.ts",
    added: 31,
    removed: 4,
    language: "ts",
    hunks: [
      {
        header: "@@ -1,8 +1,12 @@",
        lines: [
          {
            kind: "ctx",
            oldNo: 1,
            newNo: 1,
            text: "export async function reserve(input: ReservationInput) {",
          },
          {
            newNo: 2,
            text: "  return db.reservations.create(input)",
            oldNo: 2,
            kind: "ctx",
          },
        ],
      },
    ],
  },
  {
    path: "app/api/bookings/route.ts",
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
            text: "  const input = await request.json()",
          },
          {
            kind: "del",
            oldNo: 45,
            newNo: null,
            text: "  return completeBooking(input)",
          },
          {
            kind: "add",
            oldNo: null,
            newNo: 45,
            text: "  return withTimeout(completeBooking(input), 1_500)",
          },
        ],
      },
    ],
  },
  {
    path: "lib/payments.ts",
    added: 11,
    removed: 6,
    language: "ts",
    hunks: [],
  },
  {
    path: "lib/retry.ts",
    added: 8,
    removed: 0,
    language: "ts",
    hunks: [],
  },
  {
    path: "tests/booking.test.ts",
    added: 0,
    removed: 5,
    language: "ts",
    hunks: [],
  },
  {
    path: "docs/RUNBOOK.md",
    added: 0,
    removed: 0,
    language: "md",
    hunks: [],
  },
]

export const changes: Change[] = [
  {
    id: "5",
    number: 5,
    title: "Retry timed-out booking requests",
    branch: "demo/bad-retry-live",
    baseBranch: "main",
    sha: "b7e31f4",
    risk: "high",
    planState: "draft",
    contractVersion: 2,
    trigger: "Merge",
    agentSummary: "1 proposed",
    updated: "8s",
    author: { name: "Dana Whitfield", handle: "dwhitfield", initials: "DW" },
    filesChanged: 7,
    additions: 118,
    deletions: 42,
    body: "Retries a booking after a timeout, but creates a new operation ID for each attempt. A commit-then-timeout can duplicate reservation and payment side effects.",
    impact: {
      headline: "Booking confirmation and reservation path",
      detail:
        "Booking retry behavior changed on the confirmation hot path. Reservation persistence, payment creation, and booking completion are downstream.",
    },
    riskReasons: [
      "Reservation and payment side effects",
      "Retry and timeout behavior changed",
      "Operation ID is regenerated per attempt",
      "Previous duplicate-booking incident",
    ],
    sources: [
      { label: "GitHub diff", detail: "7 files · +118 / -42" },
      {
        label: "Greptile knowledge",
        detail: "RUNBOOK.md, INCIDENT-001-duplicate-booking.md",
      },
    ],
    files: retryDiff,
  },
  {
    id: "4",
    number: 4,
    title: "Add fare-currency fallback",
    branch: "fare-currency-fallback",
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
    body: "Falls back to the origin currency when a destination fare currency cannot be resolved.",
    impact: {
      headline: "Fare display and booking totals",
      detail:
        "Currency resolution changed. Fare display and booking totals are downstream.",
    },
    riskReasons: [
      "Fare total calculation changed",
      "No provider metric resolved for currency accuracy",
    ],
    sources: [{ label: "GitHub diff", detail: "4 files · +63 / -12" }],
    files: [],
  },
  {
    id: "2",
    number: 2,
    title: "Reduce flight-search payload",
    branch: "smaller-search-payload",
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
    body: "Trims unused fields from the flight-search response.",
    impact: {
      headline: "Flight-search response",
      detail: "Payload shape changed. Client hydration is downstream.",
    },
    riskReasons: ["Response contract changed", "Hot path payload size changed"],
    sources: [{ label: "GitHub diff", detail: "9 files · +41 / -210" }],
    files: [],
  },
  {
    id: "1",
    number: 1,
    title: "Update booking email copy",
    branch: "booking-email-copy",
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
    body: "Copy-only change to the booking confirmation email.",
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
    purpose: "Detects unsafe retry and recovery behavior from evidence",
    selectedWhen: "External call, queue, retry, recovery",
    tools: ["CloudWatch fixtures", "Stripe fixtures", "Greptile"],
    health: "ok",
    runs: 96,
    medianDuration: "46s",
  },
  {
    key: "performance",
    name: "Performance",
    purpose: "Compares candidate and baseline latency observations",
    selectedWhen: "Hot path or resource behavior",
    tools: ["CloudWatch fixtures", "PostHog fixtures"],
    health: "ok",
    runs: 131,
    medianDuration: "42s",
  },
  {
    key: "product-health",
    name: "Product Health",
    purpose: "Watches funnel and journey completion",
    selectedWhen: "Journey or flag exposure",
    tools: ["PostHog fixtures"],
    health: "ok",
    runs: 88,
    medianDuration: "41s",
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
  changeId: "5",
  contractVersion: 3,
  previousVersion: 2,
  trigger: "GitHub merge",
  triggerDetail: "Fires once for merged commit b7e31f4",
  requirementDraft:
    "Also monitor booking completion and duplicate reservations.",
  agents: [
    {
      key: "resilience",
      name: "Resilience",
      selection: "required",
      reason: "Compiled from duplicate reservation requirement",
    },
    {
      key: "performance",
      name: "Performance",
      selection: "required",
      reason: "Booking hot path policy requires p99 evidence",
    },
    {
      key: "product-health",
      name: "Product Health",
      selection: "required",
      reason: "Compiled from booking completion requirement",
    },
  ] satisfies PlanAgent[],
  existingSignals: [
    {
      id: "p99",
      name: "Booking p99",
      provider: "CloudWatch fixture",
      threshold: "<= 1.5s",
      condition: "Fail above 1.5s",
      origin: "policy",
    },
  ] satisfies Signal[],
  compiledSignals: [
    {
      id: "booking-completion",
      name: "Booking completion relative drop",
      provider: "PostHog fixture",
      threshold: "<= 5%",
      condition: "Fail above 5% relative drop",
      origin: "requested",
    },
    {
      id: "reservations",
      name: "Reservations per operation",
      provider: "CloudWatch fixture",
      threshold: "<= 1",
      condition: "Fail above 1",
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
    key: "resilience",
    name: "Resilience agent",
    verdict: "running",
    headline: "Waiting for correlated reservation records",
    detail:
      "Reads booking logs and payment records for the same operation ID.",
    latestTool: "query_cloudwatch_observations · 18s",
    hypothesis: "A timeout retry creates more than one reservation per operation.",
    toolCalls: [
      {
        id: "res-1",
        name: "query_greptile_context",
        status: "completed",
        duration: "8s",
        summary: "Read the booking runbook and duplicate-booking incident.",
        output: "RUNBOOK.md · INCIDENT-001-duplicate-booking.md",
      },
      {
        id: "res-2",
        name: "query_cloudwatch_observations",
        status: "running",
        duration: "18s",
        summary: "Waiting for the booking evidence window to become complete.",
        input: "{ operationId: 'op-204', throughMs: 30000 }",
      },
    ],
    observations: [
      { label: "Reservations / operation", value: "1 so far", status: "idle" },
      { label: "Payment intents / operation", value: "1 so far", status: "idle" },
      { label: "Evidence window", value: "18s / 36s max", status: "running" },
    ],
  },
  {
    key: "performance",
    name: "Performance agent",
    verdict: "queued",
    headline: "Waiting for candidate booking p99",
    detail: "The deterministic p99 measurement is not available yet.",
    toolCalls: [
      {
        id: "perf-1",
        name: "await_required_evidence",
        status: "queued",
        duration: "--",
        summary: "Candidate booking p99 appears at T+26s.",
      },
    ],
    observations: [
      { label: "Threshold", value: "<= 1.5s", status: "idle" },
      { label: "Candidate booking p99", value: "--", status: "idle" },
    ],
  },
  {
    key: "product-health",
    name: "Product Health agent",
    verdict: "queued",
    headline: "Waiting for booking completion counts",
    detail: "Baseline is ready; candidate counts appear at T+30s.",
    toolCalls: [
      {
        id: "ph-1",
        name: "query_posthog_observations",
        status: "queued",
        duration: "--",
        summary: "Waiting for candidate booking_started and booking_confirmed.",
      },
    ],
    observations: [
      { label: "Baseline completion", value: "72%", status: "ok" },
      { label: "Candidate completion", value: "--", status: "idle" },
    ],
  },
]

export const missionRunsComplete: AgentRun[] = [
  {
    ...missionRuns[0],
    verdict: "fail",
    headline: "One operation produced two reservations",
    latestTool: undefined,
    toolCalls: [
      missionRuns[0].toolCalls[0],
      {
        id: "res-2",
        name: "query_cloudwatch_observations",
        status: "completed",
        duration: "22s",
        summary: "Read two reservation records for operation op-204.",
        output: "rsv-204-a · rsv-204-b",
      },
      {
        id: "res-3",
        name: "max_distinct_count_by_group",
        status: "completed",
        duration: "<1s",
        summary: "Computed the maximum reservation count by operation ID.",
        output: "op-204 => 2 · threshold <= 1",
      },
    ],
    observations: [
      { label: "Reservations / operation", value: "2", status: "fail" },
      { label: "Payment intents / operation", value: "2", status: "fail" },
    ],
  },
  {
    ...missionRuns[1],
    verdict: "fail",
    headline: "Booking p99 exceeded the contract",
    observations: [
      { label: "Threshold", value: "1.5s", status: "ok" },
      { label: "Candidate booking p99", value: "2.28s", status: "fail" },
    ],
  },
  {
    ...missionRuns[2],
    verdict: "fail",
    headline: "Booking completion dropped 15.3%",
    observations: [
      { label: "Baseline completion", value: "72%", status: "ok" },
      { label: "Candidate completion", value: "61%", status: "fail" },
      { label: "Relative drop", value: "15.3%", status: "fail" },
    ],
  },
]

export const missions: Mission[] = [
  {
    id: "m-5-candidate",
    changeId: "5",
    changeNumber: 5,
    title: "Retry timed-out booking requests",
    contractVersion: 3,
    candidate: "flightlab-candidate",
    sha: "b7e31f4",
    stage: "Candidate",
    state: "running",
    risk: "high",
    startedAgo: "1m ago",
    elapsed: "1m 18s",
    updated: "8s",
    agentsComplete: 0,
    agentsTotal: 3,
    hypothesis: "A timeout retry duplicates booking side effects",
    stages: missionStages,
    runs: missionRuns,
  },
  {
    id: "m-5-rejected",
    changeId: "5",
    changeNumber: 5,
    title: "Retry timed-out booking requests",
    contractVersion: 3,
    candidate: "flightlab-candidate",
    sha: "b7e31f4",
    stage: "Candidate",
    state: "hold",
    risk: "high",
    startedAgo: "1m ago",
    elapsed: "12m 04s",
    updated: "1m",
    agentsComplete: 3,
    agentsTotal: 3,
    hypothesis: "A timeout retry duplicates booking side effects",
    stages: heldStages,
    runs: missionRunsComplete,
  },
  {
    id: "m-2-release",
    changeId: "2",
    changeNumber: 2,
    title: "Reduce flight-search payload",
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
  missionId: "m-5-rejected",
  outcome: "Do not promote this candidate",
  rationale: "Production remains on the last healthy deployment.",
  productionState: "Unchanged",
  metrics: [
    {
      label: "Booking completion drop",
      value: "15.3%",
      limit: "limit 5%",
      status: "fail" as Status,
    },
    {
      label: "Booking p99",
      value: "2.28s",
      limit: "limit 1.5s",
      status: "fail" as Status,
    },
    {
      label: "Reservations / operation",
      value: "2",
      limit: "limit 1",
      status: "fail" as Status,
    },
  ],
  rootCause: {
    title: "Retry without a stable booking operation ID",
    detail:
      "The first booking committed before its response timed out. The retry generated a new operation ID and created a second reservation.",
    evidence: [
      "CloudWatch reservation pair",
      "Stripe payment-intent pair",
      "PostHog booking funnel",
    ],
  },
  repair: {
    scope: "hrishikeshmane/flightlab",
    guardrail:
      "Codex works only in the repository and opens a repair PR. It cannot deploy or read production credentials.",
    acceptance: [
      "Stable booking operation ID across attempts",
      "Idempotent reservation and payment writes",
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
    environment: "flightlab",
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
    environment: "FlightLab fixtures",
    scope: "Read booking funnel observations",
    status: "idle",
    statusLabel: "Fixture data",
    lastEvent: "22s ago",
    writeAccess: false,
  },
  {
    provider: "Stripe",
    environment: "FlightLab fixtures",
    scope: "Read payment-intent observations",
    status: "idle",
    statusLabel: "Fixture data",
    lastEvent: "14s ago",
    writeAccess: false,
  },
  {
    provider: "AWS",
    environment: "Not configured",
    scope: "CloudWatch fixture reads only",
    status: "idle",
    statusLabel: "Not configured",
    lastEvent: "3m ago",
    writeAccess: false,
  },
  {
    provider: "Greptile",
    environment: "flightlab",
    scope: "Knowledge base read",
    status: "ok",
    statusLabel: "Connected",
    lastEvent: "9m ago",
    writeAccess: false,
  },
  {
    provider: "Linear",
    environment: "Not configured",
    scope: "Create issues",
    status: "idle",
    statusLabel: "Stretch",
    lastEvent: "1h ago",
    writeAccess: true,
  },
  {
    provider: "Codex",
    environment: "flightlab",
    scope: "Open repair PRs only",
    status: "ok",
    statusLabel: "Connected",
    lastEvent: "2h ago",
    writeAccess: true,
  },
]

export const safetyBoundary = [
  "Fault injection is not configured in the core demo",
  "CloudWatch, PostHog, and Stripe reads are labeled fixtures",
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
    id: "pol-booking",
    name: "Booking side effects",
    scope: "Any change touching lib/booking.ts or lib/reservations.ts",
    requires: "Resilience agent, max one reservation per operation",
    onFailure: "Hold candidate, preserve production",
    enabled: true,
    lastEdited: "3d ago",
  },
  {
    id: "pol-hot-path",
    name: "Booking hot path",
    scope: "Any change touching app/api/bookings/**",
    requires: "Performance agent, p99 <= 1.5s",
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
    title: "Detected PR #5",
    detail: "Pulled diff, branch, and commit b7e31f4 from GitHub",
  },
  {
    id: "t2",
    at: "12:04",
    actor: "Impact agent",
    kind: "agent",
    title: "Inferred high risk",
    detail: "Booking side effects and duplicate-booking history",
  },
  {
    id: "t3",
    at: "12:05",
    actor: "Booking side effects",
    kind: "policy",
    title: "Required Impact and Resilience",
    detail: "Policy match on lib/booking.ts",
  },
  {
    id: "t4",
    at: "12:07",
    actor: "dwhitfield",
    kind: "human",
    title: "Added a monitoring requirement",
    detail: "Booking completion and duplicate reservations",
  },
  {
    id: "t5",
    at: "12:07",
    actor: "Opssemble",
    kind: "system",
    title: "Compiled 2 phrases into signals",
    detail: "PostHog completion and reservation count resolved",
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
