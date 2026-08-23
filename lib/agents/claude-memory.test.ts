import { access, readFile, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import type { ToolExecutionOptions } from "ai"
import { afterEach, describe, expect, it } from "vitest"

import {
  ClaudeMemoryStore,
  createClaudeMemoryMutationToolProvider,
  createClaudeMemoryReadTools,
  createClaudeMemoryToolProvider,
  MAX_CLAUDE_MEMORY_CONTENT_LENGTH,
  MAX_CLAUDE_MEMORY_SEARCH_RESULTS,
} from "./claude-memory"
import { ToolExecutionBudget } from "./tools"

const PROJECT_A = "d38b8a75-4c33-4263-b0d5-f3877f127439"
const PROJECT_B = "7f52c981-9abe-48f2-b437-f9f876d69a2d"
const temporaryDirectories: string[] = []

async function temporaryRoot(): Promise<string> {
  const root = await import("node:fs/promises").then(({ mkdtemp }) =>
    mkdtemp(join(tmpdir(), "opssemble-claude-memory-"))
  )
  temporaryDirectories.push(root)
  return root
}

function executionOptions(signal?: AbortSignal): ToolExecutionOptions<unknown> {
  return {
    toolCallId: "memory-call",
    messages: [],
    abortSignal: signal,
    context: undefined,
  }
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  )
})

