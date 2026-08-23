/**
 * The change detail header.
 *
 * Two rows in one grid: a breadcrumb line facing the actions across from it,
 * then the title block spanning both columns beneath. The breadcrumb row is a
 * fixed 28px so the actions cannot change the height of the page as they come
 * and go, and the title block below it is free to grow.
 *
 * There is no status pill, no contract badge and no risk badge here. The change
 * number wears the risk tone and that is the whole state signal -- a badge for
 * it would say the same thing a third time next to the plan glyph the inbox row
 * already showed.
 */
import Link from "next/link"
import { MoreHorizontalIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { type Change, repo } from "@/lib/mock-data"
import {
  ActorLabel,
  BranchPair,
  DiffStat,
  FileCount,
  MetaLine,
  riskToneClassName,
} from "@/components/opssemble/presentation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ChangeDetailHeader({ change }: { change: Change }) {
  return (
    <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 border-b border-border/60">
      <div className="ml-4 grid h-7 min-w-0 items-center">
        <MetaLine className="text-xs text-muted-foreground">
          {/* The repository is the ancestor a reader came through, so it stays a
              link back to the inbox. The number is this page, so it does not. */}
          <Link
            href="/changes"
            className="min-w-0 truncate font-medium transition-colors hover:text-foreground"
          >
            {repo.slug}
          </Link>
          <span
            className={cn("shrink-0 font-medium", riskToneClassName(change.risk))}
          >
            #{change.number}
          </span>
        </MetaLine>
      </div>

      <div className="mr-4 flex h-7 min-w-0 flex-nowrap items-center justify-end gap-1">
        {/* Arming is the consequential act on this page and the only thing here
            wearing the primary tone. Saving a draft changes nothing anybody can
            see, so it is an outline; rejecting is rare enough for the overflow. */}
        <Button size="xs">Arm Watch Plan</Button>
        <Button size="xs" variant="outline">
          Save draft
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label="More change actions"
              />
            }
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          {/* The popup anchors to a 20px trigger, so it has to be told its own
              width or it inherits that. */}
          <DropdownMenuContent align="end" className="w-auto min-w-44">
            <DropdownMenuItem>Reject</DropdownMenuItem>
            <DropdownMenuItem>Create Linear issue</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Open on GitHub</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="col-span-2 mt-1 min-w-0 px-4 pb-4">
        <h1 className="min-w-0 text-base leading-snug font-semibold">
          {change.title}
        </h1>

        {/* Who and when, and nothing else. Reviewers, labels and a created date
            all read as equally important beside them, and none of them is. */}
        <MetaLine className="mt-2 text-xs text-muted-foreground">
          <ActorLabel
            handle={change.author.handle}
            initials={change.author.initials}
            className="max-w-40 shrink-0"
          />
          <span className="shrink-0 tabular-nums">
            updated {change.updated} ago
          </span>
        </MetaLine>

        <p className="mt-2 max-w-3xl text-xs text-muted-foreground">
          {change.body}
        </p>

        <div className="mt-4 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <BranchPair base={change.baseBranch} head={change.branch} />
          {/* The size of the change sits with the branches rather than with the
              author: both answer "how much of the repository is this", and the
              Diff tab's accessory repeats the pair for the same reason. */}
          <span className="ml-auto flex shrink-0 items-center gap-3">
            <FileCount count={change.filesChanged} />
            <DiffStat
              additions={change.additions}
              deletions={change.deletions}
              className="shrink-0 font-mono text-xs"
            />
          </span>
        </div>
      </div>
    </header>
  )
}
