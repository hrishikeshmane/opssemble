"use client"

/**
 * Policy row. Client-only because the enabled toggle holds local state; the
 * grid template is owned by the page so the head and rows never drift.
 */
import * as React from "react"

import { cn } from "@/lib/utils"
import type { Policy } from "@/lib/mock-data"
import { Mono } from "@/components/opssemble/kit"
import { Switch } from "@/components/ui/switch"

/** Splitter keeps the `src/payments/**` style fragment as its own token. */
const PATH_SPLIT = /([\w./-]+\/\*\*)/g
const PATH_TOKEN = /^[\w./-]+\/\*\*$/

/** Renders a scope sentence with any glob path promoted to monospace. */
function ScopeText({ scope }: { scope: string }) {
  const parts = scope.split(PATH_SPLIT).filter(Boolean)

  return (
    <span className="text-[12px] text-muted-foreground">
      {parts.map((part, index) =>
        PATH_TOKEN.test(part) ? (
          <Mono key={`${part}-${index}`} className="text-foreground">
            {part}
          </Mono>
        ) : (
          <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
        )
      )}
    </span>
  )
}

export function PolicyRow({
  policy,
  template,
}: {
  policy: Policy
  template: string
}) {
  const [enabled, setEnabled] = React.useState(policy.enabled)

  return (
    <div
      style={{ gridTemplateColumns: template }}
      className={cn(
        "ops-row grid items-center gap-3 px-3 py-2.5",
        !enabled && "opacity-60"
      )}
    >
      <div className="min-w-0">
        <div className="truncate text-[12px] font-medium">{policy.name}</div>
        <div className="text-[11px] text-muted-foreground">
          Edited {policy.lastEdited}
        </div>
      </div>
      <ScopeText scope={policy.scope} />
      <span className="text-[12px] text-muted-foreground">
        {policy.requires}
      </span>
      <span className="text-[12px] text-muted-foreground">
        {policy.onFailure}
      </span>
      <Switch
        checked={enabled}
        onCheckedChange={setEnabled}
        aria-label={`${policy.name} enabled`}
        className="justify-self-end"
      />
    </div>
  )
}
