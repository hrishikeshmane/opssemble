"use client"

import Link from "next/link"
import { useActionState, useState } from "react"
import {
  ExternalLinkIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react"

import {
  removeProjectAction,
  retryProjectAction,
  syncProjectAction,
  type ProjectActionState,
} from "@/app/(app)/projects/actions"
import type { ProjectStatus } from "@/lib/db/schema"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const initialState: ProjectActionState = {
  error: null,
}

export function ProjectControls({
  projectId,
  projectSlug,
  status,
  remoteUrl,
}: {
  projectId: string
  projectSlug: string
  status: ProjectStatus
  remoteUrl: string
}) {
  const [removeOpen, setRemoveOpen] = useState(false)
  const projectAction =
    status === "error" ? retryProjectAction : syncProjectAction
  const [projectState, projectFormAction, projectPending] = useActionState(
    projectAction.bind(null, projectId),
    initialState
  )
  const [removeState, removeFormAction, removePending] = useActionState(
    removeProjectAction.bind(null, projectId),
    initialState
  )
  const actionLabel =
    status === "error" ? "Retry project import" : "Sync project"
  const ActionIcon = status === "error" ? RotateCcwIcon : RefreshCwIcon

  return (
    <>
      <form action={projectFormAction}>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="submit"
                variant="outline"
                size="icon-sm"
                aria-label={actionLabel}
                disabled={projectPending}
              />
            }
          >
            {projectPending ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <ActionIcon />
            )}
          </TooltipTrigger>
          <TooltipContent>{actionLabel}</TooltipContent>
        </Tooltip>
      </form>

      {projectState.error ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <span
                role="img"
                aria-label={projectState.error}
                className="inline-flex size-6 items-center justify-center text-destructive"
              />
            }
          >
            <TriangleAlertIcon className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent>{projectState.error}</TooltipContent>
        </Tooltip>
      ) : null}

      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href={remoteUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Open repository on GitHub"
              className={cn(
                buttonVariants({ variant: "outline", size: "icon-sm" })
              )}
            />
          }
        >
          <ExternalLinkIcon />
        </TooltipTrigger>
        <TooltipContent>Open repository on GitHub</TooltipContent>
      </Tooltip>

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <Tooltip>
          <TooltipTrigger
            render={
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove project"
                  />
                }
              />
            }
          >
            <Trash2Icon />
          </TooltipTrigger>
          <TooltipContent>Remove project</TooltipContent>
        </Tooltip>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {projectSlug}</DialogTitle>
            <DialogDescription>
              This removes the managed clone and project record. GitHub is not
              changed.
            </DialogDescription>
          </DialogHeader>

          {removeState.error ? (
            <p role="alert" className="text-xs text-destructive">
              {removeState.error}
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose render={<Button size="sm" variant="outline" />}>
              Cancel
            </DialogClose>
            <form action={removeFormAction}>
              <Button
                type="submit"
                size="sm"
                variant="destructive"
                disabled={removePending}
              >
                {removePending ? (
                  <LoaderCircleIcon
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : (
                  <Trash2Icon data-icon="inline-start" />
                )}
                {removePending ? "Removing" : "Remove project"}
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
