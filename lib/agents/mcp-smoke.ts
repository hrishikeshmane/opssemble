import "server-only"

import { isStepCount, ToolLoopAgent, type LanguageModelUsage } from "ai"
import { z } from "zod"

import { AgentRuntimeError, normalizeAgentError } from "./errors"
import {
  createObservabilityMcpToolProvider,
  getObservabilityMcpConfig,
  OBSERVABILITY_MCP_TOOL_NAMES,
  observabilityQuerySchema,
  observabilityToolInputSchema,
  type ObservabilityMcpClientFactory,
} from "./observability-mcp"
import {
  createAgentModelProvider,
  type AgentModelProvider,
} from "./model-provider"
import { ToolExecutionBudget } from "./tools"

const MAX_DEMO_SESSION_ID_LENGTH = 128
const MAX_OUTPUT_TOKENS = 128
const MAX_OUTPUT_CHARACTERS = 4_096
const TOOL_ERROR_MESSAGE =
  "The MCP smoke test could not verify observation tool execution."

export const mcpSmokeRequestSchema = z
  .object({
    demoSessionId: z.string().trim().min(1).max(MAX_DEMO_SESSION_ID_LENGTH),
    query: observabilityQuerySchema.default({}),
    limit: z.number().int().min(1).max(10).default(2),
    timeoutMs: z.number().int().min(1_000).max(60_000).default(30_000),
  })
  .strict()

export type McpSmokeRequest = z.infer<typeof mcpSmokeRequestSchema>

type McpSmokeDependencies = {
  env?: NodeJS.ProcessEnv
  createModelProvider?: (env: NodeJS.ProcessEnv) => AgentModelProvider
  mcpClientFactory?: ObservabilityMcpClientFactory
}

type ToolCallSummary = {
  toolCallId: string
  toolName: string
  input: {
    demoSessionId: string
    query: McpSmokeRequest["query"]
    limit: number
  } | null
}

type ToolResultSummary = {
  toolCallId: string
  toolName: string
  itemCount: number | null
  dataMode: string | null
}

function toolError(): AgentRuntimeError {
  return new AgentRuntimeError("TOOL_ERROR", TOOL_ERROR_MESSAGE)
}

function hasExactToolNames(names: readonly string[]): boolean {
  const actual = new Set(names)

  return (
    names.length === OBSERVABILITY_MCP_TOOL_NAMES.length &&
    actual.size === OBSERVABILITY_MCP_TOOL_NAMES.length &&
    OBSERVABILITY_MCP_TOOL_NAMES.every((name) => actual.has(name))
  )
}

