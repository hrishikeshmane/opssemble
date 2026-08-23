"use client"

/**
 * Diff tab. One collapsible per file with a code-review style header row
 * (path, add/remove counts, ratio bar) and a three-column line grid.
 */
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import type { ChangeFile, DiffLine } from "@/lib/mock-data"
import { EmptyState, Mono, Panel } from "@/components/opssemble/kit"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

const BAR_SEGMENTS = 5

const lineSurface: Record<DiffLine["kind"], string> = {
  add: "bg-ok-muted",
  del: "bg-fail-muted",
  ctx: "",
  meta: "bg-muted/40",
}

const lineGutter: Record<DiffLine["kind"], string> = {
  add: "+",
  del: "-",
  ctx: " ",
  meta: " ",
}

/** Five-segment bar showing the added-to-removed ratio for one file. */
function RatioBar({ added, removed }: { added: number; removed: number }) {
  const total = added + removed
  let filled = 0
  if (total > 0) {
    filled = Math.round((added / total) * BAR_SEGMENTS)
    if (added > 0 && filled === 0) filled = 1
    if (removed > 0 && filled === BAR_SEGMENTS) filled = BAR_SEGMENTS - 1
  }

  return (
    <span aria-hidden className="flex shrink-0 items-center gap-px">
      {Array.from({ length: BAR_SEGMENTS }, (_, index) => (
        <span
          key={index}
          className={cn(
            "size-1.5 rounded-[1px]",
            total === 0
              ? "bg-muted-foreground/25"
              : index < filled
                ? "bg-ok"
                : "bg-fail"
          )}
        />
      ))}
    </span>
  )
}

function FilePath({ path }: { path: string }) {
  const cut = path.lastIndexOf("/")
  const directory = cut === -1 ? "" : path.slice(0, cut + 1)
  const basename = cut === -1 ? path : path.slice(cut + 1)

  return (
    <Mono className="min-w-0 truncate text-muted-foreground">
      {directory}
      <span className="font-medium text-foreground">{basename}</span>
    </Mono>
  )
}

function DiffRow({ line }: { line: DiffLine }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[44px_44px_1fr] items-stretch",
        lineSurface[line.kind]
      )}
    >
      <span className="ops-mono border-r border-border/60 px-2 text-right text-[10px] leading-5 text-muted-foreground/60 select-none">
        {line.oldNo ?? ""}
      </span>
      <span className="ops-mono border-r border-border/60 px-2 text-right text-[10px] leading-5 text-muted-foreground/60 select-none">
        {line.newNo ?? ""}
      </span>
      <code className="ops-mono scrollbar-thin block overflow-x-auto px-2 text-[11px] leading-5 whitespace-pre">
        <span aria-hidden className="inline-block w-[1ch] text-muted-foreground">
          {lineGutter[line.kind]}
        </span>
        {line.text}
      </code>
    </div>
  )
}

export function DiffViewer({ files }: { files: ChangeFile[] }) {
  if (files.length === 0) {
    return (
      <Panel>
        <EmptyState
          title="No file diff available"
          detail="Diff collapsed for brevity in this mock."
        />
      </Panel>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {files.map((file) => (
        <Panel key={file.path} className="overflow-hidden">
          <Collapsible defaultOpen={file.hunks.length > 0}>
            <CollapsibleTrigger className="group/file ops-row flex w-full items-center gap-2 px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
              <ChevronRight
                aria-hidden
                className="size-3 shrink-0 text-muted-foreground transition-transform duration-100 group-data-[panel-open]/file:rotate-90"
              />
              <FilePath path={file.path} />
              <span className="flex-1" />
              <Mono className="text-[10px] text-ok">+{file.added}</Mono>
              <Mono className="text-[10px] text-fail">-{file.removed}</Mono>
              <RatioBar added={file.added} removed={file.removed} />
            </CollapsibleTrigger>

            <CollapsibleContent className="border-t border-border">
              {file.hunks.length === 0 ? (
                <p className="px-3 py-2 text-[11px] text-muted-foreground">
                  Diff collapsed for brevity in this mock.
                </p>
              ) : (
                file.hunks.map((hunk) => (
                  <div key={hunk.header}>
                    <div className="ops-mono border-b border-border bg-muted/40 px-3 py-1 text-[10px] text-muted-foreground">
                      {hunk.header}
                    </div>
                    {hunk.lines.map((line, index) => (
                      <DiffRow
                        key={`${line.kind}-${line.oldNo}-${line.newNo}-${index}`}
                        line={line}
                      />
                    ))}
                  </div>
                ))
              )}
            </CollapsibleContent>
          </Collapsible>
        </Panel>
      ))}
    </div>
  )
}
