import "server-only"

import { execFile as execFileCallback } from "node:child_process"
import { promisify } from "node:util"

import {
  decodeGitHubPullRequestDetail,
  decodeGitHubPullRequestDiff,
  decodeGitHubPullRequests,
  GitHubPullRequestDataError,
  type GitHubPullRequest,
  type GitHubPullRequestDetail,
  type GitHubPullRequestFile,
} from "@/lib/github/pull-request-data"

const execFile = promisify(execFileCallback)
const DEFAULT_TIMEOUT_MS = 30_000
const MAX_OUTPUT_BYTES = 5 * 1024 * 1024

export type GitHubRepository = {
  id: string
  nameWithOwner: string
  owner: string
  repository: string
  url: string
  defaultBranch: string | null
}

export class GitHubCliError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "GitHubCliError"
  }
}

export class GitHubCliUnavailableError extends GitHubCliError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "GitHubCliUnavailableError"
  }
}

type ProcessFailure = Error & {
  code?: number | string
  stderr?: string | Buffer
}

function firstLine(value: unknown): string | null {
  const text =
    typeof value === "string"
      ? value
      : Buffer.isBuffer(value)
        ? value.toString("utf8")
        : ""
  const line = text
    .split(/\r?\n/)
    .map((part) => part.trim())
    .find(Boolean)

  return line ? line.slice(0, 300) : null
}

async function runGitHubCli(
  args: string[],
  options: { cwd?: string; timeoutMs?: number } = {}
): Promise<string> {
  try {
    const result = await execFile("gh", args, {
      cwd: options.cwd,
      encoding: "utf8",
      timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT_BYTES,
      env: {
        ...process.env,
        GH_PAGER: "cat",
        GH_PROMPT_DISABLED: "1",
        NO_COLOR: "1",
        PAGER: "cat",
      },
    })

    return result.stdout
  } catch (error) {
    const failure = error as ProcessFailure

    if (failure.code === "ENOENT") {
      throw new GitHubCliUnavailableError(
        "GitHub CLI is not installed. Install `gh` and try again.",
        { cause: error }
      )
    }

    const detail = firstLine(failure.stderr) ?? firstLine(failure.message)
    throw new GitHubCliError(
      detail ?? "GitHub CLI could not complete the request.",
      { cause: error }
    )
  }
}

function parseJson(value: string, operation: string): unknown {
  try {
    return JSON.parse(value)
  } catch (error) {
    throw new GitHubCliError(
      `GitHub CLI returned unreadable ${operation} data.`,
      { cause: error }
    )
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function requiredString(
  value: Record<string, unknown>,
  key: string,
  operation: string
): string {
  const field = value[key]

  if (typeof field !== "string" || field.length === 0) {
    throw new GitHubCliError(
      `GitHub CLI returned incomplete ${operation} data.`
    )
  }

  return field
}

function decodeCliData<T>(operation: () => T): T {
  try {
    return operation()
  } catch (error) {
    if (error instanceof GitHubPullRequestDataError) {
      throw new GitHubCliError(error.message, { cause: error })
    }

    throw error
  }
}

export async function assertGitHubAuthentication(): Promise<void> {
  try {
    await runGitHubCli(["auth", "status", "--active"])
  } catch (error) {
    if (error instanceof GitHubCliUnavailableError) {
      throw error
    }

    if (error instanceof GitHubCliError) {
      throw new GitHubCliError(
        "GitHub CLI is not authenticated. Run `gh auth login` and try again.",
        { cause: error }
      )
    }

    throw error
  }
}

export async function getGitHubRepository(
  slug: string
): Promise<GitHubRepository> {
  const raw = parseJson(
    await runGitHubCli([
      "repo",
      "view",
      slug,
      "--json",
      "id,nameWithOwner,url,defaultBranchRef",
    ]),
    "repository"
  )

  if (!isRecord(raw)) {
    throw new GitHubCliError("GitHub CLI returned unreadable repository data.")
  }

  const nameWithOwner = requiredString(raw, "nameWithOwner", "repository")
  const [owner, repository, ...extra] = nameWithOwner.split("/")

  if (!owner || !repository || extra.length > 0) {
    throw new GitHubCliError("GitHub CLI returned an invalid repository name.")
  }

  const defaultBranchRef = raw.defaultBranchRef
  const defaultBranch =
    isRecord(defaultBranchRef) && typeof defaultBranchRef.name === "string"
      ? defaultBranchRef.name
      : null

  return {
    id: requiredString(raw, "id", "repository"),
    nameWithOwner,
    owner,
    repository,
    url: requiredString(raw, "url", "repository"),
    defaultBranch,
  }
}

export async function cloneGitHubRepository(
  slug: string,
  destination: string
): Promise<void> {
  await runGitHubCli(["repo", "clone", slug, destination], {
    timeoutMs: 120_000,
  })
}

export async function listGitHubPullRequests(
  repositoryPath: string
): Promise<GitHubPullRequest[]> {
  const raw = parseJson(
    await runGitHubCli(
      [
        "pr",
        "list",
        "--state",
        "all",
        "--limit",
        "99",
        "--json",
        [
          "number",
          "title",
          "url",
          "state",
          "isDraft",
          "author",
          "baseRefName",
          "headRefName",
          "additions",
          "deletions",
          "changedFiles",
          "reviewDecision",
          "updatedAt",
        ].join(","),
      ],
      { cwd: repositoryPath }
    ),
    "pull request"
  )

  return decodeCliData(() => decodeGitHubPullRequests(raw))
}

const PULL_REQUEST_DETAIL_FIELDS = [
  "number",
  "title",
  "url",
  "state",
  "isDraft",
  "author",
  "body",
  "baseRefName",
  "headRefName",
  "additions",
  "deletions",
  "changedFiles",
  "reviewDecision",
  "createdAt",
  "updatedAt",
  "closedAt",
  "mergedAt",
  "mergeable",
  "mergeStateStatus",
  "labels",
  "reviews",
  "commits",
  "files",
  "statusCheckRollup",
] as const

export async function getGitHubPullRequest(
  repositoryPath: string,
  pullRequestNumber: number
): Promise<GitHubPullRequestDetail> {
  if (!Number.isSafeInteger(pullRequestNumber) || pullRequestNumber < 1) {
    throw new GitHubCliError("Enter a valid pull request number.")
  }

  const raw = parseJson(
    await runGitHubCli(
      [
        "pr",
        "view",
        String(pullRequestNumber),
        "--json",
        PULL_REQUEST_DETAIL_FIELDS.join(","),
      ],
      { cwd: repositoryPath }
    ),
    "pull request"
  )

  return decodeCliData(() => decodeGitHubPullRequestDetail(raw))
}

export async function getGitHubPullRequestDiff(
  repositoryPath: string,
  pullRequestNumber: number
): Promise<GitHubPullRequestFile[]> {
  if (!Number.isSafeInteger(pullRequestNumber) || pullRequestNumber < 1) {
    throw new GitHubCliError("Enter a valid pull request number.")
  }

  const raw = await runGitHubCli(["pr", "diff", String(pullRequestNumber)], {
    cwd: repositoryPath,
    timeoutMs: 120_000,
  })

  return decodeCliData(() => decodeGitHubPullRequestDiff(raw))
}
