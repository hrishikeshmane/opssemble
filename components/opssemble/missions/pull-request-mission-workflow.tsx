"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { Streamdown } from "streamdown"
import {
  ActivityIcon,
  CheckIcon,
  ChevronDownIcon,
  EyeIcon,
  FlaskConicalIcon,
  GaugeIcon,
  LoaderCircleIcon,
  PlayIcon,
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

type SpecialistId =
  | "impact-analysis"
  | "stress-test"
  | "chaos-test"
  | "watch-arm"

type SpecialistReport = {
  specialistId: SpecialistId
  status: "completed" | "failed" | "cancelled" | "timed_out"
  report: string | null
  toolsUsed: string[]
  durationMs: number
  usage: { totalTokens: number | null } | null
  error: { message: string } | null
}

type MissionRun = {
  ok: boolean
  status: "completed" | "failed" | "cancelled" | "timed_out"
  selectedAgents: SpecialistId[]
  reports: SpecialistReport[]
  summary: string | null
  error: { message: string } | null
}

const AGENT_ICON: Record<PullRequestMissionAgentKey, LucideIcon> = {
  impact: ActivityIcon,
  "stress-test": GaugeIcon,
  chaos: FlaskConicalIcon,
  "watch-arm": EyeIcon,
}

const SPECIALIST_BY_AGENT: Record<PullRequestMissionAgentKey, SpecialistId> = {
  impact: "impact-analysis",
  "stress-test": "stress-test",
  chaos: "chaos-test",
  "watch-arm": "watch-arm",
}

function AgentReport({
  agent,
  report,
  instruction,
  onInstructionChange,
  onInstructionSubmit,
}: {
  agent: PullRequestMissionAgent
  report: SpecialistReport | undefined
  instruction: string
  onInstructionChange: (value: string) => void
  onInstructionSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className="flex flex-col gap-3 px-3 pb-3">
      <Separator />
      {report?.report ? (
        <>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground">
              Agent-generated report
            </p>
            <h3 className="mt-0.5 text-sm font-medium">{agent.reportTitle}</h3>
          </div>
          <Streamdown
            className="max-w-4xl text-xs leading-5 text-muted-foreground [&_a]:text-foreground [&_h1]:text-base [&_h1]:text-foreground [&_h2]:text-sm [&_h2]:text-foreground [&_h3]:text-xs [&_h3]:text-foreground [&_li]:text-xs [&_p]:text-xs [&_td]:text-xs [&_th]:text-xs"
            mode="static"
          >
            {report.report}
          </Streamdown>
          <div>
            <h4 className="text-xs font-medium">Tool activity</h4>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-muted-foreground">
              {report.toolsUsed.map((toolName, index) => (
                <span key={`${toolName}-${index}`}>{toolName}</span>
              ))}
              <span>{(report.durationMs / 1000).toFixed(1)}s</span>
              {report.usage?.totalTokens ? (
                <span>{report.usage.totalTokens.toLocaleString()} tokens</span>
              ) : null}
            </div>
          </div>
        </>
      ) : (
        <p className="text-xs text-destructive">
          {report?.error?.message ?? "This specialist did not return a report."}
        </p>
      )}

      {agent.acceptsInstructions ? (
        <form onSubmit={onInstructionSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="watch-instruction">
                Custom watch instruction
              </FieldLabel>
              <FieldDescription>
                Add an instruction and rerun the agents with this context.
              </FieldDescription>
              <InputGroup>
                <InputGroupTextarea
                  id="watch-instruction"
                  maxLength={240}
                  onChange={(event) =>
                    onInstructionChange(event.currentTarget.value)
                  }
                  placeholder="Watch failed mission-page loads for 30 minutes"
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
                    Run with instruction
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
  report,
  running,
  instruction,
  onInstructionChange,
  onInstructionSubmit,
  onOpen,
}: {
  agent: PullRequestMissionAgent
  report: SpecialistReport | undefined
  running: boolean
  instruction: string
  onInstructionChange: (value: string) => void
  onInstructionSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onOpen: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const Icon = AGENT_ICON[agent.key]

  return (
    <li>
      <Collapsible
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (nextOpen) onOpen()
        }}
        open={open}
      >
        <CollapsibleTrigger className="group/agent-trigger flex min-h-12 w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium">
              {agent.name}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {report?.report
                ? "Agent report ready"
                : running
                  ? "Agent is running"
                  : "Open to run this mission"}
            </span>
          </span>
          <span
            className={cn(
              "flex shrink-0 items-center gap-1.5 text-[11px]",
              report?.status === "completed" ? tone.good : tone.pending
            )}
          >
            <StatusGlyph
              status={
                report?.status === "completed"
                  ? "ok"
                  : running
                    ? "running"
                    : "queued"
              }
            />
            {report?.status === "completed"
              ? "Report ready"
              : running
                ? "Running"
                : "Ready"}
          </span>
          <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-150 group-aria-expanded/agent-trigger:rotate-180" />
        </CollapsibleTrigger>
        {open ? (
          <CollapsibleContent>
            {running && !report ? (
              <div className="flex items-center gap-2 px-3 pb-3 text-xs text-muted-foreground">
                <LoaderCircleIcon className="size-3.5 animate-spin" />
                Orchestrator and specialist agents are running...
              </div>
            ) : report ? (
              <AgentReport
                agent={agent}
                instruction={instruction}
                onInstructionChange={onInstructionChange}
                onInstructionSubmit={onInstructionSubmit}
                report={report}
              />
            ) : null}
          </CollapsibleContent>
        ) : null}
      </Collapsible>
    </li>
  )
}

export function PullRequestMissionWorkflow({
  mission,
  projectId,
  pullRequestNumber,
}: {
  mission: PullRequestMission
  projectId: string
  pullRequestNumber: number
}) {
  const [instruction, setInstruction] = React.useState("")
  const [run, setRun] = React.useState<MissionRun | null>(null)
  const [running, setRunning] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const runMission = React.useCallback(
    async (customInstructions = instruction.trim()) => {
      if (running) return
      setRunning(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/projects/${projectId}/pulls/${pullRequestNumber}/mission`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customInstructions: customInstructions || undefined,
            }),
          }
        )
        const result = (await response.json()) as MissionRun

        if (!response.ok || !result.ok) {
          throw new Error(
            result.error?.message ?? "The agent mission could not complete."
          )
        }

        setRun(result)
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "The agent mission could not complete."
        )
      } finally {
        setRunning(false)
      }
    },
    [instruction, projectId, pullRequestNumber, running]
  )

  function submitInstruction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void runMission(instruction.trim())
  }

  return (
    <>
      <SectionHeading
        action={
          <Button
            disabled={running}
            onClick={() => void runMission()}
            size="xs"
            variant="outline"
          >
            {running ? (
              <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
            ) : run ? (
              <PlayIcon data-icon="inline-start" />
            ) : (
              <WorkflowIcon data-icon="inline-start" />
            )}
            {running ? "Running agents" : run ? "Run again" : "Run mission"}
          </Button>
        }
        title="Orchestrator"
      />
      <Section>
        <div className="flex items-start gap-3">
          <WorkflowIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {running
                ? "Selecting and running specialist agents"
                : run
                  ? `Completed ${run.reports.length} specialist reports`
                  : mission.orchestrator.headline}
            </p>
            <p className="mt-1 max-w-4xl whitespace-pre-wrap text-xs text-muted-foreground">
              {error ?? run?.summary ?? mission.orchestrator.rationale}
            </p>
            <MetaLine className="mt-2 flex-wrap text-xs text-muted-foreground">
              {mission.agents.map((agent) => (
                <span key={agent.key}>{agent.name}</span>
              ))}
            </MetaLine>
          </div>
          {run?.ok ? (
            <CheckIcon className={cn("ml-auto size-3.5 shrink-0", tone.good)} />
          ) : null}
        </div>
      </Section>

      <SectionHeading
        action={
          <span className="text-xs text-muted-foreground">
            Open an agent to run and view reports
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
            key={agent.key}
            onInstructionChange={setInstruction}
            onInstructionSubmit={submitInstruction}
            onOpen={() => {
              if (!run && !running) void runMission()
            }}
            report={run?.reports.find(
              (report) => report.specialistId === SPECIALIST_BY_AGENT[agent.key]
            )}
            running={running}
          />
        ))}
      </ul>
    </>
  )
}
