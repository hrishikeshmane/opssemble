"use client"

import * as React from "react"
import { Check } from "lucide-react"

import { decision } from "@/lib/mock-data"
import { Label, Mono, Panel } from "@/components/opssemble/kit"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

/**
 * Human authorization gate for a bounded Codex repair. Approval is mock state
 * held here and surfaced as an inline confirmation next to the trigger.
 */
export function RepairDialog() {
  const [open, setOpen] = React.useState(false)
  const [queued, setQueued] = React.useState(false)

  return (
    <div className="flex items-center gap-2">
      {queued ? (
        <Alert className="w-auto border-ok/40 py-1">
          <Check className="text-ok" />
          <AlertTitle className="font-normal">
            Repair queued in <Mono>{decision.repair.scope}</Mono>
          </AlertTitle>
        </Alert>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button>Repair with Codex</Button>} />
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Codex repair</DialogTitle>
            <DialogDescription>
              Codex is scoped to <Mono>{decision.repair.scope}</Mono>.{" "}
              {decision.repair.guardrail}
            </DialogDescription>
          </DialogHeader>

          <Panel className="flex flex-col gap-2 p-3">
            <Label>Acceptance criteria</Label>
            <ul className="flex flex-col gap-1.5">
              {decision.repair.acceptance.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[12px]">
                  <Check
                    aria-hidden
                    className="mt-0.5 size-3 shrink-0 text-ok"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              onClick={() => {
                setQueued(true)
                setOpen(false)
              }}
            >
              Approve repair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
