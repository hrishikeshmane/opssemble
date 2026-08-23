import type { LanguageModelV4GenerateResult } from "@ai-sdk/provider"
import type { ListToolsResult } from "@ai-sdk/mcp"
import type { ToolExecutionOptions, ToolSet } from "ai"
import { MockLanguageModelV4 } from "ai/test"
import { describe, expect, it, vi } from "vitest"

import {
  createRepositoryCodingAgent,
  createRepositoryCodingAgentDefinition,
} from "./coding-agent"
import type { ManagedAgentProject } from "./confinement"
import type { AgentExecutionObserver } from "./executor"
import {
  OBSERVABILITY_MCP_TOOL_NAMES,
  observabilityMcpToolSchemas,
  type ObservabilityMcpClient,
  type ObservabilityMcpClientFactory,
} from "./observability-mcp"

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

const managedProject: ManagedAgentProject = {
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

const observabilityMcp = {
  url: "https://observability.invalid/mcp/agent/",
  token: "fixture-credential",
}

function toolCall(
  id: string,
  toolName = "readProjectMetadata",
  input: Record<string, unknown> = {}
): LanguageModelV4GenerateResult {
  return {
    content: [
      {
        type: "tool-call",
        toolCallId: id,
        toolName,
        input: JSON.stringify(input),
      },
    ],
    finishReason: { unified: "tool-calls", raw: undefined },
    usage,
    warnings: [],
  }
}

function simultaneousToolCalls(): LanguageModelV4GenerateResult {
  return {
    content: [
      {
        type: "tool-call",
        toolCallId: "repo-call",
        toolName: "readProjectMetadata",
        input: "{}",
      },
      {
        type: "tool-call",
        toolCallId: "mcp-call",
        toolName: "get_logs",
        input: JSON.stringify({ demoSessionId: "demo-1" }),
      },
    ],
    finishReason: { unified: "tool-calls", raw: undefined },
    usage,
    warnings: [],
  }
}

function text(textValue: string): LanguageModelV4GenerateResult {
  return {
    content: [{ type: "text", text: textValue }],
    finishReason: { unified: "stop", raw: undefined },
    usage,
    warnings: [],
  }
}

function mcpClient(
  implementation?: (
    name: string,
    input: unknown,
    options: ToolExecutionOptions<unknown>
  ) => unknown
) {
  const execute = vi.fn(
    implementation ??
      ((name: string, input: unknown) => ({
        stream: name,
        query: input,
        items: [],
      }))
  )
  const close = vi.fn(async () => undefined)
  const listTools = vi.fn(async (): Promise<ListToolsResult> => ({
    tools: OBSERVABILITY_MCP_TOOL_NAMES.map((name) => ({
      name,
      inputSchema: {
        type: "object",
        additionalProperties: true,
      },
    })),
  }))
  const toolsFromDefinitions = vi.fn(
    (
      definitions: ListToolsResult,
      options?: {
        schemas?: typeof observabilityMcpToolSchemas
      }
    ) =>
      Object.fromEntries(
        definitions.tools.map(({ name }) => [
          name,
          {
            inputSchema:
              options?.schemas?.[
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

function observer(): AgentExecutionObserver {
  return {
    onStepEnd: () => undefined,
    onToolStart: () => undefined,
    onToolEnd: () => undefined,
  }
}

describe("repository coding agent", () => {
  it("adds only the four observation tools to the configured definition", () => {
    expect(
      createRepositoryCodingAgentDefinition(false).tools.map(({ name }) => name)
    ).toEqual([
      "readProjectMetadata",
      "listRepositoryFiles",
      "readRepositoryFile",
      "inspectGitStatus",
    ])
    expect(
      createRepositoryCodingAgentDefinition(true).tools.map(({ name }) => name)
    ).toEqual([
      "readProjectMetadata",
      "listRepositoryFiles",
      "readRepositoryFile",
      "inspectGitStatus",
      ...OBSERVABILITY_MCP_TOOL_NAMES,
    ])
  })

  it("runs a deterministic AI SDK tool loop", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: [toolCall("call-1"), text("Repository is ready.")],
    })
    const executor = createRepositoryCodingAgent({
      model,
      project: managedProject,
      maxSteps: 4,
      maxToolCalls: 4,
      maxOutputTokens: 512,
      maxRetries: 0,
    })

    const result = await executor.execute({
      prompt: "Summarize this project.",
      abortSignal: new AbortController().signal,
      timeoutMs: 1_000,
      observer: observer(),
    })

    expect(result).toMatchObject({
      output: "Repository is ready.",
      finishReason: "stop",
      steps: 2,
      toolCalls: 1,
      limitReached: null,
    })
    expect(model.doGenerateCalls).toHaveLength(2)
  })

  it("runs a deterministic MCP observation tool loop and closes the client", async () => {
    const mockedMcp = mcpClient()
    const model = new MockLanguageModelV4({
      doGenerate: [
        toolCall("call-1", "get_logs", {
          demoSessionId: "demo-1",
          query: { operationId: "op-204" },
        }),
        text("No matching logs."),
      ],
    })
    const executor = createRepositoryCodingAgent({
      model,
      project: managedProject,
      maxSteps: 4,
      maxToolCalls: 4,
      maxOutputTokens: 512,
      maxRetries: 0,
      observabilityMcp,
      mcpClientFactory: mockedMcp.factory,
    })

    const result = await executor.execute({
      prompt: "Inspect the demo logs.",
      abortSignal: new AbortController().signal,
      timeoutMs: 1_000,
      observer: observer(),
    })

    expect(result).toMatchObject({
      output: "No matching logs.",
      finishReason: "stop",
      steps: 2,
      toolCalls: 1,
      limitReached: null,
    })
    expect(mockedMcp.execute).toHaveBeenCalledWith(
      "get_logs",
      {
        demoSessionId: "demo-1",
        query: { operationId: "op-204" },
        waitMs: 0,
        limit: 100,
      },
      expect.objectContaining({ abortSignal: expect.any(AbortSignal) })
    )
    expect(mockedMcp.close).toHaveBeenCalledOnce()
  })

  it("shares the tool budget across repository and MCP calls", async () => {
    const mockedMcp = mcpClient()
    const model = new MockLanguageModelV4({
      doGenerate: simultaneousToolCalls(),
    })
    const executor = createRepositoryCodingAgent({
      model,
      project: managedProject,
      maxSteps: 4,
      maxToolCalls: 1,
      maxOutputTokens: 512,
      maxRetries: 0,
      observabilityMcp,
      mcpClientFactory: mockedMcp.factory,
    })

    const result = await executor.execute({
      prompt: "Inspect repository metadata and logs.",
      abortSignal: new AbortController().signal,
      timeoutMs: 1_000,
      observer: observer(),
    })

    expect(result).toMatchObject({
      finishReason: "tool-calls",
      toolCalls: 2,
      limitReached: "tools",
    })
    expect(mockedMcp.execute).not.toHaveBeenCalled()
    expect(mockedMcp.close).toHaveBeenCalledOnce()
  })

  it("closes the MCP client when the model fails", async () => {
    const mockedMcp = mcpClient()
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new Error("model-response-marker")
      },
    })
    const executor = createRepositoryCodingAgent({
      model,
      project: managedProject,
      maxSteps: 4,
      maxToolCalls: 4,
      maxOutputTokens: 512,
      maxRetries: 0,
      observabilityMcp,
      mcpClientFactory: mockedMcp.factory,
    })

    await expect(
      executor.execute({
        prompt: "Inspect the demo.",
        abortSignal: new AbortController().signal,
        timeoutMs: 1_000,
        observer: observer(),
      })
    ).rejects.toThrow("model-response-marker")
    expect(mockedMcp.close).toHaveBeenCalledOnce()
  })

  it("closes the MCP client when the run is aborted", async () => {
    let markToolStarted: () => void = () => undefined
    const toolStarted = new Promise<void>((resolve) => {
      markToolStarted = resolve
    })
    const mockedMcp = mcpClient((_name, _input, options) => {
      markToolStarted()

      return new Promise((_resolve, reject) => {
        const signal = options.abortSignal

        if (!signal) {
          reject(new Error("Expected an abort signal."))
          return
        }

        const abort = () => reject(signal.reason)

        if (signal.aborted) {
          abort()
          return
        }

        signal.addEventListener("abort", abort, { once: true })
      })
    })
    const model = new MockLanguageModelV4({
      doGenerate: toolCall("call-1", "get_logs", {
        demoSessionId: "demo-1",
      }),
    })
    const executor = createRepositoryCodingAgent({
      model,
      project: managedProject,
      maxSteps: 4,
      maxToolCalls: 4,
      maxOutputTokens: 512,
      maxRetries: 0,
      observabilityMcp,
      mcpClientFactory: mockedMcp.factory,
    })
    const controller = new AbortController()
    const execution = executor.execute({
      prompt: "Inspect the demo.",
      abortSignal: controller.signal,
      timeoutMs: 1_000,
      observer: observer(),
    })

    await toolStarted
    controller.abort(new DOMException("Cancelled.", "AbortError"))

    await expect(execution).rejects.toMatchObject({ name: "AbortError" })
    expect(mockedMcp.close).toHaveBeenCalledOnce()
  })

  it("stops at the configured AI SDK step limit", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: [
        toolCall("call-1"),
        toolCall("call-2"),
        text("must not run"),
      ],
    })
    const executor = createRepositoryCodingAgent({
      model,
      project: managedProject,
      maxSteps: 2,
      maxToolCalls: 10,
      maxOutputTokens: 512,
      maxRetries: 0,
    })

    const result = await executor.execute({
      prompt: "Keep inspecting.",
      abortSignal: new AbortController().signal,
      timeoutMs: 1_000,
      observer: observer(),
    })

    expect(result.steps).toBe(2)
    expect(result.limitReached).toBe("steps")
    expect(model.doGenerateCalls).toHaveLength(2)
  })
})
