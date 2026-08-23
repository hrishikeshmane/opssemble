import type { LanguageModelV4GenerateResult } from "@ai-sdk/provider"
import type { ListToolsResult } from "@ai-sdk/mcp"
import { APICallError, tool, type ToolSet } from "ai"
import { MockLanguageModelV4 } from "ai/test"
import { describe, expect, it, vi } from "vitest"
import { z } from "zod"

import type { ManagedAgentProject } from "./confinement"
import {
  OBSERVABILITY_MCP_TOOL_NAMES,
  observabilityMcpToolSchemas,
  type ObservabilityMcpClient,
  type ObservabilityMcpClientFactory,
} from "./observability-mcp"
import {
  createPrOrchestrationService,
  type PullRequestContext,
  type ReadOnlySharedContextToolProvider,
} from "./pr-orchestration"

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

const pullRequest: PullRequestContext = {
  number: 42,
  title: "Change request routing",
  body: "Updates the request path.",
  author: "octocat",
  base: "main",
  head: "feature/routing",
  url: "https://github.com/acme/service/pull/42",
  additions: 20,
  deletions: 4,
  changedFiles: 1,
  files: [
    {
      path: "lib/router.ts",
      pathTruncated: false,
      additions: 20,
      deletions: 4,
      diff: "@@ routing diff",
      hunksTruncated: false,
      linesTruncated: false,
      diffTruncated: false,
    },
  ],
  diffStatus: "loaded",
  truncation: {
    metadata: false,
    body: false,
    files: false,
    hunks: false,
    lines: false,
    diffChars: false,
  },
}

const request = {
  projectId: project.project.id,
  pullRequestNumber: 42,
  demoSessionId: "demo-1",
}

