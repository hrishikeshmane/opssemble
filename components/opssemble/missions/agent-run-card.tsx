"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import type { AgentRun, ToolCall } from "@/lib/mock-data"
import {
  Label,
  Mono,
  Muted,
  Panel,
  Row,
  Rows,
  StatusDot,
  VerdictPill,
  verdictStatus,
} from "@/components/opssemble/kit"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

const toolStatusText: Record<ToolCall["status"], string> = {
  completed: "text-ok",
  running: "text-brand",
  queued: "text-muted-foreground",
  failed: "text-fail",
}

const toolStatusDot: Record<ToolCall["status"], string> = {
  completed: "bg-ok",
  running: "bg-brand",
  queued: "bg-muted-foreground/40",
  failed: "bg-fail",
}

function ToolPayload({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <div className="ops-mono rounded border border-border bg-muted/40 p-2 text-[10px] break-all">
        {value}
      </div>
    </div>
  )
}

function ToolCallItem({ call }: { call: ToolCall }) {
  return (
    <li className="relative">
      <span
        aria-hidden
        className={cn(
          "absolute top-1.5 -left-[19px] size-1.5 rounded-full",
          toolStatusDot[call.status]
        )}
      />
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className={cn("ops-label", toolStatusText[call.status])}>
          {call.status}
        </span>
        <Mono className="font-medium">{call.name}</Mono>
        <Mono className="text-[10px] text-muted-foreground">
          {call.duration}
        </Mono>
      </div>
      <p className="mt-0.5 text-[12px] text-muted-foreground">{call.summary}</p>
      {call.input || call.output ? (
        <div className="mt-1.5 flex flex-col gap-1.5">
          {call.input ? <ToolPayload label="Input" value={call.input} /> : null}
          {call.output ? (
            <ToolPayload label="Output" value={call.output} />
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

/**
 * One agent run: collapsed it is a single scan line; expanded it exposes the
 * hypothesis, the tool timeline, and the live observations.
 */
export function AgentRunCard({ run }: { run: AgentRun }) {
  const [open, setOpen] = React.useState(false)
  const isRunning = run.verdict === "running"

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Panel className={cn("overflow-hidden", isRunning && "border-brand/40")}>
        <CollapsibleTrigger
          className={cn(
            "ops-row ops-focus flex w-full items-start gap-2.5 px-3 py-2.5 text-left",
            open && "border-b border-border"
          )}
        >
          <StatusDot
            status={verdictStatus[run.verdict]}
            pulse={isRunning}
            className="mt-1.5"
          />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium">{run.name}</div>
            <p className="text-[11px] text-muted-foreground">{run.headline}</p>
          </div>
          <VerdictPill verdict={run.verdict} />
          <ChevronDown
            aria-hidden
            className={cn(
              "mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform duration-100",
              open && "rotate-180"
            )}
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="flex flex-col gap-3 px-3 py-3">
            <Muted>{run.detail}</Muted>

            {run.hypothesis ? (
              <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/30 px-3 py-2">
                <Label>Hypothesis</Label>
                <p className="text-[12px]">{run.hypothesis}</p>
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label>Tool activity</Label>
              <ol className="ml-[3px] flex flex-col gap-3 border-l border-border pl-4">
                {run.toolCalls.map((call) => (
                  <ToolCallItem key={call.id} call={call} />
                ))}
              </ol>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Observations</Label>
              <Panel>
                <Rows>
                  {run.observations.map((observation) => (
                    <Row
                      key={observation.label}
                      label={observation.label}
                      value={observation.value}
                      status={observation.status}
                    />
                  ))}
                </Rows>
              </Panel>
            </div>
          </div>
        </CollapsibleContent>

        {run.latestTool && !open ? (
          <div className="border-t border-border px-3 py-2">
            <Mono className="text-[10px] text-muted-foreground">
              {run.latestTool}
            </Mono>
          </div>
        ) : null}
      </Panel>
    </Collapsible>
  )
}
