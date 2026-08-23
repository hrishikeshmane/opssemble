# Mock UI notes

The binding style contract is **[`/DESIGN.md`](../DESIGN.md)** at the repository
root. Read it before changing any screen. This file only records what is specific
to the mock.

## Nature of the mock

Front-end only. No backend, no network, no persistence. Every string and number
on screen comes from [`lib/mock-data.ts`](../lib/mock-data.ts); interactive
controls hold local state and are presentational. Nothing filters, saves, or
navigates outside the routes below.

## Routes

| Route | Screen |
|---|---|
| `/changes` | Changes list |
| `/changes/[id]` | Change detail — Watch Plan, Diff, Timeline. The centrepiece. |
| `/missions` | Release Missions list |
| `/missions/[id]` | Mission detail — stages, agent work, decision, repair |
| `/agents` | Agent registry |
| `/policies` | Policies |
| `/integrations` | Integrations and safety boundary |

Walkthrough: `/changes` → `/changes/184` → `/missions/m-184-candidate` →
`/missions/m-flag-dialup` → Repair with Codex.

## Provenance

The visual language is taken from the real
[T3 Code](https://github.com/pingdotgg/t3code) pull-request UI
(`apps/web/src/components/pullRequest/`), read from source and from its running
build's compiled CSS. Theme token values, the type scale, the three-zone row
geometry, and the restraint rules in `DESIGN.md` are observed from that
implementation rather than invented.

Source wireframes for the *product* (not the styling) are in
[`visual-plan/opssemble-product/`](./visual-plan/opssemble-product/).

## Known gaps

- Filters are presentational; the list always renders every record.
- `/changes/183`, `/181`, `/179` have no diff fixtures, so their Diff tab shows
  the empty state.
- Agent and integration rows have no detail route, so they are plain `<li>`
  rather than links.
