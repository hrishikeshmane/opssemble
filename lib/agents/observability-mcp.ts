import "server-only"

import {
  createMCPClient,
  type ListToolsResult,
  type MCPClient,
  type MCPClientConfig,
} from "@ai-sdk/mcp"
import type { ToolExecutionOptions, ToolSet } from "ai"
import { z } from "zod"

import { AgentRuntimeError } from "./errors"
import type { AgentToolProvider } from "./tool-provider"
import type { ToolExecutionBudget } from "./tools"

const MAX_DEMO_SESSION_ID_LENGTH = 128
const MAX_CURSOR_LENGTH = 4_096
const MAX_QUERY_KEYS = 24
const MAX_QUERY_KEY_LENGTH = 64
const MAX_QUERY_STRING_LENGTH = 512
const MAX_QUERY_LIST_ITEMS = 32

const MCP_ERROR_MESSAGE =
  "The observability tool provider could not complete the request."

export const OBSERVABILITY_MCP_TOOL_NAMES = [
  "get_metrics",
  "get_logs",
  "get_traces",
  "get_events",
] as const

type ObservabilityMcpToolName = (typeof OBSERVABILITY_MCP_TOOL_NAMES)[number]

const queryKeySchema = z
  .string()
  .min(1)
  .max(MAX_QUERY_KEY_LENGTH)
  .regex(/^[A-Za-z][A-Za-z0-9_.-]*$/)

const queryScalarSchema = z.union([
  z.string().max(MAX_QUERY_STRING_LENGTH),
  z.number().finite(),
  z.boolean(),
  z.null(),
])

export const observabilityQuerySchema = z
  .record(
    queryKeySchema,
    z.union([
      queryScalarSchema,
      z.array(queryScalarSchema).max(MAX_QUERY_LIST_ITEMS),
    ])
  )
  .superRefine((query, context) => {
    if (Object.keys(query).length > MAX_QUERY_KEYS) {
      context.addIssue({
        code: "too_big",
        origin: "object",
        maximum: MAX_QUERY_KEYS,
        inclusive: true,
        message: `Query must contain at most ${MAX_QUERY_KEYS} keys.`,
      })
    }
  })

export const observabilityToolInputSchema = z
  .object({
    demoSessionId: z.string().trim().min(1).max(MAX_DEMO_SESSION_ID_LENGTH),
    query: observabilityQuerySchema.default({}),
    cursor: z.string().min(1).max(MAX_CURSOR_LENGTH).optional(),
    waitMs: z.number().int().min(0).max(5_000).default(0),
    limit: z.number().int().min(1).max(100).default(100),
  })
  .strict()

export const observabilityMcpToolSchemas = {
  get_metrics: { inputSchema: observabilityToolInputSchema },
  get_logs: { inputSchema: observabilityToolInputSchema },
  get_traces: { inputSchema: observabilityToolInputSchema },
  get_events: { inputSchema: observabilityToolInputSchema },
} as const

const OBSERVABILITY_TOOL_DESCRIPTIONS = {
  get_metrics:
    "Read bounded metric observations for a fake observability demo session.",
  get_logs:
    "Read bounded structured log observations for a fake observability demo session.",
  get_traces:
    "Read bounded request and dependency traces for a fake observability demo session.",
  get_events:
    "Read bounded product and experiment events for a fake observability demo session.",
} satisfies Record<ObservabilityMcpToolName, string>

export type ObservabilityMcpConfig = {
  url: string
  token: string
}

export type ObservabilityMcpClient = Pick<
  MCPClient,
  "close" | "listTools" | "toolsFromDefinitions"
>

export type ObservabilityMcpClientFactory = (
  config: MCPClientConfig
) => Promise<ObservabilityMcpClient>

export type ObservabilityMcpTools = ToolSet & {
  [NAME in ObservabilityMcpToolName]: ToolSet[string]
}

function configurationError(message: string): AgentRuntimeError {
  return new AgentRuntimeError("CONFIGURATION_ERROR", message)
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase()

  if (normalized === "localhost" || normalized === "[::1]") {
    return true
  }

  const octets = normalized.split(".")
  return (
    octets.length === 4 &&
    octets[0] === "127" &&
    octets.every(
      (octet) =>
        /^\d{1,3}$/.test(octet) && Number(octet) >= 0 && Number(octet) <= 255
    )
  )
}

