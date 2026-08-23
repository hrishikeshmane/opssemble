"use client"

/**
 * Handing a held candidate to Codex.
 *
 * The dialog exists to state the boundary before a person crosses it: what Codex
 * can touch, what it cannot, and what the repair has to satisfy to come back. The
 * confirm button is labelled with the action rather than "Confirm", so a reader
 * who only reads the button still knows what they approved.
 */
import * as React from "react"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { decision } from "@/lib/mock-data"
import { tone } from "@/components/opssemble/presentation"
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

export function RepairDialog() {
  const [open, setOpen] = React.useState(false)
  const [approved, setApproved] = React.useState(false)

  // Once the repair is approved the action is spent, and a button that would
  // start a second one is a control whose only option is the current state. The
  // confirmation takes its place rather than sitting beside it.
  if (approved) {
    return (
      <span className={cn("flex items-center gap-1.5 text-xs", tone.good)}>
        <CheckIcon aria-hidden className="size-3 shrink-0" />
        Repair opened in {decision.repair.scope}
      </span>
    )
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={<Button size="xs">Repair with Codex</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Repair with Codex</DialogTitle>
          <DialogDescription>
            Codex works in {decision.repair.scope} and opens a repair pull
            request. {decision.repair.guardrail}
          </DialogDescription>
        </DialogHeader>

        <div>
          <p className="text-xs text-muted-foreground">
            The repair is accepted when it:
          </p>
          {/* A plain list. Each criterion is already a complete sentence, so a
              card or a row per item would frame text that needs no frame. */}
          <ul className="mt-1.5 space-y-1">
            {decision.repair.acceptance.map((criterion) => (
              <li className="flex items-start gap-1.5 text-xs" key={criterion}>
                <CheckIcon
                  aria-hidden
                  className={cn("mt-0.5 size-3 shrink-0", tone.good)}
                />
                <span className="min-w-0">{criterion}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <DialogClose render={<Button size="sm" variant="outline" />}>
            Cancel
          </DialogClose>
          {/* `size="sm"` rather than the `xs` the page uses: inside a dialog the
              hit target is the whole decision, not a row accessory. */}
          <Button
            onClick={() => {
              setApproved(true)
              setOpen(false)
            }}
            size="sm"
          >
            Approve repair
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
