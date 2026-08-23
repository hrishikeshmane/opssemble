"use client"

/**
 * Synchronized stress charts for the baseline and feature sandbox.
 *
 * The selected metric changes both charts together and their domains stay
 * identical. A reader can therefore compare the shape and the breakpoint
 * directly; independently autoscaled axes would make a regression look flat.
 */
import * as React from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { cn } from "@/lib/utils"
import {
  type StressMetric,
  type StressRun,
  stressTestAnalysis,
} from "@/lib/mock-data"
import { chartTone, MetaLine, Sha } from "@/components/opssemble/presentation"
import { Card, Section, SectionHeading } from "@/components/opssemble/layout"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const METRICS = [
  { value: "throughput", label: "Throughput" },
  { value: "latency", label: "Latency" },
  { value: "cpu", label: "CPU" },
] as const satisfies readonly { value: StressMetric; label: string }[]

const chartConfig = {
  finishedTps: {
    label: "Finished TPS",
    color: chartTone.primary,
  },
  succeededTps: {
    label: "Succeeded TPS",
    color: chartTone.good,
  },
  failedTps: {
    label: "Failed TPS",
    color: chartTone.bad,
  },
  breakingPointTps: {
    label: "Breaking point",
    color: chartTone.limit,
  },
  p50Ms: {
    label: "p50 latency",
    color: chartTone.muted,
  },
  p99Ms: {
    label: "p99 latency",
    color: chartTone.primary,
  },
  latencyGuardrailMs: {
    label: "p99 guardrail",
    color: chartTone.limit,
  },
  cpuPercent: {
    label: "CPU utilization",
    color: chartTone.primary,
  },
  cpuGuardrailPercent: {
    label: "Saturation guardrail",
    color: chartTone.limit,
  },
} satisfies ChartConfig

const METRIC_META = {
  throughput: {
    domain: [0, 600] as [number, number],
    ticks: [0, 200, 400, 600],
    unit: "TPS",
    ariaLabel: "throughput",
  },
  latency: {
    domain: [0, 2200] as [number, number],
    ticks: [0, 500, 1000, 1500, 2000],
    unit: "ms",
    ariaLabel: "request latency",
  },
  cpu: {
    domain: [0, 100] as [number, number],
    ticks: [0, 20, 40, 60, 80, 100],
    unit: "%",
    ariaLabel: "CPU utilization",
  },
} satisfies Record<
  StressMetric,
  {
    domain: [number, number]
    ticks: number[]
    unit: string
    ariaLabel: string
  }
>

function MetricLines({ metric }: { metric: StressMetric }) {
  if (metric === "latency") {
    return (
      <>
        <Line
          dataKey="p50Ms"
          type="linear"
          stroke="var(--color-p50Ms)"
          strokeWidth={1.5}
          isAnimationActive={false}
          dot={false}
          activeDot={{ r: 3 }}
        />
        <Line
          dataKey="p99Ms"
          type="linear"
          stroke="var(--color-p99Ms)"
          strokeWidth={2}
          isAnimationActive={false}
          dot={false}
          activeDot={{ r: 3 }}
        />
        <Line
          dataKey="latencyGuardrailMs"
          type="linear"
          stroke="var(--color-latencyGuardrailMs)"
          strokeWidth={1.5}
          strokeDasharray="5 4"
          isAnimationActive={false}
          dot={false}
          activeDot={false}
        />
      </>
    )
  }

  if (metric === "cpu") {
    return (
      <>
        <Line
          dataKey="cpuPercent"
          type="linear"
          stroke="var(--color-cpuPercent)"
          strokeWidth={2}
          isAnimationActive={false}
          dot={false}
          activeDot={{ r: 3 }}
        />
        <Line
          dataKey="cpuGuardrailPercent"
          type="linear"
          stroke="var(--color-cpuGuardrailPercent)"
          strokeWidth={1.5}
          strokeDasharray="5 4"
          isAnimationActive={false}
          dot={false}
          activeDot={false}
        />
      </>
    )
  }

  return (
    <>
      <Line
        dataKey="finishedTps"
        type="linear"
        stroke="var(--color-finishedTps)"
        strokeWidth={2}
        isAnimationActive={false}
        dot={false}
        activeDot={{ r: 3 }}
      />
      <Line
        dataKey="succeededTps"
        type="linear"
        stroke="var(--color-succeededTps)"
        strokeWidth={1.5}
        isAnimationActive={false}
        dot={false}
        activeDot={{ r: 3 }}
      />
      <Line
        dataKey="failedTps"
        type="linear"
        stroke="var(--color-failedTps)"
        strokeWidth={1.5}
        isAnimationActive={false}
        dot={false}
        activeDot={{ r: 3 }}
      />
      <Line
        dataKey="breakingPointTps"
        type="linear"
        stroke="var(--color-breakingPointTps)"
        strokeWidth={1.5}
        strokeDasharray="5 4"
        isAnimationActive={false}
        dot={false}
        activeDot={false}
      />
    </>
  )
}

