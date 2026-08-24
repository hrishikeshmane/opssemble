import { homedir } from "node:os"
import { join } from "node:path"

import type { GitHubRepositoryRef } from "@/lib/github/repository-ref"

export type ProjectPaths = {
  opssembleHome: string
  projectsRoot: string
  projectRoot: string
  repository: string
  artifacts: string
  fixtures: string
  logs: string
}

export function getProjectPaths(
  repository: GitHubRepositoryRef,
  homeDirectory = homedir()
): ProjectPaths {
  const opssembleHome = join(homeDirectory, ".opssemble")
  const projectsRoot = join(opssembleHome, "projects")
  const directoryName = [
    repository.host,
    repository.owner,
    repository.repository,
  ]
    .join("--")
    .toLowerCase()
  const projectRoot = join(projectsRoot, directoryName)

  return {
    opssembleHome,
    projectsRoot,
    projectRoot,
    repository: join(projectRoot, "repo"),
    artifacts: join(projectRoot, "artifacts"),
    fixtures: join(projectRoot, "fixtures"),
    logs: join(projectRoot, "logs"),
  }
}
