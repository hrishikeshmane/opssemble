import type {
  GitHubPullRequest,
  GitHubPullRequestState,
} from "./pull-request-data"

export type PullRequestStateFilter = "all" | GitHubPullRequestState

export function filterGitHubPullRequests(
  pullRequests: readonly GitHubPullRequest[],
  query: string,
  state: PullRequestStateFilter
): GitHubPullRequest[] {
  const normalizedQuery = query.trim().toLowerCase()

  return pullRequests.filter((pullRequest) => {
    if (state !== "all" && pullRequest.state !== state) {
      return false
    }

    if (normalizedQuery.length === 0) {
      return true
    }

    const searchable = [
      pullRequest.title,
      `#${pullRequest.number}`,
      String(pullRequest.number),
      pullRequest.author,
      pullRequest.baseBranch,
      pullRequest.headBranch,
    ]
      .join(" ")
      .toLowerCase()

    return searchable.includes(normalizedQuery)
  })
}
