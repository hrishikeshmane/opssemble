import "server-only"

import { getProject } from "@/lib/db/projects"

import {
  validateManagedProjectRepository,
  type ManagedAgentProject,
} from "./confinement"
import { AgentRuntimeError } from "./errors"

export async function resolveAgentProject(
  projectId: string
): Promise<ManagedAgentProject> {
  const project = await getProject(projectId)

  if (!project) {
    throw new AgentRuntimeError(
      "PROJECT_NOT_FOUND",
      "The requested project does not exist."
    )
  }

  if (project.status !== "ready") {
    throw new AgentRuntimeError(
      "PROJECT_NOT_READY",
      "The requested project is not ready for agent runs."
    )
  }

  return validateManagedProjectRepository(project)
}
