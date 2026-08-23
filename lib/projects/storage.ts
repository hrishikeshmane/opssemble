import "server-only"

import { lstat, mkdir, rm, stat } from "node:fs/promises"
import { homedir } from "node:os"
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path"

import { cloneGitHubRepository } from "@/lib/github/client"
import type { GitHubRepositoryRef } from "@/lib/github/repository-ref"
import { getProjectPaths } from "@/lib/projects/paths"

export class ProjectStorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "ProjectStorageError"
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false
    }

    throw error
  }
}

async function isGitRepository(path: string): Promise<boolean> {
  try {
    const [directory, gitDirectory] = await Promise.all([
      lstat(path),
      stat(`${path}/.git`),
    ])
    return (
      directory.isDirectory() &&
      !directory.isSymbolicLink() &&
      gitDirectory.isDirectory()
    )
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return false
    }

    throw error
  }
}

export async function ensureProjectClone(
  repository: GitHubRepositoryRef
): Promise<string> {
  const paths = getProjectPaths(repository)

  await Promise.all([
    mkdir(paths.artifacts, { recursive: true }),
    mkdir(paths.fixtures, { recursive: true }),
    mkdir(paths.logs, { recursive: true }),
  ])

  if (await pathExists(paths.repository)) {
    if (await isGitRepository(paths.repository)) {
      return paths.repository
    }

    throw new ProjectStorageError(
      `The project destination already exists but is not a Git repository: ${paths.repository}`
    )
  }

  try {
    await cloneGitHubRepository(repository.slug, paths.repository)
  } catch (error) {
    await rm(paths.repository, { recursive: true, force: true })
    throw error
  }

  if (!(await isGitRepository(paths.repository))) {
    throw new ProjectStorageError(
      "GitHub CLI finished without creating a readable Git repository."
    )
  }

  return paths.repository
}

export async function removeProjectFiles(clonePath: string): Promise<void> {
  const projectsRoot = resolve(join(homedir(), ".opssemble", "projects"))
  const resolvedClonePath = resolve(clonePath)
  const projectRoot = dirname(resolvedClonePath)
  const projectRelativePath = relative(projectsRoot, projectRoot)

  if (
    basename(resolvedClonePath) !== "repo" ||
    projectRelativePath.length === 0 ||
    projectRelativePath.startsWith("..") ||
    isAbsolute(projectRelativePath)
  ) {
    throw new ProjectStorageError(
      "Refusing to remove a project outside ~/.opssemble/projects."
    )
  }

  try {
    const projectDirectory = await lstat(projectRoot)

    if (!projectDirectory.isDirectory() || projectDirectory.isSymbolicLink()) {
      throw new ProjectStorageError(
        "Refusing to remove a project through an unexpected filesystem entry."
      )
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return
    }

    throw error
  }

  await rm(projectRoot, { recursive: true, force: true })
}
