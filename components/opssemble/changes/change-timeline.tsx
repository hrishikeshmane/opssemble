/**
 * Timeline tab. A single hairline spine with one node per event, coloured by
 * the actor kind that produced it.
 */
import { cn } from "@/lib/utils"
import type { Status, TimelineEvent } from "@/lib/mock-data"
import {
  Mono,
  Muted,
  Panel,
  StatusPill,
} from "@/components/opssemble/kit"

const kindStatus: Record<TimelineEvent["kind"], Status> = {
  system: "idle",
  agent: "brand",
  policy: "warn",
  human: "ok",
}

const kindDot: Record<TimelineEvent["kind"], string> = {
  system: "border-muted-foreground/50",
  agent: "border-brand",
  policy: "border-warn",
  human: "border-ok",
}

export function ChangeTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <Panel className="p-4">
      <div className="relative">
        <span
          aria-hidden
          className="absolute top-0 bottom-0 left-[7px] w-px bg-border"
        />
        <ol className="flex flex-col gap-4">
          {events.map((event) => (
            <li key={event.id} className="flex gap-3">
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 size-3.5 shrink-0 rounded-full border-2 bg-background ring-2 ring-background",
                  kindDot[event.kind]
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <Mono className="text-[10px] text-muted-foreground">
                    {event.at}
                  </Mono>
                  <span className="text-[12px] font-medium">{event.actor}</span>
                  <div className="flex-1" />
                  <StatusPill status={kindStatus[event.kind]} dot={false}>
                    <span className="capitalize">{event.kind}</span>
                  </StatusPill>
                </div>
                <p className="mt-0.5 text-[12px] leading-snug">{event.title}</p>
                {event.detail ? (
                  <Muted className="mt-0.5 text-[11px] leading-snug">
                    {event.detail}
                  </Muted>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Panel>
  )
}
