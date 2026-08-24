import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import type { ProjectSummary } from "@/lib/db/projects"

import {
  resolveRepositoryPath,
  validateManagedProjectRepository,
  validateRepositoryRelativePath,
} from "./confinement"
import { AgentRuntimeError } from "./errors"

const temporaryDirectories: string[] = []

function project(clonePath: string): ProjectSummary {
  return {
    id: "d38b8a75-4c33-4263-b0d5-f3877f127439",
    owner: "acme",
    repository: "service",
    remoteUrl: "https://github.com/acme/service",
    clonePath,
    defaultBranch: "main",
    status: "ready",
    lastError: null,
    lastSyncedAt: null,
    createdAt: "2026-08-23T00:00:00.000Z",
    updatedAt: "2026-08-23T00:00:00.000Z",
  }
}

async function createManagedRepository() {
  const home = await mkdtemp(join(tmpdir(), "opssemble-agent-"))
  temporaryDirectories.push(home)
  const repository = join(
    home,
    ".opssemble",
    "projects",
    "managed-project",
    "repo"
  )
  await mkdir(join(repository, ".git"), { recursive: true })

  return {
    home,
    repository,
    context: await validateManagedProjectRepository(project(repository), home),
  }
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  )
})

describe("repository confinement", () => {
  it("accepts a plain managed repository", async () => {
    const managed = await createManagedRepository()

    expect(managed.context.repositoryRoot).toBe(managed.repository)
  })

  it("rejects clone paths outside managed project storage", async () => {
    const home = await mkdtemp(join(tmpdir(), "opssemble-agent-"))
    temporaryDirectories.push(home)
    const repository = join(home, "outside", "repo")
    await mkdir(repository, { recursive: true })

    await expect(
      validateManagedProjectRepository(project(repository), home)
    ).rejects.toMatchObject({ code: "REPOSITORY_ACCESS_DENIED" })
  })

  it.each(["../secret", "src/../../secret", "/etc/passwd", "C:/secret"])(
    "rejects traversal path %s",
    (path) => {
      expect(() => validateRepositoryRelativePath(path)).toThrowError(
        AgentRuntimeError
      )
    }
  )

  it("rejects a symlink that escapes the repository", async () => {
    const managed = await createManagedRepository()
    const outsideFile = join(managed.home, "secret.txt")
    await writeFile(outsideFile, "not repository content")
    await symlink(outsideFile, join(managed.repository, "escape.txt"))

    await expect(
      resolveRepositoryPath(managed.context, "escape.txt")
    ).rejects.toMatchObject({ code: "REPOSITORY_ACCESS_DENIED" })
  })

  it("rejects direct access to git metadata", () => {
    expect(() => validateRepositoryRelativePath(".git/config")).toThrow(
      "Git metadata"
    )
  })

  it("rejects a symlinked managed project root", async () => {
    const home = await mkdtemp(join(tmpdir(), "opssemble-agent-"))
    temporaryDirectories.push(home)
    const projectsRoot = join(home, ".opssemble", "projects")
    const outsideProject = join(home, "outside-project")
    await mkdir(join(outsideProject, "repo"), { recursive: true })
    await mkdir(projectsRoot, { recursive: true })
    await symlink(outsideProject, join(projectsRoot, "managed-project"))

    await expect(
      validateManagedProjectRepository(
        project(join(projectsRoot, "managed-project", "repo")),
        home
      )
    ).rejects.toMatchObject({ code: "REPOSITORY_ACCESS_DENIED" })
  })
})
