import "server-only"

import {
  deleteProject,
  getProject,
  updateProject,
  type ProjectSummary,
} from "@/lib/db/projects"
import { importGitHubProject } from "@/lib/projects/import-project"
import { ProjectGitError, syncProjectRepository } from "@/lib/projects/git"
import { ProjectStorageError, removeProjectFiles } from "@/lib/projects/storage"

export class ProjectManagementError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "ProjectManagementError"
  }
}

async function requireProject(projectId: string): Promise<ProjectSummary> {
  const project = await getProject(projectId)

  if (!project) {
    throw new ProjectManagementError("This project no longer exists.")
  }

  return project
}

export async function syncProject(projectId: string): Promise<ProjectSummary> {
  const project = await requireProject(projectId)

  try {
    await syncProjectRepository(project.clonePath, project.defaultBranch)

    return await updateProject(project.id, {
      status: "ready",
      lastError: null,
      lastSyncedAt: new Date(),
    })
  } catch (error) {
    const managementError =
      error instanceof ProjectGitError
        ? new ProjectManagementError(error.message, { cause: error })
        : new ProjectManagementError(
            "Opssemble could not synchronize this repository.",
            { cause: error }
          )

    await updateProject(project.id, {
      status: "error",
      lastError: managementError.message,
    }).catch(() => undefined)

    throw managementError
  }
}

export async function retryProject(projectId: string): Promise<ProjectSummary> {
  const project = await requireProject(projectId)
  const importedProject = await importGitHubProject(
    `${project.owner}/${project.repository}`
  )
  return syncProject(importedProject.id)
}

export async function removeProject(projectId: string): Promise<void> {
  const project = await requireProject(projectId)

  try {
    await removeProjectFiles(project.clonePath)
    await deleteProject(project.id)
  } catch (error) {
    const message =
      error instanceof ProjectStorageError ||
      error instanceof ProjectManagementError
        ? error.message
        : "Opssemble could not remove this project."

    await updateProject(project.id, {
      status: "error",
      lastError: message,
    }).catch(() => undefined)

    if (
      error instanceof ProjectStorageError ||
      error instanceof ProjectManagementError
    ) {
      throw new ProjectManagementError(error.message, { cause: error })
    }

    throw new ProjectManagementError(message, { cause: error })
  }
}
