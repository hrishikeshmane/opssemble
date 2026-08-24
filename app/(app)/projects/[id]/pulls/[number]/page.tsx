import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { ExternalLinkIcon, GitPullRequestIcon, RadarIcon } from "lucide-react"

import { getProject } from "@/lib/db/projects"
import {
  getGitHubPullRequest,
  getGitHubPullRequestDiff,
  GitHubCliError,
} from "@/lib/github/client"
import { mergeGitHubPullRequestFiles } from "@/lib/github/pull-request-data"
import { PageBody, PageHeader } from "@/components/opssemble/layout"
import { MetaLine, tone } from "@/components/opssemble/presentation"
import { PullRequestDetailTabs } from "@/components/opssemble/projects/pull-request-detail-tabs"
import { PullRequestDiffViewer } from "@/components/opssemble/projects/pull-request-diff-viewer"
import {
  pullRequestCheckSummary,
  PullRequestChecks,
  PullRequestCommits,
  PullRequestLoadError,
  PullRequestOverview,
  PullRequestReviews,
  pullRequestStateLabel,
} from "@/components/opssemble/projects/pull-request-panels"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default async function PullRequestPage({
  params,
}: {
  params: Promise<{ id: string; number: string }>
}) {
  await connection()
  const { id, number } = await params

  if (!/^[1-9]\d*$/.test(number)) {
    notFound()
  }

  const project = await getProject(id)

  if (!project) {
    notFound()
  }

  const pullRequestNumber = Number(number)
  const slug = `${project.owner}/${project.repository}`
  const [detailResult, diffResult] = await Promise.allSettled([
    getGitHubPullRequest(project.clonePath, pullRequestNumber),
    getGitHubPullRequestDiff(project.clonePath, pullRequestNumber),
  ])

  if (detailResult.status === "rejected") {
    const message =
      detailResult.reason instanceof GitHubCliError
        ? detailResult.reason.message
        : "This pull request could not be loaded."

    return (
      <>
        <PageHeader
          title={`${slug} #${pullRequestNumber.toLocaleString()}`}
          subtitle="Pull request details"
        >
          <MetaLine className="mt-2 text-xs text-muted-foreground/70">
            <Link
              href={`/projects/${project.id}`}
              className="rounded-sm transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              All pull requests
            </Link>
          </MetaLine>
        </PageHeader>
        <PageBody>
          <PullRequestLoadError projectId={project.id} message={message} />
        </PageBody>
      </>
    )
  }

  const pullRequest = {
    ...detailResult.value,
    files:
      diffResult.status === "fulfilled"
        ? mergeGitHubPullRequestFiles(
            detailResult.value.files,
            diffResult.value
          )
        : detailResult.value.files,
  }
  const diffError =
    diffResult.status === "rejected"
      ? diffResult.reason instanceof GitHubCliError
        ? diffResult.reason.message
        : "The pull request diff could not be loaded."
      : null

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      <PageHeader
        title={pullRequest.title}
        subtitle={`${slug} pull request #${pullRequest.number.toLocaleString()}`}
        actions={
          <>
            <Link
              href={`/projects/${project.id}/pulls/${pullRequest.number}/mission`}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              <RadarIcon data-icon="inline-start" />
              Mission
            </Link>
            <Link
              href={pullRequest.url}
              target="_blank"
              rel="noreferrer"
              aria-label="Open pull request on GitHub"
              className={cn(
                buttonVariants({ variant: "outline", size: "icon-sm" })
              )}
            >
              <ExternalLinkIcon />
            </Link>
          </>
        }
      >
        <MetaLine className="mt-2 flex-wrap text-xs text-muted-foreground/70">
          <span className={cn("inline-flex items-center gap-1", tone.good)}>
            <GitPullRequestIcon aria-hidden className="size-3" />#
            {pullRequest.number.toLocaleString()}
          </span>
          <span>{pullRequest.author}</span>
          <span className="font-mono">
            {pullRequest.headBranch} → {pullRequest.baseBranch}
          </span>
          <Link
            href={`/projects/${project.id}`}
            className="rounded-sm transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            All pull requests
          </Link>
        </MetaLine>
      </PageHeader>

      <PullRequestDetailTabs
        stateLabel={pullRequestStateLabel(pullRequest)}
        checkSummary={pullRequestCheckSummary(pullRequest.checks)}
        reviewCount={pullRequest.reviews.length}
        commitCount={pullRequest.commits.length}
        fileCount={pullRequest.changedFiles}
        additions={pullRequest.additions}
        deletions={pullRequest.deletions}
        overview={<PullRequestOverview pullRequest={pullRequest} />}
        checks={<PullRequestChecks checks={pullRequest.checks} />}
        reviews={<PullRequestReviews reviews={pullRequest.reviews} />}
        commits={<PullRequestCommits commits={pullRequest.commits} />}
        files={
          <PullRequestDiffViewer files={pullRequest.files} error={diffError} />
        }
      />
    </div>
  )
}
