import type { Metadata } from "next"
import { connection } from "next/server"

import { listProjects } from "@/lib/db/projects"
import { EmptyPanel, PageBody, PageHeader } from "@/components/opssemble/layout"
import { ImportProjectForm } from "@/components/opssemble/projects/import-project-form"
import { ProjectRow } from "@/components/opssemble/projects/project-row"

export const metadata: Metadata = {
  title: "Projects",
}

export default async function ProjectsPage() {
  await connection()
  const projects = await listProjects()

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="GitHub repositories available to this Opssemble workspace"
      >
        <ImportProjectForm />
      </PageHeader>

      <PageBody>
        {projects.length > 0 ? (
          <ul className="px-2 py-2">
            {projects.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </ul>
        ) : (
          <EmptyPanel>No projects imported.</EmptyPanel>
        )}
      </PageBody>
    </>
  )
}
