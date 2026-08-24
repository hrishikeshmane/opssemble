import {
  APICallError,
  InvalidToolInputError,
  LoadAPIKeyError,
  LoadSettingError,
  NoSuchModelError,
} from "ai"
import { ZodError } from "zod"

import type { AgentErrorCode, AgentRunError } from "./types"

export class AgentRuntimeError extends Error {
  readonly code: AgentErrorCode
  readonly retryable: boolean

  constructor(
    code: AgentErrorCode,
    message: string,
    options?: ErrorOptions & { retryable?: boolean }
  ) {
    super(message, options)
    this.name = "AgentRuntimeError"
    this.code = code
    this.retryable = options?.retryable ?? false
  }
}

export type ErrorNormalizationContext = {
  aborted?: boolean
  timedOut?: boolean
}

export function normalizeAgentError(
  error: unknown,
  context: ErrorNormalizationContext = {}
): AgentRunError {
  if (context.timedOut) {
    return {
      code: "TIMEOUT",
      message: "The agent run exceeded its time limit.",
      retryable: true,
    }
  }

  if (context.aborted) {
    return {
      code: "ABORTED",
      message: "The agent run was cancelled.",
      retryable: false,
    }
  }

  if (error instanceof AgentRuntimeError) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    }
  }

  if (APICallError.isInstance(error)) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return {
        code: "PROVIDER_AUTH_ERROR",
        message:
          "The model provider rejected the configured credentials or access.",
        retryable: false,
      }
    }

    if (error.statusCode === 429) {
      return {
        code: "PROVIDER_RATE_LIMITED",
        message: "The model provider rate-limited the agent request.",
        retryable: true,
      }
    }

    if (error.statusCode !== undefined && error.statusCode >= 500) {
      return {
        code: "PROVIDER_UNAVAILABLE",
        message: "The model provider is temporarily unavailable.",
        retryable: true,
      }
    }

    return {
      code: "PROVIDER_ERROR",
      message: "The model provider could not complete the agent request.",
      retryable: error.isRetryable,
    }
  }

  if (LoadAPIKeyError.isInstance(error) || LoadSettingError.isInstance(error)) {
    return {
      code: "CONFIGURATION_ERROR",
      message: "The model provider configuration is incomplete.",
      retryable: false,
    }
  }

  if (NoSuchModelError.isInstance(error)) {
    return {
      code: "MODEL_NOT_FOUND",
      message: "The configured model is not available from the provider.",
      retryable: false,
    }
  }

  if (InvalidToolInputError.isInstance(error) || error instanceof ZodError) {
    return {
      code: "INVALID_REQUEST",
      message: "The agent received invalid tool or run input.",
      retryable: false,
    }
  }

  return {
    code: "PROVIDER_ERROR",
    message: "The agent run failed.",
    retryable: false,
  }
}
