import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import { getProject } from "@/lib/db/projects"
import { GitHubCliError, listGitHubPullRequests } from "@/lib/github/client"
import { PageBody, PageHeader, Section } from "@/components/opssemble/layout"
import { MetaLine } from "@/components/opssemble/presentation"
import { ProjectControls } from "@/components/opssemble/projects/project-controls"
import { PullRequestList } from "@/components/opssemble/projects/pull-request-list"

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await connection()
  const { id } = await params
  const project = await getProject(id)

  if (!project) {
    notFound()
  }

  let pullRequests: Awaited<ReturnType<typeof listGitHubPullRequests>> = []
  let pullRequestError: string | null = null

  if (project.status === "ready") {
    try {
      pullRequests = await listGitHubPullRequests(project.clonePath)
    } catch (error) {
      pullRequestError =
        error instanceof GitHubCliError
          ? error.message
          : "Pull requests could not be loaded."
    }
  } else {
    pullRequestError =
      project.lastError ?? "This project is not ready to load pull requests."
  }

  const slug = `${project.owner}/${project.repository}`

  return (
    <>
      <PageHeader
        title={slug}
        subtitle="Pull requests from the local project clone"
        actions={
          <ProjectControls
            projectId={project.id}
            projectSlug={slug}
            status={project.status}
            remoteUrl={project.remoteUrl}
          />
        }
      >
        <MetaLine className="mt-2 flex-wrap text-xs text-muted-foreground/70">
          {project.defaultBranch ? (
            <span className="font-mono">{project.defaultBranch}</span>
          ) : null}
          <span className="max-w-full truncate font-mono">
            {project.clonePath}
          </span>
          <Link
            href="/projects"
            className="rounded-sm transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            All projects
          </Link>
        </MetaLine>
      </PageHeader>

      <PageBody>
        {pullRequestError ? (
          <Section>
            <p
              role="alert"
              className="rounded-md border border-destructive/30 px-3 py-2 text-xs text-destructive"
            >
              {pullRequestError}
            </p>
          </Section>
        ) : (
          <PullRequestList projectId={project.id} pullRequests={pullRequests} />
        )}
      </PageBody>
    </>
  )
}