export function getObservabilityMcpConfig(
  env: Readonly<Record<string, string | undefined>> = process.env
): ObservabilityMcpConfig | undefined {
  const configuredUrl = env.OPSSEMBLE_FAKE_MCP_URL?.trim()
  const configuredToken = env.OPSSEMBLE_FAKE_MCP_TOKEN?.trim()

  if (!configuredUrl && !configuredToken) {
    return undefined
  }

  if (!configuredUrl || !configuredToken) {
    throw configurationError(
      "OPSSEMBLE_FAKE_MCP_URL and OPSSEMBLE_FAKE_MCP_TOKEN must be configured together."
    )
  }

  let url: URL
  try {
    url = new URL(configuredUrl)
  } catch {
    throw configurationError(
      "OPSSEMBLE_FAKE_MCP_URL must be a valid absolute URL."
    )
  }

  if (url.username || url.password) {
    throw configurationError(
      "OPSSEMBLE_FAKE_MCP_URL must not contain credentials."
    )
  }

  if (configuredUrl.includes("?") || configuredUrl.includes("#")) {
    throw configurationError(
      "OPSSEMBLE_FAKE_MCP_URL must not contain a query string or fragment."
    )
  }

  if (!url.pathname.endsWith("/mcp/agent/")) {
    throw configurationError(
      "OPSSEMBLE_FAKE_MCP_URL must use the /mcp/agent/ profile."
    )
  }

  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && isLoopbackHostname(url.hostname))
  ) {
    throw configurationError(
      "OPSSEMBLE_FAKE_MCP_URL must use HTTPS or loopback HTTP."
    )
  }

  return {
    url: url.toString(),
    token: configuredToken,
  }
}

function toolError(): AgentRuntimeError {
  return new AgentRuntimeError("TOOL_ERROR", MCP_ERROR_MESSAGE)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isMcpErrorResult(value: unknown): boolean {
  if (!isObject(value)) {
    return false
  }

  if (value.isError === true) {
    return true
  }

  const structuredContent = value.structuredContent
  return (
    isObject(structuredContent) &&
    isObject(structuredContent.error) &&
    typeof structuredContent.error.code === "string"
  )
}

function assertExactToolCatalog(definitions: ListToolsResult): void {
  const actualNames = definitions.tools.map(({ name }) => name)
  const expectedNames = new Set<string>(OBSERVABILITY_MCP_TOOL_NAMES)

  if (
    definitions.nextCursor !== undefined ||
    actualNames.length !== expectedNames.size ||
    new Set(actualNames).size !== expectedNames.size ||
    actualNames.some((name) => !expectedNames.has(name))
  ) {
    throw toolError()
  }
}

function wrapToolExecution(
  name: ObservabilityMcpToolName,
  convertedTool: ToolSet[string],
  budget: ToolExecutionBudget
): ToolSet[string] {
  const execute = convertedTool.execute

  if (!execute) {
    throw toolError()
  }

  return {
    description: OBSERVABILITY_TOOL_DESCRIPTIONS[name],
    inputSchema: observabilityMcpToolSchemas[name].inputSchema,
    ...(convertedTool.toModelOutput
      ? { toModelOutput: convertedTool.toModelOutput }
      : {}),
    async execute(input: unknown, options: ToolExecutionOptions<unknown>) {
      budget.claim()

      try {
        const result = await execute(input, options)

        if (isMcpErrorResult(result)) {
          throw toolError()
        }

        return result
      } catch {
        if (options.abortSignal?.aborted) {
          throw options.abortSignal.reason
        }

        throw toolError()
      }
    },
  } as ToolSet[string]
}

export function createObservabilityMcpToolProvider(options: {
  config: ObservabilityMcpConfig
  clientFactory?: ObservabilityMcpClientFactory
}): AgentToolProvider<
  {
    budget: ToolExecutionBudget
    abortSignal: AbortSignal
    timeoutMs: number
  },
  ObservabilityMcpTools
> &
  Required<Pick<AgentToolProvider<never>, "close">> {
  const clientFactory = options.clientFactory ?? createMCPClient
  let client: ObservabilityMcpClient | undefined

  async function close(): Promise<void> {
    const activeClient = client
    client = undefined

    if (!activeClient) {
      return
    }

    try {
      await activeClient.close()
    } catch {
      // Closing is best-effort and must not replace the run's primary result.
    }
  }

  return {
    id: "fake-observability-mcp",
    kind: "mcp",
    async createTools({ budget, abortSignal, timeoutMs }) {
      try {
        client = await clientFactory({
          clientName: "opssemble-agent-runtime",
          version: "1.0.0",
          transport: {
            type: "http",
            url: options.config.url,
            headers: {
              Authorization: `Bearer ${options.config.token}`,
            },
            redirect: "error",
          },
          initializationOptions: {
            signal: abortSignal,
            timeout: timeoutMs,
            maxTotalTimeout: timeoutMs,
          },
          maxRetries: 0,
        })

        const definitions = await client.listTools({
          options: {
            signal: abortSignal,
            timeout: timeoutMs,
            maxTotalTimeout: timeoutMs,
          },
        })
        assertExactToolCatalog(definitions)

        const convertedTools = client.toolsFromDefinitions(definitions, {
          schemas: observabilityMcpToolSchemas,
        })

        return Object.fromEntries(
          OBSERVABILITY_MCP_TOOL_NAMES.map((name) => [
            name,
            wrapToolExecution(name, convertedTools[name], budget),
          ])
        ) as ObservabilityMcpTools
      } catch (error) {
        await close()

        if (abortSignal.aborted) {
          throw abortSignal.reason
        }

        if (error instanceof AgentRuntimeError && error.code === "TOOL_ERROR") {
          throw error
        }

        throw toolError()
      }
    },
    close,
  }
}
