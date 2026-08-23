import type { GitHubPullRequestDetail } from "@/lib/github/pull-request-data"

type PullRequestMissionInput = Pick<
  GitHubPullRequestDetail,
  | "additions"
  | "baseBranch"
  | "changedFiles"
  | "checks"
  | "deletions"
  | "headBranch"
  | "reviews"
  | "title"
>

export type PullRequestMissionAgentKey =
  | "impact"
  | "stress-test"
  | "chaos"
  | "watch-arm"

export type PullRequestMissionAgent = {
  key: PullRequestMissionAgentKey
  name: string
  status: "completed" | "running" | "queued"
  headline: string
  reportTitle: string
  reportSummary: string
  metrics: { label: string; value: string }[]
  findings: string[]
  acceptsInstructions?: boolean
}

export type PullRequestMission = {
  orchestrator: {
    status: "completed"
    headline: string
    rationale: string
  }
  agents: PullRequestMissionAgent[]
}

export function buildPullRequestMission(
  pullRequest: PullRequestMissionInput
): PullRequestMission {
  const changedLines = pullRequest.additions + pullRequest.deletions
  const reviewCount = pullRequest.reviews.length
  const checkCount = pullRequest.checks.length
  const agents: PullRequestMissionAgent[] = [
    {
      key: "impact",
      name: "Impact agent",
      status: "completed",
      headline: "Blast analysis report ready",
      reportTitle: "Blast analysis",
      reportSummary: `Mapped ${pullRequest.changedFiles.toLocaleString()} changed files to likely runtime and customer-facing surfaces.`,
      metrics: [
        {
          label: "Files",
          value: pullRequest.changedFiles.toLocaleString(),
        },
        { label: "Changed lines", value: changedLines.toLocaleString() },
        { label: "Risk surface", value: "Application" },
      ],
      findings: [
        "Primary impact is concentrated in the changed pull-request workflow.",
        "Adjacent project navigation and mission execution paths should be smoke tested.",
      ],
    },
    {
      key: "stress-test",
      name: "Stress test agent",
      status: "completed",
      headline: "Synthetic load report ready",
      reportTitle: "Stress test",
      reportSummary:
        "Dummy run: 10-minute traffic ramp against equivalent baseline and candidate environments.",
      metrics: [
        { label: "Baseline p95", value: "412 ms" },
        { label: "Candidate p95", value: "468 ms" },
        { label: "Delta", value: "+13.6%" },
        { label: "Error rate", value: "0.8%" },
      ],
      findings: [
        "Candidate remained below the 600 ms demo threshold at 250 requests per second.",
        "No sustained throughput collapse was observed during the synthetic ramp.",
      ],
    },
    {
      key: "chaos",
      name: "Chaos agent",
      status: "completed",
      headline: "Recovery report ready",
      reportTitle: "Chaos test",
      reportSummary:
        "Dummy run: exercised dependency latency, worker restart, and transient API failure.",
      metrics: [
        { label: "Scenarios", value: "3" },
        { label: "Recovered", value: "3" },
        { label: "Longest recovery", value: "41 s" },
        { label: "Data loss", value: "0" },
      ],
      findings: [
        "All simulated failures recovered inside the 60-second demo guardrail.",
        "Transient API failure produced one retry burst that should be watched after deploy.",
      ],
    },
    {
      key: "watch-arm",
      name: "Watch Arm agent",
      status: "running",
      headline: "Building the deployment watch plan",
      reportTitle: "Deployment watch plan",
      reportSummary:
        "Preparing signals and rollback conditions for the first 30 minutes after deployment.",
      metrics: [
        { label: "Signals", value: "4" },
        { label: "Watch window", value: "30 min" },
        { label: "Rollback rule", value: "2 breaches" },
      ],
      findings: [
        "Watch request error rate and p95 latency against the pre-deploy baseline.",
        "Alert on repeated API retries or a failed mission-page load.",
      ],
      acceptsInstructions: true,
    },
  ]

  return {
    orchestrator: {
      status: "completed",
      headline: `Selected ${agents.length} agents for this pull request`,
      rationale: `${pullRequest.changedFiles.toLocaleString()} files and ${changedLines.toLocaleString()} changed lines on ${pullRequest.headBranch} -> ${pullRequest.baseBranch}; ${checkCount.toLocaleString()} checks and ${reviewCount.toLocaleString()} reviews were available.`,
    },
    agents,
  }
}
