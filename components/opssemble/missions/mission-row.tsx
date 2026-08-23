import Link from "next/link"
import { ChevronRight } from "lucide-react"

import type { Mission } from "@/lib/mock-data"
import { Mono, VerdictPill } from "@/components/opssemble/kit"
import { Progress } from "@/components/ui/progress"

/**
 * Single grid template shared by the queue header (`GridHead`) and every row so
 * the columns can never drift apart.
 */
export const missionGridTemplate =
  "minmax(0,2.1fr) 0.85fr 0.85fr 0.85fr 0.6fr"

export function MissionRow({ mission }: { mission: Mission }) {
  // A flag dial-up mission has no commit of its own; its candidate is the
  // exposure step itself, so it reads as the subject rather than a change.
  const isFlagExposure = mission.candidate.startsWith("flag")
  const progress = Math.round(
    (mission.agentsComplete / mission.agentsTotal) * 100
  )

  return (
    <Link
      href={`/missions/${mission.id}`}
      style={{ gridTemplateColumns: missionGridTemplate }}
      className="ops-row group grid items-center gap-3 px-3 py-2.5"
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-baseline gap-1.5">
          {isFlagExposure ? null : (
            <Mono className="shrink-0 text-muted-foreground">
              #{mission.changeNumber}
            </Mono>
          )}
          <span className="truncate text-[12px] font-medium">
            {mission.title}
          </span>
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
          <span>contract</span>
          <Mono>v{mission.contractVersion}</Mono>
          <span aria-hidden>·</span>
          {isFlagExposure ? (
            <Mono className="truncate">{mission.candidate}</Mono>
          ) : (
            <>
              <span>candidate</span>
              <Mono>{mission.sha}</Mono>
            </>
          )}
        </div>
      </div>

      <span className="truncate text-[12px]">{mission.stage}</span>

      <div className="flex min-w-0 flex-col gap-1.5 pr-3">
        <Mono>
          {mission.agentsComplete} / {mission.agentsTotal}
        </Mono>
        <Progress
          value={progress}
          aria-label={`${mission.agentsComplete} of ${mission.agentsTotal} agents complete`}
          className="w-full"
        />
      </div>

      <div className="flex items-center">
        <VerdictPill verdict={mission.state} />
      </div>

      <div className="flex items-center justify-between gap-1">
        <Mono className="text-muted-foreground">{mission.updated}</Mono>
        <ChevronRight
          aria-hidden
          className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-100 group-hover:opacity-100"
        />
      </div>
    </Link>
  )
}
