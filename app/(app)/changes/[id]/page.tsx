import { notFound } from "next/navigation"

import { changeTimeline, changes, getChange, watchPlan } from "@/lib/mock-data"
import { ActionBar } from "@/components/opssemble/kit"
import { Button } from "@/components/ui/button"
import { ChangeDetailHeader } from "@/components/opssemble/changes/change-detail-header"
import { ChangeDetailTabs } from "@/components/opssemble/changes/change-detail-tabs"
import { ChangeTimeline } from "@/components/opssemble/changes/change-timeline"
import { DiffViewer } from "@/components/opssemble/changes/diff-viewer"
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

  // The plan under edit carries the next contract version; the change record
  // still holds the last armed one.
  const contractVersion =
    watchPlan.changeId === change.id
      ? watchPlan.contractVersion
      : change.contractVersion

  return (
    <div className="flex min-h-full flex-col">
      <ChangeDetailHeader change={change} contractVersion={contractVersion} />

      <ChangeDetailTabs
        filesChanged={change.filesChanged}
        watchPlan={<WatchPlanPanel change={change} />}
        diff={<DiffViewer files={change.files} />}
        timeline={<ChangeTimeline events={changeTimeline} />}
      />

      <ActionBar
        note={`Arming freezes contract v${contractVersion}. Later edits create v${contractVersion + 1}.`}
      >
        <Button variant="ghost">Reject</Button>
        <Button variant="outline">Save draft</Button>
        <Button>Arm Watch Plan</Button>
      </ActionBar>
    </div>
  )
}
