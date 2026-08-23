# Opssemble mock UI — design spec

Binding reference for the `moc-ui` mock. Read this before touching any screen
file. The goal is a restrained, dense, engineering-tool aesthetic in the vein of
a modern code-review surface: hairline borders, monospace identifiers, colour
reserved for status, and a sticky action bar that always states the consequence
of the primary button.

## Non-negotiables

1. **shadcn only.** Compose from `@/components/ui/*` and
   `@/components/opssemble/kit`. Never hand-roll a button, badge, tab, dialog,
   popover, tooltip, table, or sheet.
2. **This shadcn build is Base UI based, not Radix.** There is no `asChild`. To
   render a shadcn component as another element, pass `render={<Other />}`:
   ```tsx
   <TooltipTrigger render={<Button variant="ghost" size="icon-sm"><X /></Button>} />
   <Button render={<Link href="/missions/x" />}>Open mission</Button>
   ```
   `Tabs` uses `value` / `onValueChange`, and `TabsContent` requires `value`.
3. **All content comes from `@/lib/mock-data`.** Do not inline copy or numbers in
   a screen. If a screen needs a new field, add it to `lib/mock-data.ts`.
4. **Do not edit** `app/globals.css`, `app/layout.tsx`, `app/(app)/layout.tsx`,
   `lib/mock-data.ts` (append-only if truly required),
   `components/opssemble/kit.tsx`, `components/opssemble/app-shell.tsx`, or
   anything in `components/ui/` and `components/ai-elements/`.
5. **No new dependencies.** Icons come from `lucide-react`.
6. **Server components by default.** Add `"use client"` only to the specific
   interactive leaf component that needs state.

## Type scale

| Use | Class |
|---|---|
| Page title | `text-[15px] font-medium tracking-[-0.01em]` |
| Section title | `text-[12px] font-medium` |
| Body | `text-[12px]` |
| Secondary body | `text-[12px] text-muted-foreground` |
| Micro label | `<Label>` from the kit (`ops-label`) |
| Identifier / metric / threshold | `<Mono>` or `ops-mono` |
| Big metric | `ops-mono text-[19px] font-medium` |

Every SHA, deployment id, file path, provider threshold, and numeric metric is
monospace with tabular figures. Prose never is.

## Colour

Only status carries colour. Everything else is greyscale.

- `text-ok` / `bg-ok-muted` — pass, healthy, resolved
- `text-warn` / `bg-warn-muted` — held, needs input, medium risk
- `text-fail` / `bg-fail-muted` — fail, high risk, breached threshold
- `text-brand` / `bg-brand-muted` — running, active, current selection

Use `StatusPill`, `StatusDot`, `VerdictPill`, `RiskBadge`, `StatusText`, and
`Metric` from the kit rather than reaching for these classes directly.

## Structure

- Surfaces are `<Panel>`: `rounded-lg border border-border bg-card/60`. **Never
  add a shadow.** Depth comes from borders alone.
- Dividers are `divide-y divide-border` or `border-b border-border` — one pixel,
  no double borders.
- Tabular data uses CSS grid with an explicit `gridTemplateColumns`, paired with
  `<GridHead>` so the header and rows share one template string. Use the shadcn
  `Table` only for genuinely simple rectangular data.
- Row hover is `ops-row` (3.5% foreground tint). Clickable rows are `<Link>`
  wrapping the whole grid row, and reveal their trailing chevron on
  `group-hover`.
- Detail pages are two columns: main content plus a `w-[280px]` sticky right rail
  (`sticky top-4 self-start`) holding hypothesis, guardrails, and baseline.
- Page padding is `px-5 py-4`. Gaps between panels are `gap-3`.

## Furniture

- `<PageHeader title subtitle actions>` for the top of every page; pass tab bars
  or filter chips as `children`.
- `<ActionBar note>` pinned to the bottom of any page with a decision. The
  `note` states the consequence in plain language ("Arming freezes contract v3.
  Later edits create v4."). Primary action is the rightmost button.
- `<Metric label value detail status>` for threshold-versus-actual cards.
- `<Field label>` for label-over-value, `<Row label value status>` inside
  `<Rows>` for hairline-separated key/value lists.

## Motion

Almost none. Permitted: 100ms colour transitions on hover, `animate-ops-pulse`
on a running `StatusDot`, and `Collapsible` open/close. No page transitions, no
skeleton shimmer on mock data, no entrance animations.

## Accessibility

- Icon-only buttons need `aria-label`.
- Status is never colour-only — always pair a dot or colour with a text label.
- Active nav uses `aria-current="page"`.
- Decorative dots are `aria-hidden`.

## Routes

| Route | Screen |
|---|---|
| `/changes` | Changes inbox |
| `/changes/[id]` | Change detail: Watch Plan, Diff, Timeline tabs |
| `/missions` | Missions queue |
| `/missions/[id]` | Mission detail: running stages, agent work, decision |
| `/agents` | Agent registry |
| `/policies` | Policy list |
| `/integrations` | Integration health and safety boundary |
