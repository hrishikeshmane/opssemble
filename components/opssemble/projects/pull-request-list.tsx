"use client"

import { useMemo, useState } from "react"
import {
  CircleDashedIcon,
  GitMergeIcon,
  GitPullRequestClosedIcon,
  GitPullRequestIcon,
  ListFilterIcon,
  SearchIcon,
} from "lucide-react"

import type { GitHubPullRequest } from "@/lib/github/pull-request-data"
import {
  filterGitHubPullRequests,
  type PullRequestStateFilter,
} from "@/lib/github/pull-request-filter"
import { PullRequestRow } from "@/components/opssemble/projects/pull-request-row"
import { EmptyLine } from "@/components/opssemble/layout"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"

const STATE_OPTIONS = [
  { value: "all", label: "All", Icon: CircleDashedIcon },
  { value: "open", label: "Open", Icon: GitPullRequestIcon },
  { value: "closed", label: "Closed", Icon: GitPullRequestClosedIcon },
  { value: "merged", label: "Merged", Icon: GitMergeIcon },
] as const

export function PullRequestList({
  projectId,
  pullRequests,
}: {
  projectId: string
  pullRequests: readonly GitHubPullRequest[]
}) {
  const [query, setQuery] = useState("")
  const [state, setState] = useState<PullRequestStateFilter>("all")
  const filteredPullRequests = useMemo(
    () => filterGitHubPullRequests(pullRequests, query, state),
    [pullRequests, query, state]
  )

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center gap-2 border-t border-border/60 bg-background px-4 py-2">
        <div className="min-w-0 flex-1 text-sm font-medium">
          <span>Pull requests</span>
          <span
            aria-live="polite"
            className="ml-1.5 text-xs text-muted-foreground tabular-nums"
          >
            {filteredPullRequests.length.toLocaleString()}
          </span>
        </div>

        <InputGroup className="w-40 sm:w-64">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search pull requests"
            placeholder="Search pull requests"
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
                aria-label="Filter pull requests"
                className="relative"
              />
            }
          >
            <ListFilterIcon className="size-4" />
            {state !== "all" ? (
              <span
                aria-hidden
                className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-primary"
              />
            ) : null}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuRadioGroup
              value={state}
              onValueChange={(value) =>
                setState(String(value) as PullRequestStateFilter)
              }
            >
              <DropdownMenuLabel>State</DropdownMenuLabel>
              {STATE_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  <option.Icon className="size-3.5" />
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {filteredPullRequests.length > 0 ? (
        <ul className="px-2 pb-2">
          {filteredPullRequests.map((pullRequest) => (
            <PullRequestRow
              key={pullRequest.number}
              projectId={projectId}
              pullRequest={pullRequest}
            />
          ))}
        </ul>
      ) : (
        <EmptyLine>
          {pullRequests.length === 0
            ? "This repository has no pull requests."
            : "No pull requests match the current search and state filter."}
        </EmptyLine>
      )}
    </>
  )
}
