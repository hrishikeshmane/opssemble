import "server-only"

import { execFile as execFileCallback } from "node:child_process"
import { promisify } from "node:util"

const execFile = promisify(execFileCallback)

export class ProjectGitError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "ProjectGitError"
  }
}

type ProcessFailure = Error & {
  code?: number | string
  stderr?: string | Buffer
}

function firstLine(value: unknown): string | null {
  const text =
    typeof value === "string"
      ? value
      : Buffer.isBuffer(value)
        ? value.toString("utf8")
        : ""

  return (
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean)
      ?.slice(0, 300) ?? null
  )
}

async function runGit(args: string[], cwd: string): Promise<string> {
  try {
    const result = await execFile("git", args, {
      cwd,
      encoding: "utf8",
      timeout: 120_000,
      maxBuffer: 5 * 1024 * 1024,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
      },
    })

    return result.stdout
  } catch (error) {
    const failure = error as ProcessFailure

    if (failure.code === "ENOENT") {
      throw new ProjectGitError("Git is not installed or available on PATH.", {
        cause: error,
      })
    }

    throw new ProjectGitError(
      firstLine(failure.stderr) ??
        firstLine(failure.message) ??
        "Git could not synchronize this repository.",
      { cause: error }
    )
  }
}

export async function syncProjectRepository(
  repositoryPath: string,
  defaultBranch: string | null
): Promise<void> {
  const changes = await runGit(["status", "--porcelain"], repositoryPath)

  if (changes.trim().length > 0) {
    throw new ProjectGitError(
      "The managed clone has local changes. Commit or remove them before syncing."
    )
  }

  await runGit(["fetch", "--prune", "origin"], repositoryPath)

  if (defaultBranch) {
    await runGit(["switch", defaultBranch], repositoryPath)
    await runGit(["pull", "--ff-only", "origin", defaultBranch], repositoryPath)
    return
  }

  await runGit(["pull", "--ff-only"], repositoryPath)
}
