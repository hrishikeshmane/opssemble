export type SerializableValue =
  | null
  | boolean
  | number
  | string
  | SerializableValue[]
  | { [key: string]: SerializableValue }

export type AgentToolDefinition = {
  name: string
  description: string
}

export type AgentDefinition = {
  id: string
  version: string
  name: string
  description: string
  tools: AgentToolDefinition[]
}

export type AgentRunLimits = {
  maxSteps: number
  maxToolCalls: number
  timeoutMs: number
}

export type AgentRunRequest = {
  agentId?: string
  projectId: string
  prompt: string
  limits?: Partial<AgentRunLimits>
}

export type AgentRunStatus =
  "queued" | "running" | "completed" | "failed" | "cancelled" | "timed_out"

export type AgentToolInvocation = {
  id: string
  toolName: string
  input: SerializableValue
  startedAt: string
}

export type AgentToolResult = {
  invocationId: string
  toolName: string
  status: "success" | "error"
  output: SerializableValue | null
  error: AgentRunError | null
  completedAt: string
  durationMs: number
}

export type AgentUsage = {
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  cachedInputTokens: number | null
  cacheWriteInputTokens: number | null
  reasoningTokens: number | null
}

export type AgentErrorCode =
  | "ABORTED"
  | "CONFIGURATION_ERROR"
  | "INVALID_REQUEST"
  | "MODEL_NOT_FOUND"
  | "PROJECT_NOT_FOUND"
  | "PROJECT_NOT_READY"
  | "PROVIDER_AUTH_ERROR"
  | "PROVIDER_ERROR"
  | "PROVIDER_RATE_LIMITED"
  | "PROVIDER_UNAVAILABLE"
  | "REPOSITORY_ACCESS_DENIED"
  | "TIMEOUT"
  | "TOOL_ERROR"
  | "TOOL_LIMIT_REACHED"

export type AgentRunError = {
  code: AgentErrorCode
  message: string
  retryable: boolean
}

type AgentRunBase = {
  runId: string
  agentId: string
  projectId: string
  startedAt: string
  completedAt: string
  durationMs: number
  limits: AgentRunLimits & {
    reached: "steps" | "tools" | null
  }
  steps: number
  toolInvocations: AgentToolInvocation[]
  toolResults: AgentToolResult[]
}

export type AgentRunResult = AgentRunBase & {
  ok: true
  status: "completed"
  output: string
  finishReason:
    "stop" | "length" | "content-filter" | "tool-calls" | "error" | "other"
  usage: AgentUsage
  error: null
}

export type AgentRunFailure = AgentRunBase & {
  ok: false
  status: "failed" | "cancelled" | "timed_out"
  output: null
  finishReason: null
  usage: AgentUsage | null
  error: AgentRunError
}

export type AgentRunResponse = AgentRunResult | AgentRunFailure