function StressRunChart({
  run,
  metric,
}: {
  run: StressRun
  metric: StressMetric
}) {
  const meta = METRIC_META[metric]
  const data = run.points.map((point) => ({
    ...point,
    breakingPointTps: run.breakingPointTps,
    latencyGuardrailMs: 800,
    cpuGuardrailPercent: 80,
  }))
  const { breakingPointEndsAt, increasedLoadEndsAt, runEndsAt } =
    stressTestAnalysis.phaseBoundaries

  return (
    <Card className="min-w-0 p-0">
      <div className="flex min-w-0 items-start gap-2 border-b border-border/60 px-3 py-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium">{run.branch}</h3>
          <MetaLine className="mt-0.5 text-[10px] text-muted-foreground">
            <span className="shrink-0">{run.role}</span>
            <Sha sha={run.sha} className="shrink-0" />
          </MetaLine>
        </div>
        <span className="shrink-0 text-right">
          <span className="block font-mono text-sm font-medium tabular-nums">
            {run.breakingPointTps.toLocaleString()} TPS
          </span>
          <span className="block text-[10px] text-muted-foreground">
            breaking point
          </span>
        </span>
      </div>

      <div className="px-2 pt-3 pb-2">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-64 w-full"
          initialDimension={{ width: 480, height: 256 }}
          aria-label={`${run.branch} ${meta.ariaLabel} during the stress test`}
        >
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ top: 4, right: 8, bottom: 0, left: -10 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="minute"
              type="number"
              domain={[0, runEndsAt]}
              ticks={[0, 10, 20, 30, 40, 46]}
              tickFormatter={(value) => `${value}m`}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              domain={meta.domain}
              ticks={meta.ticks}
              tickFormatter={(value) =>
                metric === "cpu" ? `${value}%` : value.toLocaleString()
              }
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              width={48}
            />
            <ChartTooltip
              cursor={{ stroke: "var(--border)" }}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(value) => `${value}m elapsed`}
                />
              }
            />
            <ChartLegend
              content={
                <ChartLegendContent className="flex-wrap gap-2 pt-2 text-[10px]" />
              }
            />
            <MetricLines metric={metric} />
          </LineChart>
        </ChartContainer>

        {/* These widths come from the shared phase boundaries. Keeping the rail
            outside SVG gives the labels room to wrap without covering data. */}
        <div
          className="mt-2 grid min-h-8 border-t border-border/60 pt-2 text-center text-[10px] text-muted-foreground"
          style={{
            gridTemplateColumns: `${breakingPointEndsAt}fr ${
              increasedLoadEndsAt - breakingPointEndsAt
            }fr ${runEndsAt - increasedLoadEndsAt}fr`,
          }}
        >
          <span className="px-1">Find break point</span>
          <span className="border-l border-border/60 px-1">Increased load</span>
          <span className="border-l border-border/60 px-1">Recovery</span>
        </div>
      </div>
    </Card>
  )
}

export function StressComparisonCharts({
  baseline,
  candidate,
}: {
  baseline: StressRun
  candidate: StressRun
}) {
  const [metric, setMetric] = React.useState<StressMetric>("throughput")

  return (
    <>
      <SectionHeading
        title="Metric charts"
        action={
          <ToggleGroup
            value={[metric]}
            onValueChange={(next) => {
              const selected = next[0] as StressMetric | undefined
              if (selected) setMetric(selected)
            }}
            spacing={1}
            aria-label="Stress test metric"
            className="shrink-0 rounded-md border border-border/60 p-[3px]"
          >
            {METRICS.map((item) => (
              <ToggleGroupItem
                key={item.value}
                value={item.value}
                size="sm"
                className="px-2 text-xs aria-pressed:bg-accent aria-pressed:text-accent-foreground"
              >
                {item.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        }
      />
      <Section className="py-4">
        <div className={cn("grid min-w-0 grid-cols-1 gap-3", "xl:grid-cols-2")}>
          <StressRunChart run={baseline} metric={metric} />
          <StressRunChart run={candidate} metric={metric} />
        </div>
      </Section>
    </>
  )
}
