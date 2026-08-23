"use client"

import * as React from "react"
import { ChevronDownIcon, ChevronRightIcon, FileDiffIcon } from "lucide-react"

import type {
  GitHubPullRequestDiffLine,
  GitHubPullRequestFile,
} from "@/lib/github/pull-request-data"
import { EmptyLine, EmptyPanel } from "@/components/opssemble/layout"
import { DiffStat } from "@/components/opssemble/presentation"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

const LINE_SURFACE: Record<GitHubPullRequestDiffLine["kind"], string> = {
  add: "bg-emerald-500/10",
  del: "bg-red-500/10",
  ctx: "",
}

const LINE_PREFIX: Record<GitHubPullRequestDiffLine["kind"], string> = {
  add: "+",
  del: "-",
  ctx: " ",
}

function FilePath({ path }: { path: string }) {
  const cut = path.lastIndexOf("/")

  return (
    <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
      {cut === -1 ? null : path.slice(0, cut + 1)}
      <span className="text-foreground">{path.slice(cut + 1)}</span>
    </span>
  )
}

function DiffRow({ line }: { line: GitHubPullRequestDiffLine }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[44px_44px_minmax(max-content,1fr)]",
        LINE_SURFACE[line.kind]
      )}
    >
      <span className="pr-2 text-right font-mono text-[11px] leading-5 text-muted-foreground/70 select-none">
        {line.oldLine ?? ""}
      </span>
      <span className="pr-2 text-right font-mono text-[11px] leading-5 text-muted-foreground/70 select-none">
        {line.newLine ?? ""}
      </span>
      <code className="pr-4 font-mono text-[11px] leading-5 whitespace-pre">
        {LINE_PREFIX[line.kind]}
        {line.text}
      </code>
    </div>
  )
}

function DiffFile({
  file,
  initiallyOpen,
}: {
  file: GitHubPullRequestFile
  initiallyOpen: boolean
}) {
  const [open, setOpen] = React.useState(initiallyOpen && file.hunks.length > 0)
  const Chevron = open ? ChevronDownIcon : ChevronRightIcon

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2 text-xs">
        <CollapsibleTrigger
          render={
            <Button
              size="icon-xs"
              variant="ghost"
              className="rounded hover:bg-transparent"
              aria-label={`${open ? "Collapse" : "Expand"} ${file.path}`}
            />
          }
        >
          <Chevron className="size-3.5" />
        </CollapsibleTrigger>
        <FilePath path={file.path} />
        <DiffStat
          additions={file.additions}
          deletions={file.deletions}
          className="ml-auto font-mono text-[11px]"
        />
      </div>

      {open ? (
        <CollapsibleContent>
          {file.hunks.length === 0 ? (
            <EmptyLine>Patch content is unavailable for this file.</EmptyLine>
          ) : (
            <div className="[scrollbar-gutter:stable] overflow-x-auto [contain-intrinsic-block-size:auto_220px] [content-visibility:auto]">
              {file.hunks.map((hunk, hunkIndex) => (
                <div key={`${hunk.header}:${hunkIndex}`}>
                  <div className="bg-muted/40 px-4 py-1 font-mono text-[11px] text-muted-foreground">
                    {hunk.header}
                  </div>
                  {hunk.lines.map((line, lineIndex) => (
                    <DiffRow
                      key={`${line.oldLine ?? "_"}:${line.newLine ?? "_"}:${lineIndex}`}
                      line={line}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      ) : null}
    </Collapsible>
  )
}

export function PullRequestDiffViewer({
  files,
  error,
}: {
  files: readonly GitHubPullRequestFile[]
  error: string | null
}) {
  if (files.length === 0) {
    return (
      <EmptyPanel icon={<FileDiffIcon className="size-5" />}>
        This pull request has no changed files.
      </EmptyPanel>
    )
  }

  return (
    <div>
      {error ? (
        <p
          role="alert"
          className="border-b border-border/60 px-4 py-2 text-xs text-destructive"
        >
          {error} File names and line counts are still available.
        </p>
      ) : null}
      {files.map((file, index) => (
        <DiffFile key={file.path} file={file} initiallyOpen={index === 0} />
      ))}
    </div>
  )
}
