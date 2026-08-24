import { describe, expect, it, vi } from "vitest"

import type {
  GitHubPullRequestDetail,
  GitHubPullRequestFile,
} from "../github/pull-request-data"

import type { ManagedAgentProject } from "./confinement"
import { AgentRuntimeError } from "./errors"
import {
  loadPullRequestContext,
  PULL_REQUEST_CONTEXT_LIMITS,
  type PullRequestContextDependencies,
} from "./pull-request-context"

const project = {
  repositoryRoot: "/managed/project/repo",
} as ManagedAgentProject

function file(
  path: string,
  hunks: GitHubPullRequestFile["hunks"] = []
): GitHubPullRequestFile {
  return { path, additions: 1, deletions: 1, hunks }
}

function detail(
  overrides: Partial<GitHubPullRequestDetail> = {}
): GitHubPullRequestDetail {
  return {
    number: 42,
    title: "Bound the agent context",
    body: "Pull request body",
    author: "octocat",
    baseBranch: "main",
    headBranch: "feature/context",
    url: "https://github.com/acme/service/pull/42",
    additions: 20,
    deletions: 10,
    changedFiles: 1,
    state: "open",
    isDraft: false,
    reviewDecision: null,
    updatedAt: "2026-08-23T00:00:00.000Z",
    createdAt: "2026-08-23T00:00:00.000Z",
    closedAt: null,
    mergedAt: null,
    mergeable: "MERGEABLE",
    mergeStateStatus: "CLEAN",
    labels: [],
    checks: [],
    reviews: [],
    commits: [],
    files: [file("lib/example.ts")],
    ...overrides,
  }
}

function dependencies(
  pullRequest = detail(),
  diff: GitHubPullRequestFile[] | Error = pullRequest.files
): PullRequestContextDependencies {
  return {
    getGitHubPullRequest: vi.fn().mockResolvedValue(pullRequest),
    getGitHubPullRequestDiff:
      diff instanceof Error
        ? vi.fn().mockRejectedValue(diff)
        : vi.fn().mockResolvedValue(diff),
  }
}

function githubError(message: string): Error {
  const error = new Error(message)
  error.name = "GitHubCliError"
  return error
}

describe("loadPullRequestContext", () => {
  it("strictly bounds body, files, hunks, lines, and total diff text", async () => {
    const lines = Array.from(
      { length: PULL_REQUEST_CONTEXT_LIMITS.linesPerHunk + 1 },
      (_, index) => ({
        kind: "add" as const,
        oldLine: null,
        newLine: index + 1,
        text:
          index === 0
            ? "x".repeat(PULL_REQUEST_CONTEXT_LIMITS.totalDiffChars + 100)
            : `line ${index}`,
      })
    )
    const hunks = Array.from(
      { length: PULL_REQUEST_CONTEXT_LIMITS.hunksPerFile + 1 },
      (_, index) => ({ header: `@@ hunk ${index} @@`, lines })
    )
    const files = Array.from(
      { length: PULL_REQUEST_CONTEXT_LIMITS.files + 1 },
      (_, index) => file(`lib/file-${index}.ts`, index === 0 ? hunks : [])
    )
    const calls = dependencies(
      detail({
        body: "b".repeat(PULL_REQUEST_CONTEXT_LIMITS.bodyChars + 1),
        changedFiles: files.length,
        files,
      }),
      files
    )

    const context = await loadPullRequestContext(
      project,
      42,
      new AbortController().signal,
      calls
    )

    expect(context.body).toHaveLength(PULL_REQUEST_CONTEXT_LIMITS.bodyChars)
    expect(context.files).toHaveLength(PULL_REQUEST_CONTEXT_LIMITS.files)
    expect(
      context.files.reduce((length, entry) => length + entry.diff.length, 0)
    ).toBeLessThanOrEqual(PULL_REQUEST_CONTEXT_LIMITS.totalDiffChars)
    expect(context.truncation).toMatchObject({
      body: true,
      files: true,
      hunks: true,
      lines: true,
      diffChars: true,
    })
    expect(calls.getGitHubPullRequest).toHaveBeenCalledWith(
      project.repositoryRoot,
      42,
      { signal: expect.any(AbortSignal) }
    )
    expect(calls.getGitHubPullRequestDiff).toHaveBeenCalledWith(
      project.repositoryRoot,
      42,
      { signal: expect.any(AbortSignal) }
    )
    expect(context.files[0]).toMatchObject({
      hunksTruncated: true,
      linesTruncated: true,
      diffTruncated: true,
    })
    expect(() => JSON.stringify(context)).not.toThrow()
  })

  it("checks cancellation before and after both fixed GitHub reads", async () => {
    const preAborted = new AbortController()
    preAborted.abort()
    const unused = dependencies()

    await expect(
      loadPullRequestContext(project, 42, preAborted.signal, unused)
    ).rejects.toMatchObject({ code: "ABORTED" })
    expect(unused.getGitHubPullRequest).not.toHaveBeenCalled()

    const afterDetail = new AbortController()
    const detailCalls = dependencies()
    vi.mocked(detailCalls.getGitHubPullRequest).mockImplementation(async () => {
      afterDetail.abort()
      return detail()
    })
    await expect(
      loadPullRequestContext(project, 42, afterDetail.signal, detailCalls)
    ).rejects.toMatchObject({ code: "ABORTED" })
    expect(detailCalls.getGitHubPullRequestDiff).not.toHaveBeenCalled()

    const afterDiff = new AbortController()
    const diffCalls = dependencies()
    vi.mocked(diffCalls.getGitHubPullRequestDiff).mockImplementation(
      async () => {
        afterDiff.abort()
        return detail().files
      }
    )
    await expect(
      loadPullRequestContext(project, 42, afterDiff.signal, diffCalls)
    ).rejects.toMatchObject({ code: "ABORTED" })
  })

  it("validates input, sanitizes failures, and falls back without a diff", async () => {
    const invalidCalls = dependencies()
    await expect(
      loadPullRequestContext(
        project,
        0,
        new AbortController().signal,
        invalidCalls
      )
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" })
    expect(invalidCalls.getGitHubPullRequest).not.toHaveBeenCalled()

    const secret = "raw-stderr-secret"
    const failedCalls = dependencies()
    vi.mocked(failedCalls.getGitHubPullRequest).mockRejectedValue(
      githubError(secret)
    )
    const failure = await loadPullRequestContext(
      project,
      42,
      new AbortController().signal,
      failedCalls
    ).catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(AgentRuntimeError)
    expect(failure).toMatchObject({
      code: "TOOL_ERROR",
      message: "Pull request context could not be loaded.",
    })
    expect(failure).not.toHaveProperty("cause")
    expect(JSON.stringify(failure)).not.toContain(secret)

    const fallback = await loadPullRequestContext(
      project,
      42,
      new AbortController().signal,
      dependencies(detail(), githubError(secret))
    )
    expect(fallback.diffStatus).toBe("unavailable")
    expect(fallback.files).toEqual([
      expect.objectContaining({ path: "lib/example.ts", diff: "" }),
    ])

    const malformedCalls = dependencies({
      ...detail(),
      title: null,
    } as unknown as GitHubPullRequestDetail)
    await expect(
      loadPullRequestContext(
        project,
        42,
        new AbortController().signal,
        malformedCalls
      )
    ).rejects.toMatchObject({
      code: "TOOL_ERROR",
      message: "Pull request context could not be loaded.",
    })
  })
})
