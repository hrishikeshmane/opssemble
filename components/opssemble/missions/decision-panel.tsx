import { CircleX, ExternalLink } from "lucide-react"

import { decision, type AgentRun } from "@/lib/mock-data"
import {
  Label,
  Metric,
  Muted,
  Panel,
  PanelHeader,
  VerdictPill,
} from "@/components/opssemble/kit"

const verdictGrid = "minmax(0,1.1fr) 0.7fr minmax(0,2fr)"

/**
 * Evidence-backed policy decision: the outcome, the breached thresholds, every
 * agent verdict, and the root cause with links to correlated evidence.
 */
export function DecisionPanel({ runs }: { runs: readonly AgentRun[] }) {
  return (
    <div className="flex flex-col gap-3">
      <Panel className="flex items-center gap-3.5 border-warn/40 p-3">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warn-muted"
        >
          <CircleX className="size-4 text-warn" />
        </span>
        <div className="min-w-0 space-y-0.5">
          <Label>Policy decision</Label>
          <h2 className="text-[14px] leading-tight font-medium">
            {decision.outcome}
          </h2>
          <Muted>{decision.rationale}</Muted>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {decision.metrics.map((metric) => (
          <Metric
            key={metric.label}
            label={metric.label}
            value={metric.value}
            detail={metric.limit}
            status={metric.status}
          />
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(240px,1fr)]">
        <Panel>
          <PanelHeader
            title="Agent verdicts"
            meta={`${runs.length} agents`}
          />
          <div className="divide-y divide-border">
            {runs.map((run) => (
              <div
                key={run.key}
                style={{ gridTemplateColumns: verdictGrid }}
                className="grid items-center gap-3 px-3 py-2.5"
              >
                <span className="truncate text-[12px] font-medium">
                  {run.name}
                </span>
                <VerdictPill verdict={run.verdict} />
                <span className="text-[11px] text-muted-foreground">
                  {run.headline}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="flex flex-col gap-2 p-3">
          <Label>Root cause</Label>
          <h3 className="text-[12px] font-medium">
            {decision.rootCause.title}
          </h3>
          <Muted>{decision.rootCause.detail}</Muted>
          <div className="mt-1 flex flex-col divide-y divide-border border-t border-border">
            {decision.rootCause.evidence.map((item) => (
              <a
                key={item}
                href="#"
                className="ops-focus flex items-center gap-1.5 py-2 text-[12px] text-muted-foreground transition-colors duration-100 hover:text-foreground"
              >
                <span className="min-w-0 truncate">{item}</span>
                <ExternalLink aria-hidden className="size-3 shrink-0" />
              </a>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
