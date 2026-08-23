/**
 * One row of the Changes inbox. Server component: the whole row is a link and
 * the grid template lives here so the header and every row stay in step.
 */
import Link from "next/link"
import { ChevronRight } from "lucide-react"

import type { Change, PlanState, Status } from "@/lib/mock-data"
import {
  Mono,
  StatusPill,
  StatusText,
  riskStatus,
} from "@/components/opssemble/kit"

/** Single source of truth for the inbox grid. Shared with `GridHead`. */
export const CHANGE_GRID_TEMPLATE =
  "minmax(0,2.2fr) 0.6fr 1fr 1.15fr 0.9fr 0.7fr"

export const CHANGE_GRID_COLUMNS = [
  "Change",
  "Risk",
  "Watch plan",
  "Trigger",
  "Agents",
  "Updated",
]

const planStatus: Record<PlanState, Status> = {
  "not-required": "idle",
  draft: "idle",
  "needs-input": "warn",
  ready: "brand",
  armed: "ok",
}

const planLabel: Record<PlanState, string> = {
  "not-required": "Not required",
  draft: "Draft",
  "needs-input": "Needs input",
  ready: "Ready",
  armed: "Armed",
}

export function ChangeRow({ change }: { change: Change }) {
  const risk = change.risk[0].toUpperCase() + change.risk.slice(1)

  return (
    <Link
      href={`/changes/${change.id}`}
      style={{ gridTemplateColumns: CHANGE_GRID_TEMPLATE }}
      className="ops-row ops-focus group grid items-center gap-3 px-3 py-2.5"
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <Mono className="shrink-0 text-muted-foreground">
            #{change.number}
          </Mono>
          <span className="truncate text-[12px] font-medium">
            {change.title}
          </span>
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          <Mono className="truncate">{change.baseBranch}</Mono>
          <span aria-hidden>←</span>
          <span className="sr-only">from</span>
          <Mono className="truncate">{change.branch}</Mono>
          <span aria-hidden>·</span>
          <Mono>{change.sha}</Mono>
        </div>
      </div>

      <div className="text-[12px]">
        <StatusText status={riskStatus[change.risk]}>{risk}</StatusText>
      </div>

      <div className="min-w-0">
        <StatusPill
          status={planStatus[change.planState]}
          dot={change.planState !== "not-required"}
        >
          {planLabel[change.planState]}
        </StatusPill>
      </div>

      <span className="truncate text-[12px] text-muted-foreground">
        {change.trigger}
      </span>

      <span className="truncate text-[12px] text-muted-foreground">
        {change.agentSummary}
      </span>

      <div className="flex items-center justify-between gap-1">
        <Mono className="text-muted-foreground">{change.updated}</Mono>
        <ChevronRight
          aria-hidden
          className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-100 group-hover:opacity-100"
        />
      </div>
    </Link>
  )
}
