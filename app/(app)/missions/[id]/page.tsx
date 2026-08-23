import Link from "next/link"
import { notFound } from "next/navigation"

import { getMission, missions, repo, watchPlan } from "@/lib/mock-data"
import {
  Chip,
  EmptyLine,
  MetaRow,
  PageBody,
  Section,
  SectionHeading,
} from "@/components/opssemble/layout"
import {
  MetaLine,
  Sha,
  verdictLabel,
  verdictToneClassName,
} from "@/components/opssemble/presentation"
import { AgentRunCard } from "@/components/opssemble/missions/agent-run-card"
import { DecisionPanel } from "@/components/opssemble/missions/decision-panel"
import { missionVerdict } from "@/components/opssemble/missions/mission-row"
import { RepairDialog } from "@/components/opssemble/missions/repair-dialog"
import { StageRail } from "@/components/opssemble/missions/stage-rail"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * The guardrails a mission is held to are the armed contract's own signals, not a
 * separate list: naming them here from the plan is what makes the two screens
 * agree about what "contract v3" means.
 */
const contractSignals = [
  ...watchPlan.compiledSignals,
  ...watchPlan.existingSignals,
]
type ContractSignal = (typeof contractSignals)[number]

const guardrails = ["eu-completion", "p99", "dupes"]
  .map((id) => contractSignals.find((signal) => signal.id === id))
  .filter((signal): signal is ContractSignal => signal !== undefined)

export function generateStaticParams() {
  return missions.map((mission) => ({ id: mission.id }))
}

export default async function MissionPage(props: PageProps<"/missions/[id]">) {
  const { id } = await props.params
  const mission = getMission(id)

  if (!mission) {
    notFound()
  }

  const verdict = missionVerdict(mission.state)
  const isHeld = mission.state === "hold"

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Hand-rolled rather than `PageHeader`: the breadcrumb belongs above the
          title, and a header whose first child is its title cannot say that. */}
      <header className="shrink-0 border-b border-border/60 px-4 py-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <MetaLine className="text-xs text-muted-foreground/70">
              <Link
                className="shrink-0 rounded-sm outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                href="/missions"
              >
                Missions
              </Link>
              <span className="shrink-0 tabular-nums">
                #{mission.changeNumber}
              </span>
              <span className="shrink-0">
                contract v{mission.contractVersion}
              </span>
            </MetaLine>

            <h1 className="mt-1 truncate text-base leading-snug font-semibold">
              {mission.title}
            </h1>

            <MetaLine className="mt-1 text-xs text-muted-foreground">
              {/* The state, spent once and spent here: the tone sits on the
                  mission's own id rather than on a pill, and the tooltip is what
                  makes an unfamiliar colour decodable. */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      aria-label={`${verdictLabel(verdict)} mission ${mission.id}`}
                      className={cn(
                        "shrink-0 font-mono font-medium",
                        verdictToneClassName(verdict)
                      )}
                      role="img"
                    />
                  }
                >
                  {mission.id}
                </TooltipTrigger>
                <TooltipContent>{verdictLabel(verdict)}</TooltipContent>
              </Tooltip>
              <span className="flex min-w-0 shrink-0 items-center gap-1.5">
                Candidate
                <span className="truncate font-mono">{mission.candidate}</span>
              </span>
              <Sha className="shrink-0" sha={mission.sha} />
              <span className="shrink-0">triggered {mission.startedAgo}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                {mission.state === "running" ? "running for" : "ran for"}
                <span className="font-mono tabular-nums">
                  {mission.elapsed}
                </span>
              </span>
            </MetaLine>
          </div>

          {/* Exactly one primary. While a mission runs, the consequential act is
              stopping it; once it is held, it is authorising the repair. A passed
              mission has nothing consequential left, so it gets no primary. */}
          <div className="flex h-7 shrink-0 items-center gap-1">
            {mission.state === "running" ? (
              <>
                <Button size="xs" variant="outline">
                  Ask mission
                </Button>
                <Button size="xs">Hold candidate</Button>
              </>
            ) : isHeld ? (
              <>
                <Button size="xs" variant="outline">
                  Create Linear issue
                </Button>
                <Button size="xs" variant="outline">
                  Reject candidate
                </Button>
                <RepairDialog />
              </>
            ) : (
              <Button size="xs" variant="outline">
                Ask mission
              </Button>
            )}
          </div>
        </div>
      </header>

      <StageRail stages={mission.stages} />

      <PageBody>
        {/* The decision comes before the work that produced it: a reader who
            opened a held mission wants the outcome, not the evidence trail. */}
        {isHeld ? <DecisionPanel /> : null}

        <SectionHeading
          // Omitted rather than zeroed for an archived mission: "Agent work 0"
          // reads as no agents having run rather than as runs no longer kept.
          count={mission.runs.length || undefined}
          title="Agent work"
        />
        {mission.runs.length > 0 ? (
          <ul className="space-y-2 px-4 pb-4">
            {mission.runs.map((run) => (
              <AgentRunCard key={run.key} run={run} />
            ))}
          </ul>
        ) : (
          <EmptyLine>
            This mission passed its contract and its agent runs have been
            archived.
          </EmptyLine>
        )}

        <SectionHeading title="Contract" />
        <Section className="pt-0">
          <MetaRow label="Hypothesis">{mission.hypothesis}</MetaRow>
          <MetaRow label="Guardrails">
            {/* One chip per signal, name then threshold. The threshold is the
                only monospace on the row because it is the thing a reader
                compares against a measurement two panels up. */}
            <span className="flex flex-wrap gap-1.5">
              {guardrails.map((signal) => (
                <Chip key={signal.id}>
                  <span className="truncate">{signal.name}</span>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {signal.threshold}
                  </span>
                </Chip>
              ))}
            </span>
          </MetaRow>
          <MetaRow label="Production">
            <span className="flex min-w-0 items-center gap-1.5 font-mono">
              <span className="truncate">{repo.productionUrl}</span>
              <span className="shrink-0 text-muted-foreground">
                {repo.productionDeployment}
              </span>
            </span>
          </MetaRow>
          <MetaRow label="Candidate">
            <span className="flex min-w-0 items-center gap-1.5 font-mono">
              <span className="truncate">{mission.candidate}</span>
              <Sha className="shrink-0 text-muted-foreground" sha={mission.sha} />
            </span>
          </MetaRow>
        </Section>
      </PageBody>
    </div>
  )
}
