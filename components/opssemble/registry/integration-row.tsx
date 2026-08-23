/**
 * One row of the integrations list.
 *
 * Connectivity is the glyph in the first column and nothing else -- no pill, no
 * repeated "Connected" word, no tinted border. Eight healthy rows carrying eight
 * green labels would say the same thing eight times and leave nothing to notice
 * when one of them stops being true.
 */
import { CircleCheckIcon, TriangleAlertIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Integration } from "@/lib/mock-data"
import { MetaLine, tone } from "@/components/opssemble/presentation"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function IntegrationRow({ integration }: { integration: Integration }) {
  // A tick is drawn only for a provider actually reporting healthy. Anything else
  // takes the warning triangle, because a green tick over a provider that is not
  // answering is the one mistake this screen must never make.
  const { Icon, toneClassName } =
    integration.status === "ok"
      ? { Icon: CircleCheckIcon, toneClassName: tone.good }
      : { Icon: TriangleAlertIcon, toneClassName: tone.pending }

  return (
    <li
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-accent/60",
        // Offscreen rows are skipped for style, layout and paint. The intrinsic
        // size keeps the scrollbar honest while one is skipped.
        "[contain-intrinsic-block-size:54px] [content-visibility:auto]"
      )}
    >
      <Tooltip>
        {/* A span trigger: the glyph carries the label, and an interactive
            trigger would put a control in a row that has none. */}
        <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
          <Icon
            role="img"
            aria-label={integration.statusLabel}
            className={cn("size-4 shrink-0", toneClassName)}
          />
        </TooltipTrigger>
        <TooltipContent>{integration.statusLabel}</TooltipContent>
      </Tooltip>

      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">
          {integration.provider}
        </span>
        <MetaLine className="mt-0.5 text-xs text-muted-foreground/70">
          {/* The environment is an identifier a reader checks against a console,
              so it is mono; the scope beside it is prose and is not. */}
          <span className="max-w-32 shrink-0 truncate font-mono">
            {integration.environment}
          </span>
          <span className="truncate">{integration.scope}</span>
          {/* Only write access is named. A read-only provider says nothing,
              because labelling both makes neither stand out -- and the notable
              case is the one that can change something. */}
          {integration.writeAccess ? (
            <span
              className={cn(
                "shrink-0 font-medium lowercase",
                // The caution amber the app already uses for "look at this".
                // A second amber for permissions would fork the palette.
                tone.pending
              )}
            >
              write
            </span>
          ) : null}
        </MetaLine>
      </span>

      <span className="shrink-0 text-xs tabular-nums text-muted-foreground/70">
        {integration.lastEvent}
      </span>
    </li>
  )
}
