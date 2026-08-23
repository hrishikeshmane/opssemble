"use client"

/**
 * A segmented tab bar, and an accessory strip to its right.
 *
 * The tabs carry no counts. A count belongs to the tab a reader is on, so it
 * sits in the accessory and changes with the selection -- a row of tabs each
 * wearing a number reads as a dashboard rather than as navigation.
 */
import * as React from "react"

import { cn } from "@/lib/utils"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onValueChange,
  accessory,
  className,
}: {
  tabs: readonly { readonly value: T; readonly label: string }[]
  value: T
  onValueChange: (value: T) => void
  accessory?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1 overflow-x-auto border-t border-border/60 px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      <ToggleGroup
        value={[value]}
        onValueChange={(next) => {
          // Base UI hands back the whole pressed set. An empty one means the
          // reader pressed the tab they were already on, which should not clear
          // the selection and leave the panel behind it orphaned.
          const selected = next[0] as T | undefined
          if (selected) onValueChange(selected)
        }}
        spacing={1}
        className="shrink-0 rounded-md border border-border/60 p-[3px]"
      >
        {tabs.map((tab) => (
          <ToggleGroupItem
            key={tab.value}
            value={tab.value}
            size="sm"
            className="px-2 text-xs aria-pressed:bg-accent aria-pressed:text-accent-foreground"
          >
            {tab.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {accessory ? (
        <div className="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          {accessory}
        </div>
      ) : null}
    </div>
  )
}
