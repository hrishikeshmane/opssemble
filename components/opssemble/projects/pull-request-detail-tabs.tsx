"use client"

import * as React from "react"

import { PageBody } from "@/components/opssemble/layout"
import { DiffStat, FileCount } from "@/components/opssemble/presentation"
import { SegmentedTabs } from "@/components/opssemble/segmented-tabs"

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "checks", label: "Checks" },
  { value: "reviews", label: "Reviews" },
  { value: "commits", label: "Commits" },
  { value: "files", label: "Files" },
] as const

type TabValue = (typeof TABS)[number]["value"]

export function PullRequestDetailTabs({
  stateLabel,
  checkSummary,
  reviewCount,
  commitCount,
  fileCount,
  additions,
  deletions,
  overview,
  checks,
  reviews,
  commits,
  files,
}: {
  stateLabel: string
  checkSummary: string
  reviewCount: number
  commitCount: number
  fileCount: number
  additions: number
  deletions: number
  overview: React.ReactNode
  checks: React.ReactNode
  reviews: React.ReactNode
  commits: React.ReactNode
  files: React.ReactNode
}) {
  const [tab, setTab] = React.useState<TabValue>("overview")
  const accessory =
    tab === "overview" ? (
      <span>{stateLabel}</span>
    ) : tab === "checks" ? (
      <span>{checkSummary}</span>
    ) : tab === "reviews" ? (
      <span className="tabular-nums">
        {reviewCount.toLocaleString()}{" "}
        {reviewCount === 1 ? "review" : "reviews"}
      </span>
    ) : tab === "commits" ? (
      <span className="tabular-nums">
        {commitCount.toLocaleString()}{" "}
        {commitCount === 1 ? "commit" : "commits"}
      </span>
    ) : (
      <>
        <FileCount count={fileCount} />
        <DiffStat
          additions={additions}
          deletions={deletions}
          className="font-mono"
        />
      </>
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
      <PageBody className="[scrollbar-gutter:stable]">
        {tab === "overview" ? overview : null}
        {tab === "checks" ? checks : null}
        {tab === "reviews" ? reviews : null}
        {tab === "commits" ? commits : null}
        {tab === "files" ? files : null}
      </PageBody>
    </>
  )
}
