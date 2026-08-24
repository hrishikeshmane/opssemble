import { z } from "zod"

import { AgentRuntimeError } from "./errors"
import type { AgentRunLimits, AgentRunRequest } from "./types"

const DEFAULT_MAX_STEPS = 8
const DEFAULT_MAX_TOOL_CALLS = 16
const DEFAULT_TIMEOUT_MS = 45_000
const DEFAULT_MAX_OUTPUT_TOKENS = 2_048
const DEFAULT_MAX_RETRIES = 1

const HARD_MAX_STEPS = 20
const HARD_MAX_TOOL_CALLS = 40
const HARD_MAX_TIMEOUT_MS = 120_000
const HARD_MAX_OUTPUT_TOKENS = 8_192
const HARD_MAX_RETRIES = 3

export const agentRunRequestSchema = z
  .object({
    agentId: z.string().trim().min(1).max(100).optional(),
    projectId: z.uuid(),
    prompt: z.string().trim().min(1).max(12_000),
    limits: z
      .object({
        maxSteps: z.number().int().min(1).max(HARD_MAX_STEPS).optional(),
        maxToolCalls: z
          .number()
          .int()
          .min(1)
          .max(HARD_MAX_TOOL_CALLS)
          .optional(),
        timeoutMs: z
          .number()
          .int()
          .min(100)
          .max(HARD_MAX_TIMEOUT_MS)
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict()

export type AgentRuntimeConfig = {
  limits: AgentRunLimits
  maxOutputTokens: number
  maxRetries: number
}

function readBoundedInteger(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  maximum: number,
  minimum = 1
): number {
  const value = env[name]

  if (value === undefined || value.trim() === "") {
    return fallback
  }

  if (!/^\d+$/.test(value)) {
    throw new AgentRuntimeError(
      "CONFIGURATION_ERROR",
      `${name} must be an integer.`
    )
  }

  const parsed = Number(value)

  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new AgentRuntimeError(
      "CONFIGURATION_ERROR",
      `${name} must be between ${minimum} and ${maximum}.`
    )
  }

  return parsed
}

export function getAgentRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env
): AgentRuntimeConfig {
  return {
    limits: {
      maxSteps: readBoundedInteger(
        env,
        "OPSSEMBLE_AGENT_MAX_STEPS",
        DEFAULT_MAX_STEPS,
        HARD_MAX_STEPS
      ),
      maxToolCalls: readBoundedInteger(
        env,
        "OPSSEMBLE_AGENT_MAX_TOOL_CALLS",
        DEFAULT_MAX_TOOL_CALLS,
        HARD_MAX_TOOL_CALLS
      ),
      timeoutMs: readBoundedInteger(
        env,
        "OPSSEMBLE_AGENT_TIMEOUT_MS",
        DEFAULT_TIMEOUT_MS,
        HARD_MAX_TIMEOUT_MS
      ),
    },
    maxOutputTokens: readBoundedInteger(
      env,
      "OPSSEMBLE_AGENT_MAX_OUTPUT_TOKENS",
      DEFAULT_MAX_OUTPUT_TOKENS,
      HARD_MAX_OUTPUT_TOKENS
    ),
    maxRetries: readBoundedInteger(
      env,
      "OPSSEMBLE_AGENT_MAX_RETRIES",
      DEFAULT_MAX_RETRIES,
      HARD_MAX_RETRIES,
      0
    ),
  }
}

export function resolveRunLimits(
  request: AgentRunRequest,
  configured: AgentRunLimits
): AgentRunLimits {
  return {
    maxSteps: Math.min(
      request.limits?.maxSteps ?? configured.maxSteps,
      configured.maxSteps
    ),
    maxToolCalls: Math.min(
      request.limits?.maxToolCalls ?? configured.maxToolCalls,
      configured.maxToolCalls
    ),
    timeoutMs: Math.min(
      request.limits?.timeoutMs ?? configured.timeoutMs,
      configured.timeoutMs
    ),
  }
}
