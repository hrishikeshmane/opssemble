/**
 * The five stages a mission moves through, on one line.
 *
 * A rail rather than a stack: the stages are strictly sequential, and reading
 * them left to right with a hairline between each is what says so. The hairline
 * is a `flex-1` span rather than `divide-x` because a divider belongs to the gap
 * between two stages, not to the edge of one -- `divide-x` would also draw a
 * rule at full row height and turn the rail into a table.
 *
 * This file also owns the app's one `Status` presentation table. Observations on
 * an agent run and metrics on a decision carry the same `Status`, and a status
 * that resolved to a different tone in each place would be three statuses.
 */
import {
  CheckIcon,
  CircleDashedIcon,
  CirclePauseIcon,
  CircleXIcon,
  LoaderIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { MissionStage, Status } from "@/lib/mock-data"
import { Section } from "@/components/opssemble/layout"
import { tone } from "@/components/opssemble/presentation"

/**
 * Total over `Status` so a stage value added later cannot fall through to no
 * glyph at all. `queued` and `brand` never reach a rail -- `brand` is a chrome
 * accent rather than an outcome -- so both read as the absence of a result.
 */
const STATUS_PRESENTATION = {
  ok: { Icon: CheckIcon, toneClassName: tone.good },
  fail: { Icon: CircleXIcon, toneClassName: tone.bad },
  // A warning here means the mission stopped and is waiting on a person, which
  // is the same pause an agent on hold wears.
  warn: { Icon: CirclePauseIcon, toneClassName: tone.pending },
  running: { Icon: LoaderIcon, toneClassName: tone.pending },
  queued: { Icon: CircleDashedIcon, toneClassName: tone.absent },
  idle: { Icon: CircleDashedIcon, toneClassName: tone.absent },
  brand: { Icon: CircleDashedIcon, toneClassName: tone.absent },
} as const satisfies Record<
  Status,
  { Icon: typeof CheckIcon; toneClassName: string }
>

export function statusToneClassName(status: Status): string {
  return STATUS_PRESENTATION[status].toneClassName
}

/** Decorative: every caller names the stage or the measurement beside it. */
export function StatusGlyph({
  status,
  className,
}: {
  status: Status
  className?: string
}) {
  const presentation = STATUS_PRESENTATION[status]
  return (
    <presentation.Icon
      aria-hidden
      className={cn(
        "size-3.5 shrink-0",
        presentation.toneClassName,
        // Motion is the one place a tone gets a second dimension, so a running
        // stage and a pending one cannot be confused at a glance.
        status === "running" && "animate-spin",
        className
      )}
    />
  )
}

export function StageRail({ stages }: { stages: MissionStage[] }) {
  return (
    // The rail scrolls rather than wraps on a narrow column: a wrapped rail
    // reads as two sequences. The connecting hairlines collapse to their
    // minimum first, so the stage labels are the last thing to give way.
    <Section className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-border/60 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {stages.flatMap((stage, index) => [
        ...(index === 0
          ? []
          : [
              <span
                aria-hidden
                className="h-px min-w-4 flex-1 bg-border/45"
                key={`rule:${stage.key}`}
              />,
            ]),
        <span
          className="flex shrink-0 items-center gap-1.5"
          key={stage.key}
        >
          <StatusGlyph status={stage.status} />
          <span className="text-xs">{stage.label}</span>
          <span className="text-[11px] text-muted-foreground">
            {stage.value}
          </span>
        </span>,
      ])}
    </Section>
  )
}
