import { describe, expect, it } from "vitest"

import type { GitHubPullRequest } from "./pull-request-data"
import { filterGitHubPullRequests } from "./pull-request-filter"

const pullRequests: GitHubPullRequest[] = [
  {
    number: 12,
    title: "Add local project imports",
    url: "https://github.com/acme/opssemble/pull/12",
    state: "open",
    isDraft: false,
    author: "octocat",
    baseBranch: "main",
    headBranch: "projects",
    additions: 20,
    deletions: 2,
    changedFiles: 3,
    reviewDecision: null,
    updatedAt: "2026-08-23T20:00:00Z",
  },
  {
    number: 9,
    title: "Remove remote callbacks",
    url: "https://github.com/acme/opssemble/pull/9",
    state: "merged",
    isDraft: false,
    author: "hubot",
    baseBranch: "main",
    headBranch: "local-only",
    additions: 8,
    deletions: 10,
    changedFiles: 2,
    reviewDecision: "approved",
    updatedAt: "2026-08-22T20:00:00Z",
  },
]

describe("filterGitHubPullRequests", () => {
  it("filters by state", () => {
    expect(filterGitHubPullRequests(pullRequests, "", "merged")).toEqual([
      pullRequests[1],
    ])
  })

  it.each(["#12", "octocat", "projects", "local project"])(
    "searches pull request metadata with %s",
    (query) => {
      expect(filterGitHubPullRequests(pullRequests, query, "all")).toEqual([
        pullRequests[0],
      ])
    }
  )

  it("combines search and state filters", () => {
    expect(filterGitHubPullRequests(pullRequests, "hubot", "open")).toEqual([])
  })
})
