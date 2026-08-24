import "server-only"

import { timingSafeEqual } from "node:crypto"

import { AgentRuntimeError } from "./errors"

function equalTokens(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left)
  const rightBytes = Buffer.from(right)

  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  )
}

export function authenticateLocalAgentRequest(
  request: Request,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const expectedToken = env.OPSSEMBLE_AGENT_LOCAL_TOKEN?.trim()

  if (!expectedToken || expectedToken.length < 32) {
    throw new AgentRuntimeError(
      "CONFIGURATION_ERROR",
      "OPSSEMBLE_AGENT_LOCAL_TOKEN must contain at least 32 characters."
    )
  }

  const authorization = request.headers.get("authorization")

  if (!authorization?.startsWith("Bearer ")) {
    return false
  }

  const suppliedToken = authorization.slice("Bearer ".length)
  return equalTokens(suppliedToken, expectedToken)
}
