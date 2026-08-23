import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { ArrowLeftIcon } from "lucide-react"

import { getProject } from "@/lib/db/projects"
import { getGitHubPullRequest, GitHubCliError } from "@/lib/github/client"
import type { GitHubPullRequestDetail } from "@/lib/github/pull-request-data"
import { buildPullRequestMission } from "@/lib/projects/pull-request-mission"
import { PageBody, PageHeader } from "@/components/opssemble/layout"
import { PullRequestMissionWorkflow } from "@/components/opssemble/missions/pull-request-mission-workflow"
import { MetaLine, Sha } from "@/components/opssemble/presentation"
import { PullRequestLoadError } from "@/components/opssemble/projects/pull-request-panels"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Pull Request Mission",
}

export default async function PullRequestMissionPage({
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
  const pullRequestHref = `/projects/${project.id}/pulls/${pullRequestNumber}`
  let pullRequest: GitHubPullRequestDetail

  try {
    pullRequest = await getGitHubPullRequest(
      project.clonePath,
      pullRequestNumber
    )
  } catch (error) {
    const message =
      error instanceof GitHubCliError
        ? error.message
        : "This pull request mission could not be loaded."

    return (
      <>
        <PageHeader
          title={`${slug} #${pullRequestNumber.toLocaleString()}`}
          subtitle="Release mission"
        />
        <PageBody>
          <PullRequestLoadError projectId={project.id} message={message} />
        </PageBody>
      </>
    )
  }

  const candidateSha = pullRequest.commits.at(-1)?.oid
  const mission = buildPullRequestMission(pullRequest)

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      <PageHeader
        title={pullRequest.title}
        subtitle={`${slug} pull request #${pullRequest.number.toLocaleString()} · Release mission`}
        actions={
          <Link
            href={pullRequestHref}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Pull request
          </Link>
        }
      >
        <MetaLine className="mt-2 flex-wrap text-xs text-muted-foreground/70">
          <span className="tabular-nums">
            {mission.agents.length.toLocaleString()} agents selected
          </span>
          <span className="font-mono">
            {pullRequest.headBranch} → {pullRequest.baseBranch}
          </span>
          {candidateSha ? <Sha sha={candidateSha} /> : null}
        </MetaLine>
      </PageHeader>

      <PageBody className="[scrollbar-gutter:stable]">
        <PullRequestMissionWorkflow mission={mission} />
      </PageBody>
    </div>
  )
}
