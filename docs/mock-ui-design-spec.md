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

| Route                                   | Screen                                                |
| --------------------------------------- | ----------------------------------------------------- |
| `/projects`                             | Connected projects                                    |
| `/projects/[id]`                        | Pull requests for a project                           |
| `/projects/[id]/pulls/[number]`         | Pull request details and changed files                |
| `/projects/[id]/pulls/[number]/mission` | Mission agents running for a pull request             |
| `/missions`                             | Release Missions list                                 |
| `/missions/[id]`                        | Mission detail — stages, agent work, decision, repair |
| `/integrations`                         | Integrations and safety boundary                      |

Walkthrough: `/projects` → project → pull request → mission.

## Provenance

The visual language is taken from the real
[T3 Code](https://github.com/pingdotgg/t3code) pull-request UI
(`apps/web/src/components/pullRequest/`), read from source and from its running
build's compiled CSS. Theme token values, the type scale, the three-zone row
geometry, and the restraint rules in `DESIGN.md` are observed from that
implementation rather than invented.

Source wireframes for the _product_ (not the styling) are in
[`visual-plan/opssemble-product/`](./visual-plan/opssemble-product/).

## Known gaps

- Integration rows have no detail route, so they are plain `<li>` rather than
  links.
