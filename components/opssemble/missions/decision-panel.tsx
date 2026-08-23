/**
 * Why a mission held, and what a person can do about it.
 *
 * There is no tinted callout and no coloured disc. The one destructive glyph on
 * the heading line, and the breached numbers themselves, are the whole signal --
 * a panel that was also tinted red would say the same thing three times, and by
 * the third the reader has stopped reading it.
 *
 * The mock carries a single decision, so this takes no props: inventing one per
 * mission would suggest a shape the data does not have.
 */
import { CircleXIcon, ExternalLinkIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { decision } from "@/lib/mock-data"
import { MetaLine, tone } from "@/components/opssemble/presentation"
import {
  MetaRow,
  Section,
  SectionHeading,
} from "@/components/opssemble/layout"
import { statusToneClassName } from "@/components/opssemble/missions/stage-rail"

export function DecisionPanel() {
  return (
    <>
      <Section>
        <div className="flex items-start gap-2">
          {/* The single failing glyph on the panel. Its tone comes from the
              shared table so it cannot drift from the metrics beneath it. */}
          <CircleXIcon
            aria-hidden
            className={cn("mt-0.5 size-4 shrink-0", tone.bad)}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium">{decision.outcome}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {decision.rationale}
            </p>
          </div>
        </div>

        <div className="mt-1">
          {decision.metrics.map((metric) => (
            <MetaRow key={metric.label} label={metric.label}>
              {/* Measured value first and its limit after it, both on one line:
                  the reader is comparing two numbers, and a row apiece would
                  make them look up the second one. */}
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span
                  className={cn(
                    "font-mono tabular-nums",
                    statusToneClassName(metric.status)
                  )}
                >
                  {metric.value}
                </span>
                <span className="truncate text-muted-foreground">
                  {metric.limit}
                </span>
              </span>
            </MetaRow>
          ))}
        </div>
      </Section>

      <SectionHeading title="Root cause" />
      <Section className="pt-0">
        <p className="text-xs font-medium">{decision.rootCause.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {decision.rootCause.detail}
        </p>
        {/* Evidence lives in the providers the agents read, but the mock holds no
            addresses for it. A dead link is worse than a label, so each is plain
            text and the icon says only where the artefact is. */}
        <MetaLine className="mt-2 flex-wrap text-xs text-muted-foreground">
          {decision.rootCause.evidence.map((item) => (
            <span className="flex shrink-0 items-center gap-1.5" key={item}>
              <ExternalLinkIcon aria-hidden className="size-3 shrink-0" />
              {item}
            </span>
          ))}
        </MetaLine>
      </Section>
    </>
  )
}
