import "server-only"

import {
  mergeGitHubPullRequestFiles,
  type GitHubPullRequestDetail,
  type GitHubPullRequestDiffHunk,
  type GitHubPullRequestDiffLine,
  type GitHubPullRequestFile,
} from "../github/pull-request-data"

import type { ManagedAgentProject } from "./confinement"
import { AgentRuntimeError } from "./errors"

export const PULL_REQUEST_CONTEXT_LIMITS = {
  bodyChars: 12_000,
  titleChars: 500,
  authorChars: 200,
  refChars: 300,
  urlChars: 2_048,
  pathChars: 1_024,
  files: 30,
  hunksPerFile: 12,
  linesPerHunk: 120,
  totalDiffChars: 48_000,
} as const

export type PullRequestContextFile = {
  path: string
  pathTruncated: boolean
  additions: number
  deletions: number
  diff: string
  hunksTruncated: boolean
  linesTruncated: boolean
  diffTruncated: boolean
}

export type PullRequestContext = {
  number: number
  title: string
  body: string
  author: string
  base: string
  head: string
  url: string
  additions: number
  deletions: number
  changedFiles: number
  files: PullRequestContextFile[]
  diffStatus: "loaded" | "unavailable"
  truncation: {
    metadata: boolean
    body: boolean
    files: boolean
    hunks: boolean
    lines: boolean
    diffChars: boolean
  }
}

export type PullRequestContextDependencies = {
  getGitHubPullRequest(
    repositoryPath: string,
    pullRequestNumber: number,
    options?: { signal?: AbortSignal }
  ): Promise<GitHubPullRequestDetail>
  getGitHubPullRequestDiff(
    repositoryPath: string,
    pullRequestNumber: number,
    options?: { signal?: AbortSignal }
  ): Promise<GitHubPullRequestFile[]>
}

async function loadDefaultDependencies(): Promise<PullRequestContextDependencies> {
  const client = await import("../github/client")

  return {
    getGitHubPullRequest: client.getGitHubPullRequest,
    getGitHubPullRequestDiff: client.getGitHubPullRequestDiff,
  }
}

const LOAD_ERROR_MESSAGE = "Pull request context could not be loaded."

type ValidatedPullRequest = {
  number: number
  title: string
  body: string
  author: string
  baseBranch: string
  headBranch: string
  url: string
  additions: number
  deletions: number
  changedFiles: number
  files: GitHubPullRequestFile[]
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new AgentRuntimeError("ABORTED", "The agent run was cancelled.")
  }
}

function sanitizedLoadError(error: unknown): AgentRuntimeError {
  if (error instanceof Error && error.name === "GitHubCliError") {
    return new AgentRuntimeError("TOOL_ERROR", LOAD_ERROR_MESSAGE)
  }

  return new AgentRuntimeError("TOOL_ERROR", LOAD_ERROR_MESSAGE)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0
}

function requireString(
  value: Record<string, unknown>,
  key: string,
  allowEmpty = false
): string {
  const field = value[key]

  if (typeof field !== "string" || (!allowEmpty && field.length === 0)) {
    throw new Error("Malformed pull request data")
  }

  return field
}

function requireCount(value: Record<string, unknown>, key: string): number {
  const field = value[key]

  if (!isNonNegativeInteger(field)) {
    throw new Error("Malformed pull request data")
  }

  return field
}

function validateLine(value: unknown): GitHubPullRequestDiffLine {
  if (
    !isRecord(value) ||
    (value.kind !== "add" && value.kind !== "del" && value.kind !== "ctx") ||
    typeof value.text !== "string"
  ) {
    throw new Error("Malformed pull request data")
  }

  return value as GitHubPullRequestDiffLine
}

function validateHunk(value: unknown): GitHubPullRequestDiffHunk {
  if (
    !isRecord(value) ||
    typeof value.header !== "string" ||
    !Array.isArray(value.lines)
  ) {
    throw new Error("Malformed pull request data")
  }

  return {
    header: value.header,
    lines: value.lines
      .slice(0, PULL_REQUEST_CONTEXT_LIMITS.linesPerHunk + 1)
      .map(validateLine),
  }
}

