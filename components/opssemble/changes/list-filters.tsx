"use client"

/**
 * The two controls above the Changes list: a search field and one filter menu.
 *
 * Every filter dimension lives behind the single icon rather than in a chip row.
 * A chip row grows with the dimensions, wraps on a narrow window, and competes
 * with the rows below it for the reader's attention; one trigger costs a fixed
 * 28px and says whether anything is narrowed with a 6px dot. Nothing here counts
 * matches -- a count the filters do not actually produce would be a number the
 * reader cannot trust.
 */
import * as React from "react"
import {
  CircleDashedIcon,
  CircleDotIcon,
  GitMergeIcon,
  GitPullRequestDraftIcon,
  GitPullRequestIcon,
  ListFilterIcon,
  SearchIcon,
  ShieldCheckIcon,
  SignalHighIcon,
  SignalLowIcon,
  SignalMediumIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"

interface FilterOption {
  readonly value: string
  readonly label: string
  readonly Icon: typeof CircleDashedIcon
}

/**
 * Every dimension opens on "All", so "All" is also the value the active dot is
 * measured against. The dashed circle stands for an unnarrowed dimension in all
 * three groups, which is what makes a glance down the open menu legible.
 */
const UNFILTERED = "all"

const STATE_OPTIONS: readonly FilterOption[] = [
  { value: UNFILTERED, label: "All", Icon: CircleDashedIcon },
  { value: "open", label: "Open", Icon: GitPullRequestIcon },
  { value: "merged", label: "Merged", Icon: GitMergeIcon },
]

/**
 * Signal bars rather than the risk tones. A coloured triangle beside "High" would
 * put the row vocabulary inside a control, where it reads as a status the menu is
 * reporting instead of an option the reader can pick.
 */
const RISK_OPTIONS: readonly FilterOption[] = [
  { value: UNFILTERED, label: "All", Icon: CircleDashedIcon },
  { value: "high", label: "High", Icon: SignalHighIcon },
  { value: "medium", label: "Medium", Icon: SignalMediumIcon },
  { value: "low", label: "Low", Icon: SignalLowIcon },
]

/** The plan glyphs the rows already use, so a filter names what it will select. */
const PLAN_OPTIONS: readonly FilterOption[] = [
  { value: UNFILTERED, label: "All", Icon: CircleDashedIcon },
  { value: "draft", label: "Draft", Icon: GitPullRequestDraftIcon },
  { value: "needs-input", label: "Needs input", Icon: TriangleAlertIcon },
  { value: "ready", label: "Ready", Icon: CircleDotIcon },
  { value: "armed", label: "Armed", Icon: ShieldCheckIcon },
]

/**
 * One dimension of the menu.
 *
 * The heading sits inside the radio group rather than above it: Base UI wires
 * `aria-labelledby` from the group's own context, so a label outside the group
 * has nothing to label -- and throws.
 */
function FilterGroup({
  label,
  options,
  value,
  onValueChange,
}: {
  label: string
  options: readonly FilterOption[]
  value: string
  onValueChange: (value: string) => void
}) {
  return (
    <DropdownMenuRadioGroup
      value={value}
      onValueChange={(next) => onValueChange(String(next))}
    >
      <DropdownMenuLabel>{label}</DropdownMenuLabel>
      {options.map((option) => (
        <DropdownMenuRadioItem key={option.value} value={option.value}>
          {/* Uncoloured on purpose: the check is what the eye follows down the
              list, and a tinted icon beside it would split that job in two. */}
          <option.Icon className="size-3.5" />
          {option.label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  )
}

export function ListFilters() {
  const [query, setQuery] = React.useState("")
  const [state, setState] = React.useState(UNFILTERED)
  const [risk, setRisk] = React.useState(UNFILTERED)
  const [plan, setPlan] = React.useState(UNFILTERED)

  /**
   * The dot reports only what the menu hides. A typed query is already visible in
   * the field beside it, so counting it here would signal the same thing twice.
   */
  const isNarrowed =
    state !== UNFILTERED || risk !== UNFILTERED || plan !== UNFILTERED

  return (
    // A definite width, because `flex-1` on the field needs a line to resolve
    // against and the header's action slot sizes itself to its contents.
    <div className="flex w-64 items-center gap-1.5">
      <InputGroup className="min-w-0 flex-1">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          aria-label="Search changes"
          placeholder="Search changes, or risk:high"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </InputGroup>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="icon"
              variant="outline"
              aria-label="Filter changes"
              className="relative"
            />
          }
        >
          <ListFilterIcon className="size-4" />
          {/* The dot is the entire active signal. Swapping the trigger's fill or
              border as well would spend a second signal on the same fact, and a
              filled trigger reads as pressed rather than as narrowing. */}
          {isNarrowed ? (
            <span
              aria-hidden
              className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-primary"
            />
          ) : null}
        </DropdownMenuTrigger>
        {/* Aligned to the trigger's right edge so the popup opens inward from the
            header rather than off the window. */}
        <DropdownMenuContent align="end" className="min-w-56">
          <FilterGroup
            label="State"
            options={STATE_OPTIONS}
            value={state}
            onValueChange={setState}
          />
          <DropdownMenuSeparator />
          <FilterGroup
            label="Risk"
            options={RISK_OPTIONS}
            value={risk}
            onValueChange={setRisk}
          />
          <DropdownMenuSeparator />
          <FilterGroup
            label="Plan"
            options={PLAN_OPTIONS}
            value={plan}
            onValueChange={setPlan}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
