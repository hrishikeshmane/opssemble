import "server-only"

import {
  ClaudeMemoryStore,
  createClaudeMemoryToolProvider,
} from "./claude-memory"
import { createPrOrchestrationService } from "./pr-orchestration"
import { resolveAgentProject } from "./project"
import { loadPullRequestContext } from "./pull-request-context"

const claudeMemoryStore = new ClaudeMemoryStore()

export type PrOrchestrationService = ReturnType<
  typeof createPrOrchestrationService
>

export const prOrchestrationService: PrOrchestrationService =
  createPrOrchestrationService({
    resolveProject: resolveAgentProject,
    pullRequestContextLoader: ({ project, pullRequestNumber, abortSignal }) =>
      loadPullRequestContext(project, pullRequestNumber, abortSignal),
    sharedContextToolProviderFactory: () =>
      createClaudeMemoryToolProvider({ store: claudeMemoryStore }),
  })
