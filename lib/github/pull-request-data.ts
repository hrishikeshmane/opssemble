import parseDiff from "parse-diff"

export type GitHubPullRequestState = "open" | "closed" | "merged"

export type GitHubPullRequest = {
  number: number
  title: string
  url: string
  state: GitHubPullRequestState
  isDraft: boolean
  author: string
  baseBranch: string
  headBranch: string
  additions: number
  deletions: number
  changedFiles: number
  reviewDecision: string | null
  updatedAt: string
}

export type GitHubPullRequestCheckBucket =
  "pass" | "fail" | "pending" | "skipping" | "cancel" | "unknown"

export type GitHubPullRequestCheck = {
  name: string
  workflow: string | null
  status: string
  bucket: GitHubPullRequestCheckBucket
  link: string | null
  startedAt: string | null
  completedAt: string | null
}

export type GitHubPullRequestReview = {
  author: string
  state: string
  body: string
  submittedAt: string | null
  commitOid: string | null
}

export type GitHubPullRequestCommit = {
  oid: string
  headline: string
  body: string
  authoredAt: string
  committedAt: string
  authors: string[]
}

export type GitHubPullRequestLabel = {
  name: string
  color: string | null
}

export type GitHubPullRequestDiffLine = {
  kind: "add" | "del" | "ctx"
  oldLine: number | null
  newLine: number | null
  text: string
}

export type GitHubPullRequestDiffHunk = {
  header: string
  lines: GitHubPullRequestDiffLine[]
}

export type GitHubPullRequestFile = {
  path: string
  additions: number
  deletions: number
  hunks: GitHubPullRequestDiffHunk[]
}

export type GitHubPullRequestDetail = GitHubPullRequest & {
  body: string
  createdAt: string
  closedAt: string | null
  mergedAt: string | null
  mergeable: string | null
  mergeStateStatus: string | null
  labels: GitHubPullRequestLabel[]
  checks: GitHubPullRequestCheck[]
  reviews: GitHubPullRequestReview[]
  commits: GitHubPullRequestCommit[]
  files: GitHubPullRequestFile[]
}

export class GitHubPullRequestDataError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "GitHubPullRequestDataError"
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
    throw new GitHubPullRequestDataError(
      `GitHub CLI returned incomplete ${operation} data.`
    )
  }

  return field
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function requiredNumber(
  value: Record<string, unknown>,
  key: string,
  operation: string
): number {
  const field = value[key]

  if (typeof field !== "number" || !Number.isFinite(field)) {
    throw new GitHubPullRequestDataError(
      `GitHub CLI returned incomplete ${operation} data.`
    )
  }

  return field
}

function normalizePullRequestState(value: unknown): GitHubPullRequestState {
  const state = typeof value === "string" ? value.toLowerCase() : ""

  if (state === "open" || state === "closed" || state === "merged") {
    return state
  }

  throw new GitHubPullRequestDataError(
    "GitHub CLI returned an unsupported pull request state."
  )
}

function normalizeActor(value: unknown): string {
  if (!isRecord(value)) {
    return "ghost"
  }

  return (
    optionalString(value.login) ??
    optionalString(value.name) ??
    optionalString(value.email) ??
    "ghost"
  )
}

function normalizeReviewDecision(value: unknown): string | null {
  return typeof value === "string" && value.length > 0
    ? value.toLowerCase()
    : null
}

function decodePullRequest(value: unknown): GitHubPullRequest {
  if (!isRecord(value)) {
    throw new GitHubPullRequestDataError(
      "GitHub CLI returned unreadable pull request data."
    )
  }

  return {
    number: requiredNumber(value, "number", "pull request"),
    title: requiredString(value, "title", "pull request"),
    url: requiredString(value, "url", "pull request"),
    state: normalizePullRequestState(value.state),
    isDraft: value.isDraft === true,
    author: normalizeActor(value.author),
    baseBranch: requiredString(value, "baseRefName", "pull request"),
    headBranch: requiredString(value, "headRefName", "pull request"),
    additions: requiredNumber(value, "additions", "pull request"),
    deletions: requiredNumber(value, "deletions", "pull request"),
    changedFiles: requiredNumber(value, "changedFiles", "pull request"),
    reviewDecision: normalizeReviewDecision(value.reviewDecision),
    updatedAt: requiredString(value, "updatedAt", "pull request"),
  }
}

