import "server-only"

import { execFile as execFileCallback } from "node:child_process"
import { open, readdir } from "node:fs/promises"
import { posix } from "node:path"
import { promisify } from "node:util"

import { AgentRuntimeError } from "./errors"
import { resolveRepositoryPath, type ManagedAgentProject } from "./confinement"

const execFile = promisify(execFileCallback)

const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true })
const GIT_OUTPUT_LIMIT = 256 * 1024

export type RepositoryListEntry = {
  path: string
  type: "directory" | "file" | "symlink"
}

export type RepositoryFileList = {
  directory: string
  entries: RepositoryListEntry[]
  truncated: boolean
}

export type RepositoryFileContent = {
  path: string
  content: string
  sizeBytes: number
  truncated: boolean
}

export type RepositoryGitStatus = {
  branch: string | null
  clean: boolean
  entries: string[]
  truncated: boolean
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new AgentRuntimeError("ABORTED", "The agent run was cancelled.")
  }
}

export async function listRepositoryFiles(
  project: ManagedAgentProject,
  options: {
    directory?: string
    maxDepth: number
    maxEntries: number
    signal?: AbortSignal
  }
): Promise<RepositoryFileList> {
  const requestedDirectory = options.directory ?? ""
  const { absolutePath, relativePath } = await resolveRepositoryPath(
    project,
    requestedDirectory,
    { allowRoot: true }
  )
  const entries: RepositoryListEntry[] = []
  let truncated = false

  async function walk(
    directoryPath: string,
    outputPrefix: string,
    depth: number
  ): Promise<void> {
    throwIfAborted(options.signal)

    if (entries.length >= options.maxEntries) {
      truncated = true
      return
    }

    let directoryEntries

    try {
      directoryEntries = await readdir(directoryPath, { withFileTypes: true })
    } catch (error) {
      throw new AgentRuntimeError(
        "TOOL_ERROR",
        "The requested repository directory could not be read.",
        { cause: error }
      )
    }

    directoryEntries.sort((left, right) => left.name.localeCompare(right.name))

    for (const entry of directoryEntries) {
      throwIfAborted(options.signal)

      if (entry.name === ".git") {
        continue
      }

      if (entries.length >= options.maxEntries) {
        truncated = true
        return
      }

      const outputPath = outputPrefix
        ? posix.join(outputPrefix, entry.name)
        : entry.name

      if (entry.isSymbolicLink()) {
        entries.push({ path: outputPath, type: "symlink" })
        continue
      }

      if (entry.isDirectory()) {
        entries.push({ path: outputPath, type: "directory" })

        if (depth < options.maxDepth) {
          const child = await resolveRepositoryPath(project, outputPath)
          await walk(child.absolutePath, outputPath, depth + 1)
        }
        continue
      }

      if (entry.isFile()) {
        entries.push({ path: outputPath, type: "file" })
      }
    }
  }

  await walk(absolutePath, relativePath, 1)

  return {
    directory: relativePath || ".",
    entries,
    truncated,
  }
}

export async function readRepositoryFile(
  project: ManagedAgentProject,
  options: {
    path: string
    maxBytes: number
    signal?: AbortSignal
  }
): Promise<RepositoryFileContent> {
  throwIfAborted(options.signal)
  const resolved = await resolveRepositoryPath(project, options.path)
  const file = await open(resolved.absolutePath, "r")

  try {
    const stats = await file.stat()

    if (!stats.isFile()) {
      throw new AgentRuntimeError(
        "TOOL_ERROR",
        "The requested repository path is not a regular file."
      )
    }

    const bytesToRead = Math.min(stats.size, options.maxBytes)
    const buffer = Buffer.alloc(bytesToRead)
    const { bytesRead } = await file.read(buffer, 0, bytesToRead, 0)
    throwIfAborted(options.signal)

    let content: string

    try {
      content = TEXT_DECODER.decode(buffer.subarray(0, bytesRead))
    } catch (error) {
      throw new AgentRuntimeError(
        "TOOL_ERROR",
        "The requested repository file is not UTF-8 text.",
        { cause: error }
      )
    }

    return {
      path: resolved.relativePath,
      content,
      sizeBytes: stats.size,
      truncated: stats.size > bytesRead,
    }
  } finally {
    await file.close()
  }
}

export async function inspectRepositoryGitStatus(
  project: ManagedAgentProject,
  signal?: AbortSignal
): Promise<RepositoryGitStatus> {
  throwIfAborted(signal)

  let stdout: string

  try {
    const result = await execFile(
      "git",
      [
        "-c",
        "core.fsmonitor=false",
        "-c",
        "core.untrackedCache=false",
        "-c",
        "core.hooksPath=/dev/null",
        "status",
        "--short",
        "--branch",
        "--ignore-submodules=all",
        "--untracked-files=normal",
      ],
      {
        cwd: project.repositoryRoot,
        encoding: "utf8",
        maxBuffer: GIT_OUTPUT_LIMIT,
        timeout: 10_000,
        signal,
        env: {
          GIT_CONFIG_GLOBAL: "/dev/null",
          GIT_CONFIG_NOSYSTEM: "1",
          GIT_OPTIONAL_LOCKS: "0",
          GIT_TERMINAL_PROMPT: "0",
          LC_ALL: "C",
          NODE_ENV: process.env.NODE_ENV,
          PATH: process.env.PATH,
        },
      }
    )
    stdout = result.stdout
  } catch (error) {
    if (signal?.aborted) {
      throw new AgentRuntimeError("ABORTED", "The agent run was cancelled.", {
        cause: error,
      })
    }

    throw new AgentRuntimeError(
      "TOOL_ERROR",
      "Git status could not inspect the managed repository.",
      { cause: error }
    )
  }

  const lines = stdout.split(/\r?\n/).filter(Boolean)
  const branchLine = lines[0]?.startsWith("## ") ? lines.shift() : undefined
  const maximumEntries = 200

  return {
    branch: branchLine?.slice(3) ?? null,
    clean: lines.length === 0,
    entries: lines.slice(0, maximumEntries),
    truncated: lines.length > maximumEntries,
  }
}
