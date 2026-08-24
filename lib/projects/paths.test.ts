import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { getProjectPaths } from "./paths"

describe("getProjectPaths", () => {
  it("keeps every project artifact under the Opssemble home", () => {
    const paths = getProjectPaths(
      {
        host: "github.com",
        owner: "PingDotGG",
        repository: "T3Code",
        slug: "PingDotGG/T3Code",
      },
      "/Users/tester"
    )

    const projectRoot = join(
      "/Users/tester",
      ".opssemble",
      "projects",
      "github.com--pingdotgg--t3code"
    )

    expect(paths).toEqual({
      opssembleHome: join("/Users/tester", ".opssemble"),
      projectsRoot: join("/Users/tester", ".opssemble", "projects"),
      projectRoot,
      repository: join(projectRoot, "repo"),
      artifacts: join(projectRoot, "artifacts"),
      fixtures: join(projectRoot, "fixtures"),
      logs: join(projectRoot, "logs"),
    })
  })
})
