import { Check, ShieldCheck } from "lucide-react"

import { integrations, safetyBoundary } from "@/lib/mock-data"
import {
  GridHead,
  Metric,
  Muted,
  PageHeader,
  Panel,
  PanelHeader,
} from "@/components/opssemble/kit"
import { IntegrationRow } from "@/components/opssemble/registry/integration-row"
import { Button } from "@/components/ui/button"

/** One template string shared by the head and every row. */
const TEMPLATE =
  "minmax(0,0.9fr) minmax(0,1fr) minmax(0,1.9fr) 84px 72px 108px"

const COLUMNS = [
  "Provider",
  "Environment",
  "Scope",
  "Access",
  "Last event",
  "Status",
]

export default function IntegrationsPage() {
  const total = integrations.length
  const healthy = integrations.filter(
    (integration) => integration.status === "ok"
  ).length
  const writeScoped = integrations.filter(
    (integration) => integration.writeAccess
  ).length
  const readOnly = total - writeScoped

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Integrations"
        subtitle="Connectivity, permissions, environment, and event freshness"
        actions={<Button variant="outline">Add integration</Button>}
      />

      <div className="flex flex-col gap-3 px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric
            label="Connections healthy"
            value={`${healthy} of ${total}`}
            status="ok"
          />
          <Metric
            label="Write-scoped providers"
            value={String(writeScoped)}
            detail={`of ${total} providers`}
            status="warn"
          />
          <Metric
            label="Read-only providers"
            value={String(readOnly)}
            detail={`of ${total} providers`}
            status="idle"
          />
        </div>

        <Panel className="overflow-hidden">
          <GridHead columns={COLUMNS} template={TEMPLATE} />
          <div className="divide-y divide-border">
            {integrations.map((integration) => (
              <IntegrationRow
                key={integration.provider}
                integration={integration}
                template={TEMPLATE}
              />
            ))}
          </div>
        </Panel>

        <Panel className="border-warn/40">
          <PanelHeader
            title={
              <span className="flex items-center gap-1.5">
                <ShieldCheck aria-hidden className="size-3.5 text-warn" />
                Safety boundary
              </span>
            }
          />
          <div className="space-y-2 p-3">
            <ul className="space-y-1.5">
              {safetyBoundary.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[12px]">
                  <Check
                    aria-hidden
                    className="mt-0.5 size-3 shrink-0 text-ok"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Muted>
              A green connection reports reachability and credential validity
              only. It never implies broad production authority.
            </Muted>
          </div>
        </Panel>
      </div>
    </div>
  )
}
