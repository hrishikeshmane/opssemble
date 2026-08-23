import type { Metadata } from "next"
import Link from "next/link"
import { Search, Settings2 } from "lucide-react"

import { changeStats, changes, repo } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import {
  GridHead,
  Metric,
  PageHeader,
  Panel,
  StatusDot,
} from "@/components/opssemble/kit"
import {
  CHANGE_GRID_COLUMNS,
  CHANGE_GRID_TEMPLATE,
  ChangeRow,
} from "@/components/opssemble/changes/change-row"
import { InboxFilters } from "@/components/opssemble/changes/inbox-filters"

export const metadata: Metadata = {
  title: "Changes",
}

export default function ChangesPage() {
  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Changes"
        subtitle="Operational coverage for connected pull requests"
        actions={
          <>
            <Button variant="ghost" size="icon-sm" aria-label="Search changes">
              <Search />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Repository settings"
            >
              <Settings2 />
            </Button>
          </>
        }
      >
        <InboxFilters />
      </PageHeader>

      <div className="flex flex-1 flex-col gap-3 px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Open pull requests" value={String(changeStats.open)} />
          <Metric
            label="Need a decision"
            value={String(changeStats.needsDecision)}
            status="warn"
          />
          <Metric
            label="Ready for trigger"
            value={String(changeStats.readyForTrigger)}
            status="brand"
          />
        </div>

        <Panel className="min-w-0 overflow-hidden">
          <GridHead
            columns={CHANGE_GRID_COLUMNS}
            template={CHANGE_GRID_TEMPLATE}
          />
          <div className="divide-y divide-border">
            {changes.map((change) => (
              <ChangeRow key={change.id} change={change} />
            ))}
          </div>
        </Panel>

        <div className="mt-auto flex items-center gap-2 border-t border-border px-1 pt-3">
          <StatusDot status="ok" />
          <span className="text-[11px] text-muted-foreground">
            GitHub synced {repo.syncedSecondsAgo} seconds ago
          </span>
          <div className="flex-1" />
          <Link
            href="/policies"
            className="ops-focus rounded text-[11px] text-muted-foreground underline-offset-4 transition-colors duration-100 hover:text-foreground hover:underline"
          >
            View repository policy
          </Link>
        </div>
      </div>
    </div>
  )
}