function normalizeCheckBucket(
  state: string,
  status: string
): GitHubPullRequestCheckBucket {
  const normalizedState = state.toUpperCase()
  const normalizedStatus = status.toUpperCase()

  if (
    normalizedStatus === "QUEUED" ||
    normalizedStatus === "IN_PROGRESS" ||
    normalizedStatus === "PENDING" ||
    normalizedStatus === "WAITING" ||
    normalizedState === "PENDING" ||
    normalizedState === "EXPECTED"
  ) {
    return "pending"
  }

  if (normalizedState === "SUCCESS") {
    return "pass"
  }

  if (
    normalizedState === "FAILURE" ||
    normalizedState === "ERROR" ||
    normalizedState === "TIMED_OUT" ||
    normalizedState === "ACTION_REQUIRED" ||
    normalizedState === "STARTUP_FAILURE"
  ) {
    return "fail"
  }

  if (normalizedState === "CANCELLED") {
    return "cancel"
  }

  if (normalizedState === "SKIPPED" || normalizedState === "NEUTRAL") {
    return "skipping"
  }

  return "unknown"
}

function decodeCheck(value: unknown): GitHubPullRequestCheck {
  if (!isRecord(value)) {
    throw new GitHubPullRequestDataError(
      "GitHub CLI returned unreadable check data."
    )
  }

  const name =
    optionalString(value.name) ??
    optionalString(value.context) ??
    "Unnamed check"
  const conclusion =
    optionalString(value.conclusion) ?? optionalString(value.state) ?? ""
  const status = optionalString(value.status) ?? "UNKNOWN"
  const displayStatus = conclusion || status

  return {
    name,
    workflow: optionalString(value.workflowName),
    status: displayStatus.toLowerCase().replaceAll("_", " "),
    bucket: normalizeCheckBucket(conclusion, status),
    link:
      optionalString(value.detailsUrl) ??
      optionalString(value.targetUrl) ??
      null,
    startedAt: optionalString(value.startedAt),
    completedAt: optionalString(value.completedAt),
  }
}

function decodeReview(value: unknown): GitHubPullRequestReview {
  if (!isRecord(value)) {
    throw new GitHubPullRequestDataError(
      "GitHub CLI returned unreadable review data."
    )
  }

  const commit = isRecord(value.commit) ? value.commit : null

  return {
    author: normalizeActor(value.author),
    state: requiredString(value, "state", "review")
      .toLowerCase()
      .replaceAll("_", " "),
    body: typeof value.body === "string" ? value.body : "",
    submittedAt: optionalString(value.submittedAt),
    commitOid: commit ? optionalString(commit.oid) : null,
  }
}

function decodeCommitAuthor(value: unknown): string | null {
  if (!isRecord(value)) {
    return null
  }

  return (
    optionalString(value.login) ??
    optionalString(value.name) ??
    optionalString(value.email)
  )
}

function decodeCommit(value: unknown): GitHubPullRequestCommit {
  if (!isRecord(value)) {
    throw new GitHubPullRequestDataError(
      "GitHub CLI returned unreadable commit data."
    )
  }

  const authors = Array.isArray(value.authors)
    ? value.authors
        .map(decodeCommitAuthor)
        .filter((author): author is string => author !== null)
    : []

  return {
    oid: requiredString(value, "oid", "commit"),
    headline: requiredString(value, "messageHeadline", "commit"),
    body: typeof value.messageBody === "string" ? value.messageBody : "",
    authoredAt: requiredString(value, "authoredDate", "commit"),
    committedAt: requiredString(value, "committedDate", "commit"),
    authors: authors.length > 0 ? authors : ["Unknown author"],
  }
}

function decodeLabel(value: unknown): GitHubPullRequestLabel {
  if (!isRecord(value)) {
    throw new GitHubPullRequestDataError(
      "GitHub CLI returned unreadable label data."
    )
  }

  return {
    name: requiredString(value, "name", "label"),
    color: optionalString(value.color),
  }
}

