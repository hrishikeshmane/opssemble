/**
 * The Timeline tab: what happened to this change, in order.
 *
 * The feed is capped at a reading measure and centred, because a full-width
 * event list at this type size gives lines nobody tracks to the end of.
 *
 * Markers carry no colour and no ring. The events already say what happened in
 * words, and a column of tinted dots down the left edge competed with them --
 * the icon only says which kind of actor spoke.
 */
import {
  CircleDotIcon,
  ShieldCheckIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react"

import type { TimelineEvent } from "@/lib/mock-data"
import { ActorAvatar, MetaLine } from "@/components/opssemble/presentation"
import {
  TimelineMarker,
  TimelineRow,
  TimelineSpine,
} from "@/components/opssemble/layout"

/**
 * A human is the one actor with a face, so they get their initial rather than a
 * glyph; the other three are the machine speaking in three different capacities.
 */
const KIND_ICON: Record<Exclude<TimelineEvent["kind"], "human">, LucideIcon> = {
  system: CircleDotIcon,
  agent: SparklesIcon,
  policy: ShieldCheckIcon,
}

function EventMarker({ event }: { event: TimelineEvent }) {
  if (event.kind === "human") {
    // `ActorAvatar` takes initials and shows the first character, so an actor
    // recorded as a handle is upper-cased on the way in.
    return (
      <TimelineMarker>
        <ActorAvatar initials={event.actor.toUpperCase()} />
      </TimelineMarker>
    )
  }
  const Icon = KIND_ICON[event.kind]
  return (
    <TimelineMarker>
      <Icon aria-hidden className="size-3.5" />
    </TimelineMarker>
  )
}

export function ChangeTimeline({
  events,
}: {
  events: readonly TimelineEvent[]
}) {
  return (
    <div className="px-4 py-5">
      <div className="relative mx-auto max-w-3xl">
        <TimelineSpine />
        <ul>
          {events.map((event) => (
            <TimelineRow key={event.id}>
              <EventMarker event={event} />
              <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
                <span className="font-semibold text-foreground">
                  {event.actor}
                </span>
                <span className="min-w-0 text-muted-foreground">
                  {event.title}
                </span>
              </div>
              <MetaLine className="mt-1 flex-wrap text-[11px] text-muted-foreground">
                <span className="shrink-0 tabular-nums">{event.at}</span>
                {/* Not every event has a detail, and `MetaLine` drops the
                    separator with it rather than leaving a stray dot. */}
                {event.detail ? (
                  <span className="min-w-0">{event.detail}</span>
                ) : null}
              </MetaLine>
            </TimelineRow>
          ))}
        </ul>
      </div>
    </div>
  )
}
