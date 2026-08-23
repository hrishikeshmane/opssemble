/**
 * The per-change blast-radius report.
 *
 * The report leads with the decision, then exposes the score inputs, the path
 * through the architecture, and the exact evidence behind each finding. Source
 * evidence gets cards because each one is a discrete authored object; the
 * analysis itself stays in hairline-separated sections.
 */
import { Fragment } from "react"
import {
  ArrowDownIcon,
  ArrowRightIcon,
  BookOpenIcon,
  FileCode2Icon,
  FileDiffIcon,
  GitPullRequestIcon,
  NetworkIcon,
  RouteIcon,
} from "lucide-react"

import {
  blastRadiusReport,
  type BlastRadiusEvidence,
  type BlastRadiusLayer,
} from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import {
  Card,
  MetaRow,
  Section,
  SectionHeading,
} from "@/components/opssemble/layout"
import {
  MetaLine,
  RiskWord,
  Sha,
  riskToneClassName,
} from "@/components/opssemble/presentation"

const LAYER_ICON = {
  "changed-code": FileCode2Icon,
  "direct-dependencies": NetworkIcon,
  "customer-operations": RouteIcon,
} as const satisfies Record<BlastRadiusLayer["id"], typeof FileCode2Icon>

const EVIDENCE_ICON = {
  diff: FileDiffIcon,
  architecture: NetworkIcon,
  runbook: BookOpenIcon,
  history: GitPullRequestIcon,
} as const satisfies Record<BlastRadiusEvidence["kind"], typeof FileDiffIcon>

function ScoreFactorRow({
  factor,
}: {
  factor: (typeof blastRadiusReport.factors)[number]
}) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 py-2 text-xs [contain-intrinsic-block-size:48px] [content-visibility:auto] hover:bg-accent/60">
      <span className="min-w-0">
        <span className="block font-medium">{factor.label}</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {factor.rationale}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-mono text-sm font-medium tabular-nums">
          {factor.score.toFixed(1)}
        </span>
        <span className="block text-[10px] text-muted-foreground">
          / {blastRadiusReport.maxScore} · {factor.weight}% weight
        </span>
      </span>
    </li>
  )
}

function ImpactLayer({
  layer,
}: {
  layer: (typeof blastRadiusReport.layers)[number]
}) {
  const Icon = LAYER_ICON[layer.id]

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-1 px-2">
        <div className="flex items-center gap-1.5">
          <Icon
            aria-hidden
            className="size-3.5 shrink-0 text-muted-foreground"
          />
          <h3 className="text-sm font-medium">{layer.label}</h3>
        </div>
        <p className="text-[11px] text-muted-foreground">{layer.detail}</p>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {layer.surfaces.map((surface) => (
          <li
            key={surface.id}
            className="rounded-md px-2 py-2 [contain-intrinsic-block-size:48px] [content-visibility:auto] hover:bg-accent/60"
          >
            <span className="block text-xs font-medium">{surface.name}</span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              {surface.detail}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function EvidenceCard({
  evidence,
}: {
  evidence: (typeof blastRadiusReport.evidence)[number]
}) {
  const Icon = EVIDENCE_ICON[evidence.kind]

  return (
    <Card>
      <div className="flex items-start gap-2">
        <Icon
          aria-hidden
          className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
        />
        <span className="min-w-0">
          <span className="block text-xs font-medium">{evidence.label}</span>
          <code className="mt-0.5 block font-mono text-[10px] break-words text-muted-foreground">
            {evidence.reference}
          </code>
          <span className="mt-2 block text-xs text-muted-foreground">
            {evidence.detail}
          </span>
        </span>
      </div>
    </Card>
  )
}

export function BlastRadiusPanel() {
  const report = blastRadiusReport

  return (
    <>
      <Section className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className="flex shrink-0 items-baseline gap-1">
            <span
              aria-label={`Blast radius score ${report.score} out of ${report.maxScore}`}
              className={cn(
                "font-mono text-base font-semibold tabular-nums",
                riskToneClassName(report.risk)
              )}
            >
              {report.score.toFixed(1)}
            </span>
            <span aria-hidden className="text-[10px] text-muted-foreground">
              /{report.maxScore}
            </span>
          </span>
          <span className="min-w-0">
            <h2 className="text-sm font-medium">{report.headline}</h2>
            <p className="mt-0.5 max-w-3xl text-xs text-muted-foreground">
              {report.detail}
            </p>
          </span>
        </div>

        <div>
          <MetaRow label="Revision">
            <span className="flex min-w-0 flex-col gap-1">
              <MetaLine>
                <span className="shrink-0 font-mono">
                  {report.candidate.branch}
                </span>
                <Sha sha={report.candidate.sha} className="shrink-0" />
              </MetaLine>
              <MetaLine className="text-muted-foreground">
                <span className="shrink-0">against</span>
                <span className="shrink-0 font-mono">
                  {report.baseline.branch}
                </span>
                <Sha sha={report.baseline.sha} className="shrink-0" />
              </MetaLine>
            </span>
          </MetaRow>
          <MetaRow label="Evidence base">{report.contextSummary}</MetaRow>
          <MetaRow label="Method">{report.method}</MetaRow>
          <MetaRow label="Generated">
            <span className="block min-w-0">
              <MetaLine>
                <span>{report.generatedAt}</span>
                <span className="tabular-nums">{report.duration}</span>
              </MetaLine>
              <span className="mt-0.5 block text-muted-foreground">
                {report.agent}
              </span>
            </span>
          </MetaRow>
        </div>
      </Section>

      <SectionHeading title="Score breakdown" count={report.factors.length} />
      <ol className="px-4 pb-4">
        {report.factors.map((factor) => (
          <ScoreFactorRow key={factor.id} factor={factor} />
        ))}
      </ol>

      <SectionHeading title="Impact path" count={report.surfaceCount} />
      <Section className="py-4">
        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
          {report.layers.map((layer, index) => (
            <Fragment key={layer.id}>
              <ImpactLayer layer={layer} />
              {index < report.layers.length - 1 ? (
                <span className="flex items-center justify-center self-center text-muted-foreground/50">
                  <ArrowDownIcon
                    aria-label="flows to"
                    role="img"
                    className="size-3.5 lg:hidden"
                  />
                  <ArrowRightIcon
                    aria-label="flows to"
                    role="img"
                    className="hidden size-3.5 lg:block"
                  />
                </span>
              ) : null}
            </Fragment>
          ))}
        </div>
      </Section>

      <SectionHeading title="Findings" count={report.findings.length} />
      <ol className="px-4 pb-4">
        {report.findings.map((finding) => (
          <li
            key={finding.id}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-md px-2 py-2 [contain-intrinsic-block-size:64px] [content-visibility:auto] hover:bg-accent/60"
          >
            <RiskWord risk={finding.risk} className="mt-0.5 w-12 text-[10px]" />
            <span className="min-w-0">
              <span className="block text-xs font-medium">{finding.title}</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                {finding.detail}
              </span>
              <code className="mt-1 block font-mono text-[10px] break-words text-muted-foreground/70">
                {finding.evidence}
              </code>
            </span>
          </li>
        ))}
      </ol>

      <SectionHeading title="Evidence" count={report.evidence.length} />
      <Section className="grid grid-cols-1 gap-3 pb-4 sm:grid-cols-2">
        {report.evidence.map((evidence) => (
          <EvidenceCard key={evidence.id} evidence={evidence} />
        ))}
      </Section>
    </>
  )
}