function decodeFile(value: unknown): GitHubPullRequestFile {
  if (!isRecord(value)) {
    throw new GitHubPullRequestDataError(
      "GitHub CLI returned unreadable changed-file data."
    )
  }

  return {
    path: requiredString(value, "path", "changed-file"),
    additions: requiredNumber(value, "additions", "changed-file"),
    deletions: requiredNumber(value, "deletions", "changed-file"),
    hunks: [],
  }
}

function decodeArray<T>(
  value: unknown,
  operation: string,
  decode: (item: unknown) => T
): T[] {
  if (!Array.isArray(value)) {
    throw new GitHubPullRequestDataError(
      `GitHub CLI returned unreadable ${operation} data.`
    )
  }

  return value.map(decode)
}

export function decodeGitHubPullRequests(value: unknown): GitHubPullRequest[] {
  return decodeArray(value, "pull request", decodePullRequest)
}

export function decodeGitHubPullRequestDetail(
  value: unknown
): GitHubPullRequestDetail {
  if (!isRecord(value)) {
    throw new GitHubPullRequestDataError(
      "GitHub CLI returned unreadable pull request data."
    )
  }

  return {
    ...decodePullRequest(value),
    body: typeof value.body === "string" ? value.body : "",
    createdAt: requiredString(value, "createdAt", "pull request"),
    closedAt: optionalString(value.closedAt),
    mergedAt: optionalString(value.mergedAt),
    mergeable: optionalString(value.mergeable)?.toLowerCase() ?? null,
    mergeStateStatus:
      optionalString(value.mergeStateStatus)?.toLowerCase() ?? null,
    labels: decodeArray(value.labels, "label", decodeLabel),
    checks: decodeArray(value.statusCheckRollup, "check", decodeCheck),
    reviews: decodeArray(value.reviews, "review", decodeReview),
    commits: decodeArray(value.commits, "commit", decodeCommit),
    files: decodeArray(value.files, "changed-file", decodeFile),
  }
}

function normalizeDiffPath(value: string | undefined): string | null {
  if (!value || value === "/dev/null") {
    return null
  }

  return value.replace(/^[ab]\//, "")
}

function stripDiffPrefix(content: string): string {
  return /^[ +\-]/.test(content) ? content.slice(1) : content
}

export function decodeGitHubPullRequestDiff(
  value: string
): GitHubPullRequestFile[] {
  try {
    return parseDiff(value).map((file) => {
      const path =
        normalizeDiffPath(file.to) ??
        normalizeDiffPath(file.from) ??
        "unknown-file"

      return {
        path,
        additions: file.additions,
        deletions: file.deletions,
        hunks: file.chunks.map((chunk) => ({
          header: chunk.content,
          lines: chunk.changes.map((change) => {
            if (change.type === "add") {
              return {
                kind: "add" as const,
                oldLine: null,
                newLine: change.ln,
                text: stripDiffPrefix(change.content),
              }
            }

            if (change.type === "del") {
              return {
                kind: "del" as const,
                oldLine: change.ln,
                newLine: null,
                text: stripDiffPrefix(change.content),
              }
            }

            return {
              kind: "ctx" as const,
              oldLine: change.ln1,
              newLine: change.ln2,
              text: stripDiffPrefix(change.content),
            }
          }),
        })),
      }
    })
  } catch (error) {
    throw new GitHubPullRequestDataError(
      "GitHub CLI returned an unreadable pull request diff.",
      { cause: error }
    )
  }
}

export function mergeGitHubPullRequestFiles(
  files: readonly GitHubPullRequestFile[],
  diffFiles: readonly GitHubPullRequestFile[]
): GitHubPullRequestFile[] {
  const patches = new Map(diffFiles.map((file) => [file.path, file] as const))
  const merged = files.map((file) => ({
    ...file,
    hunks: patches.get(file.path)?.hunks ?? [],
  }))
  const knownPaths = new Set(files.map((file) => file.path))

  for (const file of diffFiles) {
    if (!knownPaths.has(file.path)) {
      merged.push(file)
    }
  }

  return merged
}
