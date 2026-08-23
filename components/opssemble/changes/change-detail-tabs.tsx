"use client"

/**
 * Tab shell for the change detail page. The panels are passed in as nodes so
 * every heavy surface (watch plan, diff, timeline) stays a server component and
 * only the tab selection lives on the client.
 */
import type * as React from "react"

import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export function ChangeDetailTabs({
  filesChanged,
  watchPlan,
  diff,
  timeline,
}: {
  filesChanged: number
  watchPlan: React.ReactNode
  diff: React.ReactNode
  timeline: React.ReactNode
}) {
  return (
    <Tabs defaultValue="watch-plan" className="min-w-0 flex-1 gap-0">
      <div className="border-b border-border px-5 pt-1.5 pb-1">
        <TabsList variant="line" className="px-0">
          <TabsTrigger value="watch-plan">Watch Plan</TabsTrigger>
          <TabsTrigger value="diff">
            Diff
            <Badge
              variant="secondary"
              className="ops-mono h-4 px-1.5 text-[10px]"
            >
              {filesChanged}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="watch-plan" className="px-5 py-4">
        {watchPlan}
      </TabsContent>
      <TabsContent value="diff" className="px-5 py-4">
        {diff}
      </TabsContent>
      <TabsContent value="timeline" className="px-5 py-4">
        {timeline}
      </TabsContent>
    </Tabs>
  )
}