function validateFile(value: unknown): GitHubPullRequestFile {
  if (
    !isRecord(value) ||
    typeof value.path !== "string" ||
    value.path.length === 0 ||
    !Array.isArray(value.hunks)
  ) {
    throw new Error("Malformed pull request data")
  }

  return {
    path: value.path,
    additions: requireCount(value, "additions"),
    deletions: requireCount(value, "deletions"),
    hunks: value.hunks
      .slice(0, PULL_REQUEST_CONTEXT_LIMITS.hunksPerFile + 1)
      .map(validateHunk),
  }
}

function validateFiles(value: unknown): GitHubPullRequestFile[] {
  if (!Array.isArray(value)) {
    throw new Error("Malformed pull request data")
  }

  return value.slice(0, PULL_REQUEST_CONTEXT_LIMITS.files + 1).map(validateFile)
}

function validatePullRequest(
  value: unknown,
  requestedNumber: number
): ValidatedPullRequest {
  if (!isRecord(value) || value.number !== requestedNumber) {
    throw new Error("Malformed pull request data")
  }

  return {
    number: requestedNumber,
    title: requireString(value, "title"),
    body: requireString(value, "body", true),
    author: requireString(value, "author"),
    baseBranch: requireString(value, "baseBranch"),
    headBranch: requireString(value, "headBranch"),
    url: requireString(value, "url"),
    additions: requireCount(value, "additions"),
    deletions: requireCount(value, "deletions"),
    changedFiles: requireCount(value, "changedFiles"),
    files: validateFiles(value.files),
  }
}

function truncate(value: string, maximum: number) {
  return {
    value: value.slice(0, maximum),
    truncated: value.length > maximum,
  }
}

function linePrefix(kind: GitHubPullRequestDiffLine["kind"]): string {
  if (kind === "add") return "+"
  if (kind === "del") return "-"
  return " "
}

function renderFiles(files: GitHubPullRequestFile[]): {
  files: PullRequestContextFile[]
  metadataTruncated: boolean
  hunksTruncated: boolean
  linesTruncated: boolean
  diffCharsTruncated: boolean
} {
  let remainingDiffChars: number = PULL_REQUEST_CONTEXT_LIMITS.totalDiffChars
  let metadataTruncated = false
  let anyHunksTruncated = false
  let anyLinesTruncated = false
  let anyDiffCharsTruncated = false

  const rendered = files
    .slice(0, PULL_REQUEST_CONTEXT_LIMITS.files)
    .map((file) => {
      const path = truncate(file.path, PULL_REQUEST_CONTEXT_LIMITS.pathChars)
      const hunksTruncated =
        file.hunks.length > PULL_REQUEST_CONTEXT_LIMITS.hunksPerFile
      const visibleHunks = file.hunks.slice(
        0,
        PULL_REQUEST_CONTEXT_LIMITS.hunksPerFile
      )
      const linesTruncated = visibleHunks.some(
        (hunk) => hunk.lines.length > PULL_REQUEST_CONTEXT_LIMITS.linesPerHunk
      )
      let diff = ""
      let diffTruncated = false

      const append = (text: string): boolean => {
        if (text.length <= remainingDiffChars) {
          diff += text
          remainingDiffChars -= text.length
          return true
        }

        diff += text.slice(0, remainingDiffChars)
        remainingDiffChars = 0
        diffTruncated = true
        anyDiffCharsTruncated = true
        return false
      }

      outer: for (const hunk of visibleHunks) {
        if (!append(`${hunk.header}\n`)) break

        for (const line of hunk.lines.slice(
          0,
          PULL_REQUEST_CONTEXT_LIMITS.linesPerHunk
        )) {
          if (!append(`${linePrefix(line.kind)}${line.text}\n`)) {
            break outer
          }
        }
      }

      if (remainingDiffChars === 0 && visibleHunks.length > 0 && diff === "") {
        diffTruncated = true
        anyDiffCharsTruncated = true
      }

      metadataTruncated ||= path.truncated
      anyHunksTruncated ||= hunksTruncated
      anyLinesTruncated ||= linesTruncated

      return {
        path: path.value,
        pathTruncated: path.truncated,
        additions: file.additions,
        deletions: file.deletions,
        diff,
        hunksTruncated,
        linesTruncated,
        diffTruncated,
      }
    })

  return {
    files: rendered,
    metadataTruncated,
    hunksTruncated: anyHunksTruncated,
    linesTruncated: anyLinesTruncated,
    diffCharsTruncated: anyDiffCharsTruncated,
  }
}