function toolCall(
  toolName: string,
  id = `${toolName}-call`,
  input: Record<string, unknown> = { objective: "Assess this change." }
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

function text(value: string): LanguageModelV4GenerateResult {
  return {
    content: [{ type: "text", text: value }],
    finishReason: { unified: "stop", raw: undefined },
    usage,
    warnings: [],
  }
}

function mockMcpFactory() {
  const closes: Array<ReturnType<typeof vi.fn>> = []
  const factory = vi.fn(async () => {
    const close = vi.fn(async () => undefined)
    closes.push(close)
    const definitions: ListToolsResult = {
      tools: OBSERVABILITY_MCP_TOOL_NAMES.map((name) => ({
        name,
        inputSchema: { type: "object", additionalProperties: true },
      })),
    }
    return {
      close,
      listTools: vi.fn(async () => definitions),
      toolsFromDefinitions: vi.fn(
        (
          listed: ListToolsResult,
          options?: { schemas?: typeof observabilityMcpToolSchemas }
        ) =>
          Object.fromEntries(
            listed.tools.map(({ name }) => [
              name,
              {
                inputSchema:
                  options?.schemas?.[
                    name as keyof typeof observabilityMcpToolSchemas
                  ]?.inputSchema,
                execute: vi.fn(async () => ({
                  dataMode: "simulated",
                  items: [],
                })),
              },
            ])
          ) as ToolSet
      ),
    } as unknown as ObservabilityMcpClient
  }) as unknown as ObservabilityMcpClientFactory

  return { factory, closes }
}

function service(
  model: MockLanguageModelV4,
  mcpClientFactory: ObservabilityMcpClientFactory,
  memoryFactory?: () => ReadOnlySharedContextToolProvider
) {
  return createPrOrchestrationService({
    model,
    observabilityMcp: {
      url: "https://observability.invalid/mcp/agent/",
      token: "fixture-token",
    },
    mcpClientFactory,
    resolveProject: async () => project,
    pullRequestContextLoader: async () => pullRequest,
    sharedContextToolProviderFactory: memoryFactory,
  })
}

describe("PR multi-agent orchestration", () => {
  it("delegates only the selected specialist with shared read-only tools", async () => {
    const mcp = mockMcpFactory()
    const memoryClose = vi.fn(async () => undefined)
    const memoryFactory = vi.fn((): ReadOnlySharedContextToolProvider => ({
      id: "test-memory",
      kind: "memory",
      createTools: ({ budget }) => ({
        recallSharedContext: tool({
          description: "Read shared context.",
          inputSchema: z.object({}).strict(),
          execute: async () => {
            budget.claim()
            return { notes: [] }
          },
        }),
      }),
      close: memoryClose,
    }))
    const model = new MockLanguageModelV4({
      doGenerate: [
        toolCall("delegateImpactAnalysis"),
        text("Blast analysis report."),
        text("Only impact analysis was needed."),
      ],
    })

    const result = await service(model, mcp.factory, memoryFactory).run(request)

    expect(result).toMatchObject({
      ok: true,
      selectedAgents: ["impact-analysis"],
      summary: "Only impact analysis was needed.",
      reports: [
        {
          specialistId: "impact-analysis",
          report: "Blast analysis report.",
        },
      ],
    })
    expect(model.doGenerateCalls[0].tools?.map(({ name }) => name)).toEqual([
      "delegateImpactAnalysis",
      "delegateStressTest",
      "delegateChaosTest",
      "delegateWatchArm",
    ])
    expect(model.doGenerateCalls[1].tools?.map(({ name }) => name)).toEqual([
      "readProjectMetadata",
      "listRepositoryFiles",
      "readRepositoryFile",
      "inspectGitStatus",
      ...OBSERVABILITY_MCP_TOOL_NAMES,
      "recallSharedContext",
    ])
    expect(memoryFactory).toHaveBeenCalledWith("impact-analysis")
    expect(memoryClose).toHaveBeenCalledOnce()
    expect(mcp.closes[0]).toHaveBeenCalledOnce()
  })

  it("executes deterministic stress and chaos simulations", async () => {
    const mcp = mockMcpFactory()
    const model = new MockLanguageModelV4({
      doGenerate: [
        toolCall("delegateStressTest"),
        toolCall("runSimulatedStressTest", "stress-simulation", {}),
        text("SIMULATED stress report."),
        toolCall("delegateChaosTest"),
        toolCall("runSimulatedChaosTest", "chaos-simulation", {}),
        text("SIMULATED chaos report."),
        text("Both simulated assessments completed."),
      ],
    })

    const result = await service(model, mcp.factory).run(request)

    expect(result.ok).toBe(true)
    expect(result.selectedAgents).toEqual(["stress-test", "chaos-test"])
    expect(result.reports.map(({ toolsUsed }) => toolsUsed)).toEqual([
      ["runSimulatedStressTest"],
      ["runSimulatedChaosTest"],
    ])
    expect(result.reports[0].simulation).toMatchObject({
      simulated: true,
      dataMode: "simulated",
      virtualRequests: 1_000,
    })
    expect(result.reports[1].simulation).toMatchObject({
      simulated: true,
      dataMode: "simulated",
      scenario: "single-instance-loss",
    })
    expect(mcp.closes).toHaveLength(2)
    expect(mcp.closes.every((close) => close.mock.calls.length === 1)).toBe(
      true
    )
    expect(model.doGenerateCalls[1].toolChoice).toEqual({
      type: "tool",
      toolName: "runSimulatedStressTest",
    })
    expect(model.doGenerateCalls[4].toolChoice).toEqual({
      type: "tool",
      toolName: "runSimulatedChaosTest",
    })
  })

  it("fails a simulation specialist that does not run its simulation", async () => {
    const mcp = mockMcpFactory()
    const model = new MockLanguageModelV4({
      doGenerate: [
        toolCall("delegateStressTest"),
        text("Skipped the simulation."),
        text("Done."),
      ],
    })

    const result = await service(model, mcp.factory).run(request)

    expect(result).toMatchObject({
      ok: false,
      selectedAgents: ["stress-test"],
      reports: [
        {
          specialistId: "stress-test",
          status: "failed",
          simulation: null,
          error: {
            code: "TOOL_ERROR",
            message: "A simulated assessment must run exactly once.",
          },
        },
      ],
      error: {
        code: "TOOL_ERROR",
        message: "A simulated assessment must run exactly once.",
      },
    })
  })

  it("normalizes abort, timeout, and provider failures", async () => {
    const mcp = mockMcpFactory()
    let markStarted: () => void = () => undefined
    const started = new Promise<void>((resolve) => {
      markStarted = resolve
    })
    const hangingModel = new MockLanguageModelV4({
      doGenerate: ({ abortSignal }) => {
        markStarted()
        return new Promise<LanguageModelV4GenerateResult>(
          (_resolve, reject) => {
            const abort = () => reject(abortSignal?.reason)
            abortSignal?.addEventListener("abort", abort, { once: true })
          }
        )
      },
    })
    const controller = new AbortController()
    const abortedRun = service(hangingModel, mcp.factory).run(request, {
      signal: controller.signal,
    })
    await started
    controller.abort(new DOMException("private reason", "AbortError"))
    const aborted = await abortedRun

    expect(aborted).toMatchObject({
      ok: false,
      status: "cancelled",
      error: { code: "ABORTED", message: "The agent run was cancelled." },
    })
    expect(JSON.stringify(aborted)).not.toContain("private reason")

    vi.useFakeTimers()
    try {
      const timeoutModel = new MockLanguageModelV4({
        doGenerate: ({ abortSignal }) =>
          new Promise<LanguageModelV4GenerateResult>((_resolve, reject) => {
            const abort = () => reject(abortSignal?.reason)
            abortSignal?.addEventListener("abort", abort, { once: true })
          }),
      })
      const timedRun = service(timeoutModel, mcp.factory).run({
        ...request,
        timeoutMs: 1_000,
      })
      await vi.advanceTimersByTimeAsync(1_000)
      expect(await timedRun).toMatchObject({
        ok: false,
        status: "timed_out",
        error: { code: "TIMEOUT" },
      })
    } finally {
      vi.useRealTimers()
    }

    const marker = "private-provider-marker"
    const providerModel = new MockLanguageModelV4({
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
    const providerFailure = await service(providerModel, mcp.factory).run(
      request
    )

    expect(providerFailure).toMatchObject({
      ok: false,
      error: {
        code: "PROVIDER_UNAVAILABLE",
        message: "The model provider is temporarily unavailable.",
      },
    })
    expect(JSON.stringify(providerFailure)).not.toContain(marker)
  })
})
