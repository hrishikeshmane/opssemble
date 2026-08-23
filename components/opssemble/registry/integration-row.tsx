/**
 * Integration row. Server component: provider, environment, credential scope,
 * write access, event freshness, and connection status.
 */
import type { Integration } from "@/lib/mock-data"
import { Badge } from "@/components/ui/badge"
import { Mono, StatusPill } from "@/components/opssemble/kit"

export function IntegrationRow({
  integration,
  template,
}: {
  integration: Integration
  template: string
}) {
  return (
    <div
      style={{ gridTemplateColumns: template }}
      className="ops-row grid items-center gap-3 px-3 py-2.5"
    >
      <span className="truncate text-[12px] font-medium">
        {integration.provider}
      </span>
      <Mono className="truncate text-muted-foreground">
        {integration.environment}
      </Mono>
      <span className="text-[12px] text-muted-foreground">
        {integration.scope}
      </span>
      {integration.writeAccess ? (
        <Badge variant="outline" className="px-1.5 text-warn">
          Write
        </Badge>
      ) : (
        <Badge variant="ghost" className="px-1.5 text-muted-foreground">
          Read only
        </Badge>
      )}
      <Mono className="text-muted-foreground">{integration.lastEvent}</Mono>
      <StatusPill status={integration.status} className="justify-self-start">
        {integration.statusLabel}
      </StatusPill>
    </div>
  )
}
