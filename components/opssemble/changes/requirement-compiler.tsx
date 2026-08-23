"use client"

/**
 * Requirement compiler. Free text is compiled into provider signals and
 * thresholds; the text itself is never executed as policy. The compilation
 * result is revealed locally so the mock can demonstrate the draft -> ready
 * transition without a backend.
 */
import * as React from "react"
import { Sparkles } from "lucide-react"

import { watchPlan } from "@/lib/mock-data"
import {
  Label,
  Panel,
  PanelHeader,
  StatusPill,
} from "@/components/opssemble/kit"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function RequirementCompiler() {
  const [draft, setDraft] = React.useState<string>(watchPlan.requirementDraft)
  const [compiled, setCompiled] = React.useState(false)

  const { resolved, unresolved, coverage, onFailure } = watchPlan.compilation

  return (
    <Panel>
      <PanelHeader
        title="Add monitoring requirement"
        meta={compiled ? "Compiled" : "Draft"}
      />
      <div className="flex flex-col gap-2.5 p-3">
        <Textarea
          aria-label="Additional monitoring requirement"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            setCompiled(false)
          }}
          className="min-h-[64px] text-[12px] leading-relaxed"
        />
        <div className="flex items-center gap-3">
          <span className="min-w-0 text-[11px] text-muted-foreground">
            Custom text is never executed as policy.
          </span>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCompiled(true)}
            disabled={draft.trim().length === 0}
          >
            <Sparkles data-icon="inline-start" />
            Compile requirement
          </Button>
        </div>

        {compiled ? (
          <div className="flex flex-col gap-2 border-t border-border pt-2.5">
            <Label>Compilation result</Label>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusPill status="ok">{resolved} phrases resolved</StatusPill>
              <StatusPill status="ok">{unresolved} unresolved</StatusPill>
              <StatusPill status="idle" dot={false}>
                {coverage}
              </StatusPill>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              On failure: {onFailure}
            </p>
          </div>
        ) : null}
      </div>
    </Panel>
  )
}
