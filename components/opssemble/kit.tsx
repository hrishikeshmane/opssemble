/**
 * Opssemble primitive kit.
 *
 * Every Opssemble screen composes these instead of restyling shadcn parts
 * inline, so density, colour, and typography stay consistent. Server-safe:
 * nothing here uses hooks or browser APIs.
 */
import type * as React from "react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { Risk, Status, Verdict } from "@/lib/mock-data"

/* ----------------------------------------------------------------- tokens --- */

const statusText: Record<Status, string> = {
  ok: "text-ok",
  warn: "text-warn",
  fail: "text-fail",
  running: "text-brand",
  queued: "text-muted-foreground",
  idle: "text-muted-foreground",
  brand: "text-brand",
}

const statusDotBg: Record<Status, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  fail: "bg-fail",
  running: "bg-brand",
  queued: "bg-muted-foreground/50",
  idle: "bg-muted-foreground/40",
  brand: "bg-brand",
}

const statusChip: Record<Status, string> = {
  ok: "bg-ok-muted text-ok",
  warn: "bg-warn-muted text-warn",
  fail: "bg-fail-muted text-fail",
  running: "bg-brand-muted text-brand",
  queued: "bg-muted text-muted-foreground",
  idle: "bg-muted text-muted-foreground",
  brand: "bg-brand-muted text-brand",
}

export const verdictStatus: Record<Verdict, Status> = {
  pass: "ok",
  fail: "fail",
  running: "running",
  queued: "queued",
  hold: "warn",
}

export const riskStatus: Record<Risk, Status> = {
  low: "idle",
  medium: "warn",
  high: "fail",
}

/* ------------------------------------------------------------------- text --- */

export function Label({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return <span className={cn("ops-label", className)} {...props} />
}

export function Mono({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("ops-mono text-[11px]", className)} {...props} />
}

export function Muted({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-[12px] leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  )
}

export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "ops-mono inline-flex h-4 min-w-4 items-center justify-center rounded border border-border bg-muted px-1 text-[10px] text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

/* ----------------------------------------------------------------- status --- */

export function StatusDot({
  status,
  pulse = false,
  className,
}: {
  status: Status
  pulse?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-1.5 shrink-0 rounded-full",
        statusDotBg[status],
        pulse && "animate-ops-pulse",
        className
      )}
    />
  )
}

export function StatusPill({
  status,
  children,
  dot = true,
  pulse = false,
  className,
}: {
  status: Status
  children: React.ReactNode
  dot?: boolean
  pulse?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full px-2 text-[10px] font-medium whitespace-nowrap",
        statusChip[status],
        className
      )}
    >
      {dot ? <StatusDot status={status} pulse={pulse} /> : null}
      {children}
    </span>
  )
}

export function RiskBadge({ risk }: { risk: Risk }) {
  const label = risk[0].toUpperCase() + risk.slice(1)
  return (
    <StatusPill status={riskStatus[risk]} dot={risk !== "low"}>
      {label} risk
    </StatusPill>
  )
}

export function VerdictPill({ verdict }: { verdict: Verdict }) {
  const label = verdict[0].toUpperCase() + verdict.slice(1)
  return (
    <StatusPill status={verdictStatus[verdict]} pulse={verdict === "running"}>
      {label}
    </StatusPill>
  )
}

export function StatusText({
  status,
  children,
  className,
}: {
  status: Status
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn("font-medium", statusText[status], className)}>
      {children}
    </span>
  )
}

/* ---------------------------------------------------------------- surface --- */

/** Bordered surface with no shadow. The default container in Opssemble. */
export function Panel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card/60 backdrop-blur-[1px]",
        className
      )}
      {...props}
    />
  )
}

export function PanelHeader({
  title,
  meta,
  action,
  className,
}: {
  title: React.ReactNode
  meta?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex h-9 items-center gap-2 border-b border-border px-3",
        className
      )}
    >
      <span className="text-[12px] font-medium">{title}</span>
      {meta ? (
        <span className="text-[11px] text-muted-foreground">{meta}</span>
      ) : null}
      <div className="flex-1" />
      {action}
    </div>
  )
}

/** Label-over-value block used across summary grids and rails. */
export function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Label>{label}</Label>
      <div className="text-[12px] leading-snug">{children}</div>
    </div>
  )
}

/** Single-line label/value row, hairline separated by the parent. */
export function Row({
  label,
  value,
  status,
  className,
}: {
  label: React.ReactNode
  value: React.ReactNode
  status?: Status
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-3 py-2 text-[12px]",
        className
      )}
    >
      <span className="min-w-0 truncate text-muted-foreground">{label}</span>
      <span
        className={cn(
          "ops-mono shrink-0 text-[11px] font-medium",
          status ? statusText[status] : "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  )
}

/** Vertically stacked rows with hairline dividers between them. */
export function Rows({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("divide-y divide-border [&>*]:min-w-0", className)}
      {...props}
    />
  )
}

export function Metric({
  label,
  value,
  detail,
  status = "idle",
}: {
  label: string
  value: string
  detail?: string
  status?: Status
}) {
  return (
    <Panel className="flex flex-col gap-1 p-3">
      <Label>{label}</Label>
      <span
        className={cn(
          "ops-mono text-[19px] leading-none font-medium",
          statusText[status]
        )}
      >
        {value}
      </span>
      {detail ? (
        <span className="ops-mono text-[10px] text-muted-foreground">
          {detail}
        </span>
      ) : null}
    </Panel>
  )
}

/* --------------------------------------------------------------- page furn --- */

/** Sticky page header. Sits directly under the top bar. */
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
        "flex flex-col gap-3 border-b border-border px-5 py-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 space-y-0.5">
          <h1 className="truncate text-[15px] leading-tight font-medium tracking-[-0.01em]">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-[12px] text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex-1" />
        {actions ? (
          <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
        ) : null}
      </div>
      {children}
    </header>
  )
}

/** Sticky bottom action bar: left-hand consequence text, right-hand actions. */
export function ActionBar({
  note,
  children,
  className,
}: {
  note?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 flex items-center gap-3 border-t border-border bg-background/85 px-5 py-3 backdrop-blur",
        className
      )}
    >
      {note ? (
        <span className="min-w-0 text-[11px] text-muted-foreground">{note}</span>
      ) : null}
      <div className="flex-1" />
      <div className="flex shrink-0 items-center gap-1.5">{children}</div>
    </div>
  )
}

/** Column-count-driven table head. Keeps grid templates in one place. */
export function GridHead({
  columns,
  template,
  className,
}: {
  columns: string[]
  template: string
  className?: string
}) {
  return (
    <div
      style={{ gridTemplateColumns: template }}
      className={cn(
        "grid items-center gap-3 border-b border-border px-3 py-2",
        className
      )}
    >
      {columns.map((column) => (
        <Label key={column}>{column}</Label>
      ))}
    </div>
  )
}

export function EmptyState({
  title,
  detail,
  action,
}: {
  title: string
  detail?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <p className="text-[13px] font-medium">{title}</p>
      {detail ? <Muted className="max-w-sm">{detail}</Muted> : null}
      {action}
    </div>
  )
}

export function OriginBadge({ origin }: { origin: string }) {
  const variant =
    origin === "policy" ? "outline" : origin === "requested" ? "secondary" : "ghost"
  return (
    <Badge variant={variant} className="capitalize">
      {origin}
    </Badge>
  )
}
