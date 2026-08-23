import type { Metadata } from "next"

import { policies } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import {
  PageBody,
  PageHeader,
  Section,
  SectionHeading,
} from "@/components/opssemble/layout"
import { PolicyRow } from "@/components/opssemble/registry/policy-row"

export const metadata: Metadata = {
  title: "Policies",
}

export default function PoliciesPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Policies"
        subtitle="Deterministic rules that authorize promotion, hold, restore, and repair"
        actions={
          <Button size="xs" variant="outline">
            New policy
          </Button>
        }
      />

      <PageBody>
        <ul className="px-2 py-2">
          {policies.map((policy) => (
            <PolicyRow key={policy.id} policy={policy} />
          ))}
        </ul>

        {/* The heading is a sibling of the prose rather than its parent: it brings
            its own full-bleed hairline and its own `px-4`, and nesting it inside a
            Section would double the page's only gutter. */}
        <SectionHeading title="Policy precedence" />
        <Section>
          {/* `max-w-prose` because a 12px line running the full width of a wide
              window is a line nobody finishes. */}
          <p className="max-w-prose text-xs text-muted-foreground">
            Policy is evaluated before any agent proposal, so an agent or signal
            required by a matching policy cannot be removed from a Watch Plan.
            Arming freezes the resolved contract: a later policy edit produces a
            new contract version, and a mission already running keeps the version
            it was armed with.
          </p>
        </Section>
      </PageBody>
    </div>
  )
}
