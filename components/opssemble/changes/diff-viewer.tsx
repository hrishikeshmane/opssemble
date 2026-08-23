"use client"

/**
 * The Diff tab. One collapsible per file, opened when it has hunks to show.
 *
 * There is no ratio bar. `+46 -18` already says which way the file went, and a
 * five-segment bar beside it said it again in colour that belongs to a status.
 *
 * The open state is held here rather than left to the collapsible so the chevron
 * can swap glyph -- a rotating chevron animates a shape into a shape that means
 * something else -- and so a closed file's lines unmount instead of hiding.
 */
import * as React from "react"
import { ChevronDownIcon, ChevronRightIcon, FileDiffIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { ChangeFile, DiffLine } from "@/lib/mock-data"
import { DiffStat } from "@/components/opssemble/presentation"
import { EmptyLine, EmptyPanel } from "@/components/opssemble/layout"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

/** Added and removed lines are tinted; context is left alone so it recedes. */
const LINE_SURFACE: Record<DiffLine["kind"], string> = {
  add: "bg-emerald-500/10",
  del: "bg-red-500/10",
  ctx: "",
  meta: "",
}

const LINE_PREFIX: Record<DiffLine["kind"], string> = {
  add: "+",
  del: "-",
  ctx: " ",
  meta: " ",
}

/**
 * The directory recedes and the file name does not: a list of paths under one
 * tree is scanned by its last segment.
 */
function FilePath({ path }: { path: string }) {
  const cut = path.lastIndexOf("/")
  return (
    <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
      {cut === -1 ? null : path.slice(0, cut + 1)}
      <span className="text-foreground">{path.slice(cut + 1)}</span>
    </span>
  )
}

function DiffRow({ line }: { line: DiffLine }) {
  return (
    <div className={cn("grid grid-cols-[44px_44px_1fr]", LINE_SURFACE[line.kind])}>
      <span className="pr-2 text-right font-mono text-[11px] leading-5 text-muted-foreground/70 select-none">
        {line.oldNo ?? ""}
      </span>
      <span className="pr-2 text-right font-mono text-[11px] leading-5 text-muted-foreground/70 select-none">
        {line.newNo ?? ""}
      </span>
      <code className="font-mono text-[11px] leading-5 whitespace-pre">
        {LINE_PREFIX[line.kind]}
        {line.text}
      </code>
    </div>
  )
}

function DiffFile({ file }: { file: ChangeFile }) {
  // A file with hunks is what the reader came for; one without is a stub, and
  // opening every stub would bury the three files that carry the change.
  const [open, setOpen] = React.useState(file.hunks.length > 0)
  const Chevron = open ? ChevronDownIcon : ChevronRightIcon

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2 text-xs">
        <CollapsibleTrigger
          render={
            <Button
              size="icon-xs"
              variant="ghost"
              // The chevron sits inside a row that already highlights on hover;
              // a second surface under a 20px target reads as a stray box.
              className="rounded hover:bg-transparent"
              aria-label={`${open ? "Collapse" : "Expand"} ${file.path}`}
            />
          }
        >
          <Chevron className="size-3.5" />
        </CollapsibleTrigger>
        <FilePath path={file.path} />
        <DiffStat
          additions={file.added}
          deletions={file.removed}
          className="ml-auto font-mono text-[11px]"
        />
      </div>

      {open ? (
        <CollapsibleContent>
          {file.hunks.length === 0 ? (
            <EmptyLine>Diff collapsed for brevity in this mock.</EmptyLine>
          ) : (
            // Long lines scroll here rather than stretching the page, and the
            // gutter is reserved so a file that crosses the overflow boundary
            // does not shift its line numbers as the scrollbar arrives.
            //
            // The containment sits on the body of a file rather than on each
            // line: this box is its own horizontal scroller, so skipping it
            // cannot affect anything else's scroll width, whereas skipping
            // individual lines would drop the widest offscreen one out of the
            // measured width and make the scroller jitter. `auto` keeps the
            // height the browser last measured, so only the first pass uses the
            // estimate, and the file header above stays laid out either way.
            <div className="overflow-x-auto [contain-intrinsic-block-size:auto_180px] [content-visibility:auto] [scrollbar-gutter:stable]">
              {file.hunks.map((hunk) => (
                <div key={hunk.header}>
                  <div className="bg-muted/40 px-4 py-1 font-mono text-[11px] text-muted-foreground">
                    {hunk.header}
                  </div>
                  {hunk.lines.map((line, index) => (
                    <DiffRow
                      key={`${line.oldNo ?? "_"}:${line.newNo ?? "_"}:${index}`}
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

export function DiffViewer({ files }: { files: readonly ChangeFile[] }) {
  if (files.length === 0) {
    return (
      <EmptyPanel icon={<FileDiffIcon className="size-5" />}>
        This change has no file changes.
      </EmptyPanel>
    )
  }

  return (
    <div>
      {files.map((file) => (
        <DiffFile key={file.path} file={file} />
      ))}
    </div>
  )
}
