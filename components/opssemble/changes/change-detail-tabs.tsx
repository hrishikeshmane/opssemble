"use client"

/**
 * The tab shell for the change detail.
 *
 * Every panel arrives as a node, so the analyses, the diff and the timeline
 * stay server-rendered and only the selection lives on the client.
 *
 * Only the selected panel is mounted. Keeping the other panels around behind
 * `invisible` would preserve their scroll offsets, but invisible content is
 * still in the accessibility tree and still takes tab focus, so a reader on the
 * Watch Plan tab could tab into the diff. Losing a scroll offset is the cheaper
 * of the two.
 */
import * as React from "react"

import { DiffStat, FileCount } from "@/components/opssemble/presentation"
import { PageBody } from "@/components/opssemble/layout"
import { SegmentedTabs } from "@/components/opssemble/segmented-tabs"

const TABS = [
  { value: "watch-plan", label: "Watch Plan" },
  { value: "blast-radius", label: "Blast Radius" },
  { value: "stress-test", label: "Stress Test" },
  { value: "diff", label: "Diff" },
  { value: "timeline", label: "Timeline" },
] as const

type TabValue = (typeof TABS)[number]["value"]

export function ChangeDetailTabs({
  planSummary,
  blastSummary,
  filesChanged,
  additions,
  deletions,
  eventCount,
  stressSummary,
  watchPlan,
  blastRadius,
  stressTest,
  diff,
  timeline,
}: {
  planSummary: string
  blastSummary: string
  filesChanged: number
  additions: number
  deletions: number
  eventCount: number
  stressSummary: string
  watchPlan: React.ReactNode
  blastRadius: React.ReactNode
  stressTest: React.ReactNode
  diff: React.ReactNode
  timeline: React.ReactNode
}) {
  const [tab, setTab] = React.useState<TabValue>("watch-plan")

  // The count belongs to the tab the reader is on. A number on all three at
  // once reads as a dashboard rather than as navigation.
  const accessory =
    tab === "watch-plan" ? (
      planSummary
    ) : tab === "blast-radius" ? (
      <span className="tabular-nums">{blastSummary}</span>
    ) : tab === "stress-test" ? (
      <span className="font-mono tabular-nums">{stressSummary}</span>
    ) : tab === "diff" ? (
      <>
        <FileCount count={filesChanged} />
        <DiffStat
          additions={additions}
          deletions={deletions}
          className="font-mono"
        />
      </>
    ) : (
      <span className="tabular-nums">
        {eventCount} {eventCount === 1 ? "event" : "events"}
      </span>
    )

  return (
    <>
      <SegmentedTabs
        tabs={TABS}
        value={tab}
        onValueChange={setTab}
        accessory={accessory}
        className="shrink-0"
      />
      {/* The gutter is reserved on the scroller so that opening a diff file --
          which is what usually pushes this page past the viewport -- does not
          reflow every line to the left as the scrollbar appears. */}
      <PageBody className="[scrollbar-gutter:stable]">
        {tab === "watch-plan" ? watchPlan : null}
        {tab === "blast-radius" ? blastRadius : null}
        {tab === "stress-test" ? stressTest : null}
        {tab === "diff" ? diff : null}
        {tab === "timeline" ? timeline : null}
      </PageBody>
    </>
  )
}
