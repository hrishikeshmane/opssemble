import { MockLanguageModelV4 } from "ai/test"
import { describe, expect, it } from "vitest"

import { repositoryCodingAgentDefinition } from "./coding-agent"
import type { ManagedAgentProject } from "./confinement"
import type { AgentExecutor } from "./executor"
import { createAgentRunService } from "./run-service"

const project: ManagedAgentProject = {
  projectsRoot: "/managed/projects",
  projectRoot: "/managed/projects/project",
  repositoryRoot: "/managed/projects/project/repo",
  project: {
    id: "d38b8a75-4c33-4263-b0d5-f3877f127439",
    owner: "acme",
    repository: "service",
    remoteUrl: "https://github.com/acme/service",
    clonePath: "/managed/projects/project/repo",
    defaultBranch: "main",
    status: "ready",
    lastError: null,
    lastSyncedAt: null,
    createdAt: "2026-08-23T00:00:00.000Z",
    updatedAt: "2026-08-23T00:00:00.000Z",
  },
}

const resultUsage = {
  inputTokens: 10,
  inputTokenDetails: {
    noCacheTokens: 8,
    cacheReadTokens: 2,
    cacheWriteTokens: 0,
  },
  outputTokens: 4,
  outputTokenDetails: {
    textTokens: 3,
    reasoningTokens: 1,
  },
  totalTokens: 14,
}

function service(executor: AgentExecutor, timeoutMs = 1_000) {
  return createAgentRunService({
    definition: repositoryCodingAgentDefinition,
    config: {
      limits: {
        maxSteps: 4,
        maxToolCalls: 4,
        timeoutMs,
      },
      maxOutputTokens: 512,
      maxRetries: 0,
    },
    resolveProject: async () => project,
    createModelProvider: () => ({
      provider: "amazon-bedrock",
      modelId: "openai.gpt-5.6-terra",
      model: new MockLanguageModelV4(),
    }),
    createExecutor: () => executor,
    createRunId: () => "run-1",
    now: () => new Date("2026-08-23T21:00:00.000Z"),
  })
}

describe("agent run service", () => {
  it("returns a deterministic structured mocked run", async () => {
    const executor: AgentExecutor = {
      execute: async ({ observer }) => {
        observer.onToolStart({
          id: "tool-1",
          toolName: "readProjectMetadata",
          input: {},
        })
        observer.onToolEnd({
          id: "tool-1",
          toolName: "readProjectMetadata",
          durationMs: 2,
          output: { status: "ready" },
          error: undefined,
        })
        observer.onStepEnd(0)

        return {
          output: "The project is ready.",
          finishReason: "stop",
          usage: resultUsage,
          steps: 1,
          toolCalls: 1,
          limitReached: null,
        }
      },
    }

    const result = await service(executor).run({
      projectId: project.project.id,
      prompt: "Check the project.",
    })

    expect(result).toMatchObject({
      ok: true,
      runId: "run-1",
      status: "completed",
      output: "The project is ready.",
      steps: 1,
      usage: {
        inputTokens: 10,
        outputTokens: 4,
        totalTokens: 14,
        cachedInputTokens: 2,
        reasoningTokens: 1,
      },
    })
    expect(result.toolInvocations).toHaveLength(1)
    expect(result.toolResults).toHaveLength(1)
  })

  it("aborts execution at the configured timeout", async () => {
    const executor: AgentExecutor = {
      execute: async ({ abortSignal }) =>
        new Promise((_, reject) => {
          abortSignal.addEventListener(
            "abort",
            () => reject(abortSignal.reason),
            { once: true }
          )
        }),
    }

    const result = await service(executor, 20).run({
      projectId: project.project.id,
      prompt: "Wait forever.",
    })

    expect(result).toMatchObject({
      ok: false,
      status: "timed_out",
      error: {
        code: "TIMEOUT",
        retryable: true,
      },
    })
  })

  it("waits for executor cleanup before returning a timeout", async () => {
    let cleanupComplete = false
    const executor: AgentExecutor = {
      execute: async ({ abortSignal }) =>
        new Promise((_, reject) => {
          abortSignal.addEventListener(
            "abort",
            () => {
              setTimeout(() => {
                cleanupComplete = true
                reject(abortSignal.reason)
              }, 5)
            },
            { once: true }
          )
        }),
    }

    const result = await service(executor, 20).run({
      projectId: project.project.id,
      prompt: "Wait for cleanup.",
    })

    expect(result.status).toBe("timed_out")
    expect(cleanupComplete).toBe(true)
  })
})