function summarizeUsage(usage: LanguageModelUsage) {
  return {
    inputTokens: usage.inputTokens ?? null,
    outputTokens: usage.outputTokens ?? null,
    totalTokens: usage.totalTokens ?? null,
    cachedInputTokens: usage.inputTokenDetails.cacheReadTokens ?? null,
    cacheWriteInputTokens: usage.inputTokenDetails.cacheWriteTokens ?? null,
    reasoningTokens: usage.outputTokenDetails.reasoningTokens ?? null,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function summarizeToolCall(call: {
  toolCallId: string
  toolName: string
  input: unknown
}): ToolCallSummary {
  const parsed = observabilityToolInputSchema.safeParse(call.input)

  return {
    toolCallId: call.toolCallId,
    toolName: call.toolName,
    input: parsed.success
      ? {
          demoSessionId: parsed.data.demoSessionId,
          query: parsed.data.query,
          limit: parsed.data.limit,
        }
      : null,
  }
}

function summarizeToolResult(result: {
  toolCallId: string
  toolName: string
  output: unknown
}): ToolResultSummary {
  const output = isRecord(result.output) ? result.output : {}
  const payload = isRecord(output.structuredContent)
    ? output.structuredContent
    : output
  const itemCount =
    typeof payload.itemCount === "number" &&
    Number.isInteger(payload.itemCount) &&
    payload.itemCount >= 0
      ? payload.itemCount
      : Array.isArray(payload.items)
        ? payload.items.length
        : null
  const dataMode =
    typeof payload.dataMode === "string" && payload.dataMode.length <= 64
      ? payload.dataMode
      : null

  return {
    toolCallId: result.toolCallId,
    toolName: result.toolName,
    itemCount,
    dataMode,
  }
}

function fixedPrompt(input: McpSmokeRequest): string {
  return `Call get_metrics exactly once with this input:
demoSessionId: ${JSON.stringify(input.demoSessionId)}
query: ${JSON.stringify(input.query)}
limit: ${input.limit}

After the tool result, answer briefly with only its itemCount and dataMode. Do not call another tool.`
}

export function createMcpSmokeService(dependencies: McpSmokeDependencies = {}) {
  const createModelProvider =
    dependencies.createModelProvider ?? createAgentModelProvider

  return {
    async run(input: McpSmokeRequest, options: { signal?: AbortSignal } = {}) {
      const timeoutController = new AbortController()
      let timedOut = false
      const timeout = setTimeout(() => {
        timedOut = true
        timeoutController.abort(
          new DOMException("MCP smoke test timed out.", "TimeoutError")
        )
      }, input.timeoutMs)
      const signal = options.signal
        ? AbortSignal.any([options.signal, timeoutController.signal])
        : timeoutController.signal
      let provider:
        ReturnType<typeof createObservabilityMcpToolProvider> | undefined

      try {
        signal.throwIfAborted()

        const env = dependencies.env ?? process.env
        const config = getObservabilityMcpConfig(env)

        if (!config) {
          throw new AgentRuntimeError(
            "CONFIGURATION_ERROR",
            "The fake observability MCP configuration is required."
          )
        }

        const modelProvider = createModelProvider(env)
        provider = createObservabilityMcpToolProvider({
          config,
          clientFactory: dependencies.mcpClientFactory,
        })
        const tools = await provider.createTools({
          budget: new ToolExecutionBudget(1),
          abortSignal: signal,
          timeoutMs: input.timeoutMs,
        })
        let contextToolNames: string[] = []
        const agent = new ToolLoopAgent({
          id: "observability-mcp-smoke",
          model: modelProvider.model,
          tools,
          toolOrder: OBSERVABILITY_MCP_TOOL_NAMES,
          stopWhen: isStepCount(2),
          maxRetries: 0,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          prepareStep({ stepNumber }) {
            if (stepNumber === 0) {
              return {
                toolChoice: { type: "tool", toolName: "get_metrics" },
              }
            }

            return { toolChoice: "none" }
          },
        })
        const configuredToolNames = Object.keys(agent.tools)
        const observedToolResults: ToolResultSummary[] = []

        if (!hasExactToolNames(configuredToolNames)) {
          throw toolError()
        }

        const result = await agent.generate({
          prompt: fixedPrompt(input),
          abortSignal: signal,
          timeout: { totalMs: input.timeoutMs },
          onStart({ tools: contextTools }) {
            contextToolNames = Object.keys(contextTools ?? {})
          },
          onToolExecutionEnd({ toolCall, toolOutput }) {
            if (toolOutput.type === "tool-result") {
              observedToolResults.push(
                summarizeToolResult({
                  toolCallId: toolCall.toolCallId,
                  toolName: toolCall.toolName,
                  output: toolOutput.output,
                })
              )
            }
          },
        })
        signal.throwIfAborted()

        if (!hasExactToolNames(contextToolNames)) {
          console.warn("MCP smoke context verification failed.", {
            configuredToolNames,
            contextToolNames,
          })
          throw toolError()
        }

        const toolCalls = result.steps.flatMap((step) =>
          step.toolCalls.map(summarizeToolCall)
        )
        const toolResults = observedToolResults
        const metricsCall = toolCalls.find(
          ({ toolName }) => toolName === "get_metrics"
        )

        if (toolCalls.length !== 1 || !metricsCall?.input) {
          console.warn("MCP smoke execution verification failed.", {
            toolCallNames: toolCalls.map(({ toolName }) => toolName),
            toolResultNames: toolResults.map(({ toolName }) => toolName),
          })
          throw toolError()
        }

        return {
          ok: true as const,
          provider: modelProvider.provider,
          model: modelProvider.modelId,
          expectedToolNames: [...OBSERVABILITY_MCP_TOOL_NAMES],
          configuredToolNames,
          contextToolNames,
          allExpectedToolsInContext: true,
          output: result.text.slice(0, MAX_OUTPUT_CHARACTERS),
          finishReason: result.finishReason,
          usage: summarizeUsage(result.usage),
          stepCount: result.steps.length,
          toolCalls,
          toolResults,
        }
      } catch (error) {
        const externallyAborted = options.signal?.aborted === true && !timedOut

        return {
          ok: false as const,
          error: normalizeAgentError(error, {
            timedOut,
            aborted: externallyAborted,
          }),
        }
      } finally {
        clearTimeout(timeout)
        await provider?.close()
      }
    },
  }
}

export const mcpSmokeService = createMcpSmokeService()
