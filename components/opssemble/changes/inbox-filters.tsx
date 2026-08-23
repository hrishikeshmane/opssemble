"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { changeStats } from "@/lib/mock-data"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const chips = [
  { id: "open", label: "Open", count: changeStats.open },
  { id: "merged", label: "Merged", count: changeStats.merged },
  { id: "needs-input", label: "Needs input", count: changeStats.needsInput },
  { id: "armed", label: "Armed", count: changeStats.armed },
] as const

const riskOptions = ["All risks", "High risk", "Medium risk", "Low risk"]
const planOptions = [
  "All plans",
  "Not required",
  "Draft",
  "Needs input",
  "Ready",
  "Armed",
]

function FilterSelect({
  label,
  options,
}: {
  label: string
  options: string[]
}) {
  const [value, setValue] = React.useState(label)

  return (
    <Select
      value={value}
      onValueChange={(next) => setValue(String(next))}
      aria-label={label}
    >
      <SelectTrigger size="sm" className="text-[12px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function InboxFilters() {
  const [active, setActive] = React.useState<string>("open")

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap">
        {chips.map((chip) => {
          const isActive = chip.id === active
          return (
            <button
              key={chip.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActive(chip.id)}
              className={cn(
                "ops-focus flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] transition-colors duration-100",
                isActive
                  ? "bg-brand-muted font-medium text-brand"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {chip.label}
              <span
                className={cn(
                  "ops-mono text-[10px]",
                  isActive ? "text-brand/70" : "text-muted-foreground/70"
                )}
              >
                {chip.count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex-1" />

      <FilterSelect label="All risks" options={riskOptions} />
      <FilterSelect label="All plans" options={planOptions} />
    </div>
  )
}
