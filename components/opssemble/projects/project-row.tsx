import Link from "next/link"
import {
  ArchiveIcon,
  CircleCheckIcon,
  LoaderCircleIcon,
  TriangleAlertIcon,
} from "lucide-react"

import type { ProjectStatus } from "@/lib/db/schema"
import type { ProjectSummary } from "@/lib/db/projects"
import { MetaLine, tone } from "@/components/opssemble/presentation"
import { cn } from "@/lib/utils"

const PROJECT_STATUS = {
  ready: {
    label: "Ready",
    Icon: CircleCheckIcon,
    className: tone.good,
  },
  cloning: {
    label: "Cloning",
    Icon: LoaderCircleIcon,
    className: tone.pending,
  },
  error: {
    label: "Import failed",
    Icon: TriangleAlertIcon,
    className: tone.bad,
  },
  archived: {
    label: "Archived",
    Icon: ArchiveIcon,
    className: tone.absent,
  },
} as const satisfies Record<
  ProjectStatus,
  { label: string; Icon: typeof CircleCheckIcon; className: string }
>

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value))
}

export function ProjectRow({ project }: { project: ProjectSummary }) {
  const status = PROJECT_STATUS[project.status]

  return (
    <li>
      <Link
        href={`/projects/${project.id}`}
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent/60 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
      >
        <status.Icon
          role="img"
          aria-label={status.label}
          className={cn(
            "size-4 shrink-0",
            status.className,
            project.status === "cloning" && "animate-spin"
          )}
        />

        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            {project.owner}/{project.repository}
          </span>
          <MetaLine className="mt-0.5 text-xs text-muted-foreground/70">
            {project.defaultBranch ? (
              <span className="shrink-0 font-mono">
                {project.defaultBranch}
              </span>
            ) : null}
            <span className="truncate font-mono">{project.clonePath}</span>
            {project.lastError ? (
              <span className="truncate text-destructive">
                {project.lastError}
              </span>
            ) : null}
          </MetaLine>
        </span>

        <span className="shrink-0 text-xs text-muted-foreground/70 tabular-nums">
          {formatUpdatedAt(project.updatedAt)}
        </span>
      </Link>
    </li>
  )
}
