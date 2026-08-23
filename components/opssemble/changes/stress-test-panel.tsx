/**
 * The per-change sandbox stress-test analysis.
 *
 * The baseline and feature run are evidence, so they get framed charts. The
 * overview and phase comparison are sections and rows: boxing those would turn
 * one analysis into a dashboard of disconnected summaries.
 */
import { stressTestAnalysis } from "@/lib/mock-data"
import { MetaLine, Sha, VerdictIcon } from "@/components/opssemble/presentation"
import { MetaRow, Section, SectionHeading } from "@/components/opssemble/layout"
import { StressComparisonCharts } from "@/components/opssemble/changes/stress-comparison-charts"

function PhaseComparisonRow({
  phase,
}: {
  phase: (typeof stressTestAnalysis.phases)[number]
}) {
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 py-2 text-xs [contain-intrinsic-block-size:52px] [content-visibility:auto] hover:bg-accent/60">
      <VerdictIcon verdict={phase.verdict} className="size-4" />
      <span className="min-w-0">
        <span className="block truncate font-medium">{phase.label}</span>
        <MetaLine className="mt-0.5 text-[11px] text-muted-foreground">
          <span className="shrink-0">{phase.window}</span>
          <span className="min-w-0 truncate">{phase.detail}</span>
        </MetaLine>
      </span>
      <span className="shrink-0 text-right">
        <span className="flex items-center justify-end gap-1 font-mono tabular-nums">
          <span>{phase.baseline}</span>
          <span aria-label="compared with" role="img" className="opacity-50">
            &rarr;
          </span>
          <span>{phase.candidate}</span>
        </span>
        <span className="mt-0.5 block text-[10px] text-muted-foreground">
          {phase.delta}
        </span>
      </span>
    </li>
  )
}

export function StressTestPanel() {
  const { baseline, candidate } = stressTestAnalysis

  return (
    <>
      <Section>
        <div className="mb-2 flex items-start gap-2">
          <VerdictIcon
            verdict={stressTestAnalysis.verdict}
            className="mt-0.5 size-4"
          />
          <span className="min-w-0">
            <h2 className="text-sm font-medium">
              {stressTestAnalysis.headline}
            </h2>
            <p className="mt-0.5 max-w-3xl text-xs text-muted-foreground">
              {stressTestAnalysis.detail}
            </p>
          </span>
        </div>

        <MetaRow label="Baseline">
          <span className="block min-w-0">
            <MetaLine>
              <span className="shrink-0 font-mono">{baseline.branch}</span>
              <Sha sha={baseline.sha} className="shrink-0" />
              <span className="min-w-0 truncate text-muted-foreground">
                latest passing main run
              </span>
            </MetaLine>
            <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">
              {baseline.sandbox}
            </span>
          </span>
        </MetaRow>

        <MetaRow label="Feature sandbox">
          <span className="block min-w-0">
            <MetaLine>
              <span className="shrink-0 font-mono">{candidate.branch}</span>
              <Sha sha={candidate.sha} className="shrink-0" />
              <span className="min-w-0 truncate text-muted-foreground">
                isolated from production
              </span>
            </MetaLine>
            <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">
              {candidate.sandbox}
            </span>
          </span>
        </MetaRow>

        <MetaRow label="Load profile">
          <span className="block min-w-0">
            {stressTestAnalysis.loadProfile}
            <span className="mt-0.5 block text-muted-foreground">
              {stressTestAnalysis.stopCondition}
            </span>
          </span>
        </MetaRow>

        <MetaRow label="Run">
          <MetaLine>
            <span className="shrink-0">{stressTestAnalysis.startedAt}</span>
            <span className="shrink-0 tabular-nums">
              {stressTestAnalysis.duration}
            </span>
            <span className="hidden shrink-0 font-mono text-muted-foreground sm:inline">
              {stressTestAnalysis.evaluationId}
            </span>
          </MetaLine>
        </MetaRow>
      </Section>

      <StressComparisonCharts baseline={baseline} candidate={candidate} />

      <SectionHeading
        title="Phase comparison"
        count={stressTestAnalysis.phases.length}
      />
      <ul className="px-4 pb-4">
        {stressTestAnalysis.phases.map((phase) => (
          <PhaseComparisonRow key={phase.id} phase={phase} />
        ))}
      </ul>
    </>
  )
}
