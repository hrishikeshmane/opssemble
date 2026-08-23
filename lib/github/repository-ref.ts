const GITHUB_HOST = "github.com"
const REPOSITORY_SEGMENT = /^[A-Za-z0-9._-]+$/

export type GitHubRepositoryRef = {
  host: typeof GITHUB_HOST
  owner: string
  repository: string
  slug: string
}

export class RepositoryInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "RepositoryInputError"
  }
}

function validateSegment(value: string, label: string): string {
  if (
    value.length === 0 ||
    value.length > 100 ||
    value === "." ||
    value === ".." ||
    !REPOSITORY_SEGMENT.test(value)
  ) {
    throw new RepositoryInputError(`Enter a valid GitHub ${label}.`)
  }

  return value
}

function pathFromInput(input: string): string {
  const trimmed = input.trim()

  if (trimmed.length === 0) {
    throw new RepositoryInputError("Enter a GitHub repository.")
  }

  if (trimmed.startsWith("git@github.com:")) {
    return trimmed.slice("git@github.com:".length)
  }

  if (/^https?:\/\//i.test(trimmed)) {
    let url: URL

    try {
      url = new URL(trimmed)
    } catch {
      throw new RepositoryInputError("Enter a valid GitHub repository URL.")
    }

    if (url.hostname.toLowerCase() !== GITHUB_HOST) {
      throw new RepositoryInputError(
        "Only github.com repositories are supported."
      )
    }

    return url.pathname
  }

  return trimmed.replace(/^github\.com\//i, "")
}

export function parseGitHubRepository(input: string): GitHubRepositoryRef {
  const path = pathFromInput(input).replace(/^\/+|\/+$/g, "")
  const segments = path.split("/")

  if (segments.length !== 2) {
    throw new RepositoryInputError(
      "Use owner/repository or paste a github.com repository URL."
    )
  }

  const owner = validateSegment(segments[0] ?? "", "owner")
  const repository = validateSegment(
    (segments[1] ?? "").replace(/\.git$/i, ""),
    "repository"
  )

  return {
    host: GITHUB_HOST,
    owner,
    repository,
    slug: `${owner}/${repository}`,
  }
}
