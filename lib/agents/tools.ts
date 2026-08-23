import "server-only"

import { tool } from "ai"
import { z } from "zod"

import { AgentRuntimeError } from "./errors"
import {
  inspectRepositoryGitStatus,
  listRepositoryFiles,
  readRepositoryFile,
} from "./repository"
import type { AgentToolProvider } from "./tool-provider"
import type { ManagedAgentProject } from "./confinement"

export const readProjectMetadataInputSchema = z.object({}).strict()

export const listRepositoryFilesInputSchema = z
  .object({
    directory: z.string().trim().max(4_096).optional(),
    maxDepth: z.number().int().min(1).max(10).default(4),
    maxEntries: z.number().int().min(1).max(500).default(200),
  })
  .strict()

export const readRepositoryFileInputSchema = z
  .object({
    path: z.string().trim().min(1).max(4_096),
    maxBytes: z
      .number()
      .int()
      .min(1_024)
      .max(128 * 1_024)
      .default(32 * 1_024),
  })
  .strict()

export const inspectGitStatusInputSchema = z.object({}).strict()

export class ToolExecutionBudget {
  private used = 0
  private exhausted = false

  constructor(readonly limit: number) {}

  claim(): void {
    if (this.used >= this.limit) {
      this.exhausted = true
      throw new AgentRuntimeError(
        "TOOL_LIMIT_REACHED",
        "The agent reached its tool-call limit."
      )
    }

    this.used += 1
  }

  get count(): number {
    return this.used
  }

  get limitReached(): boolean {
    return this.exhausted || this.used >= this.limit
  }
}

export function createRepositoryAgentTools(
  project: ManagedAgentProject,
  budget: ToolExecutionBudget
) {
  return {
    readProjectMetadata: tool({
      description:
        "Read non-sensitive metadata for the current Opssemble project.",
      inputSchema: readProjectMetadataInputSchema,
      execute: async () => {
        budget.claim()
        return {
          id: project.project.id,
          owner: project.project.owner,
          repository: project.project.repository,
          defaultBranch: project.project.defaultBranch,
          status: project.project.status,
          lastSyncedAt: project.project.lastSyncedAt,
        }
      },
    }),
    listRepositoryFiles: tool({
      description:
        "List files and directories within the managed repository. Symlinks are listed but never followed.",
      inputSchema: listRepositoryFilesInputSchema,
      execute: async (input, { abortSignal }) => {
        budget.claim()
        return listRepositoryFiles(project, {
          ...input,
          signal: abortSignal,
        })
      },
    }),
    readRepositoryFile: tool({
      description:
        "Read a bounded UTF-8 text file from the managed repository.",
      inputSchema: readRepositoryFileInputSchema,
      execute: async (input, { abortSignal }) => {
        budget.claim()
        return readRepositoryFile(project, {
          ...input,
          signal: abortSignal,
        })
      },
    }),
    inspectGitStatus: tool({
      description:
        "Inspect the current branch and working-tree status without modifying the repository.",
      inputSchema: inspectGitStatusInputSchema,
      execute: async (_input, { abortSignal }) => {
        budget.claim()
        return inspectRepositoryGitStatus(project, abortSignal)
      },
    }),
  }
}

export type RepositoryAgentTools = ReturnType<typeof createRepositoryAgentTools>

export const repositoryToolProvider = {
  id: "managed-repository",
  kind: "local",
  createTools: ({ project, budget }) =>
    createRepositoryAgentTools(project, budget),
} satisfies AgentToolProvider<
  {
    project: ManagedAgentProject
    budget: ToolExecutionBudget
  },
  RepositoryAgentTools
>
