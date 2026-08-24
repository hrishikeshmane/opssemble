import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()
const packageJson = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
)

if (packageJson.name !== "opssemble") {
  throw new Error("demo:reset must run from the Opssemble repository root")
}

const dataDir = path.join(root, ".data")
const seedDir = path.join(root, "demo-seed")

await access(path.join(seedDir, "events.ndjson"))
await rm(dataDir, { recursive: true, force: true })
await mkdir(path.join(dataDir, "fixture-snapshots"), { recursive: true })
await cp(seedDir, dataDir, { recursive: true, force: true })

const events = (await readFile(path.join(dataDir, "events.ndjson"), "utf8"))
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line))
const watchPlanEvent = events.find(
  (event) => event.type === "watch_plan.generated",
)

if (!watchPlanEvent) {
  throw new Error("demo seed must contain a watch_plan.generated event")
}

const state = {
  watchPlans: [watchPlanEvent.payload],
  armedContracts: [],
  missions: [],
  agentRuns: [],
  decisions: [],
  repairLinks: [],
  observationOverrides: {},
  nextContractVersion: watchPlanEvent.payload.watchPlan.version + 1,
}

await writeFile(
  path.join(dataDir, "state.json"),
  `${JSON.stringify(state, null, 2)}\n`,
)

console.log("Opssemble demo state reset")
console.log("repository=hrishikeshmane/flightlab")
console.log("pullRequest=5")
console.log("draftWatchPlan=v2")
console.log(`nextContract=v${state.nextContractVersion}`)
console.log("missions=0")
