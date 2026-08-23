import { describe, expect, it } from "vitest"

import { buildPullRequestMission } from "./pull-request-mission"

describe("buildPullRequestMission", () => {
  it("builds an orchestrator decision and four selected agents", () => {
    const mission = buildPullRequestMission({
      title: "Add project mission workflow",
      headBranch: "feat/project-missions",
      baseBranch: "main",
      changedFiles: 4,
      additions: 120,
      deletions: 18,
      checks: [],
      reviews: [],
    })

    expect(mission.orchestrator.headline).toBe(
      "Selected 4 agents for this pull request"
    )
    expect(mission.agents.map((agent) => agent.key)).toEqual([
      "impact",
      "stress-test",
      "chaos",
      "watch-arm",
    ])
    expect(mission.agents[0].metrics[1].value).toBe("138")
    expect(mission.agents[1].reportSummary).toContain("Dummy run")
    expect(mission.agents[2].reportSummary).toContain("Dummy run")
    expect(mission.agents[3].acceptsInstructions).toBe(true)
  })
})
