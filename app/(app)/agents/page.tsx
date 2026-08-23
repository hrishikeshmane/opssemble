import type { Metadata } from "next"

import { agents } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { EmptyLine, PageBody, PageHeader } from "@/components/opssemble/layout"
import { AgentRow } from "@/components/opssemble/registry/agent-row"

export const metadata: Metadata = {
  title: "Agents",
}

export default function AgentsPage() {
  return (
    // The shell's main is already a flex column, so the page only has to claim
    // its height for the body below to own the scrolling.
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Agent registry"
        subtitle="Capabilities, selection rules, tools, and health"
        actions={
          // Outline, not primary: creating an agent is not the consequential act
          // on this screen -- arming a contract is, two screens over.
          <Button size="xs" variant="outline">
            Create agent
          </Button>
        }
      />

      <PageBody>
        <ul className="px-2 py-2">
          {agents.map((agent) => (
            <AgentRow key={agent.key} agent={agent} />
          ))}
        </ul>

        {/* Where a selection comes from is the question this list raises and does
            not answer, so it closes with the answer rather than a legend. */}
        <EmptyLine>
          Required selections come from policy. Proposed selections come from code
          and context analysis. Every reason is visible in the Watch Plan.
        </EmptyLine>
      </PageBody>
    </div>
  )
}
