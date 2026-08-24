import type { ListToolsResult } from "@ai-sdk/mcp"
import type { ToolExecutionOptions, ToolSet } from "ai"
import { describe, expect, it, vi } from "vitest"

import { AgentRuntimeError } from "./errors"
import {
  createObservabilityMcpToolProvider,
  getObservabilityMcpConfig,
  OBSERVABILITY_MCP_TOOL_NAMES,
  observabilityMcpToolSchemas,
  observabilityToolInputSchema,
  type ObservabilityMcpClient,
  type ObservabilityMcpClientFactory,
} from "./observability-mcp"
import { ToolExecutionBudget } from "./tools"

const fixtureConfig = {
  url: "https://observability.invalid/mcp/agent/",
  token: "fixture-credential",
}

function definitions(
  names: readonly string[] = OBSERVABILITY_MCP_TOOL_NAMES
): ListToolsResult {
  return {
    tools: names.map((name) => ({
      name,
      description: `Remote description for ${name}`,
      inputSchema: {
        type: "object",
        additionalProperties: true,
      },
    })),
  }
}

function mockClient(
  options: {
    names?: readonly string[]
    listError?: Error
    execute?: (
      name: string,
      input: unknown,
      options: ToolExecutionOptions<unknown>
    ) => unknown
    closeError?: Error
  } = {}
) {
  const execute = vi.fn(
    options.execute ??
      ((name: string) => ({
        stream: name,
        items: [],
      }))
  )
  const close = vi.fn(async () => {
    if (options.closeError) {
      throw options.closeError
    }
  })
  const listTools = vi.fn(async () => {
    if (options.listError) {
      throw options.listError
    }

    return definitions(options.names)
  })
  const toolsFromDefinitions = vi.fn(
    (
      listedDefinitions: ListToolsResult,
      conversionOptions?: {
        schemas?: typeof observabilityMcpToolSchemas
      }
    ) =>
      Object.fromEntries(
        listedDefinitions.tools.map(({ name }) => [
          name,
          {
            description: `Converted ${name}`,
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

  return {
    client,
    close,
    execute,
    factory,
    listTools,
    toolsFromDefinitions,
  }
}

function executionOptions(
  signal = new AbortController().signal
): ToolExecutionOptions<unknown> {
  return {
    toolCallId: "call-1",
    messages: [],
    abortSignal: signal,
    context: undefined,
  }
}

describe("fake observability MCP configuration", () => {
  it("is optional only when both environment values are absent", () => {
    expect(getObservabilityMcpConfig({})).toBeUndefined()
    expect(
      getObservabilityMcpConfig({
        OPSSEMBLE_FAKE_MCP_URL: " ",
        OPSSEMBLE_FAKE_MCP_TOKEN: "",
      })
    ).toBeUndefined()
  })

  it.each([
    {
      OPSSEMBLE_FAKE_MCP_URL: "https://observability.invalid/mcp/agent/",
    },
    { OPSSEMBLE_FAKE_MCP_TOKEN: "fixture-credential" },
  ])("rejects partial configuration", (env) => {
    expect(() => getObservabilityMcpConfig(env)).toThrowError(
      expect.objectContaining({ code: "CONFIGURATION_ERROR" })
    )
  })

  it.each([
    "https://observability.invalid/mcp/agent/",
    "https://observability.invalid/prefix/mcp/agent/",
    "http://localhost:8000/mcp/agent/",
    "http://127.42.0.1:8000/mcp/agent/",
    "http://[::1]:8000/mcp/agent/",
  ])("accepts the agent profile at %s", (url) => {
    expect(
      getObservabilityMcpConfig({
        OPSSEMBLE_FAKE_MCP_URL: url,
        OPSSEMBLE_FAKE_MCP_TOKEN: "fixture-credential",
      })
    ).toMatchObject({ token: "fixture-credential" })
  })

  it.each([
    "not-a-url",
    "ftp://observability.invalid/mcp/agent/",
    "http://observability.invalid/mcp/agent/",
    "https://user:password@observability.invalid/mcp/agent/",
    "https://observability.invalid/mcp/agent/?scope=all",
    "https://observability.invalid/mcp/agent/#fragment",
    "https://observability.invalid/mcp/planner/",
    "https://observability.invalid/mcp/agent",
  ])("rejects an unsafe MCP URL", (url) => {
    const marker = "fixture-credential"

    try {
      getObservabilityMcpConfig({
        OPSSEMBLE_FAKE_MCP_URL: url,
        OPSSEMBLE_FAKE_MCP_TOKEN: marker,
      })
      throw new Error("Expected configuration validation to fail.")
    } catch (error) {
      expect(error).toBeInstanceOf(AgentRuntimeError)
      expect(error).toMatchObject({ code: "CONFIGURATION_ERROR" })
      expect(JSON.stringify(error)).not.toContain(marker)
      expect(JSON.stringify(error)).not.toContain(url)
    }
  })
})

describe("fake observability MCP provider", () => {
  it.each([
    { names: OBSERVABILITY_MCP_TOOL_NAMES.slice(0, 3) },
    { names: [...OBSERVABILITY_MCP_TOOL_NAMES, "execute_action"] },
  ])("rejects a missing or extra tool catalog", async ({ names }) => {
    const mocked = mockClient({ names })
    const provider = createObservabilityMcpToolProvider({
      config: fixtureConfig,
      clientFactory: mocked.factory,
    })

    await expect(
      provider.createTools({
        budget: new ToolExecutionBudget(4),
        abortSignal: new AbortController().signal,
        timeoutMs: 1_000,
      })
    ).rejects.toMatchObject({
      code: "TOOL_ERROR",
      message:
        "The observability tool provider could not complete the request.",
    })
    expect(mocked.toolsFromDefinitions).not.toHaveBeenCalled()
    expect(mocked.close).toHaveBeenCalledOnce()
  })

  it("converts only the exact allowlist with explicit local schemas", async () => {
    const mocked = mockClient()
    const provider = createObservabilityMcpToolProvider({
      config: fixtureConfig,
      clientFactory: mocked.factory,
    })

    const tools = await provider.createTools({
      budget: new ToolExecutionBudget(4),
      abortSignal: new AbortController().signal,
      timeoutMs: 1_000,
    })

    expect(Object.keys(tools)).toEqual(OBSERVABILITY_MCP_TOOL_NAMES)
    expect(mocked.toolsFromDefinitions).toHaveBeenCalledWith(
      expect.any(Object),
      { schemas: observabilityMcpToolSchemas }
    )

    await provider.close()
    expect(mocked.close).toHaveBeenCalledOnce()
  })

  it("sanitizes discovery and tool-call failures", async () => {
    const remoteMarker = "remote-response-marker"
    const discoveryMock = mockClient({
      listError: new Error(remoteMarker),
    })
    const discoveryProvider = createObservabilityMcpToolProvider({
      config: fixtureConfig,
      clientFactory: discoveryMock.factory,
    })

    const discoveryError = await Promise.resolve(
      discoveryProvider.createTools({
        budget: new ToolExecutionBudget(4),
        abortSignal: new AbortController().signal,
        timeoutMs: 1_000,
      })
    ).catch((error: unknown) => error)

    expect(discoveryError).toMatchObject({ code: "TOOL_ERROR" })
    expect(JSON.stringify(discoveryError)).not.toContain(remoteMarker)
    expect(discoveryMock.close).toHaveBeenCalledOnce()

    const callMock = mockClient({
      execute: () => {
        throw new Error(remoteMarker)
      },
    })
    const callProvider = createObservabilityMcpToolProvider({
      config: fixtureConfig,
      clientFactory: callMock.factory,
    })
    const tools = await callProvider.createTools({
      budget: new ToolExecutionBudget(4),
      abortSignal: new AbortController().signal,
      timeoutMs: 1_000,
    })
    const execute = tools.get_logs.execute as (
      input: unknown,
      options: ToolExecutionOptions<unknown>
    ) => Promise<unknown>

    const callError = await execute(
      { demoSessionId: "demo-1" },
      executionOptions()
    ).catch((error: unknown) => error)

    expect(callError).toMatchObject({ code: "TOOL_ERROR" })
    expect(JSON.stringify(callError)).not.toContain(remoteMarker)
    await callProvider.close()
  })

  it("treats FastMCP structured domain errors as tool failures", async () => {
    const mocked = mockClient({
      execute: () => ({
        isError: false,
        structuredContent: {
          error: {
            code: "SESSION_NOT_FOUND",
            message: "Unknown session",
          },
        },
      }),
    })
    const provider = createObservabilityMcpToolProvider({
      config: fixtureConfig,
      clientFactory: mocked.factory,
    })
    const tools = await provider.createTools({
      budget: new ToolExecutionBudget(4),
      abortSignal: new AbortController().signal,
      timeoutMs: 1_000,
    })
    const execute = tools.get_logs.execute as (
      input: unknown,
      options: ToolExecutionOptions<unknown>
    ) => Promise<unknown>

    await expect(
      execute({ demoSessionId: "missing" }, executionOptions())
    ).rejects.toMatchObject({
      code: "TOOL_ERROR",
      message:
        "The observability tool provider could not complete the request.",
    })

    await provider.close()
  })

  it("does not let close failures replace a successful close", async () => {
    const mocked = mockClient({
      closeError: new Error("close-response-marker"),
    })
    const provider = createObservabilityMcpToolProvider({
      config: fixtureConfig,
      clientFactory: mocked.factory,
    })

    await provider.createTools({
      budget: new ToolExecutionBudget(4),
      abortSignal: new AbortController().signal,
      timeoutMs: 1_000,
    })

    await expect(provider.close()).resolves.toBeUndefined()
  })
})

describe("fake observability MCP input", () => {
  it("applies bounded defaults", () => {
    expect(
      observabilityToolInputSchema.parse({
        demoSessionId: "demo-1",
        query: { operationId: "op-204" },
      })
    ).toEqual({
      demoSessionId: "demo-1",
      query: { operationId: "op-204" },
      waitMs: 0,
      limit: 100,
    })
  })

  it.each([
    { demoSessionId: "" },
    { demoSessionId: "demo-1", waitMs: 5_001 },
    { demoSessionId: "demo-1", limit: 101 },
    { demoSessionId: "demo-1", cursor: "" },
    {
      demoSessionId: "demo-1",
      query: { operationId: "x".repeat(513) },
    },
    {
      demoSessionId: "demo-1",
      query: { operationId: Array.from({ length: 33 }, () => "op") },
    },
    {
      demoSessionId: "demo-1",
      query: Object.fromEntries(
        Array.from({ length: 25 }, (_, index) => [`key${index}`, index])
      ),
    },
    { demoSessionId: "demo-1", query: { operationId: { nested: true } } },
    { demoSessionId: "demo-1", privileged: true },
  ])("rejects unbounded or unknown input", (input) => {
    expect(observabilityToolInputSchema.safeParse(input).success).toBe(false)
  })
})
