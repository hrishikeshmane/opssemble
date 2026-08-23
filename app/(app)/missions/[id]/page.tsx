import Link from "next/link"
import { notFound } from "next/navigation"

import {
  getMission,
  missions,
  repo,
  watchPlan,
} from "@/lib/mock-data"
import {
  ActionBar,
  EmptyState,
  Field,
  Label,
  Mono,
  PageHeader,
  Panel,
  Row,
  Rows,
  StatusPill,
  RiskBadge,
  verdictStatus,
} from "@/components/opssemble/kit"
import { AgentRunCard } from "@/components/opssemble/missions/agent-run-card"
import { DecisionPanel } from "@/components/opssemble/missions/decision-panel"
import { RepairDialog } from "@/components/opssemble/missions/repair-dialog"
import { StageRail } from "@/components/opssemble/missions/stage-rail"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

/** Guardrails shown on the mission are the armed contract's own signals. */
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

export default async function MissionPage(
  props: PageProps<"/missions/[id]">
) {
  const { id } = await props.params
  const mission = getMission(id)

  if (!mission) {
    notFound()
  }

  const stateLabel = mission.state[0].toUpperCase() + mission.state.slice(1)
  const isHeld = mission.state === "hold"

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex h-9 items-center border-b border-border px-5">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/missions" />}>
                Missions
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-1.5">
                <Mono>#{mission.changeNumber}</Mono>
                <span aria-hidden>·</span>
                <span>contract</span>
                <Mono>v{mission.contractVersion}</Mono>
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <PageHeader
        title={mission.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-1">
            <span>Candidate</span>
            <Mono>{mission.candidate}</Mono>
            <span aria-hidden>·</span>
            <span>commit</span>
            <Mono>{mission.sha}</Mono>
            <span aria-hidden>·</span>
            <span>triggered {mission.startedAgo}</span>
          </span>
        }
        actions={
          <>
            <RiskBadge risk={mission.risk} />
            <StatusPill
              status={verdictStatus[mission.state]}
              pulse={mission.state === "running"}
            >
              {stateLabel}
            </StatusPill>
          </>
        }
      />

      <div className="flex flex-1 flex-col gap-3 px-5 py-4">
        <StageRail stages={mission.stages} />

        {isHeld ? <DecisionPanel runs={mission.runs} /> : null}

        <div className="flex flex-col gap-3 lg:flex-row">
          <section className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex h-6 items-center gap-3">
              <h2 className="text-[12px] font-medium">Agent work</h2>
              <div className="flex-1" />
              <span className="ops-mono text-[11px] text-muted-foreground">
                {mission.agentsComplete} of {mission.agentsTotal} complete
              </span>
            </div>

            {mission.runs.length > 0 ? (
              mission.runs.map((run) => (
                <AgentRunCard key={run.key} run={run} />
              ))
            ) : (
              <Panel>
                <EmptyState
                  title="No agent work retained"
                  detail="This mission passed its contract and its agent runs have been archived."
                />
              </Panel>
            )}
          </section>

          <aside className="flex w-full shrink-0 flex-col gap-3 lg:sticky lg:top-4 lg:w-[280px] lg:self-start">
            <Panel className="flex flex-col gap-1.5 p-3">
              <Label>Current hypothesis</Label>
              <p className="text-[12px] leading-snug font-medium">
                {mission.hypothesis}
              </p>
            </Panel>

            <Panel>
              <div className="px-3 pt-2.5">
                <Label>Contract guardrails</Label>
              </div>
              <Rows className="mt-1.5 border-t border-border">
                {guardrails.map((signal) => (
                  <Row
                    key={signal.id}
                    label={signal.name}
                    value={signal.threshold}
                  />
                ))}
              </Rows>
            </Panel>

            <Panel className="flex flex-col gap-2.5 p-3">
              <Label>Baseline</Label>
              <Field label="Production">
                <Mono className="block truncate">{repo.productionUrl}</Mono>
                <Mono className="block text-[10px] text-muted-foreground">
                  {repo.productionDeployment}
                </Mono>
              </Field>
              <Field label="Candidate">
                <Mono className="block truncate">{mission.candidate}</Mono>
                <Mono className="block text-[10px] text-muted-foreground">
                  {mission.sha}
                </Mono>
              </Field>
            </Panel>
          </aside>
        </div>
      </div>

      {mission.state === "running" ? (
        <ActionBar
          note={
            <span className="flex flex-wrap items-center gap-1">
              <span>Mission running for</span>
              <Mono className="text-[10px]">{mission.elapsed}</Mono>
              <span aria-hidden>·</span>
              <span>holding keeps production on</span>
              <Mono className="text-[10px]">{repo.productionDeployment}</Mono>
            </span>
          }
        >
          <Button variant="outline">Ask mission</Button>
          <Button>Hold candidate</Button>
        </ActionBar>
      ) : isHeld ? (
        <ActionBar
          note={
            <span className="flex flex-wrap items-center gap-1">
              <span className="font-medium text-foreground">Next action</span>
              <span aria-hidden>·</span>
              <Mono className="text-[10px]">
                {repo.productionDeployment}
              </Mono>
              <span>
                stays in production until a repair passes contract v
                {mission.contractVersion}
              </span>
            </span>
          }
        >
          <Button variant="outline">Create Linear issue</Button>
          <Button variant="outline">Reject candidate</Button>
          <RepairDialog />
        </ActionBar>
      ) : (
        <ActionBar
          note={
            <span className="flex flex-wrap items-center gap-1">
              <span>Mission completed in</span>
              <Mono className="text-[10px]">{mission.elapsed}</Mono>
              <span aria-hidden>·</span>
              <span>production is serving this release</span>
            </span>
          }
        >
          <Button variant="outline">Ask mission</Button>
        </ActionBar>
      )}
    </div>
  )
}
