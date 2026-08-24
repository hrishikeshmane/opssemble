/**
 * One mission in the queue.
 *
 * Three zones -- state glyph, title over a dot-separated meta line, and
 * right-aligned time -- keep every mission easy to scan.
 *
 * There is no progress bar and no chevron. A bar would be a second reading of
 * the agent count already in the meta line, and every row here is a link, so a
 * chevron on each of them says nothing the hover does not.
 */
import Link from "next/link"

import type { Mission, Verdict } from "@/lib/mock-data"
import {
  MetaLine,
  Sha,
  VerdictIcon,
  verdictLabel,
} from "@/components/opssemble/presentation"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * A mission's state answers the same four-way question an agent run answers, so
 * it borrows the verdict vocabulary rather than growing a second palette beside
 * it: a held mission wears the amber a held agent already wears one screen down.
 *
 * Exported because the detail page needs the same mapping, and a state that
 * resolved differently in two places would be two states.
 */
const MISSION_VERDICT = {
  running: "running",
  hold: "hold",
  pass: "pass",
  fail: "fail",
} as const satisfies Record<Mission["state"], Verdict>

export function missionVerdict(state: Mission["state"]): Verdict {
  return MISSION_VERDICT[state]
}

export function MissionRow({ mission }: { mission: Mission }) {
  const verdict = missionVerdict(mission.state)
  const label = verdictLabel(verdict)

  return (
    <li>
      <Link
        href={`/missions/${mission.id}`}
        className={
          // Offscreen rows are skipped for style, layout and paint, and the
          // intrinsic size keeps the scrollbar honest while one is skipped.
          "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-3 py-2 text-left transition-colors outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring [contain-intrinsic-block-size:54px] [content-visibility:auto]"
        }
      >
        {/* The only state indicator on the row. The trigger carries the label
            rather than the icon because the icon is decorative by contract, and
            it stays a span so it cannot nest a control inside this link. */}
        <Tooltip>
          <TooltipTrigger
            render={
              <span
                aria-label={label}
                className="inline-flex shrink-0"
                role="img"
              />
            }
          >
            {/* A fixed glyph size keeps the first column on one optical edge. */}
            <VerdictIcon className="size-4" verdict={verdict} />
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>

        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">
            {mission.title}
          </span>
          <MetaLine className="mt-0.5 text-xs text-muted-foreground/70">
            {/* "contract v3" is prose, not a copyable identifier, so it stays
                out of the monospace that the sha beside it earns. */}
            <span className="shrink-0 tabular-nums">
              #{mission.changeNumber}
            </span>
            <span className="shrink-0">
              contract v{mission.contractVersion}
            </span>
            <span className="max-w-32 shrink-0 truncate">{mission.stage}</span>
            <Sha className="shrink-0" sha={mission.sha} />
            <span className="shrink-0 tabular-nums">
              {mission.agentsComplete} / {mission.agentsTotal}
            </span>
          </MetaLine>
        </span>

        <span className="shrink-0 text-xs tabular-nums text-muted-foreground/70">
          {mission.updated}
        </span>
      </Link>
    </li>
  )
}
