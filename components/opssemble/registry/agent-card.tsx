/**
 * Agent registry card. Server component: capability, selection rule, tools,
 * and health for a single agent in the swarm.
 */
import {
  Activity,
  Gauge,
  GitCompare,
  ShieldAlert,
  Wrench,
  type LucideIcon,
} from "lucide-react"

import type { Agent, AgentKey } from "@/lib/mock-data"
import { Badge } from "@/components/ui/badge"
import {
  Field,
  Mono,
  Muted,
  Panel,
  StatusPill,
} from "@/components/opssemble/kit"

/** One glyph per capability so the grid is scannable without reading names. */
const agentIcon: Record<AgentKey, LucideIcon> = {
  impact: GitCompare,
  resilience: ShieldAlert,
  performance: Gauge,
  "product-health": Activity,
  repair: Wrench,
}

export function AgentCard({ agent }: { agent: Agent }) {
  const Icon = agentIcon[agent.key]

  return (
    <Panel className="flex flex-col">
      <div className="flex items-start gap-2.5 p-3">
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-muted"
        >
          <Icon className="size-3.5 text-brand" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="truncate text-[13px] leading-tight font-medium">
            {agent.name}
          </h2>
          <Muted>{agent.purpose}</Muted>
        </div>
        <StatusPill status={agent.health}>Ready</StatusPill>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-3 border-t border-border p-3">
        <Field label="Selected when" className="col-span-2">
          <span className="text-muted-foreground">{agent.selectedWhen}</span>
        </Field>
        <Field label="Tools" className="col-span-2">
          <div className="flex flex-wrap gap-1">
            {agent.tools.map((tool) => (
              <Badge key={tool} variant="outline" className="px-1.5">
                {tool}
              </Badge>
            ))}
          </div>
        </Field>
        <Field label="Runs">
          <Mono>{agent.runs}</Mono>
        </Field>
        <Field label="Median duration">
          <Mono>{agent.medianDuration}</Mono>
        </Field>
      </div>
    </Panel>
  )
}
