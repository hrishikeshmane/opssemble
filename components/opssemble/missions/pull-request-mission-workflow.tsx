"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import {
  ActivityIcon,
  CheckIcon,
  ChevronDownIcon,
  EyeIcon,
  FlaskConicalIcon,
  GaugeIcon,
  PlusIcon,
  WorkflowIcon,
} from "lucide-react"

import type {
  PullRequestMission,
  PullRequestMissionAgent,
  PullRequestMissionAgentKey,
} from "@/lib/projects/pull-request-mission"
import { cn } from "@/lib/utils"
import { MetaLine, tone } from "@/components/opssemble/presentation"
import { Section, SectionHeading } from "@/components/opssemble/layout"
import { StatusGlyph } from "@/components/opssemble/missions/stage-rail"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
  InputGroupText,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"

const AGENT_ICON: Record<PullRequestMissionAgentKey, LucideIcon> = {
  impact: ActivityIcon,
  "stress-test": GaugeIcon,
  chaos: FlaskConicalIcon,
  "watch-arm": EyeIcon,
}

const AGENT_STATUS = {
  completed: { label: "Report ready", status: "ok" },
  running: { label: "Running", status: "running" },
  queued: { label: "Queued", status: "queued" },
} as const

function AgentReport({
  agent,
  instructions,
  instruction,
  onInstructionChange,
  onInstructionSubmit,
}: {
  agent: PullRequestMissionAgent
  instructions: string[]
  instruction: string
  onInstructionChange: (value: string) => void
  onInstructionSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className="flex flex-col gap-3 px-3 pb-3">
      <Separator />
      <div>
        <h3 className="text-xs font-medium">{agent.reportTitle}</h3>
        <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
          {agent.reportSummary}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-4">
        {agent.metrics.map((metric) => (
          <div className="min-w-0" key={metric.label}>
            <dt className="truncate text-[10px] text-muted-foreground">
              {metric.label}
            </dt>
            <dd className="truncate font-mono text-xs tabular-nums">
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>

      <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-muted-foreground">
        {agent.findings.map((finding) => (
          <li key={finding}>{finding}</li>
        ))}
        {instructions.map((customInstruction) => (
          <li className="text-foreground" key={customInstruction}>
            Custom: {customInstruction}
          </li>
        ))}
      </ul>

      {agent.acceptsInstructions ? (
        <form onSubmit={onInstructionSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="watch-instruction">
                Custom watch instruction
              </FieldLabel>
              <FieldDescription>
                Add a signal or deployment condition for this pull request.
              </FieldDescription>
              <InputGroup>
                <InputGroupTextarea
                  id="watch-instruction"
                  maxLength={240}
                  onChange={(event) =>
                    onInstructionChange(event.currentTarget.value)
                  }
                  placeholder="Example: Watch failed mission-page loads for 30 minutes"
                  value={instruction}
                />
                <InputGroupAddon align="block-end">
                  <InputGroupText>{instruction.length}/240</InputGroupText>
                  <Button
                    className="ml-auto"
                    disabled={instruction.trim().length === 0}
                    size="xs"
                    type="submit"
                  >
                    <PlusIcon data-icon="inline-start" />
                    Add instruction
                  </Button>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          </FieldGroup>
        </form>
      ) : null}
    </div>
  )
}

function AgentRow({
  agent,
  instructions,
  instruction,
  onInstructionChange,
  onInstructionSubmit,
}: {
  agent: PullRequestMissionAgent
  instructions: string[]
  instruction: string
  onInstructionChange: (value: string) => void
  onInstructionSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  const [open, setOpen] = React.useState(false)
  const Icon = AGENT_ICON[agent.key]
  const status = AGENT_STATUS[agent.status]

  return (
    <li>
      <Collapsible onOpenChange={setOpen} open={open}>
        <CollapsibleTrigger className="group/agent-trigger flex min-h-12 w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium">
              {agent.name}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {agent.headline}
            </span>
          </span>
          <span
            className={cn(
              "flex shrink-0 items-center gap-1.5 text-[11px]",
              agent.status === "completed" ? tone.good : tone.pending
            )}
          >
            <StatusGlyph status={status.status} />
            {status.label}
          </span>
          <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-150 group-aria-expanded/agent-trigger:rotate-180" />
        </CollapsibleTrigger>
        {open ? (
          <CollapsibleContent>
            <AgentReport
              agent={agent}
              instruction={instruction}
              instructions={instructions}
              onInstructionChange={onInstructionChange}
              onInstructionSubmit={onInstructionSubmit}
            />
          </CollapsibleContent>
        ) : null}
      </Collapsible>
    </li>
  )
}

export function PullRequestMissionWorkflow({
  mission,
}: {
  mission: PullRequestMission
}) {
  const [instruction, setInstruction] = React.useState("")
  const [instructions, setInstructions] = React.useState<string[]>([])

  function addInstruction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextInstruction = instruction.trim()

    if (!nextInstruction) {
      return
    }

    setInstructions((current) => [...current, nextInstruction])
    setInstruction("")
  }

  return (
    <>
      <SectionHeading
        action={
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckIcon className={cn("size-3.5", tone.good)} />
            Complete
          </span>
        }
        title="Orchestrator"
      />
      <Section>
        <div className="flex items-start gap-3">
          <WorkflowIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {mission.orchestrator.headline}
            </p>
            <p className="mt-1 max-w-4xl text-xs text-muted-foreground">
              {mission.orchestrator.rationale}
            </p>
            <MetaLine className="mt-2 flex-wrap text-xs text-muted-foreground">
              {mission.agents.map((agent) => (
                <span key={agent.key}>{agent.name}</span>
              ))}
            </MetaLine>
          </div>
        </div>
      </Section>

      <SectionHeading
        action={
          <span className="text-xs text-muted-foreground">
            Open an agent to view its report
          </span>
        }
        count={mission.agents.length}
        title="Selected agents"
      />
      <ul className="mx-4 mb-4 divide-y divide-border/60 rounded-md border border-border/60">
        {mission.agents.map((agent) => (
          <AgentRow
            agent={agent}
            instruction={instruction}
            instructions={agent.acceptsInstructions ? instructions : []}
            key={agent.key}
            onInstructionChange={setInstruction}
            onInstructionSubmit={addInstruction}
          />
        ))}
      </ul>
    </>
  )
}
