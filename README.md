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

| Route                       | What it shows                                                                      |
| --------------------------- | ---------------------------------------------------------------------------------- |
| `/changes`                  | Changes inbox — operational coverage for every connected pull request              |
| `/changes/184`              | **Change detail** — Watch Plan, Blast Radius, Stress Test, Diff, and Timeline tabs |
| `/missions`                 | Release Missions queue — every execution created from an armed contract            |
| `/missions/m-184-candidate` | Mission running — live agent work, tool calls, guardrails                          |
| `/missions/m-flag-dialup`   | Mission held — policy decision, evidence, bounded Codex repair                     |
| `/agents`                   | Agent registry — capabilities, selection rules, tools, health                      |
| `/policies`                 | Policies — the deterministic rules that authorize promote, hold, restore, repair   |
| `/integrations`             | Integration health and the safety boundary                                         |

The intended walkthrough is `/changes` → `/changes/184` → arm → `/missions/m-184-candidate`
→ `/missions/m-flag-dialup` → Repair with Codex.

## How it is built

- **Next.js 16** App Router. Screens are server components; only interactive
  leaves (`list-filters`, `requirement-compiler`, `diff-viewer`,
  `agent-run-card`, `repair-dialog`, `policy-row`, the tab shell) are client
  components.
- **shadcn/ui** on Base UI. Note there is no `asChild` in this build — compose
  with `render={<Element />}`.
- **[`DESIGN.md`](./DESIGN.md)** is the binding design system. It is derived from
  the real [T3 Code](https://github.com/pingdotgg/t3code) pull-request UI, read
  from source and from its running build's compiled CSS — theme tokens, type
  scale, the three-zone row geometry, and the restraint rules all come from that
  implementation. Read it before changing any screen.
- `components/opssemble/presentation.tsx` owns every status tone and glyph;
  `layout.tsx` owns structure. A screen composes them and never defines a colour.
- The Blast Radius report combines the diff, dependency graph, architecture,
  runbook, and relevant change history into an explained `0–10` impact score.
  The Stress Test compares equivalent `main` and feature-branch sandboxes across
  throughput, latency, CPU, breaking point, sustained load, and recovery.

The governing rule is that **colour is spent only on a status, and only once per
item** — a state is a glyph, or a tone on an identifier, or one lowercased
coloured word, never a pill with a tint and a dot and coloured text.

Source wireframes for the product live in
[`docs/visual-plan/opssemble-product/`](./docs/visual-plan/opssemble-product/).

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
