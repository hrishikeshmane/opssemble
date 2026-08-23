import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "./client"
import {
  projects,
  type NewProject,
  type Project,
  type ProjectStatus,
} from "./schema"

export type ProjectSummary = {
  id: string
  owner: string
  repository: string
  remoteUrl: string
  clonePath: string
  defaultBranch: string | null
  status: ProjectStatus
  lastError: string | null
  lastSyncedAt: string | null
  createdAt: string
  updatedAt: string
}

export type UpdateProjectInput = Partial<
  Pick<
    Project,
    | "clonePath"
    | "defaultBranch"
    | "lastError"
    | "lastSyncedAt"
    | "providerRepositoryId"
    | "remoteUrl"
    | "status"
  >
>

export type CreateProjectInput = Pick<
  NewProject,
  | "owner"
  | "repository"
  | "remoteUrl"
  | "clonePath"
  | "providerRepositoryId"
  | "defaultBranch"
> &
  Partial<Pick<NewProject, "provider" | "host" | "status">>

function toProjectSummary(project: Project): ProjectSummary {
  return {
    id: project.id,
    owner: project.owner,
    repository: project.repository,
    remoteUrl: project.remoteUrl,
    clonePath: project.clonePath,
    defaultBranch: project.defaultBranch,
    status: project.status,
    lastError: project.lastError,
    lastSyncedAt: project.lastSyncedAt?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  }
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const rows = await db
    .select()
    .from(projects)
    .orderBy(desc(projects.createdAt))
  return rows.map(toProjectSummary)
}

export async function getProject(
  projectId: string
): Promise<ProjectSummary | null> {
  const row = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  })

  return row ? toProjectSummary(row) : null
}

export async function getGitHubProject(
  owner: string,
  repository: string
): Promise<ProjectSummary | null> {
  const row = await db.query.projects.findFirst({
    where: and(
      eq(projects.provider, "github"),
      eq(projects.host, "github.com"),
      eq(projects.owner, owner),
      eq(projects.repository, repository)
    ),
  })

  return row ? toProjectSummary(row) : null
}

export async function createProject(
  input: CreateProjectInput
): Promise<ProjectSummary> {
  const [project] = await db
    .insert(projects)
    .values({
      id: crypto.randomUUID(),
      ...input,
    })
    .returning()

  return toProjectSummary(project)
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput
): Promise<ProjectSummary> {
  const [project] = await db
    .update(projects)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning()

  if (!project) {
    throw new Error(`Project ${projectId} does not exist`)
  }

  return toProjectSummary(project)
}

export async function deleteProject(
  projectId: string
): Promise<ProjectSummary | null> {
  const [project] = await db
    .delete(projects)
    .where(eq(projects.id, projectId))
    .returning()

  return project ? toProjectSummary(project) : null
}
