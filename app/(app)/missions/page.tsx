import { missions } from "@/lib/mock-data"
import { GridHead, Muted, PageHeader, Panel } from "@/components/opssemble/kit"
import { MissionFilters } from "@/components/opssemble/missions/mission-filters"
import {
  MissionRow,
  missionGridTemplate,
} from "@/components/opssemble/missions/mission-row"

const columns = ["Change / contract", "Stage", "Agents", "Verdict", "Updated"]

export default function MissionsPage() {
  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Release Missions"
        subtitle="Every execution created from an armed contract"
      >
        <MissionFilters />
      </PageHeader>

      <div className="flex flex-col gap-3 px-5 py-4">
        <Panel className="overflow-hidden">
          <GridHead columns={columns} template={missionGridTemplate} />
          <div className="divide-y divide-border">
            {missions.map((mission) => (
              <MissionRow key={mission.id} mission={mission} />
            ))}
          </div>
        </Panel>

        <Muted>
          A single Release Contract can create multiple rows as a change moves
          through deployment and feature exposure.
        </Muted>
      </div>
    </div>
  )
}
