# Opssemble

Operational coverage for every change. A pull request receives an explicit Watch
Plan, which is armed into a versioned Release Contract, which is executed by
agents as a Release Mission.

This branch (`moc-ui`) contains a **clickable mock UI** of that product. It is
front-end only: there is no backend, no network, and no persistence. Every value
on screen is read from [`lib/mock-data.ts`](./lib/mock-data.ts).

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000 — it redirects to `/changes`.

Press <kbd>d</kbd> to toggle light and dark. The mock is designed dark-first.

## Screens

| Route | What it shows |
|---|---|
| `/changes` | Changes inbox — operational coverage for every connected pull request |
| `/changes/184` | **Change detail** — the centrepiece. Watch Plan, Diff, and Timeline tabs |
| `/missions` | Release Missions queue — every execution created from an armed contract |
| `/missions/m-184-candidate` | Mission running — live agent work, tool calls, guardrails |
| `/missions/m-flag-dialup` | Mission held — policy decision, evidence, bounded Codex repair |
| `/agents` | Agent registry — capabilities, selection rules, tools, health |
| `/policies` | Policies — the deterministic rules that authorize promote, hold, restore, repair |
| `/integrations` | Integration health and the safety boundary |

The intended walkthrough is `/changes` → `/changes/184` → arm → `/missions/m-184-candidate`
→ `/missions/m-flag-dialup` → Repair with Codex.

## How it is built

- **Next.js 16** App Router. Screens are server components; only interactive
  leaves (`inbox-filters`, `requirement-compiler`, `diff-viewer`,
  `agent-run-card`, `repair-dialog`, `policy-row`, tab shells) are client
  components.
- **shadcn/ui** on Base UI. Note there is no `asChild` in this build — compose
  with `render={<Element />}`.
- **`components/opssemble/kit.tsx`** holds the shared primitives (`Panel`,
  `StatusPill`, `Metric`, `Row`, `PageHeader`, `ActionBar`, `GridHead`) so
  density and colour stay consistent across screens.
- **[`docs/mock-ui-design-spec.md`](./docs/mock-ui-design-spec.md)** is the
  binding style contract: hairline borders and no shadows, monospace with
  tabular figures for every identifier and threshold, colour reserved for
  status, and a sticky action bar that states the consequence of its primary
  button.

Source wireframes live in
[`docs/visual-plan/opssemble-product/`](./docs/visual-plan/opssemble-product/)
and the written plan is in [`docs/`](./docs/).

## Verify

```bash
npm run typecheck
npm run lint
npm run build
```

`components/ai-elements/` is a vendored AI Elements toolkit that is not wired
into any route and does not type-check against the installed `ai` and
`streamdown` versions. It is excluded in `tsconfig.json`; remove that exclusion
when the toolkit is actually used and fixed.
