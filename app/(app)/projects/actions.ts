"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  importGitHubProject,
  ProjectImportError,
} from "@/lib/projects/import-project"
import {
  ProjectManagementError,
  removeProject,
  retryProject,
  syncProject,
} from "@/lib/projects/manage-project"

export type ImportProjectState = {
  error: string | null
}

export type ProjectActionState = {
  error: string | null
}

export async function importProjectAction(
  _previousState: ImportProjectState,
  formData: FormData
): Promise<ImportProjectState> {
  const repository = formData.get("repository")

  if (typeof repository !== "string") {
    return { error: "Enter a GitHub repository." }
  }

  let projectId: string

  try {
    const project = await importGitHubProject(repository)
    projectId = project.id
  } catch (error) {
    return {
      error:
        error instanceof ProjectImportError
          ? error.message
          : "Opssemble could not import this repository.",
    }
  }

  revalidatePath("/projects")
  redirect(`/projects/${projectId}`)
}

export async function syncProjectAction(
  projectId: string,
  previousState: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  void previousState
  void formData

  try {
    await syncProject(projectId)
  } catch (error) {
    return {
      error:
        error instanceof ProjectManagementError
          ? error.message
          : "Opssemble could not synchronize this project.",
    }
  }

  revalidatePath("/projects")
  revalidatePath(`/projects/${projectId}`)
  return { error: null }
}

export async function retryProjectAction(
  projectId: string,
  previousState: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  void previousState
  void formData

  try {
    await retryProject(projectId)
  } catch (error) {
    return {
      error:
        error instanceof ProjectImportError ||
        error instanceof ProjectManagementError
          ? error.message
          : "Opssemble could not retry this project.",
    }
  }

  revalidatePath("/projects")
  revalidatePath(`/projects/${projectId}`)
  return { error: null }
}

export async function removeProjectAction(
  projectId: string,
  previousState: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  void previousState
  void formData

  try {
    await removeProject(projectId)
  } catch (error) {
    return {
      error:
        error instanceof ProjectManagementError
          ? error.message
          : "Opssemble could not remove this project.",
    }
  }

  revalidatePath("/projects")
  redirect("/projects")
}
