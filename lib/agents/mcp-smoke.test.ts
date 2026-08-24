import { APICallError, type ToolExecutionOptions, type ToolSet } from "ai"
import type { LanguageModelV4GenerateResult } from "@ai-sdk/provider"
import type { ListToolsResult } from "@ai-sdk/mcp"
import { MockLanguageModelV4 } from "ai/test"
import { describe, expect, it, vi } from "vitest"

import { createMcpSmokeService, mcpSmokeRequestSchema } from "./mcp-smoke"
import {
  OBSERVABILITY_MCP_TOOL_NAMES,
  observabilityMcpToolSchemas,
  type ObservabilityMcpClient,
  type ObservabilityMcpClientFactory,
} from "./observability-mcp"

const env = {
  NODE_ENV: "test",
  OPSSEMBLE_FAKE_MCP_URL: "https://observability.invalid/mcp/agent/",
  OPSSEMBLE_FAKE_MCP_TOKEN: "fixture-credential",
} satisfies NodeJS.ProcessEnv

const usage = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: {
    total: 4,
    text: 4,
    reasoning: undefined,
  },
}

function toolCall(): LanguageModelV4GenerateResult {
  return {
    content: [
      {
        type: "tool-call",
        toolCallId: "metrics-call",
        toolName: "get_metrics",
        input: JSON.stringify({
          demoSessionId: "demo-1",
          query: { operationId: "op-204" },
          limit: 2,
        }),
      },
    ],
    finishReason: { unified: "tool-calls", raw: undefined },
    usage,
    warnings: [],
  }
}

function text(value: string): LanguageModelV4GenerateResult {
  return {
    content: [{ type: "text", text: value }],
    finishReason: { unified: "stop", raw: undefined },
    usage,
    warnings: [],
  }
}

function mockMcpClient(options: { listError?: Error } = {}) {
  const execute = vi.fn(
    (
      name: string,
      input: unknown,
      executionOptions: ToolExecutionOptions<unknown>
    ) => {
      void input
      void executionOptions

      return {
        content: [{ type: "text", text: "2 simulated metrics" }],
        structuredContent: {
          dataMode: "simulated",
          itemCount: 2,
          items: [{ id: "metric-1" }, { id: "metric-2" }],
        },
        stream: name,
      }
    }
  )
  const close = vi.fn(async () => undefined)
  const listTools = vi.fn(async (): Promise<ListToolsResult> => {
    if (options.listError) {
      throw options.listError
    }

    return {
      tools: OBSERVABILITY_MCP_TOOL_NAMES.map((name) => ({
        name,
        inputSchema: {
          type: "object",
          additionalProperties: true,
        },
      })),
    }
  })
  const toolsFromDefinitions = vi.fn(
    (
      definitions: ListToolsResult,
      conversionOptions?: {
        schemas?: typeof observabilityMcpToolSchemas
      }
    ) =>
      Object.fromEntries(
        definitions.tools.map(({ name }) => [
          name,
          {
            inputSchema:
              conversionOptions?.schemas?.[
                name as keyof typeof observabilityMcpToolSchemas
              ]?.inputSchema,
            execute: (
              input: unknown,
              executionOptions: ToolExecutionOptions<unknown>
            ) => execute(name, input, executionOptions),
          },
        ])
      ) as ToolSet
  )
  const client = {
    close,
    listTools,
    toolsFromDefinitions,
  } as unknown as ObservabilityMcpClient
  const factory = vi.fn(
    async () => client
  ) as unknown as ObservabilityMcpClientFactory

  return { close, execute, factory }
}

function service(
  model: MockLanguageModelV4,
  mcpClientFactory: ObservabilityMcpClientFactory
) {
  return createMcpSmokeService({
    env,
    mcpClientFactory,
    createModelProvider: () => ({
      provider: "amazon-bedrock",
      modelId: "openai.gpt-5.6-terra",
      model,
    }),
  })
}

