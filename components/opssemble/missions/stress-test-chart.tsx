"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"

import { stressTestAnalysis } from "@/lib/mock-data"
import { chartTone } from "@/components/opssemble/presentation"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
  mainFinishedTps: {
    label: "Main finished",
    color: chartTone.primary,
  },
  mainSucceededTps: {
    label: "Main succeeded",
    color: chartTone.good,
  },
  mainFailedTps: {
    label: "Main failed",
    color: chartTone.bad,
  },
  candidateFinishedTps: {
    label: "Candidate finished",
    color: chartTone.primary,
  },
  candidateSucceededTps: {
    label: "Candidate succeeded",
    color: chartTone.good,
  },
  candidateFailedTps: {
    label: "Candidate failed",
    color: chartTone.bad,
  },
} satisfies ChartConfig

const chartData = stressTestAnalysis.baseline.points.map((main, index) => {
  const candidate = stressTestAnalysis.candidate.points[index]

  return {
    minute: main.minute,
    mainFinishedTps: main.finishedTps,
    mainSucceededTps: main.succeededTps,
    mainFailedTps: main.failedTps,
    candidateFinishedTps: candidate?.finishedTps ?? null,
    candidateSucceededTps: candidate?.succeededTps ?? null,
    candidateFailedTps: candidate?.failedTps ?? null,
  }
})

const SERIES: readonly {
  dataKey: keyof typeof chartConfig
  strokeWidth: number
  strokeDasharray?: string
}[] = [
  {
    dataKey: "mainFinishedTps",
    strokeWidth: 2,
  },
  {
    dataKey: "mainSucceededTps",
    strokeWidth: 1.5,
  },
  {
    dataKey: "mainFailedTps",
    strokeWidth: 1.5,
  },
  {
    dataKey: "candidateFinishedTps",
    strokeWidth: 2,
    strokeDasharray: "6 4",
  },
  {
    dataKey: "candidateSucceededTps",
    strokeWidth: 1.5,
    strokeDasharray: "6 4",
  },
  {
    dataKey: "candidateFailedTps",
    strokeWidth: 1.5,
    strokeDasharray: "6 4",
  },
]

export function StressTestChart() {
  return (
    <div className="min-w-0">
      <div className="mb-2">
        <h4 className="text-xs font-medium">Main vs candidate throughput</h4>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Solid lines are main; dashed lines are the candidate.
        </p>
      </div>
      <ChartContainer
        aria-label="Main and candidate throughput during the stress test"
        className="aspect-auto h-72 w-full"
        config={chartConfig}
        initialDimension={{ width: 900, height: 288 }}
      >
        <LineChart
          accessibilityLayer
          data={chartData}
          margin={{ top: 4, right: 12, bottom: 0, left: -8 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="minute"
            domain={[0, 46]}
            tickFormatter={(value) => `${value}m`}
            tickLine={false}
            tickMargin={8}
            ticks={[0, 10, 20, 30, 40, 46]}
            type="number"
          />
          <YAxis
            axisLine={false}
            domain={[0, 600]}
            tickLine={false}
            tickMargin={6}
            ticks={[0, 200, 400, 600]}
            width={42}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                indicator="line"
                labelFormatter={(value) => `${value}m elapsed`}
              />
            }
            cursor={{ stroke: "var(--border)" }}
          />
          <ChartLegend
            content={
              <ChartLegendContent className="flex-wrap gap-x-3 gap-y-1 pt-2 text-[10px]" />
            }
          />
          {SERIES.map((series) => (
            <Line
              activeDot={{ r: 3 }}
              dataKey={series.dataKey}
              dot={false}
              isAnimationActive={false}
              key={series.dataKey}
              stroke={`var(--color-${series.dataKey})`}
              strokeDasharray={series.strokeDasharray}
              strokeWidth={series.strokeWidth}
              type="linear"
            />
          ))}
        </LineChart>
      </ChartContainer>
    </div>
  )
}
