import "server-only"

import type { ToolSet } from "ai"

export type AgentToolProviderKind = "local" | "mcp" | "memory"

export type AgentToolProvider<CONTEXT, TOOLS extends ToolSet = ToolSet> = {
  id: string
  kind: AgentToolProviderKind
  createTools(context: CONTEXT): Promise<TOOLS> | TOOLS
  close?(): Promise<void>
}
