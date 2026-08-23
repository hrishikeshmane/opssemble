import { notFound } from "next/navigation"

import {
  blastRadiusReport,
  changeTimeline,
  changes,
  getChange,
  stressTestAnalysis,
  watchPlan,
} from "@/lib/mock-data"
import { ChangeDetailHeader } from "@/components/opssemble/changes/change-detail-header"
import { ChangeDetailTabs } from "@/components/opssemble/changes/change-detail-tabs"
import { ChangeTimeline } from "@/components/opssemble/changes/change-timeline"
import { BlastRadiusPanel } from "@/components/opssemble/changes/blast-radius-panel"
import { DiffViewer } from "@/components/opssemble/changes/diff-viewer"
import { StressTestPanel } from "@/components/opssemble/changes/stress-test-panel"
import { WatchPlanPanel } from "@/components/opssemble/changes/watch-plan-panel"

export function generateStaticParams() {
  return changes.map((change) => ({ id: change.id }))
}

export default async function ChangeDetailPage(
  props: PageProps<"/changes/[id]">
) {
  const { id } = await props.params
  const change = getChange(id)

  if (!change) {
    notFound()
  }

  const signalCount =
    watchPlan.existingSignals.length + watchPlan.compiledSignals.length

  return (
    // The page owns the scroll containment: the header and the tab bar hold
    // their height and the panel below them is the only thing that moves.
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      <ChangeDetailHeader change={change} />
      <ChangeDetailTabs
        // The accessory says how much coverage this plan buys, which is the one
        // number a reader on the Watch Plan tab is actually counting.
        planSummary={`${signalCount} signals · ${watchPlan.compilation.resolved} from your requirement`}
        blastSummary={`${blastRadiusReport.score.toFixed(1)}/${blastRadiusReport.maxScore} · ${blastRadiusReport.surfaceCount} surfaces`}
        filesChanged={change.filesChanged}
        additions={change.additions}
        deletions={change.deletions}
        eventCount={changeTimeline.length}
        stressSummary={`${stressTestAnalysis.baseline.breakingPointTps} TPS → ${stressTestAnalysis.candidate.breakingPointTps} TPS`}
        watchPlan={<WatchPlanPanel change={change} />}
        blastRadius={<BlastRadiusPanel />}
        stressTest={<StressTestPanel />}
        diff={<DiffViewer files={change.files} />}
        timeline={<ChangeTimeline events={changeTimeline} />}
      />
    </div>
  )
}
