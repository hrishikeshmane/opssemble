/**
 * How Opssemble state reads, in the one place every surface takes it from.
 *
 * A plan state, a mission state and an agent verdict are all "how did this go",
 * so they share one palette: a green here is the green a passing agent already
 * wears two panels away, and "armed" cannot look like a different kind of good
 * news than "promoted". Tones are literal palette classes rather than semantic
 * variables so the dark pairing is visible at the point of decision.
 *
 * Colour is spent once per item. A verdict is a glyph, or the tone on an
 * identifier, or a lowercased word -- never a badge and a border and a
 * background at the same time.
 */
import { Children, isValidElement, type ReactNode } from "react"
import {
  CircleCheckIcon,
  CircleDashedIcon,
  CircleDotIcon,
  CirclePauseIcon,
  CircleXIcon,
  FileDiffIcon,
  GitPullRequestDraftIcon,
  LoaderIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { PlanState, Risk, Verdict } from "@/lib/mock-data"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/* ------------------------------------------------------------------ tones --- */

/** The only status tones in the app. Anything else is structural greyscale. */
export const tone = {
  good: "text-emerald-600 dark:text-emerald-300/90",
  bad: "text-destructive",
  pending: "text-amber-600 dark:text-amber-400/90",
  terminal: "text-violet-600 dark:text-violet-300/90",
  draft: "text-zinc-500 dark:text-zinc-400/80",
  absent: "text-muted-foreground/70",
} as const

/**
 * Chart strokes use the same semantic palette as status presentation, but as
 * CSS values because Recharts paints SVG attributes rather than class names.
 */
export const chartTone = {
  primary: "var(--primary)",
  good: "var(--success-foreground)",
  bad: "var(--destructive)",
  limit: "var(--warning-foreground)",
  muted: "var(--muted-foreground)",
} as const

type Tone = (typeof tone)[keyof typeof tone]

interface StatePresentation {
  readonly label: string
  readonly toneClassName: Tone
  readonly Icon: typeof CircleCheckIcon
}

/* ------------------------------------------------------------- plan state --- */

/**
 * A Watch Plan's state. "Armed" wears the terminal violet rather than green
 * because it is the end of the planning road, not a passing check -- the same
 * distinction a merged pull request draws against one whose checks went green.
 */
export function resolvePlanState(state: PlanState): StatePresentation {
  switch (state) {
    case "armed":
      return {
        label: "Armed",
        toneClassName: tone.terminal,
        Icon: ShieldCheckIcon,
      }
    case "ready":
      return {
        label: "Ready to arm",
        toneClassName: tone.good,
        Icon: CircleDotIcon,
      }
    case "needs-input":
      return {
        // Naming what is missing beats "Needs input": the warning triangle is
        // what catches the eye, and the reader's next question is always which.
        label: "Needs input to resolve a signal",
        toneClassName: tone.pending,
        Icon: TriangleAlertIcon,
      }
    case "draft":
      return {
        label: "Draft plan",
        toneClassName: tone.draft,
        Icon: GitPullRequestDraftIcon,
      }
    case "not-required":
      return {
        label: "No coverage required",
        toneClassName: tone.absent,
        Icon: CircleDashedIcon,
      }
  }
}

export function PlanStateGlyph({
  state,
  className,
}: {
  state: PlanState
  className?: string
}) {
  const presentation = resolvePlanState(state)
  return (
    <Tooltip>
      {/* The row is itself a link, so the trigger stays a span: an interactive
          one would nest a control inside that link and steal its click target. */}
      <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
        <presentation.Icon
          role="img"
          aria-label={presentation.label}
          className={cn(
            "size-4 shrink-0",
            presentation.toneClassName,
            className
          )}
        />
      </TooltipTrigger>
      <TooltipContent>{presentation.label}</TooltipContent>
    </Tooltip>
  )
}

/* ---------------------------------------------------------------- verdict --- */

const VERDICT_PRESENTATION = {
  pass: { label: "Passed", toneClassName: tone.good, Icon: CircleCheckIcon },
  fail: { label: "Failed", toneClassName: tone.bad, Icon: CircleXIcon },
  running: {
    label: "Running",
    toneClassName: tone.pending,
    Icon: LoaderIcon,
  },
  queued: {
    label: "Queued",
    toneClassName: tone.absent,
    Icon: CircleDashedIcon,
  },
  hold: {
    label: "Held",
    toneClassName: tone.pending,
    Icon: CirclePauseIcon,
  },
} as const satisfies Record<Verdict, StatePresentation>

export function verdictLabel(verdict: Verdict): string {
  return VERDICT_PRESENTATION[verdict].label
}

export function verdictToneClassName(verdict: Verdict): string {
  return VERDICT_PRESENTATION[verdict].toneClassName
}

/** Decorative: every caller says which verdict this is in words beside it. */
export function VerdictIcon({
  verdict,
  className,
}: {
  verdict: Verdict
  className?: string
}) {
  const presentation = VERDICT_PRESENTATION[verdict]
  return (
    <presentation.Icon
      aria-hidden
      className={cn(
        "size-3.5 shrink-0",
        presentation.toneClassName,
        // A spinner is the one place a tone gets motion rather than a second
        // signal, so a queued and a running agent cannot be confused at a glance.
        verdict === "running" && "animate-spin",
        className
      )}
    />
  )
}

/**
 * A verdict as one lowercased coloured word. Lowercased in CSS rather than in
 * the string so a screen reader still announces the shared label.
 */
export function VerdictWord({
  verdict,
  className,
}: {
  verdict: Verdict
  className?: string
}) {
  return (
    <span
      className={cn(
        "font-medium lowercase",
        verdictToneClassName(verdict),
        className
      )}
    >
      {verdictLabel(verdict)}
    </span>
  )
}

/* ------------------------------------------------------------------- risk --- */

const RISK_TONE = {
  high: tone.bad,
  medium: tone.pending,
  low: tone.absent,
} as const satisfies Record<Risk, Tone>

export function riskToneClassName(risk: Risk): string {
  return RISK_TONE[risk]
}

/**
 * Risk as one coloured word rather than a badge. It is an assessment, not a
 * lifecycle state, and a pill for it competed with the plan glyph beside it.
 */
export function RiskWord({
  risk,
  className,
}: {
  risk: Risk
  className?: string
}) {
  return (
    <span className={cn("font-medium capitalize", RISK_TONE[risk], className)}>
      {risk}
    </span>
  )
}

/* ---------------------------------------------------------------- numbers --- */

/**
 * Added and removed lines, coloured the way every host colours them.
 *
 * Returns null when both are zero: "+0 -0" reads as an empty change set rather
 * than as a change whose counts we never had.
 */
export function DiffStat({
  additions,
  deletions,
  className,
}: {
  additions: number
  deletions: number
  className?: string
}) {
  if (additions === 0 && deletions === 0) {
    return null
  }
  return (
    <span
      className={cn("inline-flex items-baseline gap-1 tabular-nums", className)}
    >
      <span className={tone.good}>+{additions.toLocaleString()}</span>
      <span className="text-destructive">-{deletions.toLocaleString()}</span>
    </span>
  )
}

export function FileCount({
  count,
  withWord = true,
  className,
}: {
  count: number
  withWord?: boolean
  className?: string
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 tabular-nums", className)}
    >
      <FileDiffIcon aria-hidden className="size-3.5 shrink-0" />
      {count.toLocaleString()}
      {withWord ? (count === 1 ? " file" : " files") : null}
    </span>
  )
}

/* -------------------------------------------------------------- meta line --- */

function separatorKey(segment: ReactNode): string {
  return `separator:${isValidElement(segment) ? String(segment.key) : String(segment)}`
}

/**
 * Dot-separated metadata. It owns the separator and draws one only between the
 * segments that survive, so a caller can render `{cond ? <span/> : null}`
 * without leaving a stray dot behind.
 *
 * `Children.toArray` drops the nullish entries and keys what remains, which a
 * plain array check would not do for a single child or a fragment. A separator
 * borrows the key of the segment it precedes so it stays stable without
 * counting positions.
 */
export function MetaLine({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const segments = Children.toArray(children)
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5", className)}>
      {segments.flatMap((segment, index) =>
        index === 0
          ? segment
          : [
              <span
                aria-hidden
                // One step fainter than the text it divides, so the run reads as
                // one line rather than as a list of separated things.
                className="shrink-0 text-muted-foreground/50"
                key={separatorKey(segment)}
              >
                ·
              </span>,
              segment,
            ]
      )}
    </span>
  )
}

/* ----------------------------------------------------------------- actors --- */

export function ActorAvatar({
  initials,
  className,
}: {
  initials: string
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-medium text-muted-foreground",
        className
      )}
    >
      {initials.slice(0, 1)}
    </span>
  )
}

export function ActorLabel({
  handle,
  initials,
  className,
}: {
  handle: string
  initials: string
  className?: string
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5", className)}>
      <ActorAvatar initials={initials} />
      <span className="truncate">{handle}</span>
    </span>
  )
}

/* --------------------------------------------------------------- branches --- */

/**
 * Where the change is going and where it came from, base first: the arrow points
 * at what receives the work, which is the direction every host writes it in.
 */
export function BranchPair({
  base,
  head,
  className,
}: {
  base: string
  head: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "flex min-w-0 items-center gap-1.5 font-mono text-xs text-muted-foreground/70",
        className
      )}
    >
      <span className="max-w-[40%] shrink-0 truncate">{base}</span>
      <span
        aria-label="receives changes from"
        role="img"
        className="shrink-0 opacity-60"
      >
        &larr;
      </span>
      <span className="min-w-0 truncate">{head}</span>
    </span>
  )
}

/** The abbreviated oid, which is what a reader matches against a commit list. */
export function Sha({ sha, className }: { sha: string; className?: string }) {
  return <code className={cn("font-mono", className)}>{sha.slice(0, 7)}</code>
}
