"use client"

/**
 * One row of the policy list. Client-only for the toggle's local state: this is a
 * mock, so the switch remembers its own position and nothing else.
 *
 * Same three zones as the agent registry, so the two control surfaces read as one
 * family: a glyph, a name over a dot-separated meta line, and the row's only
 * control on the right.
 */
import * as React from "react"
import { ShieldCheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Policy } from "@/lib/mock-data"
import { MetaLine } from "@/components/opssemble/presentation"
import { Switch } from "@/components/ui/switch"

/**
 * A glob fragment inside a scope sentence. The capturing group keeps the
 * delimiter in `split`'s output, so the sentence survives intact around it.
 */
const GLOB_SPLIT = /([\w./-]+\/\*\*)/g
const GLOB_TOKEN = /^[\w./-]+\/\*\*$/

/**
 * A scope is a sentence and is typeset as one -- except the path, which a reader
 * matches character for character against their own tree. That earns the
 * monospace; the prose around it does not.
 */
function ScopeText({ scope }: { scope: string }) {
  return (
    <>
      {scope
        .split(GLOB_SPLIT)
        .filter(Boolean)
        .map((part, index) =>
          GLOB_TOKEN.test(part) ? (
            <code className="font-mono" key={`${index}-${part}`}>
              {part}
            </code>
          ) : (
            <React.Fragment key={`${index}-${part}`}>{part}</React.Fragment>
          )
        )}
    </>
  )
}

export function PolicyRow({ policy }: { policy: Policy }) {
  const [enabled, setEnabled] = React.useState(policy.enabled)

  return (
    <li
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-accent/60",
        // Offscreen rows are skipped for style, layout and paint. The intrinsic
        // size keeps the scrollbar honest while one is skipped.
        "[contain-intrinsic-block-size:54px] [content-visibility:auto]",
        // A policy that is off is still worth reading -- it is why a change went
        // unwatched -- so it fades rather than greys out, and the fade is the
        // whole signal. There is no second "disabled" word competing with the
        // switch that already says so.
        !enabled && "opacity-60"
      )}
    >
      <ShieldCheckIcon
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground"
      />

      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{policy.name}</span>
        <MetaLine className="mt-0.5 text-xs text-muted-foreground/70">
          {/* The scope absorbs the squeeze: it is the longest segment and the one
              whose tail a reader can infer from the path at its front. */}
          <span className="truncate">
            <ScopeText scope={policy.scope} />
          </span>
          <span className="max-w-64 shrink-0 truncate">{policy.requires}</span>
          {/* Labelled inline rather than left bare, because "Hold candidate"
              beside a requirement reads as another requirement. */}
          <span className="shrink-0">on failure: {policy.onFailure}</span>
        </MetaLine>
      </span>

      <span className="flex shrink-0 items-center gap-2">
        {/* Beside the switch rather than above it: the row is two lines tall
            already, and a third would break the rhythm the list is scanned on. */}
        <span className="text-[10px] text-muted-foreground/70">
          Edited {policy.lastEdited}
        </span>
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          aria-label={`${policy.name} enabled`}
        />
      </span>
    </li>
  )
}
