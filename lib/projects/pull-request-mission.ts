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
  sections?: { title: string; content: string }[]
  comparison?: {
    metric: string
    main: string
    candidate: string
    delta: string
  }[]
  mcpCalls?: { name: string; summary: string; output: string }[]
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
  const baselineP95 = 412
  const candidateP95 = 440 + Math.floor(Math.random() * 121)
  const baselineThroughput = 250
  const candidateThroughput = 218 + Math.floor(Math.random() * 34)
  const candidateErrorRate = (0.6 + Math.random() * 1.1).toFixed(1)
  const latencyDelta = (
    ((candidateP95 - baselineP95) / baselineP95) *
    100
  ).toFixed(1)
  const throughputDelta = (
    ((candidateThroughput - baselineThroughput) / baselineThroughput) *
    100
  ).toFixed(1)
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
      sections: [
        {
          title: "Affected surfaces",
          content:
            "Pull-request detail, mission routing, agent orchestration, and report rendering.",
        },
        {
          title: "Dependency path",
          content:
            "Project metadata -> GitHub PR context -> orchestrator -> specialist report UI.",
        },
        {
          title: "Rollback concern",
          content:
            "A runtime or provider failure must not block access to the underlying pull request.",
        },
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
        { label: "Main p95", value: `${baselineP95} ms` },
        { label: "Candidate p95", value: `${candidateP95} ms` },
        { label: "Latency delta", value: `+${latencyDelta}%` },
        { label: "Candidate errors", value: `${candidateErrorRate}%` },
      ],
      comparison: [
        {
          metric: "p95 latency",
          main: `${baselineP95} ms`,
          candidate: `${candidateP95} ms`,
          delta: `+${latencyDelta}%`,
        },
        {
          metric: "Throughput",
          main: `${baselineThroughput} rps`,
          candidate: `${candidateThroughput} rps`,
          delta: `${throughputDelta}%`,
        },
        {
          metric: "Error rate",
          main: "0.4%",
          candidate: `${candidateErrorRate}%`,
          delta: `+${(Number(candidateErrorRate) - 0.4).toFixed(1)} pp`,
        },
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
      sections: [
        {
          title: "Simulated scenarios",
          content:
            "Dependency latency, one worker restart, and a transient GitHub API failure.",
        },
        {
          title: "Recovery behavior",
          content:
            "All scenarios recovered; the slowest returned to steady state in 41 seconds.",
        },
        {
          title: "Verdict",
          content:
            "Pass with watch: monitor retry bursts and mission-page availability after deploy.",
        },
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
      mcpCalls: [
        {
          name: "get_metrics",
          summary: "Read candidate latency, throughput, and error signals.",
          output: "p95=468ms · error_rate=0.8% · throughput=236rps",
        },
        {
          name: "get_logs",
          summary: "Search for mission and provider failures.",
          output: "2 retry warnings · 0 terminal mission failures",
        },
        {
          name: "get_traces",
          summary: "Inspect orchestrator-to-specialist latency.",
          output: "p95 delegation=1.8s · slowest specialist=chaos-test",
        },
        {
          name: "get_events",
          summary: "Read deployment and pull-request events.",
          output: "candidate deployed · observation window opened",
        },
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
