import { policies } from "@/lib/mock-data"
import {
  GridHead,
  Muted,
  PageHeader,
  Panel,
  PanelHeader,
} from "@/components/opssemble/kit"
import { PolicyRow } from "@/components/opssemble/registry/policy-row"
import { Button } from "@/components/ui/button"

/** One template string shared by the head and every row. */
const TEMPLATE =
  "minmax(0,1.3fr) minmax(0,1.5fr) minmax(0,1.6fr) minmax(0,1.1fr) 40px"

const COLUMNS = ["Policy", "Scope", "Requires", "On failure", "Enabled"]

export default function PoliciesPage() {
  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Policies"
        subtitle="Deterministic rules that authorize promotion, hold, restore, and repair"
        actions={<Button>New policy</Button>}
      />

      <div className="flex flex-col gap-3 px-5 py-4">
        <Panel className="overflow-hidden">
          <GridHead columns={COLUMNS} template={TEMPLATE} />
          <div className="divide-y divide-border">
            {policies.map((policy) => (
              <PolicyRow key={policy.id} policy={policy} template={TEMPLATE} />
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Policy precedence" />
          <div className="space-y-2 p-3">
            <Muted>
              Policy is evaluated before any agent proposal. An agent or signal
              required by a matching policy cannot be removed from a Watch Plan,
              and a scope match always takes precedence over an exemption.
            </Muted>
            <Muted>
              Arming freezes the resolved contract. Later policy or plan edits
              produce a new contract version, and a mission already running
              keeps the version it was armed with.
            </Muted>
          </div>
        </Panel>
      </div>
    </div>
  )
}
