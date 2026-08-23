import type { Metadata } from "next"

import { missions } from "@/lib/mock-data"
import {
  EmptyLine,
  PageBody,
  PageHeader,
} from "@/components/opssemble/layout"
import { MissionRow } from "@/components/opssemble/missions/mission-row"

export const metadata: Metadata = {
  title: "Release Missions",
}

/**
 * The mission queue.
 *
 * No filter chips, no column header and no metric cards: the rows are few and
 * each one already says its stage and its progress, so a strip of counts above
 * them would restate the list rather than summarise it. Filtering, when it
 * exists, belongs behind a single trigger in the header.
 */
export default function MissionsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        subtitle="Every execution created from an armed contract"
        title="Release Missions"
      />

      <PageBody>
        {/* The list holds the outer gutter and each row holds its own inset, so
            a row's hover fill stops short of the page edge. */}
        <ul className="px-2 py-2">
          {missions.map((mission) => (
            <MissionRow key={mission.id} mission={mission} />
          ))}
        </ul>

        {/* Why the same change appears twice in the list above. It is a footnote
            about the list, so it takes the seam that separates it from one. */}
        <EmptyLine className="border-t border-border/60">
          A single Release Contract can create multiple rows as a change moves
          through deployment and feature exposure.
        </EmptyLine>
      </PageBody>
    </div>
  )
}
