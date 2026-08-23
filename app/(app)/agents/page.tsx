import { agents } from "@/lib/mock-data"
import { Muted, PageHeader } from "@/components/opssemble/kit"
import { AgentCard } from "@/components/opssemble/registry/agent-card"
import { Button } from "@/components/ui/button"

export default function AgentsPage() {
  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Agent registry"
        subtitle="Capabilities, selection rules, tools, permissions, and health"
        actions={<Button>Create agent</Button>}
      />

      <div className="flex flex-col gap-3 px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.key} agent={agent} />
          ))}
        </div>

        <Muted>
          Required selections come from policy. Proposed selections come from
          code and context analysis. Every reason is visible in the Watch Plan.
        </Muted>
      </div>
    </div>
  )
}
