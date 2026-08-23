import type { Metadata } from "next"
import { CheckIcon } from "lucide-react"

import { integrations, safetyBoundary } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  PageBody,
  PageHeader,
  Section,
  SectionHeading,
} from "@/components/opssemble/layout"
import { tone } from "@/components/opssemble/presentation"
import { IntegrationRow } from "@/components/opssemble/registry/integration-row"

export const metadata: Metadata = {
  title: "Integrations",
}

export default function IntegrationsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Integrations"
        subtitle="Connectivity, permissions, environment, and event freshness"
        actions={
          <Button size="xs" variant="outline">
            Add integration
          </Button>
        }
      />

      <PageBody>
        <ul className="px-2 py-2">
          {integrations.map((integration) => (
            <IntegrationRow
              key={integration.provider}
              integration={integration}
            />
          ))}
        </ul>

        {/* Sibling to the prose below it, so the heading keeps its full-bleed
            hairline and the page keeps its single `px-4` gutter. */}
        <SectionHeading title="Safety boundary" />
        <Section>
          {/* Constraints, not statuses: they are ticked because each one holds,
              and the tick is the only ink they get. An amber callout box around
              them would make the boundary read as a warning rather than as the
              reassurance it is. */}
          <ul className="space-y-1.5">
            {safetyBoundary.map((item) => (
              <li
                key={item}
                className="flex items-start gap-1.5 text-xs text-muted-foreground"
              >
                <CheckIcon
                  aria-hidden
                  className={cn("mt-0.5 size-3 shrink-0", tone.good)}
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 max-w-prose text-xs text-muted-foreground">
            A connected provider reports reachability and credential validity. It
            never implies broad production authority.
          </p>
        </Section>
      </PageBody>
    </div>
  )
}
