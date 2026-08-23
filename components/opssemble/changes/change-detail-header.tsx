/**
 * Change detail header. Modelled on a code-review pull-request header: a
 * breadcrumb, a title row carrying risk and contract state, and a dense
 * hairline-separated meta strip of monospace facts.
 */
import type * as React from "react"
import Link from "next/link"
import { ArrowLeft, MoreHorizontal } from "lucide-react"

import type { Change } from "@/lib/mock-data"
import { Mono, RiskBadge, StatusPill } from "@/components/opssemble/kit"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

/** Small bordered monospace chip used for git branch names. */
function BranchChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="ops-mono rounded-sm border border-border px-1.5 py-px text-[10px] leading-4">
      {children}
    </span>
  )
}

function MetaSeparator() {
  return <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
}

export function ChangeDetailHeader({
  change,
  contractVersion,
}: {
  change: Change
  contractVersion: number
}) {
  return (
    <header className="flex flex-col gap-2.5 border-b border-border px-5 py-4">
      <Breadcrumb>
        <BreadcrumbList className="text-[11px]">
          <BreadcrumbItem>
            <BreadcrumbLink
              render={
                <Link href="/changes" className="inline-flex items-center gap-1">
                  <ArrowLeft className="size-3" />
                  Changes
                </Link>
              }
            />
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="ops-mono">
              #{change.number}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <h1 className="text-[15px] leading-tight font-medium tracking-[-0.01em]">
            {change.title}
          </h1>
          <span className="ops-mono text-[13px] leading-tight text-muted-foreground">
            #{change.number}
          </span>
        </div>
        <div className="flex-1" />
        <div className="flex shrink-0 items-center gap-1.5">
          <RiskBadge risk={change.risk} />
          <StatusPill status="idle" dot={false}>
            Contract v{contractVersion}
          </StatusPill>
          <Button variant="ghost" size="icon-sm" aria-label="More change actions">
            <MoreHorizontal />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Avatar className="size-4.5">
            <AvatarFallback className="text-[9px] font-medium">
              {change.author.initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-foreground">{change.author.name}</span>
        </span>
        <MetaSeparator />
        <span className="flex items-center gap-1">
          <BranchChip>{change.baseBranch}</BranchChip>
          <span aria-hidden className="ops-mono text-[10px]">
            &larr;
          </span>
          <BranchChip>{change.branch}</BranchChip>
        </span>
        <MetaSeparator />
        <Mono className="text-[10px]">{change.sha}</Mono>
        <MetaSeparator />
        <Mono className="text-[10px]">
          {change.filesChanged} files changed
        </Mono>
        <MetaSeparator />
        <Mono className="text-[10px]">
          <span className="text-ok">+{change.additions}</span>
          <span className="px-1 text-muted-foreground">/</span>
          <span className="text-fail">-{change.deletions}</span>
        </Mono>
      </div>

      <p className="max-w-3xl border-l-2 border-border pl-3 text-[12px] leading-relaxed text-muted-foreground">
        {change.body}
      </p>
    </header>
  )
}
