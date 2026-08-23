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

Then open http://localhost:3000 — it redirects to `/projects`.

Run the monitoring/MCP process independently with:

```bash
UV_CACHE_DIR=/tmp/opssemble-uv-cache uv sync --group dev
MCP_TOKEN=test-mcp-token REPLAY_SPEED=100 \
  UV_CACHE_DIR=/tmp/opssemble-uv-cache \
  uv run uvicorn monitoring.app:app --host 127.0.0.1 --port 8000
```

Press <kbd>d</kbd> to toggle light and dark. The mock is designed dark-first.

## Screens

| Route                                             | What it shows                                                   |
| ------------------------------------------------- | --------------------------------------------------------------- |
| `/projects`                                       | Connected projects                                              |
| `/projects/[id]`                                  | Pull requests for a project                                     |
| `/projects/[id]/pulls/[number]`                   | Pull request details and changed files                          |
| `/projects/[id]/pulls/[number]/mission`           | Mission agents running for a pull request                       |
| `/missions`                                       | Release Missions queue                                          |
| `/missions/m-184-candidate`                       | Mission running — live agent work, tool calls, and guardrails   |
| `/missions/m-flag-dialup`                         | Mission held — policy decision, evidence, bounded Codex repair  |
| `/integrations`                                   | Integration health and the safety boundary                      |

The intended walkthrough is `/projects` → project → pull request → mission.

## How it is built

- **Next.js 16** App Router. Screens are server components; only interactive
  leaves (`agent-run-card`, `repair-dialog`, and tab shells) are client components.
- **shadcn/ui** on Base UI. Note there is no `asChild` in this build — compose
  with `render={<Element />}`.
- **[`DESIGN.md`](./DESIGN.md)** is the binding design system. It is derived from
  the real [T3 Code](https://github.com/pingdotgg/t3code) pull-request UI, read
  from source and from its running build's compiled CSS — theme tokens, type
  scale, the three-zone row geometry, and the restraint rules all come from that
  implementation. Read it before changing any screen.
- `components/opssemble/presentation.tsx` owns every status tone and glyph;
  `layout.tsx` owns structure. A screen composes them and never defines a colour.
The governing rule is that **colour is spent only on a status, and only once per
item** — a state is a glyph, or a tone on an identifier, or one lowercased
coloured word, never a pill with a tint and a dot and coloured text.

Source wireframes for the product live in
[`docs/visual-plan/opssemble-product/`](./docs/visual-plan/opssemble-product/).

## Verify

```bash
npm run typecheck
npm run lint
npm run test
npm run build
UV_CACHE_DIR=/tmp/opssemble-uv-cache uv run --group dev pytest -q
UV_CACHE_DIR=/tmp/opssemble-uv-cache uv run python -m monitoring generate --check
```

`components/ai-elements/` is a vendored AI Elements toolkit that is not wired
into any route and does not type-check against the installed `ai` and
`streamdown` versions. It is excluded in `tsconfig.json`; remove that exclusion
when the toolkit is actually used and fixed.
