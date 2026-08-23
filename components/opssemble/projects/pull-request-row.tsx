import Link from "next/link"
import {
  GitMergeIcon,
  GitPullRequestClosedIcon,
  GitPullRequestDraftIcon,
  GitPullRequestIcon,
} from "lucide-react"

import type {
  GitHubPullRequest,
  GitHubPullRequestState,
} from "@/lib/github/pull-request-data"
import {
  ActorLabel,
  BranchPair,
  DiffStat,
  MetaLine,
  tone,
} from "@/components/opssemble/presentation"
import { cn } from "@/lib/utils"

const PULL_REQUEST_STATE = {
  open: {
    label: "Open",
    Icon: GitPullRequestIcon,
    className: tone.good,
  },
  closed: {
    label: "Closed",
    Icon: GitPullRequestClosedIcon,
    className: tone.bad,
  },
  merged: {
    label: "Merged",
    Icon: GitMergeIcon,
    className: tone.terminal,
  },
} as const satisfies Record<
  GitHubPullRequestState,
  { label: string; Icon: typeof GitPullRequestIcon; className: string }
>

const REVIEW_DECISION = {
  approved: { label: "approved", className: tone.good },
  changes_requested: { label: "changes requested", className: tone.bad },
  review_required: { label: "review required", className: tone.pending },
} as const

function formatUpdatedAt(value: string): string {
  const date = new Date(value)
  const formatted = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date)

  return `updated ${formatted}`
}

export function PullRequestRow({
  projectId,
  pullRequest,
}: {
  projectId: string
  pullRequest: GitHubPullRequest
}) {
  const presentation = pullRequest.isDraft
    ? {
        label: "Draft",
        Icon: GitPullRequestDraftIcon,
        className: tone.draft,
      }
    : PULL_REQUEST_STATE[pullRequest.state]
  const review =
    pullRequest.reviewDecision && pullRequest.reviewDecision in REVIEW_DECISION
      ? REVIEW_DECISION[
          pullRequest.reviewDecision as keyof typeof REVIEW_DECISION
        ]
      : null

  return (
    <li>
      <Link
        href={`/projects/${projectId}/pulls/${pullRequest.number}`}
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-3 py-2 text-left transition-colors [contain-intrinsic-block-size:54px] [content-visibility:auto] hover:bg-accent/60 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
      >
        <presentation.Icon
          role="img"
          aria-label={presentation.label}
          className={cn("size-4 shrink-0", presentation.className)}
        />

        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            {pullRequest.title}
          </span>
          <MetaLine className="mt-0.5 text-xs text-muted-foreground/70">
            <span className="shrink-0 tabular-nums">#{pullRequest.number}</span>
            {review ? (
              <span className={cn("shrink-0 font-medium", review.className)}>
                {review.label}
              </span>
            ) : null}
            <ActorLabel
              handle={pullRequest.author}
              initials={pullRequest.author}
              className="max-w-40 shrink-0"
            />
            <BranchPair
              base={pullRequest.baseBranch}
              head={pullRequest.headBranch}
              className="max-w-64"
            />
            <span className="shrink-0 tabular-nums">
              {pullRequest.changedFiles.toLocaleString()} files
            </span>
          </MetaLine>
        </span>

        <span className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-muted-foreground/70 tabular-nums">
          <span>{formatUpdatedAt(pullRequest.updatedAt)}</span>
          <DiffStat
            additions={pullRequest.additions}
            deletions={pullRequest.deletions}
          />
        </span>
      </Link>
    </li>
  )
}
