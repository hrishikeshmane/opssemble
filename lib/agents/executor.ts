import type { FinishReason, LanguageModelUsage } from "ai"

import type {
  AgentToolInvocation,
  AgentToolResult,
  SerializableValue,
} from "./types"

export type AgentExecutionObserver = {
  onStepEnd(stepNumber: number): void
  onToolStart(event: {
    id: string
    toolName: string
    input: SerializableValue
  }): void
  onToolEnd(event: {
    id: string
    toolName: string
    durationMs: number
    output: SerializableValue | null
    error: unknown
  }): void
}

export type AgentExecutionResult = {
  output: string
  finishReason: FinishReason
  usage: LanguageModelUsage
  steps: number
  toolCalls: number
  limitReached: "steps" | "tools" | null
}

export type AgentExecutor = {
  execute(options: {
    prompt: string
    abortSignal: AbortSignal
    timeoutMs: number
    observer: AgentExecutionObserver
  }): Promise<AgentExecutionResult>
}

export type RecordedAgentExecution = {
  steps: number
  toolInvocations: AgentToolInvocation[]
  toolResults: AgentToolResult[]
}
