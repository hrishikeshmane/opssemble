import Link from "next/link"
import {
  BanIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  CircleXIcon,
  ExternalLinkIcon,
  GitCommitHorizontalIcon,
  GitMergeIcon,
  GitPullRequestClosedIcon,
  GitPullRequestDraftIcon,
  GitPullRequestIcon,
  LoaderCircleIcon,
} from "lucide-react"

import type {
  GitHubPullRequestCheck,
  GitHubPullRequestCheckBucket,
  GitHubPullRequestCommit,
  GitHubPullRequestDetail,
  GitHubPullRequestReview,
  GitHubPullRequestState,
} from "@/lib/github/pull-request-data"
import {
  Card,
  Chip,
  EmptyLine,
  MetaRow,
  Section,
  SectionHeading,
} from "@/components/opssemble/layout"
import {
  ActorLabel,
  BranchPair,
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
  {
    label: string
    Icon: typeof GitPullRequestIcon
    className: string
  }
>

const CHECK_STATE = {
  pass: {
    label: "Passed",
    Icon: CircleCheckIcon,
    className: tone.good,
  },
  fail: {
    label: "Failed",
    Icon: CircleXIcon,
    className: tone.bad,
  },
  pending: {
    label: "Pending",
    Icon: LoaderCircleIcon,
    className: tone.pending,
  },
  skipping: {
    label: "Skipped",
    Icon: CircleDashedIcon,
    className: tone.absent,
  },
  cancel: {
    label: "Cancelled",
    Icon: BanIcon,
    className: tone.absent,
  },
  unknown: {
    label: "Unknown",
    Icon: CircleDashedIcon,
    className: tone.absent,
  },
} as const satisfies Record<
  GitHubPullRequestCheckBucket,
  {
    label: string
    Icon: typeof CircleCheckIcon
    className: string
  }
>

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function PullRequestState({
  pullRequest,
}: {
  pullRequest: GitHubPullRequestDetail
}) {
  const state = pullRequest.isDraft
    ? {
        label: "Draft",
        Icon: GitPullRequestDraftIcon,
        className: tone.draft,
      }
    : PULL_REQUEST_STATE[pullRequest.state]

  return (
    <span className={cn("inline-flex items-center gap-1.5", state.className)}>
      <state.Icon role="img" aria-label={state.label} className="size-3.5" />
      <span className="font-medium">{state.label}</span>
    </span>
  )
}

export function PullRequestOverview({
  pullRequest,
}: {
  pullRequest: GitHubPullRequestDetail
}) {
  return (
    <>
      <Section>
        <MetaRow label="State">
          <PullRequestState pullRequest={pullRequest} />
        </MetaRow>
        <MetaRow label="Author">
          <ActorLabel
            handle={pullRequest.author}
            initials={pullRequest.author}
            className="w-fit"
          />
        </MetaRow>
        <MetaRow label="Branches">
          <BranchPair
            base={pullRequest.baseBranch}
            head={pullRequest.headBranch}
          />
        </MetaRow>
        <MetaRow label="Created">
          <time dateTime={pullRequest.createdAt}>
            {formatDate(pullRequest.createdAt)}
          </time>
        </MetaRow>
        <MetaRow label="Updated">
          <time dateTime={pullRequest.updatedAt}>
            {formatDate(pullRequest.updatedAt)}
          </time>
        </MetaRow>
        {pullRequest.mergedAt ? (
          <MetaRow label="Merged">
            <time dateTime={pullRequest.mergedAt}>
              {formatDate(pullRequest.mergedAt)}
            </time>
          </MetaRow>
        ) : null}
        {pullRequest.reviewDecision ? (
          <MetaRow label="Review">
            <span className="capitalize">
              {pullRequest.reviewDecision.replaceAll("_", " ")}
            </span>
          </MetaRow>
        ) : null}
        {pullRequest.labels.length > 0 ? (
          <MetaRow label="Labels">
            <span className="flex flex-wrap gap-1.5">
              {pullRequest.labels.map((label) => (
                <Chip key={label.name}>{label.name}</Chip>
              ))}
            </span>
          </MetaRow>
        ) : null}
      </Section>

      <SectionHeading title="Description" />
      {pullRequest.body.trim().length > 0 ? (
        <Section>
          <p className="max-w-4xl text-xs/relaxed whitespace-pre-wrap">
            {pullRequest.body}
          </p>
        </Section>
      ) : (
        <EmptyLine>No description was provided.</EmptyLine>
      )}
    </>
  )
}

function CheckRow({ check }: { check: GitHubPullRequestCheck }) {
  const state = CHECK_STATE[check.bucket]
  const content = (
    <>
      <state.Icon
        role="img"
        aria-label={state.label}
        className={cn(
          "size-4 shrink-0",
          state.className,
          check.bucket === "pending" && "animate-spin"
        )}
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{check.name}</span>
        <MetaLine className="mt-0.5 text-xs text-muted-foreground/70">
          {check.workflow ? <span>{check.workflow}</span> : null}
          {check.completedAt ? (
            <time dateTime={check.completedAt}>
              completed {formatDate(check.completedAt)}
            </time>
          ) : check.startedAt ? (
            <time dateTime={check.startedAt}>
              started {formatDate(check.startedAt)}
            </time>
          ) : null}
        </MetaLine>
      </span>
      <span className={cn("shrink-0 text-xs font-medium", state.className)}>
        {check.status}
      </span>
    </>
  )

  return (
    <li>
      {check.link ? (
        <Link
          href={check.link}
          target="_blank"
          rel="noreferrer"
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-accent/60 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
        >
          {content}
        </Link>
      ) : (
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2">
          {content}
        </div>
      )}
    </li>
  )
}

export function PullRequestChecks({
  checks,
}: {
  checks: readonly GitHubPullRequestCheck[]
}) {
  if (checks.length === 0) {
    return <EmptyLine>No checks were reported for this pull request.</EmptyLine>
  }

  return (
    <ul className="px-2 py-2">
      {checks.map((check, index) => (
        <CheckRow
          key={`${check.workflow ?? "check"}:${check.name}:${index}`}
          check={check}
        />
      ))}
    </ul>
  )
}

function reviewPresentation(state: string) {
  if (state === "approved") {
    return { label: "approved", className: tone.good }
  }

  if (state === "changes requested") {
    return { label: state, className: tone.bad }
  }

  if (state === "pending") {
    return { label: state, className: tone.pending }
  }

  return { label: state, className: tone.absent }
}

function ReviewCard({ review }: { review: GitHubPullRequestReview }) {
  const presentation = reviewPresentation(review.state)

  return (
    <Card className="[contain-intrinsic-block-size:100px] [content-visibility:auto]">
      <div className="flex min-w-0 items-center gap-2">
        <ActorLabel
          handle={review.author}
          initials={review.author}
          className="min-w-0"
        />
        <span className={cn("font-medium", presentation.className)}>
          {presentation.label}
        </span>
        {review.submittedAt ? (
          <time
            dateTime={review.submittedAt}
            className="ml-auto shrink-0 text-[11px] text-muted-foreground"
          >
            {formatDate(review.submittedAt)}
          </time>
        ) : null}
      </div>
      {review.body.trim().length > 0 ? (
        <p className="mt-2 text-xs/relaxed whitespace-pre-wrap">
          {review.body}
        </p>
      ) : null}
    </Card>
  )
}

export function PullRequestReviews({
  reviews,
}: {
  reviews: readonly GitHubPullRequestReview[]
}) {
  if (reviews.length === 0) {
    return <EmptyLine>No reviews have been submitted.</EmptyLine>
  }

  return (
    <div className="space-y-2 px-4 py-3">
      {reviews.map((review, index) => (
        <ReviewCard
          key={`${review.author}:${review.submittedAt ?? index}:${index}`}
          review={review}
        />
      ))}
    </div>
  )
}

function CommitRow({ commit }: { commit: GitHubPullRequestCommit }) {
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-3 py-2 [contain-intrinsic-block-size:54px] [content-visibility:auto]">
      <GitCommitHorizontalIcon
        aria-hidden
        className="size-4 text-muted-foreground"
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">
          {commit.headline}
        </span>
        <MetaLine className="mt-0.5 text-xs text-muted-foreground/70">
          <span className="truncate">{commit.authors.join(", ")}</span>
          <time dateTime={commit.authoredAt}>
            authored {formatDate(commit.authoredAt)}
          </time>
        </MetaLine>
      </span>
      <code className="shrink-0 font-mono text-[11px] text-muted-foreground">
        {commit.oid.slice(0, 7)}
      </code>
    </li>
  )
}