export async function loadPullRequestContext(
  project: ManagedAgentProject,
  pullRequestNumber: number,
  signal: AbortSignal,
  dependencies?: PullRequestContextDependencies
): Promise<PullRequestContext> {
  if (!Number.isSafeInteger(pullRequestNumber) || pullRequestNumber < 1) {
    throw new AgentRuntimeError(
      "INVALID_REQUEST",
      "Enter a positive pull request number."
    )
  }

  throwIfAborted(signal)
  const github = dependencies ?? (await loadDefaultDependencies())
  throwIfAborted(signal)

  let pullRequest: ValidatedPullRequest

  try {
    const value = await github.getGitHubPullRequest(
      project.repositoryRoot,
      pullRequestNumber,
      { signal }
    )
    throwIfAborted(signal)
    pullRequest = validatePullRequest(value, pullRequestNumber)
  } catch (error) {
    throwIfAborted(signal)
    throw sanitizedLoadError(error)
  }

  throwIfAborted(signal)

  let files = pullRequest.files
  let diffStatus: PullRequestContext["diffStatus"] = "loaded"

  try {
    const diff = await github.getGitHubPullRequestDiff(
      project.repositoryRoot,
      pullRequestNumber,
      { signal }
    )
    throwIfAborted(signal)
    files = mergeGitHubPullRequestFiles(files, validateFiles(diff))
  } catch {
    throwIfAborted(signal)
    diffStatus = "unavailable"
  }

  throwIfAborted(signal)

  const title = truncate(
    pullRequest.title,
    PULL_REQUEST_CONTEXT_LIMITS.titleChars
  )
  const body = truncate(pullRequest.body, PULL_REQUEST_CONTEXT_LIMITS.bodyChars)
  const author = truncate(
    pullRequest.author,
    PULL_REQUEST_CONTEXT_LIMITS.authorChars
  )
  const base = truncate(
    pullRequest.baseBranch,
    PULL_REQUEST_CONTEXT_LIMITS.refChars
  )
  const head = truncate(
    pullRequest.headBranch,
    PULL_REQUEST_CONTEXT_LIMITS.refChars
  )
  const url = truncate(pullRequest.url, PULL_REQUEST_CONTEXT_LIMITS.urlChars)
  const rendered = renderFiles(files)
  const filesTruncated =
    pullRequest.changedFiles > PULL_REQUEST_CONTEXT_LIMITS.files ||
    files.length > PULL_REQUEST_CONTEXT_LIMITS.files

  return {
    number: pullRequest.number,
    title: title.value,
    body: body.value,
    author: author.value,
    base: base.value,
    head: head.value,
    url: url.value,
    additions: pullRequest.additions,
    deletions: pullRequest.deletions,
    changedFiles: pullRequest.changedFiles,
    files: rendered.files,
    diffStatus,
    truncation: {
      metadata:
        title.truncated ||
        author.truncated ||
        base.truncated ||
        head.truncated ||
        url.truncated ||
        rendered.metadataTruncated,
      body: body.truncated,
      files: filesTruncated,
      hunks: rendered.hunksTruncated,
      lines: rendered.linesTruncated,
      diffChars: rendered.diffCharsTruncated,
    },
  }
}
