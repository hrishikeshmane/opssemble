/**
 * Watch Plan tab. Two columns: the editable plan on the left, and a sticky
 * right rail holding the inferred impact, the risk reasoning, and the sources
 * the inference was drawn from.
 */
import { AlertTriangle, Lock, Pencil, Plus, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Change, Signal } from "@/lib/mock-data"
import { watchPlan } from "@/lib/mock-data"
import {
  GridHead,
  Label,
  Mono,
  Muted,
  OriginBadge,
  Panel,
  PanelHeader,
  Rows,
  StatusPill,
} from "@/components/opssemble/kit"
import { Button, buttonVariants } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { RequirementCompiler } from "@/components/opssemble/changes/requirement-compiler"

const AGENT_COLUMNS = "minmax(0,128px) 84px minmax(0,1fr) 24px"
const SIGNAL_COLUMNS = "minmax(0,1fr) 84px 82px 74px"

function TitleCase({ value }: { value: string }) {
  return <>{value[0].toUpperCase() + value.slice(1)}</>
}

function SignalRow({
  signal,
  compiled = false,
}: {
  signal: Signal
  compiled?: boolean
}) {
  return (
    <div
      style={{ gridTemplateColumns: SIGNAL_COLUMNS }}
      className={cn(
        "ops-row grid items-center gap-3 py-2",
        compiled ? "border-l-2 border-ok pr-3 pl-[10px]" : "px-3"
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-[12px]">{signal.name}</span>
        {compiled ? (
          <Sparkles aria-hidden className="size-3 shrink-0 text-ok" />
        ) : null}
      </span>
      <span className="truncate text-[11px] text-muted-foreground">
        {signal.provider}
      </span>
      <Mono className="font-medium">{signal.threshold}</Mono>
      <OriginBadge origin={signal.origin} />
    </div>
  )
}

export function WatchPlanPanel({ change }: { change: Change }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Panel className="flex items-start gap-3 p-3">
          <div className="min-w-0">
            <Label>Trigger</Label>
            <div className="mt-1 text-[12px] font-medium">
              {watchPlan.trigger}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {watchPlan.triggerDetail}
            </p>
          </div>
          <div className="flex-1" />
          <Button variant="ghost" size="icon-sm" aria-label="Edit trigger">
            <Pencil />
          </Button>
        </Panel>

        <Panel>
          <PanelHeader
            title="Selected agents"
            meta={`${watchPlan.agents.length} selected`}
          />
          <Rows>
            {watchPlan.agents.map((agent) => (
              <div
                key={agent.key}
                style={{ gridTemplateColumns: AGENT_COLUMNS }}
                className="ops-row grid items-center gap-3 px-3 py-2"
              >
                <span className="truncate text-[12px] font-medium">
                  {agent.name}
                </span>
                <StatusPill
                  status={agent.selection === "required" ? "ok" : "brand"}
                  dot={false}
                >
                  <TitleCase value={agent.selection} />
                </StatusPill>
                <span className="truncate text-[12px] text-muted-foreground">
                  {agent.reason}
                </span>
                {agent.selection === "required" ? (
                  <Tooltip>
                    <TooltipTrigger
                      className={buttonVariants({
                        variant: "ghost",
                        size: "icon-xs",
                        className: "text-muted-foreground",
                      })}
                      aria-label={`${agent.name} is required by policy`}
                    >
                      <Lock />
                    </TooltipTrigger>
                    <TooltipContent>
                      Policy requires this agent. It cannot be removed.
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Switch
                    size="sm"
                    defaultChecked
                    aria-label={`Include the ${agent.name} agent`}
                  />
                )}
              </div>
            ))}
          </Rows>
        </Panel>

        <Panel>
          <PanelHeader
            title="Signals and guardrails"
            meta={`${watchPlan.existingSignals.length + watchPlan.compiledSignals.length} active`}
            action={
              <Button variant="ghost" size="icon-sm" aria-label="Add signal">
                <Plus />
              </Button>
            }
          />
          <GridHead
            columns={["Signal", "Provider", "Threshold", "Origin"]}
            template={SIGNAL_COLUMNS}
          />
          <Rows>
            {watchPlan.existingSignals.map((signal) => (
              <SignalRow key={signal.id} signal={signal} />
            ))}
            {watchPlan.compiledSignals.map((signal) => (
              <SignalRow key={signal.id} signal={signal} compiled />
            ))}
          </Rows>
        </Panel>

        <RequirementCompiler />
      </div>

      <aside className="sticky top-4 hidden w-[280px] shrink-0 flex-col gap-3 self-start lg:flex">
        <Panel className="p-3">
          <Label>Inferred impact</Label>
          <h2 className="mt-1.5 text-[13px] leading-snug font-medium">
            {change.impact.headline}
          </h2>
          <Muted className="mt-1 text-[11px]">{change.impact.detail}</Muted>
        </Panel>

        <Panel>
          <div className="px-3 pt-2.5 pb-2">
            <Label>Why {change.risk} risk</Label>
          </div>
          <Rows className="border-t border-border">
            {change.riskReasons.map((reason) => (
              <div
                key={reason}
                className="flex items-start gap-2 px-3 py-2 text-[12px]"
              >
                <AlertTriangle
                  aria-hidden
                  className="mt-0.5 size-3 shrink-0 text-warn"
                />
                <span className="min-w-0 leading-snug">{reason}</span>
              </div>
            ))}
          </Rows>
        </Panel>

        <Panel>
          <div className="px-3 pt-2.5 pb-2">
            <Label>Sources</Label>
          </div>
          <Rows className="border-t border-border">
            {change.sources.map((source) => (
              <div key={source.label} className="px-3 py-2">
                <div className="text-[12px] font-medium">{source.label}</div>
                <Mono className="text-[10px] text-muted-foreground">
                  {source.detail}
                </Mono>
              </div>
            ))}
          </Rows>
        </Panel>
      </aside>
    </div>
  )
}
