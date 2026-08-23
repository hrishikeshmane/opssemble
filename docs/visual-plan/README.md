# Opssemble Visual Plan

> **Product vision:** This visual plan shows the intended full product. It is not
> the four-hour implementation checklist. The team should execute
> [`../plans/2026-08-23-three-engineer-hackathon-critical-path.md`](../plans/2026-08-23-three-engineer-hackathon-critical-path.md)
> during the hackathon.

This folder contains a visual walkthrough of Opssemble. It includes the product
plan, screen designs, and a clickable prototype.

You do not need to know how to code to view it.

## What You Will See

- **Plan:** The product problem, decisions, workflows, and implementation scope.
- **Wireframes:** Static views of the main Opssemble screens.
- **Prototype:** A clickable walkthrough from a pull request to a Release
  Mission and Codex repair.

The source files are in [`opssemble-product/`](./opssemble-product/):

| File | Purpose |
|---|---|
| `plan.mdx` | Written product and engineering plan |
| `canvas.mdx` | Screen wireframes and annotations |
| `prototype.mdx` | Clickable product walkthrough |

## Before You Start

You need:

1. The Opssemble repository downloaded on your computer.
2. A current Node.js LTS installation.
3. Google Chrome or Microsoft Edge.

If `node --version` works in Terminal or PowerShell, Node.js is installed.

## Mac: Open the Visual Plan

1. Open **Terminal**.
2. Move into the Opssemble repository. You can type `cd ` and drag the repository
   folder from Finder into Terminal.
3. Run this command:

```bash
NPM_CONFIG_REGISTRY=https://registry.npmjs.org npx @agent-native/core@latest plan local serve \
  --dir docs/visual-plan/opssemble-product \
  --kind plan \
  --open
```

Chrome should open automatically.

Keep Terminal open while viewing the plan. Press `Control + C` in Terminal when
you are finished.

## Windows: Open the Visual Plan

1. Open **PowerShell**.
2. Move into the Opssemble repository.
3. Run:

```powershell
$env:NPM_CONFIG_REGISTRY = "https://registry.npmjs.org"
npx @agent-native/core@latest plan local serve --dir docs/visual-plan/opssemble-product --kind plan --open
```

Keep PowerShell open while viewing the plan. Press `Control + C` when finished.

## Browser Permission

The browser may ask for permission to access devices or services on your local
network. Select **Allow**. The visual plan is being read from a small server
running only on your own computer.

Use Chrome or Edge. Safari may block the connection.

## Validate the Files

This step is optional. It checks that the visual-plan files are valid:

### Mac

```bash
NPM_CONFIG_REGISTRY=https://registry.npmjs.org npx @agent-native/core@latest plan local check \
  --dir docs/visual-plan/opssemble-product
```

### Windows

```powershell
$env:NPM_CONFIG_REGISTRY = "https://registry.npmjs.org"
npx @agent-native/core@latest plan local check --dir docs/visual-plan/opssemble-product
```

A successful check prints:

```text
"ok": true
```

## Common Problems

### `npx: command not found`

Install the current Node.js LTS release, close Terminal or PowerShell, and open
it again.

### `Local plan not found`

The local server is not running, or the link came from someone else's computer.
Run the `plan local serve` command again and use the new browser tab it opens.

### The page says `Connect to local plan`

Select **Connect to local plan** and allow local-network access when the browser
asks.

### The page stays on `Loading plan`

1. Confirm the Terminal or PowerShell window is still open.
2. Use Chrome or Edge.
3. Refresh the page.
4. Run the `plan local serve` command again if needed.

### An `E401` or npm authentication error appears

Use the exact commands in this README. They explicitly use the public npm
registry and avoid company-specific npm settings.

## Sharing With Teammates

The generated browser URL works only on the computer running the command. Do
not send that URL to another person, even if they are on the same Wi-Fi network.

Each teammate should:

1. Download or clone the Opssemble repository.
2. Run the command above on their own computer.
3. Open the browser tab created by their command.

The generated `.plan-url` file contains a temporary local token. It is ignored
by Git and should not be committed or shared.
