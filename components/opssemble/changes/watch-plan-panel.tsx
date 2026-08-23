/**
 * The Watch Plan tab: what will be watched, by whom, and against what limits.
 *
 * Sections rather than cards, and no right rail. The facts at the top are a
 * label/value stack because that is what they are; boxing them would have made
 * four surfaces out of four sentences. Agents and signals are lists, so they get
 * a heading with a count and rows under it.
 *
 * Nothing here carries a Required/Proposed pill or an origin badge. The lock and
 * the switch are the distinction between a required agent and a proposed one,
 * and the sparkle is the distinction between a signal policy asked for and one
 * compiled from the author's own sentence.
 */
import { LockIcon, SparklesIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  type Change,
  type PlanAgent,
  type Signal,
  watchPlan,
} from "@/lib/mock-data"
import { MetaLine, tone } from "@/components/opssemble/presentation"
import {
  Chip,
  MetaRow,
  Section,
  SectionHeading,
} from "@/components/opssemble/layout"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { RequirementCompiler } from "@/components/opssemble/changes/requirement-compiler"

/**
 * Shared row shape for the two lists. `content-visibility` is here because these
 * are repeating rows and every one of them is exactly 28px tall -- 16px of line
 * box inside 12px of padding -- so the intrinsic hint is the real height rather
 * than a guess, and a skipped row cannot move the scrollbar.
 */
const ROW =
  "group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs [contain-intrinsic-block-size:28px] [content-visibility:auto] hover:bg-accent/60"

function AgentRow({ agent }: { agent: PlanAgent }) {
  return (
    <div className={ROW}>
      <span className="shrink-0 font-medium">{agent.name}</span>
      <span className="min-w-0 flex-1 truncate text-muted-foreground">
        {agent.reason}
      </span>
      {agent.selection === "required" ? (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
            <LockIcon
              role="img"
              aria-label="Required by policy"
              className="size-3 text-muted-foreground"
            />
          </TooltipTrigger>
          <TooltipContent>Required by policy</TooltipContent>
        </Tooltip>
      ) : (
        // A proposed agent is on unless somebody has taken it out, so the switch
        // opens checked and an excluded one is the same control turned off.
        <Switch
          size="sm"
          defaultChecked={agent.selection !== "excluded"}
          aria-label={`Include the ${agent.name} agent`}
          className="shrink-0"
        />
      )}
    </div>
  )
}

function SignalRow({ signal }: { signal: Signal }) {
  const compiled = signal.origin !== "policy"
  return (
    <div className={ROW}>
      <span className="shrink-0 font-medium">{signal.name}</span>
      <span className="min-w-0 flex-1 truncate text-muted-foreground">
        {signal.provider}
      </span>
      <Tooltip>
        {/* The threshold is the condition abbreviated, so the sentence it stands
            for is a tooltip rather than a second column nobody reads twice. */}
        <TooltipTrigger
          render={<span className="shrink-0 font-mono tabular-nums" />}
        >
          {signal.threshold}
        </TooltipTrigger>
        <TooltipContent>{signal.condition}</TooltipContent>
      </Tooltip>
      {/* The slot is always reserved. A mixed list of compiled and policy
          signals would otherwise ladder its right edge by the width of one
          glyph, which reads as a mistake rather than as a distinction. */}
      <span className="flex size-3 shrink-0 items-center justify-center">
        {compiled ? (
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <SparklesIcon
                role="img"
                aria-label="Resolved from your requirement"
                className={cn("size-3", tone.good)}
              />
            </TooltipTrigger>
            <TooltipContent>Resolved from your requirement</TooltipContent>
          </Tooltip>
        ) : null}
      </span>
    </div>
  )
}

export function WatchPlanPanel({ change }: { change: Change }) {
  const signals = [...watchPlan.existingSignals, ...watchPlan.compiledSignals]

  return (
    <>
      <Section>
        <MetaRow label="Trigger">
          <MetaLine>
            <span className="shrink-0">{watchPlan.trigger}</span>
            <span className="min-w-0 truncate text-muted-foreground">
              {watchPlan.triggerDetail}
            </span>
          </MetaLine>
        </MetaRow>

        <MetaRow label="Impact">
          <span className="block min-w-0">
            {change.impact.headline}
            <span className="mt-0.5 block text-muted-foreground">
              {change.impact.detail}
            </span>
          </span>
        </MetaRow>

        <MetaRow label="Risk factors">
          {/* The chip's own width cap is lifted here: these are short sentences
              rather than labels, and a capped chip wraps its text inside a
              rounded-full outline, which reads as a broken pill. */}
          <span className="flex min-w-0 flex-wrap gap-1.5">
            {change.riskReasons.map((reason) => (
              <Chip key={reason} className="max-w-none">
                {reason}
              </Chip>
            ))}
          </span>
        </MetaRow>

        <MetaRow label="Sources">
          {/* The label is what a reader acts on; the detail behind it is either
              the diff stat the header already shows or a file list too long for
              the row, so it rides in a tooltip. */}
          <MetaLine className="text-muted-foreground">
            {change.sources.map((source) => (
              <Tooltip key={source.label}>
                <TooltipTrigger render={<span className="shrink-0" />}>
                  {source.label}
                </TooltipTrigger>
                <TooltipContent>{source.detail}</TooltipContent>
              </Tooltip>
            ))}
          </MetaLine>
        </MetaRow>
      </Section>

      <SectionHeading title="Agents" count={watchPlan.agents.length} />
      <div className="px-4 pb-4">
        {watchPlan.agents.map((agent) => (
          <AgentRow key={agent.key} agent={agent} />
        ))}
      </div>

      <SectionHeading title="Signals and guardrails" count={signals.length} />
      <div className="px-4 pb-4">
        {signals.map((signal) => (
          <SignalRow key={signal.id} signal={signal} />
        ))}
      </div>

      <RequirementCompiler
        draft={watchPlan.requirementDraft}
        resolved={watchPlan.compilation.resolved}
        unresolved={watchPlan.compilation.unresolved}
        onFailure={watchPlan.compilation.onFailure}
      />
    </>
  )
}
