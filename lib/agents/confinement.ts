import "server-only"

import { lstat, realpath } from "node:fs/promises"
import { homedir } from "node:os"
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
  win32,
} from "node:path"

import type { ProjectSummary } from "@/lib/db/projects"

import { AgentRuntimeError } from "./errors"

export type ManagedAgentProject = {
  project: ProjectSummary
  projectsRoot: string
  projectRoot: string
  repositoryRoot: string
}

function isContained(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate)
  return (
    pathFromRoot === "" ||
    (!pathFromRoot.startsWith(`..${sep}`) &&
      pathFromRoot !== ".." &&
      !isAbsolute(pathFromRoot))
  )
}

async function requirePlainDirectory(
  path: string,
  message: string
): Promise<void> {
  try {
    const entry = await lstat(path)

    if (!entry.isDirectory() || entry.isSymbolicLink()) {
      throw new AgentRuntimeError("REPOSITORY_ACCESS_DENIED", message)
    }
  } catch (error) {
    if (error instanceof AgentRuntimeError) {
      throw error
    }

    throw new AgentRuntimeError("REPOSITORY_ACCESS_DENIED", message, {
      cause: error,
    })
  }
}

export async function validateManagedProjectRepository(
  project: ProjectSummary,
  homeDirectory = homedir()
): Promise<ManagedAgentProject> {
  const projectsRoot = resolve(homeDirectory, ".opssemble", "projects")

  if (!isAbsolute(project.clonePath)) {
    throw new AgentRuntimeError(
      "REPOSITORY_ACCESS_DENIED",
      "The project repository is outside managed storage."
    )
  }

  const repositoryRoot = resolve(project.clonePath)
  const projectRoot = dirname(repositoryRoot)
  const projectDirectory = relative(projectsRoot, projectRoot)

  if (
    basename(repositoryRoot) !== "repo" ||
    projectDirectory.length === 0 ||
    projectDirectory === ".." ||
    projectDirectory.startsWith(`..${sep}`) ||
    isAbsolute(projectDirectory) ||
    projectDirectory.includes(sep)
  ) {
    throw new AgentRuntimeError(
      "REPOSITORY_ACCESS_DENIED",
      "The project repository is outside managed storage."
    )
  }

  await requirePlainDirectory(
    projectsRoot,
    "The managed projects directory is unavailable."
  )
  await requirePlainDirectory(
    projectRoot,
    "The project directory is not a managed directory."
  )
  await requirePlainDirectory(
    repositoryRoot,
    "The project repository is not a managed directory."
  )
  await requirePlainDirectory(
    join(repositoryRoot, ".git"),
    "The project repository has invalid git metadata."
  )

  const [canonicalProjectsRoot, canonicalRepositoryRoot] = await Promise.all([
    realpath(projectsRoot),
    realpath(repositoryRoot),
  ])

  if (!isContained(canonicalProjectsRoot, canonicalRepositoryRoot)) {
    throw new AgentRuntimeError(
      "REPOSITORY_ACCESS_DENIED",
      "The project repository resolves outside managed storage."
    )
  }

  return {
    project,
    projectsRoot: canonicalProjectsRoot,
    projectRoot: dirname(canonicalRepositoryRoot),
    repositoryRoot: canonicalRepositoryRoot,
  }
}

export function validateRepositoryRelativePath(
  input: string,
  options: { allowRoot?: boolean } = {}
): string {
  const value = input.trim()

  if (value.length === 0 && options.allowRoot) {
    return ""
  }

  if (
    value.length === 0 ||
    value.length > 4_096 ||
    value.includes("\0") ||
    value.includes("\\") ||
    isAbsolute(value) ||
    win32.isAbsolute(value)
  ) {
    throw new AgentRuntimeError(
      "REPOSITORY_ACCESS_DENIED",
      "The requested repository path is invalid."
    )
  }

  const segments = value.split("/")

  if (segments.includes(".git")) {
    throw new AgentRuntimeError(
      "REPOSITORY_ACCESS_DENIED",
      "Git metadata is not available to repository tools."
    )
  }

  if (
    segments.some(
      (segment) => segment === "" || segment === "." || segment === ".."
    )
  ) {
    throw new AgentRuntimeError(
      "REPOSITORY_ACCESS_DENIED",
      "Repository path traversal is not allowed."
    )
  }

  return segments.join("/")
}

export async function resolveRepositoryPath(
  project: ManagedAgentProject,
  input: string,
  options: { allowRoot?: boolean } = {}
): Promise<{ absolutePath: string; relativePath: string }> {
  const relativePath = validateRepositoryRelativePath(input, options)
  const lexicalPath = resolve(project.repositoryRoot, relativePath)

  if (!isContained(project.repositoryRoot, lexicalPath)) {
    throw new AgentRuntimeError(
      "REPOSITORY_ACCESS_DENIED",
      "Repository path traversal is not allowed."
    )
  }

  let canonicalPath: string

  try {
    canonicalPath = await realpath(lexicalPath)
  } catch (error) {
    throw new AgentRuntimeError(
      "REPOSITORY_ACCESS_DENIED",
      "The requested repository path does not exist.",
      { cause: error }
    )
  }

  if (!isContained(project.repositoryRoot, canonicalPath)) {
    throw new AgentRuntimeError(
      "REPOSITORY_ACCESS_DENIED",
      "Repository symlinks may not escape the managed repository."
    )
  }

  return {
    absolutePath: canonicalPath,
    relativePath,
  }
}
