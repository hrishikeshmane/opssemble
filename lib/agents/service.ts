import "server-only"

import {
  createRepositoryCodingAgent,
  createRepositoryCodingAgentDefinition,
} from "./coding-agent"
import { getAgentRuntimeConfig } from "./config"
import { createAgentModelProvider } from "./model-provider"
import { getObservabilityMcpConfig } from "./observability-mcp"
import { resolveAgentProject } from "./project"
import { createAgentRunService } from "./run-service"

const observabilityMcp = getObservabilityMcpConfig()

export const agentRunService = createAgentRunService({
  definition: createRepositoryCodingAgentDefinition(
    observabilityMcp !== undefined
  ),
  config: getAgentRuntimeConfig(),
  resolveProject: resolveAgentProject,
  createModelProvider: createAgentModelProvider,
  createExecutor: ({
    modelProvider,
    project,
    maxSteps,
    maxToolCalls,
    maxOutputTokens,
    maxRetries,
  }) =>
    createRepositoryCodingAgent({
      model: modelProvider.model,
      project,
      maxSteps,
      maxToolCalls,
      maxOutputTokens,
      maxRetries,
      observabilityMcp,
    }),
  createRunId: () => crypto.randomUUID(),
  now: () => new Date(),
})
