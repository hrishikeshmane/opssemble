/**
 * One row of the agent registry.
 *
 * The registry is a reference list rather than a navigation surface -- there is
 * no agent detail route -- so the row stays a plain `li` instead of a link with
 * nowhere to go. It keeps the hover fill anyway: that is what says "this line and
 * the one under it are two things", which a flat stack of sentences loses.
 *
 * Three zones, the same as every list in the app: a glyph, a name over a
 * dot-separated meta line, and right-aligned counts.
 */
import {
  ActivityIcon,
  GaugeIcon,
  GitCompareIcon,
  ShieldAlertIcon,
  WrenchIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { Agent, AgentKey, Status } from "@/lib/mock-data"
import { MetaLine, tone } from "@/components/opssemble/presentation"

/**
 * One glyph per capability, so the list is scannable before a name is read.
 * Greyscale and untiled: a capability is not a status, and giving it a colour or
 * a tinted tile would spend the row's one unit of colour on something that never
 * changes.
 */
const AGENT_ICON: Record<AgentKey, typeof GitCompareIcon> = {
  impact: GitCompareIcon,
  resilience: ShieldAlertIcon,
  performance: GaugeIcon,
  "product-health": ActivityIcon,
  repair: WrenchIcon,
}

/**
 * Health as one lowercased coloured word, taking its tone from `presentation` so
 * a ready agent wears the green a passing agent already wears in a mission.
 *
 * Only the three states that are genuinely health are named. An entry reporting
 * anything else says nothing rather than having a word invented for it, for the
 * same reason a count we cannot trust is omitted instead of printed.
 */
const HEALTH_WORD: Partial<
  Record<Status, { readonly word: string; readonly toneClassName: string }>
> = {
  ok: { word: "ready", toneClassName: tone.good },
  warn: { word: "degraded", toneClassName: tone.pending },
  fail: { word: "unavailable", toneClassName: tone.bad },
}

export function AgentRow({ agent }: { agent: Agent }) {
  const Icon = AGENT_ICON[agent.key]
  const health = HEALTH_WORD[agent.health]

  return (
    <li
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-accent/60",
        // Offscreen rows are skipped for style, layout and paint. The intrinsic
        // size keeps the scrollbar honest while one is skipped.
        "[contain-intrinsic-block-size:54px] [content-visibility:auto]"
      )}
    >
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />

      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{agent.name}</span>
        <MetaLine className="mt-0.5 text-xs text-muted-foreground/70">
          {/* The purpose absorbs the squeeze. The selection rule and the tool
              list are short and fixed, and clipping them first would cut text
              that has no redundancy left in it. */}
          <span className="truncate">{agent.purpose}</span>
          <span className="max-w-52 shrink-0 truncate">
            {agent.selectedWhen}
          </span>
          <span className="shrink-0">{agent.tools.join(", ")}</span>
          {/* Health sits last because it is the segment a reader scans for, and
              it is a word rather than a pill so the row spends colour once. */}
          {health ? (
            <span
              className={cn(
                "shrink-0 font-medium lowercase",
                health.toneClassName
              )}
            >
              {health.word}
            </span>
          ) : null}
        </MetaLine>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-0.5 text-xs tabular-nums text-muted-foreground/70">
        <span>{agent.runs.toLocaleString()} runs</span>
        <span>{agent.medianDuration}</span>
      </span>
    </li>
  )
}
