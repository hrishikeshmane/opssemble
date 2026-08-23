import { Check } from "lucide-react"

import type { MissionStage } from "@/lib/mock-data"
import {
  Label,
  Mono,
  Panel,
  StatusDot,
  StatusText,
} from "@/components/opssemble/kit"

function StageMarker({ status }: { status: MissionStage["status"] }) {
  if (status === "ok") {
    return <Check aria-hidden className="size-3 shrink-0 text-ok" />
  }
  if (status === "running") {
    return <StatusDot status="running" pulse className="mx-[3px]" />
  }
  return <StatusDot status="idle" className="mx-[3px]" />
}

/** Horizontal five-stage rail: context, plan, execute, evaluate, decision. */
export function StageRail({ stages }: { stages: readonly MissionStage[] }) {
  return (
    <Panel className="grid grid-cols-5 divide-x divide-border">
      {stages.map((stage) => (
        <div key={stage.key} className="flex flex-col gap-1.5 px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <StageMarker status={stage.status} />
            <Mono className="text-[10px] text-muted-foreground">
              {stage.index}
            </Mono>
            <Label className="truncate">{stage.label}</Label>
            <span aria-hidden className="ml-1 h-px min-w-2 flex-1 bg-border" />
          </div>
          <StatusText status={stage.status} className="text-[12px]">
            {stage.value}
          </StatusText>
        </div>
      ))}
    </Panel>
  )
}
