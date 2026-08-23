import "server-only"

import { createBedrockMantle } from "@ai-sdk/amazon-bedrock/mantle"
import { fromNodeProviderChain } from "@aws-sdk/credential-providers"
import type { LanguageModel } from "ai"

import { AgentRuntimeError } from "./errors"

export type AgentModelProvider = {
  provider: "amazon-bedrock"
  modelId: string
  model: LanguageModel
}

function requireEnvironmentValue(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim()

  if (!value) {
    throw new AgentRuntimeError(
      "CONFIGURATION_ERROR",
      `The ${name} environment variable is required.`
    )
  }

  return value
}

export function createAgentModelProvider(
  env: NodeJS.ProcessEnv = process.env
): AgentModelProvider {
  const provider = requireEnvironmentValue(env, "OPSSEMBLE_AI_PROVIDER")

  if (provider !== "amazon-bedrock") {
    throw new AgentRuntimeError(
      "CONFIGURATION_ERROR",
      "OPSSEMBLE_AI_PROVIDER must be amazon-bedrock."
    )
  }

  const modelId = requireEnvironmentValue(env, "OPSSEMBLE_AI_MODEL")
  const region =
    env.OPSSEMBLE_BEDROCK_REGION?.trim() ||
    env.AWS_REGION?.trim() ||
    env.AWS_DEFAULT_REGION?.trim()

  if (!region) {
    throw new AgentRuntimeError(
      "CONFIGURATION_ERROR",
      "OPSSEMBLE_BEDROCK_REGION or AWS_REGION is required."
    )
  }

  const baseURL =
    env.OPSSEMBLE_BEDROCK_BASE_URL?.trim() ||
    `https://bedrock-mantle.${region}.api.aws/openai/v1`
  const bedrock = createBedrockMantle({
    region,
    baseURL,
    credentialProvider: fromNodeProviderChain({
      clientConfig: { region },
      profile: env.AWS_PROFILE?.trim() || undefined,
    }),
  })

  return {
    provider: "amazon-bedrock",
    modelId,
    model: bedrock.responses(modelId),
  }
}
