import { describe, expect, it } from "vitest"

import {
  inspectGitStatusInputSchema,
  listRepositoryFilesInputSchema,
  readProjectMetadataInputSchema,
  readRepositoryFileInputSchema,
  ToolExecutionBudget,
} from "./tools"

describe("repository agent tool schemas", () => {
  it("rejects arbitrary command input for tools without arguments", () => {
    expect(
      inspectGitStatusInputSchema.safeParse({ command: "git reset --hard" })
        .success
    ).toBe(false)
    expect(
      readProjectMetadataInputSchema.safeParse({ projectId: "other" }).success
    ).toBe(false)
  })

  it("bounds file reads and directory listings", () => {
    expect(
      readRepositoryFileInputSchema.safeParse({
        path: "src/index.ts",
        maxBytes: 128 * 1_024 + 1,
      }).success
    ).toBe(false)
    expect(
      listRepositoryFilesInputSchema.safeParse({
        maxDepth: 11,
        maxEntries: 501,
      }).success
    ).toBe(false)
  })

  it("applies safe defaults to valid inputs", () => {
    expect(
      readRepositoryFileInputSchema.parse({ path: "src/index.ts" })
    ).toEqual({
      path: "src/index.ts",
      maxBytes: 32 * 1_024,
    })
    expect(listRepositoryFilesInputSchema.parse({})).toEqual({
      maxDepth: 4,
      maxEntries: 200,
    })
  })

  it("prevents repository operations beyond the tool budget", () => {
    const budget = new ToolExecutionBudget(1)

    budget.claim()

    expect(() => budget.claim()).toThrow("agent reached its tool-call limit")
    expect(budget.count).toBe(1)
    expect(budget.limitReached).toBe(true)
  })
})
