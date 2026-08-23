import type { Metadata } from "next"

import { changes } from "@/lib/mock-data"
import { PageBody, PageHeader } from "@/components/opssemble/layout"
import { ChangeRow } from "@/components/opssemble/changes/change-row"
import { ListFilters } from "@/components/opssemble/changes/list-filters"

export const metadata: Metadata = {
  title: "Changes",
}

/**
 * The Changes list.
 *
 * A header and a list of rows, and nothing else. There are no metric cards above
 * it: "7 open" and "2 need a decision" are both already legible by looking down
 * the plan glyphs, and a card restating them pushes the first row below the fold
 * to say something the list says better. There is no column header row either --
 * the rows are not a table, so there is nothing to head.
 *
 * A fragment rather than a wrapper: the app frame's `<main>` is already the flex
 * column these two are sized against, so a div here would add a second one and
 * break the header's `shrink-0` against the body's `min-h-0 flex-1`.
 */
export default function ChangesPage() {
  return (
    <>
      <PageHeader
        title="Changes"
        subtitle="Operational coverage for connected pull requests"
        actions={<ListFilters />}
      />

      <PageBody>
        {/* The list is inset by 2 and each row pads by 3, so a row's hover fill
            floats inside the gutter instead of running into the window edge. */}
        <ul className="px-2 py-2">
          {changes.map((change) => (
            <ChangeRow key={change.id} change={change} />
          ))}
        </ul>
      </PageBody>
    </>
  )
}