describe("MCP smoke service", () => {
  it("runs get_metrics with all four tools configured and in context", async () => {
    const mcp = mockMcpClient()
    const model = new MockLanguageModelV4({
      doGenerate: [toolCall(), text("itemCount: 2, dataMode: simulated")],
    })
    const input = mcpSmokeRequestSchema.parse({
      demoSessionId: "demo-1",
      query: { operationId: "op-204" },
    })

    const result = await service(model, mcp.factory).run(input)

    expect(result).toMatchObject({
      ok: true,
      provider: "amazon-bedrock",
      model: "openai.gpt-5.6-terra",
      expectedToolNames: OBSERVABILITY_MCP_TOOL_NAMES,
      configuredToolNames: OBSERVABILITY_MCP_TOOL_NAMES,
      contextToolNames: OBSERVABILITY_MCP_TOOL_NAMES,
      allExpectedToolsInContext: true,
      output: "itemCount: 2, dataMode: simulated",
      finishReason: "stop",
      stepCount: 2,
      toolCalls: [
        {
          toolCallId: "metrics-call",
          toolName: "get_metrics",
          input: {
            demoSessionId: "demo-1",
            query: { operationId: "op-204" },
            limit: 2,
          },
        },
      ],
      toolResults: [
        {
          toolCallId: "metrics-call",
          toolName: "get_metrics",
          itemCount: 2,
          dataMode: "simulated",
        },
      ],
    })
    expect(mcp.execute).toHaveBeenCalledWith(
      "get_metrics",
      {
        demoSessionId: "demo-1",
        query: { operationId: "op-204" },
        waitMs: 0,
        limit: 2,
      },
      expect.objectContaining({ abortSignal: expect.any(AbortSignal) })
    )
    expect(model.doGenerateCalls[0].tools?.map((tool) => tool.name)).toEqual(
      OBSERVABILITY_MCP_TOOL_NAMES
    )
    expect(model.doGenerateCalls[0].toolChoice).toEqual({
      type: "tool",
      toolName: "get_metrics",
    })
    expect(model.doGenerateCalls[1].toolChoice).toEqual({ type: "none" })
    expect(mcp.close).toHaveBeenCalledOnce()
  })

  it("normalizes MCP discovery errors without leaking remote details", async () => {
    const marker = "raw-mcp-response-marker"
    const mcp = mockMcpClient({ listError: new Error(marker) })
    const model = new MockLanguageModelV4()
    const result = await service(model, mcp.factory).run(
      mcpSmokeRequestSchema.parse({ demoSessionId: "demo-1" })
    )

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "TOOL_ERROR",
        message:
          "The observability tool provider could not complete the request.",
      },
    })
    expect(JSON.stringify(result)).not.toContain(marker)
    expect(mcp.close).toHaveBeenCalledOnce()
  })

  it("normalizes provider errors and still closes the MCP client", async () => {
    const marker = "raw-provider-response-marker"
    const mcp = mockMcpClient()
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new APICallError({
          message: marker,
          url: "https://provider.invalid/private",
          requestBodyValues: { secret: marker },
          statusCode: 500,
          responseBody: marker,
        })
      },
    })
    const result = await service(model, mcp.factory).run(
      mcpSmokeRequestSchema.parse({ demoSessionId: "demo-1" })
    )
    const serialized = JSON.stringify(result)

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "PROVIDER_UNAVAILABLE",
        message: "The model provider is temporarily unavailable.",
      },
    })
    expect(serialized).not.toContain(marker)
    expect(serialized).not.toContain("provider.invalid")
    expect(mcp.close).toHaveBeenCalledOnce()
  })

  it("preserves caller cancellation as a normalized abort", async () => {
    let markStarted: () => void = () => undefined
    const started = new Promise<void>((resolve) => {
      markStarted = resolve
    })
    const mcp = mockMcpClient()
    const model = new MockLanguageModelV4({
      doGenerate: ({ abortSignal }) => {
        markStarted()

        return new Promise<LanguageModelV4GenerateResult>(
          (_resolve, reject) => {
            const abort = () => reject(abortSignal?.reason)

            if (abortSignal?.aborted) {
              abort()
              return
            }

            abortSignal?.addEventListener("abort", abort, { once: true })
          }
        )
      },
    })
    const controller = new AbortController()
    const execution = service(model, mcp.factory).run(
      mcpSmokeRequestSchema.parse({ demoSessionId: "demo-1" }),
      { signal: controller.signal }
    )

    await started
    controller.abort(new DOMException("private abort reason", "AbortError"))

    const result = await execution

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "ABORTED",
        message: "The agent run was cancelled.",
      },
    })
    expect(JSON.stringify(result)).not.toContain("private abort reason")
    expect(mcp.close).toHaveBeenCalledOnce()
  })

  it("normalizes the total deadline as a timeout", async () => {
    vi.useFakeTimers()

    try {
      let markStarted: () => void = () => undefined
      const started = new Promise<void>((resolve) => {
        markStarted = resolve
      })
      const mcp = mockMcpClient()
      const model = new MockLanguageModelV4({
        doGenerate: ({ abortSignal }) => {
          markStarted()

          return new Promise<LanguageModelV4GenerateResult>(
            (_resolve, reject) => {
              const abort = () => reject(abortSignal?.reason)

              if (abortSignal?.aborted) {
                abort()
                return
              }

              abortSignal?.addEventListener("abort", abort, { once: true })
            }
          )
        },
      })
      const execution = service(model, mcp.factory).run(
        mcpSmokeRequestSchema.parse({
          demoSessionId: "demo-1",
          timeoutMs: 1_000,
        })
      )

      await started
      await vi.advanceTimersByTimeAsync(1_000)

      const result = await execution

      expect(result).toMatchObject({
        ok: false,
        error: {
          code: "TIMEOUT",
          message: "The agent run exceeded its time limit.",
        },
      })
      expect(mcp.close).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
  })
})
