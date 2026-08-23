"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { missionStats } from "@/lib/mock-data"

const chips = [
  { key: "all", label: "All", count: missionStats.all },
  { key: "running", label: "Running", count: missionStats.running },
  {
    key: "needs-decision",
    label: "Needs decision",
    count: missionStats.needsDecision,
  },
  { key: "held", label: "Held", count: missionStats.held },
] as const

/** Filter chips for the missions queue. Selection is local mock state. */
export function MissionFilters() {
  const [active, setActive] = React.useState<string>(chips[0].key)

  return (
    <div
      role="group"
      aria-label="Filter missions"
      className="flex flex-wrap items-center gap-1.5"
    >
      {chips.map((chip) => {
        const isActive = chip.key === active
        return (
          <button
            key={chip.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => setActive(chip.key)}
            className={cn(
              "ops-focus flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[11px] transition-colors duration-100",
              isActive
                ? "border-transparent bg-brand-muted font-medium text-brand"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {chip.label}
            <span className="ops-mono text-[10px]">{chip.count}</span>
          </button>
        )
      })}
    </div>
  )
}
