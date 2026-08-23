"use client"

/**
 * The requirement box: a sentence the author writes, compiled into signals.
 *
 * The result is deliberately not a pill. Two numbers and a sentence say what
 * happened, and the only colour spent is on the one that could have gone wrong.
 */
import * as React from "react"

import { cn } from "@/lib/utils"
import { MetaLine, tone } from "@/components/opssemble/presentation"
import { Section, SectionHeading } from "@/components/opssemble/layout"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function RequirementCompiler({
  draft,
  resolved,
  unresolved,
  onFailure,
}: {
  draft: string
  resolved: number
  unresolved: number
  onFailure: string
}) {
  const [requirement, setRequirement] = React.useState(draft)
  const [compiled, setCompiled] = React.useState(false)

  return (
    <>
      <SectionHeading title="Requirement" />
      <Section className="pt-0">
        <Textarea
          value={requirement}
          aria-label="Monitoring requirement"
          placeholder="Describe anything else that should be watched."
          onChange={(event) => {
            setRequirement(event.target.value)
            // A compilation belongs to the text that produced it. Editing the
            // sentence retires the result rather than leaving it standing over
            // words it was never run against.
            setCompiled(false)
          }}
        />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <p className="text-xs text-muted-foreground">
            Custom text is never executed as policy.
          </p>
          <Button
            size="xs"
            variant="outline"
            disabled={requirement.trim().length === 0}
            onClick={() => setCompiled(true)}
            className="ml-auto"
          >
            Compile requirement
          </Button>
        </div>

        {compiled ? (
          <MetaLine className="mt-2 flex-wrap text-xs">
            <span className={cn("tabular-nums", tone.good)}>
              {resolved} {resolved === 1 ? "phrase" : "phrases"} resolved
            </span>
            {/* A zero is the point here, unlike a zeroed diff stat: nothing was
                left unresolved is the reassurance the reader came for. */}
            <span className="text-muted-foreground tabular-nums">
              {unresolved} unresolved
            </span>
            <span className="min-w-0 text-muted-foreground">{onFailure}</span>
          </MetaLine>
        ) : null}
      </Section>
    </>
  )
}