export function PullRequestCommits({
  commits,
}: {
  commits: readonly GitHubPullRequestCommit[]
}) {
  if (commits.length === 0) {
    return <EmptyLine>No commits were reported.</EmptyLine>
  }

  return (
    <ul className="px-2 py-2">
      {commits.map((commit) => (
        <CommitRow key={commit.oid} commit={commit} />
      ))}
    </ul>
  )
}

export function PullRequestLoadError({
  projectId,
  message,
}: {
  projectId: string
  message: string
}) {
  return (
    <Section>
      <p role="alert" className="text-xs text-destructive">
        {message}
      </p>
      <Link
        href={`/projects/${projectId}`}
        className="mt-2 inline-flex items-center gap-1.5 rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Return to pull requests
        <ExternalLinkIcon aria-hidden className="size-3" />
      </Link>
    </Section>
  )
}

export function pullRequestStateLabel(
  pullRequest: GitHubPullRequestDetail
): string {
  return pullRequest.isDraft
    ? "Draft"
    : PULL_REQUEST_STATE[pullRequest.state].label
}

export function pullRequestCheckSummary(
  checks: readonly GitHubPullRequestCheck[]
): string {
  if (checks.length === 0) {
    return "No checks"
  }

  const passed = checks.filter((check) => check.bucket === "pass").length
  const pending = checks.filter((check) => check.bucket === "pending").length
  const failed = checks.filter((check) => check.bucket === "fail").length

  if (failed > 0) {
    return `${failed.toLocaleString()} failed`
  }

  if (pending > 0) {
    return `${pending.toLocaleString()} pending`
  }

  return `${passed.toLocaleString()}/${checks.length.toLocaleString()} passed`
}
