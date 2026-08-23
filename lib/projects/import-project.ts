import "server-only"

import {
  assertGitHubAuthentication,
  getGitHubRepository,
  GitHubCliError,
} from "@/lib/github/client"
import {
  parseGitHubRepository,
  RepositoryInputError,
} from "@/lib/github/repository-ref"
import {
  createProject,
  getGitHubProject,
  updateProject,
  type ProjectSummary,
} from "@/lib/db/projects"
import { getProjectPaths } from "@/lib/projects/paths"
import { ensureProjectClone, ProjectStorageError } from "@/lib/projects/storage"

export class ProjectImportError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "ProjectImportError"
  }
}

function toImportError(error: unknown): ProjectImportError {
  if (
    error instanceof RepositoryInputError ||
    error instanceof GitHubCliError ||
    error instanceof ProjectStorageError
  ) {
    return new ProjectImportError(error.message, { cause: error })
  }

  return new ProjectImportError(
    "Opssemble could not import this repository. Check Turso and try again.",
    { cause: error }
  )
}

export async function importGitHubProject(
  input: string
): Promise<ProjectSummary> {
  let project: ProjectSummary | null = null

  try {
    const requestedRepository = parseGitHubRepository(input)
    await assertGitHubAuthentication()

    const repository = await getGitHubRepository(requestedRepository.slug)
    const canonicalRepository = parseGitHubRepository(repository.nameWithOwner)
    const paths = getProjectPaths(canonicalRepository)

    project = await getGitHubProject(
      canonicalRepository.owner,
      canonicalRepository.repository
    )

    if (!project) {
      project = await createProject({
        provider: "github",
        host: canonicalRepository.host,
        owner: canonicalRepository.owner,
        repository: canonicalRepository.repository,
        providerRepositoryId: repository.id,
        remoteUrl: repository.url,
        clonePath: paths.repository,
        defaultBranch: repository.defaultBranch,
        status: "cloning",
      })
    } else {
      project = await updateProject(project.id, {
        providerRepositoryId: repository.id,
        remoteUrl: repository.url,
        clonePath: paths.repository,
        defaultBranch: repository.defaultBranch,
        status: "cloning",
        lastError: null,
      })
    }

    const clonePath = await ensureProjectClone(canonicalRepository)

    return await updateProject(project.id, {
      clonePath,
      defaultBranch: repository.defaultBranch,
      status: "ready",
      lastError: null,
      lastSyncedAt: new Date(),
    })
  } catch (error) {
    const importError = toImportError(error)

    if (project) {
      await updateProject(project.id, {
        status: "error",
        lastError: importError.message,
      }).catch(() => undefined)
    }

    throw importError
  }
}