describe("ClaudeMemoryStore", () => {
  it("isolates records by validated project UUID", async () => {
    const rootDirectory = await temporaryRoot()
    const store = new ClaudeMemoryStore({ rootDirectory })
    const record = await store.create(PROJECT_A, {
      type: "incident",
      title: "Project A outage",
      content: "Only project A should see this.",
      tags: ["production"],
    })

    await expect(store.read(PROJECT_A, record.id)).resolves.toEqual(record)
    await expect(store.read(PROJECT_B, record.id)).resolves.toBeNull()
    await expect(
      store.search(PROJECT_B, { query: "outage", limit: 20 })
    ).resolves.toEqual({
      records: [],
      total: 0,
      truncated: false,
    })

    const persisted = JSON.parse(
      await readFile(join(rootDirectory, PROJECT_A, "records.json"), "utf8")
    )
    expect(persisted.records).toEqual([record])
    expect(JSON.stringify(persisted)).not.toContain(rootDirectory)
  })

  it("supports bounded CRUD and deterministic exact/substring search", async () => {
    const store = new ClaudeMemoryStore({
      rootDirectory: await temporaryRoot(),
    })
    const exact = await store.create(PROJECT_A, {
      type: "repair",
      title: "Cache timeout",
      content: "Raised the retry backoff.",
      tags: ["cache"],
    })
    const substring = await store.create(PROJECT_A, {
      type: "incident",
      title: "Cache timeout in production",
      content: "Requests exceeded the upstream deadline.",
      tags: ["production"],
    })
    await store.create(PROJECT_A, {
      type: "baseline",
      title: "Healthy deployment",
      content: "Error rate remained flat.",
      tags: [],
    })

    const matches = await store.search(PROJECT_A, {
      query: "cache timeout",
      limit: 1,
    })
    expect(matches).toEqual({
      records: [exact],
      total: 2,
      truncated: true,
    })

    const updated = await store.update(PROJECT_A, {
      id: substring.id,
      content: "Reduced retries after the upstream fix.",
      tags: ["production", "verified", "verified"],
    })
    expect(updated).toMatchObject({
      id: substring.id,
      content: "Reduced retries after the upstream fix.",
      tags: ["production", "verified"],
    })
    await expect(
      store.search(PROJECT_A, { query: "upstream fix", limit: 20 })
    ).resolves.toMatchObject({
      records: [{ id: substring.id }],
      total: 1,
      truncated: false,
    })

    await expect(store.delete(PROJECT_A, exact.id)).resolves.toBe(true)
    await expect(store.delete(PROJECT_A, exact.id)).resolves.toBe(false)
    await expect(store.read(PROJECT_A, exact.id)).resolves.toBeNull()
  })

  it("rejects invalid scopes and bounded input without creating paths", async () => {
    const rootDirectory = await temporaryRoot()
    const store = new ClaudeMemoryStore({ rootDirectory })

    await expect(
      store.create("../outside", {
        type: "observation",
        title: "",
        content: "traversal",
        tags: [],
      })
    ).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      message: "The memory request is invalid.",
    })
    await expect(
      store.create(PROJECT_A, {
        type: "observation",
        title: "",
        content: "x".repeat(MAX_CLAUDE_MEMORY_CONTENT_LENGTH + 1),
        tags: [],
      })
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" })
    await expect(
      store.search(PROJECT_A, {
        query: "x",
        limit: MAX_CLAUDE_MEMORY_SEARCH_RESULTS + 1,
      })
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" })
    await expect(
      store.update(PROJECT_A, { id: PROJECT_B })
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" })
    await expect(access(join(rootDirectory, "outside"))).rejects.toThrow()
  })

  it("rejects project-directory and record-file symlink escapes", async () => {
    const rootDirectory = await temporaryRoot()
    const outsideDirectory = await temporaryRoot()
    const store = new ClaudeMemoryStore({ rootDirectory })
    await symlink(outsideDirectory, join(rootDirectory, PROJECT_A))

    const escaped = store.create(PROJECT_A, {
      type: "observation",
      title: "",
      content: "must not escape",
      tags: [],
    })
    await expect(escaped).rejects.toMatchObject({
      code: "TOOL_ERROR",
      message: "The local memory store could not complete the request.",
    })
    await expect(
      access(join(outsideDirectory, "records.json"))
    ).rejects.toThrow()

    await rm(join(rootDirectory, PROJECT_A))
    const record = await store.create(PROJECT_A, {
      type: "observation",
      title: "",
      content: "plain record",
      tags: [],
    })
    const outsideFile = join(outsideDirectory, "outside.json")
    const marker = "outside-memory-marker"
    await writeFile(outsideFile, marker)
    await rm(join(rootDirectory, PROJECT_A, "records.json"))
    await symlink(outsideFile, join(rootDirectory, PROJECT_A, "records.json"))

    const failure = await store
      .read(PROJECT_A, record.id)
      .catch((error: unknown) => error)
    expect(failure).toMatchObject({ code: "TOOL_ERROR" })
    expect(JSON.stringify(failure)).not.toContain(marker)
    await expect(readFile(outsideFile, "utf8")).resolves.toBe(marker)
  })

  it("enforces record limits and AbortSignal cancellation", async () => {
    const store = new ClaudeMemoryStore({
      rootDirectory: await temporaryRoot(),
      maxRecords: 1,
    })
    await store.create(PROJECT_A, {
      type: "observation",
      title: "",
      content: "first",
      tags: [],
    })

    await expect(
      store.create(PROJECT_A, {
        type: "observation",
        title: "",
        content: "second",
        tags: [],
      })
    ).rejects.toMatchObject({ code: "TOOL_ERROR" })

    const controller = new AbortController()
    controller.abort(new Error("private abort reason"))
    const failure = await store
      .search(
        PROJECT_A,
        { query: "first", limit: 20 },
        { signal: controller.signal }
      )
      .catch((error: unknown) => error)
    expect(failure).toMatchObject({
      code: "ABORTED",
      message: "The agent run was cancelled.",
    })
    expect(JSON.stringify(failure)).not.toContain("private abort reason")
  })
})

describe("Claude memory tools", () => {
  it("keeps mutations opt-in and shares the supplied tool budget", async () => {
    const rootDirectory = await temporaryRoot()
    const store = new ClaudeMemoryStore({ rootDirectory })
    const record = await store.create(PROJECT_A, {
      type: "observation",
      title: "Deployment",
      content: "Deployment completed.",
      tags: [],
    })
    const budget = new ToolExecutionBudget(1)
    const tools = createClaudeMemoryReadTools({
      store,
      projectId: PROJECT_A,
      budget,
    })
    const search = tools.searchMemory.execute as (
      input: { query: string; limit?: number },
      options: ToolExecutionOptions<unknown>
    ) => Promise<unknown>
    const read = tools.readMemory.execute as (
      input: { id: string },
      options: ToolExecutionOptions<unknown>
    ) => Promise<unknown>

    await expect(
      search({ query: "deployment" }, executionOptions())
    ).resolves.toMatchObject({
      records: [{ id: record.id }],
    })
    await expect(
      read({ id: record.id }, executionOptions())
    ).rejects.toMatchObject({ code: "TOOL_LIMIT_REACHED" })
    expect(budget.count).toBe(1)

    const defaultProvider = createClaudeMemoryToolProvider({ store })
    const defaultTools = defaultProvider.createTools({
      projectId: PROJECT_A,
      budget: new ToolExecutionBudget(5),
    })
    expect(Object.keys(defaultTools)).toEqual(["readMemory", "searchMemory"])

    const optedInTools = createClaudeMemoryToolProvider({
      store,
      includeMutations: true,
    }).createTools({
      projectId: PROJECT_A,
      budget: new ToolExecutionBudget(5),
    })
    expect(Object.keys(optedInTools)).toEqual([
      "readMemory",
      "searchMemory",
      "createMemory",
      "updateMemory",
      "deleteMemory",
    ])

    const mutationTools = createClaudeMemoryMutationToolProvider({
      store,
    }).createTools({
      projectId: PROJECT_A,
      budget: new ToolExecutionBudget(5),
    })
    expect(Object.keys(mutationTools)).toEqual([
      "createMemory",
      "updateMemory",
      "deleteMemory",
    ])
  })
})
