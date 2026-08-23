/**
 * One row of the Changes list.
 *
 * Not a table row. There is no column header above these, so nothing has to line
 * up across rows: the plan glyph, then the title with a dot-separated meta line
 * under it, then the time and diff stat pinned right. A change whose branch name
 * is long spends that length on the branch rather than pushing a shared column.
 *
 * The whole row is the link. Every state on it is a glyph or a coloured word, so
 * nothing here needs a background or a border of its own -- the only fill the row
 * ever draws is its own hover.
 */
import Link from "next/link"

import type { Change } from "@/lib/mock-data"
import {
  ActorLabel,
  BranchPair,
  DiffStat,
  MetaLine,
  PlanStateGlyph,
  RiskWord,
} from "@/components/opssemble/presentation"

export function ChangeRow({ change }: { change: Change }) {
  return (
    <li>
      <Link
        href={`/changes/${change.id}`}
        // Offscreen rows are skipped for style, layout and paint, so a long list
        // costs what the viewport shows rather than what has loaded. The
        // intrinsic size keeps the scrollbar honest while a row is skipped, and
        // 54px is the measured height of a row at this padding and type scale.
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent/60 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none [contain-intrinsic-block-size:54px] [content-visibility:auto]"
      >
        {/* The plan state, once. It carries its own tooltip label, which is why
            the row does not repeat the state in words anywhere else. */}
        <PlanStateGlyph state={change.planState} />

        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">
            {change.title}
          </span>
          <MetaLine className="mt-0.5 text-xs text-muted-foreground/70">
            <span className="shrink-0 tabular-nums">#{change.number}</span>
            {/* Only a risk worth acting on. Low risk is the ordinary case, and
                printing it on most rows would spend a colour to say nothing --
                the same reason their rows show a review verdict only where
                somebody actually gave one. */}
            {change.risk === "low" ? null : (
              <RiskWord risk={change.risk} className="shrink-0" />
            )}
            <ActorLabel
              handle={change.author.handle}
              initials={change.author.initials}
              className="max-w-40 shrink-0"
            />
            {/* Capped rather than truncated at its own length: the title above
                is what a reader scans, so a long branch pair yields to it. */}
            <BranchPair
              base={change.baseBranch}
              head={change.branch}
              className="max-w-56"
            />
            {/* "None" is the absence of a trigger, not a trigger named None.
                MetaLine drops the separator with the segment, so omitting it
                leaves no stray dot behind. */}
            {change.trigger === "None" ? null : (
              <span className="truncate">{change.trigger}</span>
            )}
          </MetaLine>
        </span>

        {/* Right-aligned and tabular so the times stack into a readable column
            without a header claiming one. DiffStat returns null for an unchanged
            file set rather than printing "+0 -0". */}
        <span className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-muted-foreground/70 tabular-nums">
          <span>{change.updated}</span>
          <DiffStat additions={change.additions} deletions={change.deletions} />
        </span>
      </Link>
    </li>
  )
}
