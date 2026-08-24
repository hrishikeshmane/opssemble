"use client"

/**
 * One agent's work on a mission: a headline that fits a scan, and the tool calls
 * and measurements behind it a click away.
 *
 * A run is a discrete authored object -- an agent's report -- so it takes the
 * bordered surface a comment takes. The border stays neutral: the glyph and the
 * verdict word are already the two readings of the outcome this card is allowed,
 * and a toned border would make three.
 */
import * as React from "react"

import { cn } from "@/lib/utils"
import type { AgentRun, ToolCall } from "@/lib/mock-data"
import { Card, MetaRow } from "@/components/opssemble/layout"
import {
  VerdictIcon,
  VerdictWord,
  tone,
} from "@/components/opssemble/presentation"
import { statusToneClassName } from "@/components/opssemble/missions/stage-rail"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

/**
 * A tool call's own vocabulary, which is not the mission `Status` union: a call
 * is completed rather than ok, and failed rather than fail. Same tones, so the
 * two never disagree about what green means.
 */
const TOOL_TONE = {
  completed: tone.good,
  running: tone.pending,
  queued: tone.absent,
  failed: tone.bad,
} as const satisfies Record<ToolCall["status"], string>

function ToolCallRow({ call }: { call: ToolCall }) {
  return (
    <li>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "shrink-0 text-[10px] font-medium lowercase",
            TOOL_TONE[call.status]
          )}
        >
          {call.status}
        </span>
        <span className="min-w-0 truncate font-mono text-xs">{call.name}</span>
        {/* A queued call has not spent any time yet. The mock carries "--" for
            it, and printing that reads as a duration we failed to measure. */}
        {call.duration === "--" ? null : (
          <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums">
            {call.duration}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{call.summary}</p>
      {/* Input before output, unlabelled: the pair reads as a call and what came
          back from it, and two words of chrome per call would outweigh them. */}
      {call.input ? (
        <pre className="mt-1 overflow-x-auto rounded border border-border/60 bg-muted/40 p-2 font-mono text-[10px]">
          {call.input}
        </pre>
      ) : null}
      {call.output ? (
        <pre className="mt-1 overflow-x-auto rounded border border-border/60 bg-muted/40 p-2 font-mono text-[10px]">
          {call.output}
        </pre>
      ) : null}
    </li>
  )
}

export function AgentRunCard({
  run,
  defaultOpen = false,
}: {
  run: AgentRun
  defaultOpen?: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)

  return (
    <li>
      <Card
        className={cn(
          "p-0",
          // Skipped offscreen only while collapsed. An open card is nothing like
          // the intrinsic hint tall, and reporting the hint for one would make
          // the scrollbar lie as soon as it scrolled out of view.
          !open &&
            "[contain-intrinsic-block-size:44px] [content-visibility:auto]"
        )}
      >
        <Collapsible onOpenChange={setOpen} open={open}>
          {/* The whole head is the control. No chevron: the verdict word holds
              the right edge, and a second glyph there would compete with it. */}
          <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring">
            <VerdictIcon verdict={run.verdict} />
            <span className="shrink-0 text-xs font-medium">{run.name}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {run.headline}
            </span>
            <VerdictWord className="text-[11px]" verdict={run.verdict} />
          </CollapsibleTrigger>

          {/* Unmounted rather than hidden while collapsed, so a card that nobody
              opened costs nothing to render. */}
          {open ? (
            <CollapsibleContent className="px-3 pb-3">
              <div className="border-t border-border/60 pt-2">
                {/* The claim, then what it found. Read in that order the pair is
                    an argument; reversed it is two unrelated sentences. */}
                {run.hypothesis ? (
                  <p className="text-xs text-muted-foreground">
                    {run.hypothesis}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {run.detail}
                </p>

                <ol className="mt-2 space-y-2">
                  {run.toolCalls.map((call) => (
                    <ToolCallRow call={call} key={call.id} />
                  ))}
                </ol>

                <div className="mt-2 border-t border-border/60 pt-1">
                  {run.observations.map((observation) => (
                    <MetaRow key={observation.label} label={observation.label}>
                      {/* The tone lands on the measurement, not on its name: it
                          is the number that breached, not the thing measured. */}
                      <span
                        className={cn(
                          "font-mono tabular-nums",
                          statusToneClassName(observation.status)
                        )}
                      >
                        {observation.value}
                      </span>
                    </MetaRow>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          ) : null}
        </Collapsible>
      </Card>
    </li>
  )
}
