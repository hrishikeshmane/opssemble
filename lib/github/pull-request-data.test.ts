import { describe, expect, it } from "vitest"

import {
  decodeGitHubPullRequestDetail,
  decodeGitHubPullRequestDiff,
  decodeGitHubPullRequests,
  GitHubPullRequestDataError,
  mergeGitHubPullRequestFiles,
} from "./pull-request-data"

const summary = {
  number: 42,
  title: "Keep repository operations local",
  url: "https://github.com/acme/opssemble/pull/42",
  state: "OPEN",
  isDraft: false,
  author: { login: "octocat" },
  baseRefName: "main",
  headRefName: "local-projects",
  additions: 18,
  deletions: 4,
  changedFiles: 2,
  reviewDecision: "REVIEW_REQUIRED",
  updatedAt: "2026-08-23T20:00:00Z",
}

describe("GitHub pull request data", () => {
  it("decodes pull request summaries", () => {
    expect(decodeGitHubPullRequests([summary])).toEqual([
      {
        number: 42,
        title: "Keep repository operations local",
        url: "https://github.com/acme/opssemble/pull/42",
        state: "open",
        isDraft: false,
        author: "octocat",
        baseBranch: "main",
        headBranch: "local-projects",
        additions: 18,
        deletions: 4,
        changedFiles: 2,
        reviewDecision: "review_required",
        updatedAt: "2026-08-23T20:00:00Z",
      },
    ])
  })

  it("decodes checks, reviews, commits, labels, and files", () => {
    const detail = decodeGitHubPullRequestDetail({
      ...summary,
      body: "Adds the complete local project workflow.",
      createdAt: "2026-08-23T19:00:00Z",
      closedAt: null,
      mergedAt: null,
      mergeable: "MERGEABLE",
      mergeStateStatus: "CLEAN",
      labels: [{ name: "feature", color: "1d76db" }],
      statusCheckRollup: [
        {
          __typename: "CheckRun",
          name: "test",
          workflowName: "CI",
          status: "COMPLETED",
          conclusion: "SUCCESS",
          detailsUrl: "https://github.com/acme/opssemble/actions/1",
          startedAt: "2026-08-23T20:01:00Z",
          completedAt: "2026-08-23T20:02:00Z",
        },
        {
          __typename: "StatusContext",
          context: "deploy",
          state: "PENDING",
          targetUrl: "https://example.com/deploy",
          startedAt: "2026-08-23T20:03:00Z",
        },
      ],
      reviews: [
        {
          author: { login: "reviewer" },
          state: "APPROVED",
          body: "Looks good.",
          submittedAt: "2026-08-23T20:04:00Z",
          commit: { oid: "abcdef123456" },
        },
      ],
      commits: [
        {
          oid: "abcdef1234567890",
          messageHeadline: "feat: add project workflow",
          messageBody: "",
          authoredDate: "2026-08-23T19:30:00Z",
          committedDate: "2026-08-23T19:31:00Z",
          authors: [{ login: "octocat", name: "Octo Cat" }],
        },
      ],
      files: [
        { path: "lib/projects/manage-project.ts", additions: 12, deletions: 2 },
        { path: "app/projects/page.tsx", additions: 6, deletions: 2 },
      ],
    })

    expect(detail.checks.map((check) => check.bucket)).toEqual([
      "pass",
      "pending",
    ])
    expect(detail.reviews[0]).toMatchObject({
      author: "reviewer",
      state: "approved",
      commitOid: "abcdef123456",
    })
    expect(detail.commits[0]).toMatchObject({
      headline: "feat: add project workflow",
      authors: ["octocat"],
    })
    expect(detail.labels).toEqual([{ name: "feature", color: "1d76db" }])
    expect(detail.files).toEqual([
      {
        path: "lib/projects/manage-project.ts",
        additions: 12,
        deletions: 2,
        hunks: [],
      },
      {
        path: "app/projects/page.tsx",
        additions: 6,
        deletions: 2,
        hunks: [],
      },
    ])
  })

  it("parses and merges unified diff hunks", () => {
    const diff =
      decodeGitHubPullRequestDiff(`diff --git a/lib/example.ts b/lib/example.ts
index 1111111..2222222 100644
--- a/lib/example.ts
+++ b/lib/example.ts
@@ -1,2 +1,2 @@
-const mode = "remote"
+const mode = "local"
 export { mode }
`)

    expect(diff).toEqual([
      {
        path: "lib/example.ts",
        additions: 1,
        deletions: 1,
        hunks: [
          {
            header: "@@ -1,2 +1,2 @@",
            lines: [
              {
                kind: "del",
                oldLine: 1,
                newLine: null,
                text: 'const mode = "remote"',
              },
              {
                kind: "add",
                oldLine: null,
                newLine: 1,
                text: 'const mode = "local"',
              },
              {
                kind: "ctx",
                oldLine: 2,
                newLine: 2,
                text: "export { mode }",
              },
            ],
          },
        ],
      },
    ])

    expect(
      mergeGitHubPullRequestFiles(
        [
          {
            path: "lib/example.ts",
            additions: 1,
            deletions: 1,
            hunks: [],
          },
          {
            path: "README.md",
            additions: 1,
            deletions: 0,
            hunks: [],
          },
        ],
        diff
      )
    ).toEqual([
      diff[0],
      {
        path: "README.md",
        additions: 1,
        deletions: 0,
        hunks: [],
      },
    ])
  })

  it("rejects malformed pull request records", () => {
    expect(() =>
      decodeGitHubPullRequests([{ ...summary, number: "42" }])
    ).toThrow(GitHubPullRequestDataError)
  })
})
