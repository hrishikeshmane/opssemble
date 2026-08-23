import "server-only"

import type { ManagedAgentProject } from "./confinement"
import type { AgentRuntimeConfig } from "./config"
import { resolveRunLimits } from "./config"
import { AgentRuntimeError, normalizeAgentError } from "./errors"
import type {
  AgentExecutionObserver,
  AgentExecutor,
  RecordedAgentExecution,
} from "./executor"
import type { AgentModelProvider } from "./model-provider"
import type {
  AgentDefinition,
  AgentRunRequest,
  AgentRunResponse,
  AgentUsage,
} from "./types"

export type AgentRunServiceDependencies = {
  definition: AgentDefinition
  config: AgentRuntimeConfig
  resolveProject(projectId: string): Promise<ManagedAgentProject>
  createModelProvider(): AgentModelProvider
  createExecutor(options: {
    modelProvider: AgentModelProvider
    project: ManagedAgentProject
    maxSteps: number
    maxToolCalls: number
    maxOutputTokens: number
    maxRetries: number
  }): AgentExecutor
  createRunId(): string
  now(): Date
}

function emptyRecording(): RecordedAgentExecution {
  return {
    steps: 0,
    toolInvocations: [],
    toolResults: [],
  }
}

function mapUsage(
  usage: Awaited<ReturnType<AgentExecutor["execute"]>>["usage"]
): AgentUsage {
  return {
    inputTokens: usage.inputTokens ?? null,
    outputTokens: usage.outputTokens ?? null,
    totalTokens: usage.totalTokens ?? null,
    cachedInputTokens: usage.inputTokenDetails.cacheReadTokens ?? null,
    cacheWriteInputTokens: usage.inputTokenDetails.cacheWriteTokens ?? null,
    reasoningTokens: usage.outputTokenDetails.reasoningTokens ?? null,
  }
}

function withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(signal.reason)
  }

  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason)
    signal.addEventListener("abort", abort, { once: true })

    promise.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", abort)
    })
  })
}

export function createAgentRunService(
  dependencies: AgentRunServiceDependencies
) {
  return {
    async run(
      request: AgentRunRequest,
      options: { signal?: AbortSignal } = {}
    ): Promise<AgentRunResponse> {
      const runId = dependencies.createRunId()
      const startedAtDate = dependencies.now()
      const startedAt = startedAtDate.toISOString()
      const limits = resolveRunLimits(request, dependencies.config.limits)
      const recording = emptyRecording()
      const activeTools = new Map<
        string,
        { startedAt: Date; toolName: string }
      >()
      let timedOut = false

      const timeoutController = new AbortController()
      const timeout = setTimeout(() => {
        timedOut = true
        timeoutController.abort(
          new DOMException("Agent run timed out.", "TimeoutError")
        )
      }, limits.timeoutMs)
      const signal = options.signal
        ? AbortSignal.any([options.signal, timeoutController.signal])
        : timeoutController.signal

      const observer: AgentExecutionObserver = {
        onStepEnd(stepNumber) {
          recording.steps = Math.max(recording.steps, stepNumber + 1)
        },
        onToolStart(event) {
          const toolStartedAt = dependencies.now()
          activeTools.set(event.id, {
            startedAt: toolStartedAt,
            toolName: event.toolName,
          })
          recording.toolInvocations.push({
            id: event.id,
            toolName: event.toolName,
            input: event.input,
            startedAt: toolStartedAt.toISOString(),
          })
        },
        onToolEnd(event) {
          const completedAt = dependencies.now()
          const active = activeTools.get(event.id)
          activeTools.delete(event.id)
          recording.toolResults.push({
            invocationId: event.id,
            toolName: active?.toolName ?? event.toolName,
            status: event.error === undefined ? "success" : "error",
            output: event.output,
            error:
              event.error === undefined
                ? null
                : normalizeAgentError(event.error),
            completedAt: completedAt.toISOString(),
            durationMs:
              event.durationMs ??
              (active ? completedAt.getTime() - active.startedAt.getTime() : 0),
          })
        },
      }

      try {
        if (
          request.agentId !== undefined &&
          request.agentId !== dependencies.definition.id
        ) {
          throw new AgentRuntimeError(
            "INVALID_REQUEST",
            "The requested agent is not available."
          )
        }

        if (signal.aborted) {
          throw signal.reason
        }

        const project = await withAbort(
          dependencies.resolveProject(request.projectId),
          signal
        )
        const modelProvider = dependencies.createModelProvider()
        const executor = dependencies.createExecutor({
          modelProvider,
          project,
          maxSteps: limits.maxSteps,
          maxToolCalls: limits.maxToolCalls,
          maxOutputTokens: dependencies.config.maxOutputTokens,
          maxRetries: dependencies.config.maxRetries,
        })
        const execution = await executor.execute({
          prompt: request.prompt,
          abortSignal: signal,
          timeoutMs: limits.timeoutMs,
          observer,
        })
        const completedAtDate = dependencies.now()

        return {
          ok: true,
          runId,
          agentId: dependencies.definition.id,
          projectId: request.projectId,
          status: "completed",
          output: execution.output,
          finishReason: execution.finishReason,
          usage: mapUsage(execution.usage),
          error: null,
          startedAt,
          completedAt: completedAtDate.toISOString(),
          durationMs: completedAtDate.getTime() - startedAtDate.getTime(),
          limits: {
            ...limits,
            reached: execution.limitReached,
          },
          steps: execution.steps,
          toolInvocations: [...recording.toolInvocations],
          toolResults: [...recording.toolResults],
        }
      } catch (error) {
        const completedAtDate = dependencies.now()
        const externallyAborted = options.signal?.aborted === true && !timedOut
        const normalizedError = normalizeAgentError(error, {
          timedOut,
          aborted: externallyAborted,
        })
        const status = timedOut
          ? "timed_out"
          : externallyAborted
            ? "cancelled"
            : "failed"

        return {
          ok: false,
          runId,
          agentId: dependencies.definition.id,
          projectId: request.projectId,
          status,
          output: null,
          finishReason: null,
          usage: null,
          error: normalizedError,
          startedAt,
          completedAt: completedAtDate.toISOString(),
          durationMs: completedAtDate.getTime() - startedAtDate.getTime(),
          limits: {
            ...limits,
            reached:
              normalizedError.code === "TOOL_LIMIT_REACHED" ? "tools" : null,
          },
          steps: recording.steps,
          toolInvocations: [...recording.toolInvocations],
          toolResults: [...recording.toolResults],
        }
      } finally {
        clearTimeout(timeout)
      }
    },
  }
}
