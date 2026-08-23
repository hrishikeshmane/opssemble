# Opssemble Design System

This document governs every interface decision in this repository. It is not a
style suggestion — if a change conflicts with a rule here, the change is wrong
unless this document is amended first.

The system is derived from the real
[T3 Code](https://github.com/pingdotgg/t3code) pull-request UI
(`apps/web/src/components/pullRequest/`), read from source and from its running
build. Rules are recorded because they were observed working in a dense,
production engineering tool — not invented. Where a rule looks arbitrary, that is
why.

---

## 1. The governing principle

> **Colour is spent only on a status, and only once per item.**

A state reads as **one** of the following, never a combination:

- a **glyph** — a lucide icon in a status tone, with a Tooltip carrying its label
- a **tone on an identifier** — `#184` in red means high risk
- a **single lowercased coloured word** — `failed`, `ready`, `write`

A pill that has a tinted background *and* a coloured dot *and* coloured text is
the same fact asserted three times. It is the single clearest signal of
undesigned UI, and it is the mistake this system exists to prevent.

Everything structural is greyscale: `bg-background`, `border-border/60`,
`text-muted-foreground`.

### Corollaries

- **There are no status pills in this application.** `Badge` is for a genuine
  chip — a label, a count, a permission — never for a lifecycle state.
- If you keep a coloured left border on a card, drop the coloured word inside it.
- The brightest thing on screen should always be a status in the content, never
  chrome. This is why the sidebar's active row is a neutral `bg-accent` and not
  an accent-coloured bar.

---

## 2. Colour

### Status tones

Literal Tailwind palette classes with explicit dark variants. **Do not** create
semantic CSS variables for status — the dark pairing must be visible at the point
of decision.

| Meaning | Class |
|---|---|
| Pass, healthy, resolved | `text-emerald-600 dark:text-emerald-300/90` |
| Fail, breached, conflicting | `text-destructive` |
| Pending, running, caution | `text-amber-600 dark:text-amber-400/90` |
| Terminal-good: merged, promoted, armed | `text-violet-600 dark:text-violet-300/90` |
| Draft, inert | `text-zinc-500 dark:text-zinc-400/80` |
| Absent, skipped, neutral | `text-muted-foreground/70` |

Spinners are `animate-spin text-amber-500`.

Diff tints are the only status *backgrounds* in the app: `bg-emerald-500/10` for
an added line, `bg-red-500/10` for a removed one.

**Every tone lives in `components/opssemble/presentation.tsx`.** Never inline a
status colour in a screen. A state must not be able to look like two different
things in two places — this is the entire reason the module exists.

### The neutral ladder

Fade by opacity, not by picking a different grey.

```
text-foreground
  → text-muted-foreground          default secondary
  → text-muted-foreground/70       meta lines, branch names
  → text-muted-foreground/50       the · separator between meta segments
```

Seams and fills:

```
border-border/60     every divider, every card edge — no exceptions
border-border/70     chip edges
bg-border/45         the timeline spine
bg-accent/60         row hover
bg-accent            current row
bg-muted/40          inset code blocks, hunk headers
```

### Theme tokens

Dark is **pure black** with black cards; the hairline is white at 8%. Taken
verbatim from T3 Code's compiled build.

```
dark:  --background #000   --card #000     --muted #0a0a0a
       --accent #191a1d    --border #ffffff14  --input #ffffff2e
       --foreground #f1f3f7  --muted-foreground #a3a3a3
       --primary oklch(57.1% .21 264)     /* blue */
light: --background oklch(99.4% 0 0)  --card #fff
       --primary oklch(48.8% .217 264)
```

Semantic tokens (`--success`, `--warning`, `--info`, `--error`) exist for badge
variants only. Radius steps **subtractively**: `--radius-sm: calc(var(--radius) - 4px)`.

---

## 3. Typography

### The complete scale

Nothing outside this table. No arbitrary sizes like `text-[12px]` or `text-[15px]`.

| Use | Class |
|---|---|
| Page or detail title — the largest text in the app | `text-base font-semibold leading-snug` |
| Section heading | `text-sm font-medium` |
| List row title | `text-sm font-medium` |
| **Body, rows, meta — the default** | `text-xs` |
| Condensed meta, secondary timeline meta | `text-[11px]` |
| Badges, commit meta, tiny counts | `text-[10px]` |
| Avatar initials | `text-[9px]` |

Nothing is `text-lg` or above, anywhere, ever. A dense tool earns hierarchy from
weight and colour, not from size.

### No micro-labels

**There are no uppercase tracked-out labels.** Metadata is a label/value row with
a sentence-case `text-muted-foreground` label:

```tsx
<MetaRow label="Trigger">Vercel candidate ready after merge</MetaRow>
```

`UPPERCASE TRACKING-WIDE` above every value is a dashboard idiom. It reads as
decoration and it doubles the vertical cost of a field.

### Fonts

The **system UI stack**, not a webfont:

```
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
--font-mono: ui-monospace, "SF Mono", "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace
```

A native face is a large part of why a dense tool reads as an application rather
than a document, and it removes the layout shift a loading webfont costs.

### Monospace, narrowly

`font-mono` on branch names, commit SHAs, diff stats, provider thresholds, and
opaque identifiers. `tabular-nums` on any number that changes in place.
`.toLocaleString()` on anything that can exceed 999.

Prose is never mono. A threshold inside a sentence is not mono. **A comment body
inside a monospace context resets to `font-sans`** — prose embedded in code is
typeset as prose.

SHAs are abbreviated to 7 characters (`sha.slice(0, 7)`), which is what a reader
matches against a commit list.

---

## 4. Structure

### Sections, not cards

```tsx
<Section>            // px-4 py-3 — a padded region
<SectionHeading />   // sticky, border-t, text-sm font-medium
```

A **card** (`rounded-lg border border-border/60 p-3`) is reserved for a discrete
authored object: a comment, a tool call, a piece of evidence. Do not use one to
group a section. A page of boxes has no hierarchy — a page of hairline-separated
sections does.

Section headings are `sticky top-0` with the rule on **top**, so a heading
arriving from below carries its own divider with it. Order is title → affordance
→ count, which reads as a heading with something you can do to it rather than as
a tree node.

### Spacing

- **Horizontal gutter is `px-4`. Without exception.** Row insets are `px-2`.
- **Gaps are only** `gap-1`, `gap-1.5`, `gap-2`, `gap-3`.
- Radii: `rounded-lg` cards, `rounded-md` rows and controls, `rounded-sm` inline
  buttons, `rounded-full` chips and avatars.

### No shadows

Nothing in layout flow has a shadow. Depth comes from hairlines. `shadow-lg` is
permitted only on a floating overlay or a FAB — something deliberately outside
the flow.

### Scroll containment

Parent is `flex h-full min-h-0 flex-col`; the scroller is `min-h-0 flex-1
overflow-y-auto`. Add `[scrollbar-gutter:stable]` to any scroller whose content
can cross the overflow boundary, so line numbers and metadata do not shift.

---

## 5. List rows

**There is no column header row and no aligned column table.** A row is three
zones:

```tsx
grid-cols-[auto_minmax(0,1fr)_auto]
```

| Zone | Content |
|---|---|
| 1 | the state glyph — the row's only state indicator |
| 2 | title (`text-sm font-medium`) over a dot-separated `<MetaLine>` |
| 3 | right-aligned timestamp, and a diff stat or count beneath it |

Rows are `rounded-md px-3 py-2` with `hover:bg-accent/60`, and `bg-accent` when
current. No chevron reveal.

A grid table forces every row to reserve width for the widest cell in the
column, which is why aligned tables read as sparse and administrative. A meta
line spends exactly the width each row needs.

### `MetaLine` owns its separators

```tsx
<MetaLine className="mt-0.5 text-xs text-muted-foreground/70">
  <span>#{number}</span>
  {risk === "low" ? null : <RiskWord risk={risk} />}
  <ActorLabel … />
</MetaLine>
```

It draws a `·` only between the segments that survive, so a conditional segment
never leaves a stray dot. The separator is one step fainter than its text
(`text-muted-foreground/50`) so the run reads as one line rather than as a list
of separated things.

### Virtualisation hints

Every repeating row carries:

```
[content-visibility:auto] [contain-intrinsic-block-size:54px]
```

Style, layout and paint are skipped for offscreen rows; the intrinsic size keeps
the scrollbar honest. Tune the hint per row type (54px list row, 48px timeline
row, 120px comment card). Do **not** apply `content-visibility` to an expanded
collapsible — an open card offscreen would make the scrollbar lie.

---

## 6. Navigation and actions

### Tabs

A **segmented `ToggleGroup`**, not underline tabs. **No counts or badges on the
tabs themselves** — a count belongs to the tab a reader is on, so it sits in a
right-aligned accessory that changes with the selection. A row of tabs each
wearing a number reads as a dashboard, not as navigation.

Accessory placeholders are `…` while pending and `—` on error, at `opacity-35`.
Never a spinner, never a bare `0`.

### Actions

- **There is no sticky bottom action bar.** Actions live in the header.
- **Exactly one primary action is ever rendered.** Everything else is `outline`,
  `ghost`, or in an overflow `MoreHorizontal` menu.
- Buttons are `size="xs"` / `size="icon-xs"`. `size="sm"` **only** inside a
  dialog.
- A Save button is `variant="outline"`. Primary tone is reserved for the
  consequential action — arm, merge, approve.
- A confirm button is labelled with **the action** ("Arm", "Approve repair"),
  never "Confirm" or "OK".
- **Never duplicate an action** between a visible button and the overflow menu.

### Filters

Filters live behind **one filter icon**, not a chip row. Every dimension is a
radio group in the menu. The active signal is a
`size-1.5 rounded-full bg-primary` dot on the trigger — **no background or
border swap.** A chip row grows without bound and turns the control strip into a
second navigation.

### Icons

`size-3.5` is the default. `size-3` in condensed rows, meta lines, and badges.
`size-4` is rare — an overflow trigger, a filter trigger, a row glyph. `size-5`
in an empty state.

Icon-only buttons require `aria-label`. Decorative icons are `aria-hidden`.

---

## 7. Restraint rules

These are what separate a considered tool from a template. They are binding.

1. **Return `null` rather than render a zero.** `+0 / -0` reads as an empty change
   set rather than as counts we never had.
2. **A row survives emptiness only when it carries an action.** A Reviewers row
   with a picker can say `None`; a Labels row with nothing to do disappears.
3. **Never render an orphan separator.** Gate the separator with its group.
4. **A control whose only option is the current state does nothing** — hide it.
5. **Dead controls become plain text, not disabled controls.** No URL means a
   `<span>`, not a greyed link. A control that vanishes teaches nobody why, so
   where permission is the reason, show it disabled *with* a reason instead.
6. **Empty states are one short sentence** in `text-xs text-muted-foreground`.
   No illustrations, no cards, no call to action.
7. **A caveat too long for its strip becomes an icon with a tooltip**, not
   truncated prose. Spelled out, several caveats compete for a narrow strip and
   every one truncates to nothing.
8. **Do not show a count you cannot trust.** Omit it. A bare number beside a tick
   is read as the whole answer, and a number cannot qualify itself.
9. **Remove a control that cannot work** rather than shipping one that fails.
10. **Failure never costs typed input.** A failed save keeps the draft.
11. **Name what is missing.** "Needs input" is worse than "Needs input to resolve
    a signal"; "Has conflicts" is worse than "Conflicts with main".
12. **De-emphasis is opacity and greyscale, never a different hue.**

### Reveal on hover

Always all four states, or the control is unreachable by keyboard:

```
opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100
```

---

## 8. Motion

Almost none.

Permitted: colour transitions on hover (`transition-colors`, ~150ms),
`animate-spin` on a running status glyph, and collapsible open/close. A
crossfade must use a 1×1 grid with both children at `col-start-1 row-start-1` so
no layout shift is possible, and the hidden layer must carry `aria-hidden` +
`inert` + `tabIndex={-1}` so it is not a second tab stop.

No page transitions. No entrance animations. No skeleton shimmer over data that
is already present.

Respect `motion-reduce:`.

---

## 9. Accessibility

- Status is never colour-only. A glyph carries `role="img"` and an `aria-label`,
  or a tooltip, or an adjacent word.
- A lowercased status word is lowercased **in CSS**, so a screen reader still
  announces the canonical label.
- Where a bare number is shown for density, pair it with an `sr-only` spelled-out
  form (`<span aria-hidden>3</span><span className="sr-only">3 conversations</span>`).
- Section headings are real heading elements so the document outline works.
- Active navigation uses `aria-current="page"`.
- A tooltip trigger inside a clickable row stays a `<span>` — an interactive one
  would nest a control inside the row and steal its click target.

---

## 10. Code conventions

### Base UI, not Radix

This shadcn build sits on Base UI. **There is no `asChild`.** Compose with
`render`:

```tsx
<TooltipTrigger render={<span className="inline-flex shrink-0" />}>
<DialogTrigger render={<Button size="xs">Repair with Codex</Button>} />
<Button render={<Link href="/missions" />}>Open</Button>
```

`Collapsible` should wrap `{open ? children : null}` so collapsed content
unmounts rather than hides. **Read the component file in `components/ui/` before
using it** — do not assume the Radix API.

### Module boundaries

| Module | Owns |
|---|---|
| `components/opssemble/presentation.tsx` | every status tone, glyph, and word; `MetaLine`; `DiffStat`; actors; branches; SHAs |
| `components/opssemble/layout.tsx` | `Section`, `SectionHeading`, `MetaRow`, `Card`, `Chip`, empty states, timeline parts, `PageHeader`, `PageBody` |
| `components/opssemble/segmented-tabs.tsx` | the tab bar and its accessory strip |
| `lib/mock-data.ts` | every string and number on screen |

A screen composes these. A screen never defines a status colour and never
hardcodes copy.

### Server by default

Screens are server components. `"use client"` goes on the smallest interactive
leaf that needs it — a filter menu, a switch row, a collapsible card — never on a
page that merely contains one.

### Comment the *why*

Every non-obvious decision carries a prose comment explaining why, in the same
register as the surrounding code:

```tsx
// The row is itself a link, so the trigger stays a span: an interactive
// one would nest a control inside that link and steal its click target.
```

This is load-bearing. It is a large part of why the reference implementation
reads as considered rather than generated, and it is what stops a later change
from silently undoing a deliberate decision.

---

## 11. Reviewing a change against this document

Ask, in order:

1. Does any item assert its status more than once?
2. Is there a status pill? (There should never be.)
3. Is any text outside the scale in §3? Any uppercase micro-label?
4. Is every seam `border-border/60`? Any shadow in layout flow?
5. Is the gutter `px-4`? Are gaps within the four permitted values?
6. Is there more than one primary action in view?
7. Is a zero, an untrustworthy count, or an orphan separator rendered?
8. Is a status colour inlined in a screen instead of imported from
   `presentation.tsx`?
9. Does every non-obvious decision explain itself in a comment?

A "yes" to 1–2, 6–8 blocks the change.
