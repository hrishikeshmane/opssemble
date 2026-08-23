/**
 * Structural primitives.
 *
 * Nothing here carries colour: every seam is `border-border/60`, every surface
 * is `bg-background`, and the only ink is `text-muted-foreground`. Status tone
 * comes from `presentation.tsx` so a state cannot be styled into existence here.
 */
import type * as React from "react"

import { cn } from "@/lib/utils"

/* --------------------------------------------------------------- sections --- */

/**
 * A padded region, not a card. Sections earn their separation from a hairline
 * and their heading, so a page of them does not read as a wall of boxes.
 */
export function Section({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return <section className={cn("px-4 py-3", className)} {...props} />
}

/**
 * A section heading that survives scrolling. The rule is on top rather than the
 * bottom so a heading arriving from below carries its own divider with it.
 *
 * Order is title, then affordance, then count: it reads as a heading with
 * something you can do to it rather than as a tree node.
 */
export function SectionHeading({
  title,
  count,
  action,
  className,
}: {
  title: React.ReactNode
  count?: number
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex w-full items-center border-t border-border/60 bg-background pr-4",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5 px-4 py-3 text-left text-sm font-medium">
        <span className="truncate">{title}</span>
        {/* Omitted rather than zeroed: a count nobody can trust says less than
            no count at all. */}
        {count === undefined ? null : (
          <span className="text-xs tabular-nums text-muted-foreground">
            {count.toLocaleString()}
          </span>
        )}
      </div>
      {action}
    </div>
  )
}

/**
 * A label/value row. The label column is fixed so a stack of these aligns
 * without a table, and `min-h-8` lets a row grow for wrapped content while never
 * collapsing below the rhythm.
 */
export function MetaRow({
  label,
  icon,
  children,
  className,
}: {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid min-h-8 grid-cols-[7rem_minmax(0,1fr)] items-center gap-2 py-1.5 text-xs",
        className
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span className="min-w-0 text-foreground">{children}</span>
    </div>
  )
}

/**
 * A bordered surface, reserved for a discrete authored object: a comment, a
 * tool call, a piece of evidence. Do not use it to group a section.
 */
export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-lg border border-border/60 p-3", className)}
      {...props}
    />
  )
}

/* --------------------------------------------------------------- chip/text --- */

export function Chip({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex max-w-48 items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 py-0.5 pr-2 pl-2 text-xs",
        className
      )}
      {...props}
    />
  )
}

/** One short sentence. No illustration, no card, no call to action. */
export function EmptyLine({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p className={cn("px-4 py-5 text-xs text-muted-foreground", className)}>
      {children}
    </p>
  )
}

/** A centred empty state, for a whole tab rather than a section. */
export function EmptyPanel({
  icon,
  children,
}: {
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
      {icon ? <span className="mb-2 flex size-5 items-center">{icon}</span> : null}
      <p className="text-xs">{children}</p>
    </div>
  )
}

/* --------------------------------------------------------------- timeline --- */

/**
 * The spine a feed hangs from. `left-[15px]` centres a 1px line under a 32px
 * marker sitting at `left-0`, and the vertical inset keeps it from overshooting
 * the first and last nodes.
 */
export function TimelineSpine() {
  return (
    <span
      aria-hidden
      className="absolute top-1 bottom-5 left-[15px] w-px bg-border/45"
    />
  )
}

/**
 * A node is an opaque puck that erases the spine behind it rather than a
 * coloured dot: the feed already says what happened in words, and a row of
 * tinted dots down the left edge competed with them.
 *
 * De-emphasis is greyscale and opacity, never a different hue.
 */
export function TimelineMarker({
  children,
  muted = false,
  className,
}: {
  children: React.ReactNode
  muted?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        "absolute top-1/2 left-0 z-10 flex size-8 -translate-y-1/2 items-center justify-center bg-background",
        className
      )}
    >
      <span
        className={cn(
          "flex size-7 items-center justify-center bg-background text-muted-foreground",
          muted && "opacity-45 grayscale"
        )}
      >
        {children}
      </span>
    </span>
  )
}

/**
 * A feed row. `content-visibility` skips style, layout and paint for the rows
 * off screen, and the intrinsic size keeps the scrollbar honest while one is
 * skipped.
 */
export function TimelineRow({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      className={cn(
        "relative mb-5 pl-12 [contain-intrinsic-block-size:48px] [content-visibility:auto]",
        className
      )}
      {...props}
    />
  )
}

/* ------------------------------------------------------------------ pages --- */

/**
 * A page header. The title is the largest text on the page and nothing competes
 * with it; actions sit to its right, and at most one of them is primary.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        "shrink-0 border-b border-border/60 px-4 py-3",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-base leading-snug font-semibold">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex-1" />
        {actions ? (
          <div className="flex h-7 shrink-0 items-center gap-1">{actions}</div>
        ) : null}
      </div>
      {children}
    </header>
  )
}

/** The scroll container every page body uses, so containment is consistent. */
export function PageBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("min-h-0 flex-1 overflow-y-auto", className)}
      {...props}
    />
  )
}
