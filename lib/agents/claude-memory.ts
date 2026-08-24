import "server-only"

import { randomUUID } from "node:crypto"
import { constants } from "node:fs"
import { lstat, mkdir, open, realpath, rename, rm } from "node:fs/promises"
import { homedir } from "node:os"
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path"

import { tool } from "ai"
import { z } from "zod"

import { AgentRuntimeError } from "./errors"
import type { AgentToolProvider } from "./tool-provider"
import type { ToolExecutionBudget } from "./tools"

export const MAX_CLAUDE_MEMORY_RECORDS = 500
export const MAX_CLAUDE_MEMORY_CONTENT_LENGTH = 32_768
export const MAX_CLAUDE_MEMORY_SEARCH_RESULTS = 50

const MAX_MEMORY_FILE_BYTES = 64 * 1_024 * 1_024
const MAX_MEMORY_TITLE_LENGTH = 256
const MAX_MEMORY_TYPE_LENGTH = 64
const MAX_MEMORY_TAGS = 24
const MAX_MEMORY_TAG_LENGTH = 64
const MAX_MEMORY_QUERY_LENGTH = 512
const MEMORY_FILE_NAME = "records.json"
const MEMORY_FILE_VERSION = 1
const MEMORY_ERROR_MESSAGE =
  "The local memory store could not complete the request."
const INVALID_MEMORY_REQUEST_MESSAGE = "The memory request is invalid."

export const DEFAULT_CLAUDE_MEMORY_ROOT = resolve(
  homedir(),
  ".opssemble",
  "claude-mem"
)

export const claudeMemoryProjectIdSchema = z
  .string()
  .uuid()
  .transform((value) => value.toLowerCase())

export const claudeMemoryRecordIdSchema = z
  .string()
  .uuid()
  .transform((value) => value.toLowerCase())

const memoryTitleSchema = z.string().trim().max(MAX_MEMORY_TITLE_LENGTH)
const memoryContentSchema = z
  .string()
  .min(1)
  .max(MAX_CLAUDE_MEMORY_CONTENT_LENGTH)
  .refine((value) => value.trim().length > 0)
const memoryTypeSchema = z.string().trim().min(1).max(MAX_MEMORY_TYPE_LENGTH)
const memoryTagsSchema = z
  .array(z.string().trim().min(1).max(MAX_MEMORY_TAG_LENGTH))
  .max(MAX_MEMORY_TAGS)
  .transform((tags) => [...new Set(tags)])

export const claudeMemoryRecordSchema = z
  .object({
    id: claudeMemoryRecordIdSchema,
    projectId: claudeMemoryProjectIdSchema,
    type: memoryTypeSchema,
    title: memoryTitleSchema,
    content: memoryContentSchema,
    tags: memoryTagsSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict()

export const createClaudeMemoryInputSchema = z
  .object({
    type: memoryTypeSchema.default("observation"),
    title: memoryTitleSchema.default(""),
    content: memoryContentSchema,
    tags: memoryTagsSchema.default([]),
  })
  .strict()

export const readClaudeMemoryInputSchema = z
  .object({
    id: claudeMemoryRecordIdSchema,
  })
  .strict()

export const updateClaudeMemoryInputSchema = z
  .object({
    id: claudeMemoryRecordIdSchema,
    type: memoryTypeSchema.optional(),
    title: memoryTitleSchema.optional(),
    content: memoryContentSchema.optional(),
    tags: memoryTagsSchema.optional(),
  })
  .strict()
  .refine(
    ({ type, title, content, tags }) =>
      type !== undefined ||
      title !== undefined ||
      content !== undefined ||
      tags !== undefined
  )

export const deleteClaudeMemoryInputSchema = readClaudeMemoryInputSchema

export const searchClaudeMemoryInputSchema = z
  .object({
    query: z.string().trim().min(1).max(MAX_MEMORY_QUERY_LENGTH),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_CLAUDE_MEMORY_SEARCH_RESULTS)
      .default(20),
  })
  .strict()

export type ClaudeMemoryRecord = z.infer<typeof claudeMemoryRecordSchema>
export type CreateClaudeMemoryInput = z.infer<
  typeof createClaudeMemoryInputSchema
>
export type UpdateClaudeMemoryInput = z.infer<
  typeof updateClaudeMemoryInputSchema
>
export type SearchClaudeMemoryInput = z.infer<
  typeof searchClaudeMemoryInputSchema
>

export type ClaudeMemorySearchResult = {
  records: ClaudeMemoryRecord[]
  total: number
  truncated: boolean
}

export type ClaudeMemoryOperationOptions = {
  signal?: AbortSignal
}

export type ClaudeMemoryStoreOptions = {
  rootDirectory?: string
  maxRecords?: number
}

type MemoryDocument = {
  version: typeof MEMORY_FILE_VERSION
  records: ClaudeMemoryRecord[]
}

const memoryDocumentSchema = z
  .object({
    version: z.literal(MEMORY_FILE_VERSION),
    records: z.array(claudeMemoryRecordSchema).max(MAX_CLAUDE_MEMORY_RECORDS),
  })
  .strict()

function invalidMemoryRequest(): AgentRuntimeError {
  return new AgentRuntimeError(
    "INVALID_REQUEST",
    INVALID_MEMORY_REQUEST_MESSAGE
  )
}

function memoryStoreError(): AgentRuntimeError {
  return new AgentRuntimeError("TOOL_ERROR", MEMORY_ERROR_MESSAGE)
}

function abortedError(): AgentRuntimeError {
  return new AgentRuntimeError("ABORTED", "The agent run was cancelled.")
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw abortedError()
  }
}

function parseInput<OUTPUT>(schema: z.ZodType<OUTPUT>, input: unknown): OUTPUT {
  const result = schema.safeParse(input)

  if (!result.success) {
    throw invalidMemoryRequest()
  }

  return result.data
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error
}

function isContained(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate)
  return (
    pathFromRoot === "" ||
    (!pathFromRoot.startsWith(`..${sep}`) &&
      pathFromRoot !== ".." &&
      !isAbsolute(pathFromRoot))
  )
}

function normalizeMemoryError(
  error: unknown,
  signal?: AbortSignal
): AgentRuntimeError {
  if (signal?.aborted) {
    return abortedError()
  }

  if (error instanceof AgentRuntimeError) {
    return error
  }

  return memoryStoreError()
}

function emptyDocument(): MemoryDocument {
  return {
    version: MEMORY_FILE_VERSION,
    records: [],
  }
}

export class ClaudeMemoryStore {
  readonly rootDirectory: string
  readonly maxRecords: number

  private readonly mutationTails = new Map<string, Promise<void>>()

  constructor(options: ClaudeMemoryStoreOptions = {}) {
    const maxRecords = options.maxRecords ?? MAX_CLAUDE_MEMORY_RECORDS

    if (
      !Number.isInteger(maxRecords) ||
      maxRecords < 1 ||
      maxRecords > MAX_CLAUDE_MEMORY_RECORDS
    ) {
      throw new AgentRuntimeError(
        "CONFIGURATION_ERROR",
        "The local memory store configuration is invalid."
      )
    }

    this.rootDirectory = resolve(
      options.rootDirectory ?? DEFAULT_CLAUDE_MEMORY_ROOT
    )
    this.maxRecords = maxRecords
  }

  async create(
    projectId: string,
    input: CreateClaudeMemoryInput,
    options: ClaudeMemoryOperationOptions = {}
  ): Promise<ClaudeMemoryRecord> {
    const scope = parseInput(claudeMemoryProjectIdSchema, projectId)
    const values = parseInput(createClaudeMemoryInputSchema, input)

    try {
      throwIfAborted(options.signal)

      return await this.withMutationLock(scope, async () => {
        const document = await this.readDocument(scope, options.signal)

        if (document.records.length >= this.maxRecords) {
          throw memoryStoreError()
        }

        const timestamp = new Date().toISOString()
        const record = claudeMemoryRecordSchema.parse({
          id: randomUUID(),
          projectId: scope,
          ...values,
          createdAt: timestamp,
          updatedAt: timestamp,
        })

        document.records.push(record)
        await this.writeDocument(scope, document, options.signal)
        return record
      })
    } catch (error) {
      throw normalizeMemoryError(error, options.signal)
    }
  }

  async read(
    projectId: string,
    recordId: string,
    options: ClaudeMemoryOperationOptions = {}
  ): Promise<ClaudeMemoryRecord | null> {
    const scope = parseInput(claudeMemoryProjectIdSchema, projectId)
    const id = parseInput(claudeMemoryRecordIdSchema, recordId)

    try {
      throwIfAborted(options.signal)
      const document = await this.readDocument(scope, options.signal)
      throwIfAborted(options.signal)
      return document.records.find((record) => record.id === id) ?? null
    } catch (error) {
      throw normalizeMemoryError(error, options.signal)
    }
  }

  async update(
    projectId: string,
    input: UpdateClaudeMemoryInput,
    options: ClaudeMemoryOperationOptions = {}
  ): Promise<ClaudeMemoryRecord | null> {
    const scope = parseInput(claudeMemoryProjectIdSchema, projectId)
    const values = parseInput(updateClaudeMemoryInputSchema, input)

    try {
      throwIfAborted(options.signal)

      return await this.withMutationLock(scope, async () => {
        const document = await this.readDocument(scope, options.signal)
        const index = document.records.findIndex(
          (record) => record.id === values.id
        )

        if (index < 0) {
          return null
        }

        const current = document.records[index]
        const updated = claudeMemoryRecordSchema.parse({
          ...current,
          ...(values.type === undefined ? {} : { type: values.type }),
          ...(values.title === undefined ? {} : { title: values.title }),
          ...(values.content === undefined ? {} : { content: values.content }),
          ...(values.tags === undefined ? {} : { tags: values.tags }),
          updatedAt: new Date().toISOString(),
        })

        document.records[index] = updated
        await this.writeDocument(scope, document, options.signal)
        return updated
      })
    } catch (error) {
      throw normalizeMemoryError(error, options.signal)
    }
  }

  async delete(
    projectId: string,
    recordId: string,
    options: ClaudeMemoryOperationOptions = {}
  ): Promise<boolean> {
    const scope = parseInput(claudeMemoryProjectIdSchema, projectId)
    const id = parseInput(claudeMemoryRecordIdSchema, recordId)

    try {
      throwIfAborted(options.signal)

      return await this.withMutationLock(scope, async () => {
        const document = await this.readDocument(scope, options.signal)
        const remaining = document.records.filter((record) => record.id !== id)

        if (remaining.length === document.records.length) {
          return false
        }

        await this.writeDocument(
          scope,
          { ...document, records: remaining },
          options.signal
        )
        return true
      })
    } catch (error) {
      throw normalizeMemoryError(error, options.signal)
    }
  }

  async search(
    projectId: string,
    input: SearchClaudeMemoryInput,
    options: ClaudeMemoryOperationOptions = {}
  ): Promise<ClaudeMemorySearchResult> {
    const scope = parseInput(claudeMemoryProjectIdSchema, projectId)
    const { query, limit } = parseInput(searchClaudeMemoryInputSchema, input)

    try {
      throwIfAborted(options.signal)
      const document = await this.readDocument(scope, options.signal)
      const normalizedQuery = query.toLowerCase()
      const matches: Array<{ rank: number; record: ClaudeMemoryRecord }> = []

      for (const record of document.records) {
        throwIfAborted(options.signal)
        const values = [
          record.type,
          record.title,
          record.content,
          ...record.tags,
        ].map((value) => value.toLowerCase())
        const exact = values.some((value) => value === normalizedQuery)

        if (exact || values.some((value) => value.includes(normalizedQuery))) {
          matches.push({ rank: exact ? 0 : 1, record })
        }
      }

      matches.sort(
        (left, right) =>
          left.rank - right.rank ||
          right.record.updatedAt.localeCompare(left.record.updatedAt) ||
          left.record.id.localeCompare(right.record.id)
      )

      return {
        records: matches.slice(0, limit).map(({ record }) => record),
        total: matches.length,
        truncated: matches.length > limit,
      }
    } catch (error) {
      throw normalizeMemoryError(error, options.signal)
    }
  }

  private async withMutationLock<RESULT>(
    projectId: string,
    operation: () => Promise<RESULT>
  ): Promise<RESULT> {
    const previous = this.mutationTails.get(projectId) ?? Promise.resolve()
    let release: () => void = () => undefined
    const current = new Promise<void>((resolveLock) => {
      release = resolveLock
    })
    const tail = previous.then(() => current)
    this.mutationTails.set(projectId, tail)

    await previous

    try {
      return await operation()
    } finally {
      release()

      if (this.mutationTails.get(projectId) === tail) {
        this.mutationTails.delete(projectId)
      }
    }
  }

  private async resolveRoot(): Promise<string> {
    await mkdir(this.rootDirectory, { recursive: true, mode: 0o700 })
    const stats = await lstat(this.rootDirectory)

    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw memoryStoreError()
    }

    return realpath(this.rootDirectory)
  }

  private async resolveProjectDirectory(
    projectId: string,
    create: boolean
  ): Promise<string | null> {
    const root = await this.resolveRoot()
    const projectDirectory = join(root, projectId)

    if (
      dirname(projectDirectory) !== root ||
      !isContained(root, projectDirectory)
    ) {
      throw memoryStoreError()
    }

    let stats

    try {
      stats = await lstat(projectDirectory)
    } catch (error) {
      if (!isNodeError(error) || error.code !== "ENOENT") {
        throw error
      }

      if (!create) {
        return null
      }

      try {
        await mkdir(projectDirectory, { mode: 0o700 })
      } catch (mkdirError) {
        if (!isNodeError(mkdirError) || mkdirError.code !== "EEXIST") {
          throw mkdirError
        }
      }

      stats = await lstat(projectDirectory)
    }

    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw memoryStoreError()
    }

    const canonicalProjectDirectory = await realpath(projectDirectory)

    if (
      dirname(canonicalProjectDirectory) !== root ||
      !isContained(root, canonicalProjectDirectory)
    ) {
      throw memoryStoreError()
    }

    return canonicalProjectDirectory
  }

  private async readDocument(
    projectId: string,
    signal?: AbortSignal
  ): Promise<MemoryDocument> {
    throwIfAborted(signal)
    const projectDirectory = await this.resolveProjectDirectory(
      projectId,
      false
    )

    if (!projectDirectory) {
      return emptyDocument()
    }

    const filePath = join(projectDirectory, MEMORY_FILE_NAME)
    let stats

    try {
      stats = await lstat(filePath)
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return emptyDocument()
      }

      throw error
    }

    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw memoryStoreError()
    }

    const file = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW)

    try {
      const openedStats = await file.stat()

      if (
        !openedStats.isFile() ||
        openedStats.size < 1 ||
        openedStats.size > MAX_MEMORY_FILE_BYTES
      ) {
        throw memoryStoreError()
      }

      const content = await file.readFile({ encoding: "utf8" })
      throwIfAborted(signal)

      if (Buffer.byteLength(content) > MAX_MEMORY_FILE_BYTES) {
        throw memoryStoreError()
      }

      let decoded: unknown

      try {
        decoded = JSON.parse(content)
      } catch {
        throw memoryStoreError()
      }

      const parsed = memoryDocumentSchema.safeParse(decoded)

      if (
        !parsed.success ||
        parsed.data.records.length > this.maxRecords ||
        parsed.data.records.some((record) => record.projectId !== projectId) ||
        new Set(parsed.data.records.map(({ id }) => id)).size !==
          parsed.data.records.length
      ) {
        throw memoryStoreError()
      }

      return parsed.data
    } finally {
      await file.close()
    }
  }

  private async writeDocument(
    projectId: string,
    document: MemoryDocument,
    signal?: AbortSignal
  ): Promise<void> {
    throwIfAborted(signal)
    const parsed = memoryDocumentSchema.safeParse(document)

    if (
      !parsed.success ||
      parsed.data.records.length > this.maxRecords ||
      parsed.data.records.some((record) => record.projectId !== projectId)
    ) {
      throw memoryStoreError()
    }

    const projectDirectory = await this.resolveProjectDirectory(projectId, true)

    if (!projectDirectory) {
      throw memoryStoreError()
    }

    const filePath = join(projectDirectory, MEMORY_FILE_NAME)

    try {
      const stats = await lstat(filePath)

      if (!stats.isFile() || stats.isSymbolicLink()) {
        throw memoryStoreError()
      }
    } catch (error) {
      if (!isNodeError(error) || error.code !== "ENOENT") {
        throw error
      }
    }

    const serialized = `${JSON.stringify(parsed.data)}\n`

    if (Buffer.byteLength(serialized) > MAX_MEMORY_FILE_BYTES) {
      throw memoryStoreError()
    }

    const temporaryPath = join(projectDirectory, `.records-${randomUUID()}.tmp`)
    let temporaryFile: Awaited<ReturnType<typeof open>> | undefined

    try {
      temporaryFile = await open(
        temporaryPath,
        constants.O_WRONLY |
          constants.O_CREAT |
          constants.O_EXCL |
          constants.O_NOFOLLOW,
        0o600
      )
      await temporaryFile.writeFile(serialized, { encoding: "utf8" })
      await temporaryFile.sync()
      await temporaryFile.close()
      temporaryFile = undefined
      throwIfAborted(signal)
      await rename(temporaryPath, filePath)
    } finally {
      await temporaryFile?.close().catch(() => undefined)
      await rm(temporaryPath, { force: true }).catch(() => undefined)
    }
  }
}

export type ClaudeMemoryToolContext = {
  projectId: string
  budget: ToolExecutionBudget
}

export function createClaudeMemoryReadTools({
  store,
  projectId,
  budget,
}: ClaudeMemoryToolContext & { store: ClaudeMemoryStore }) {
  const scope = parseInput(claudeMemoryProjectIdSchema, projectId)

  return {
    readMemory: tool({
      description:
        "Read one local memory record from the current project by ID.",
      inputSchema: readClaudeMemoryInputSchema,
      execute: async ({ id }, { abortSignal }) => {
        budget.claim()
        return {
          record: await store.read(scope, id, { signal: abortSignal }),
        }
      },
    }),
    searchMemory: tool({
      description:
        "Search bounded local memory records for the current project.",
      inputSchema: searchClaudeMemoryInputSchema,
      execute: async (input, { abortSignal }) => {
        budget.claim()
        return store.search(scope, input, { signal: abortSignal })
      },
    }),
  }
}

export function createClaudeMemoryMutationTools({
  store,
  projectId,
  budget,
}: ClaudeMemoryToolContext & { store: ClaudeMemoryStore }) {
  const scope = parseInput(claudeMemoryProjectIdSchema, projectId)

  return {
    createMemory: tool({
      description:
        "Create a bounded local memory record for the current project.",
      inputSchema: createClaudeMemoryInputSchema,
      execute: async (input, { abortSignal }) => {
        budget.claim()
        return {
          record: await store.create(scope, input, { signal: abortSignal }),
        }
      },
    }),
    updateMemory: tool({
      description:
        "Update an existing local memory record for the current project.",
      inputSchema: updateClaudeMemoryInputSchema,
      execute: async (input, { abortSignal }) => {
        budget.claim()
        return {
          record: await store.update(scope, input, { signal: abortSignal }),
        }
      },
    }),
    deleteMemory: tool({
      description:
        "Delete one local memory record from the current project by ID.",
      inputSchema: deleteClaudeMemoryInputSchema,
      execute: async ({ id }, { abortSignal }) => {
        budget.claim()
        return {
          deleted: await store.delete(scope, id, { signal: abortSignal }),
        }
      },
    }),
  }
}

export type ClaudeMemoryReadTools = ReturnType<
  typeof createClaudeMemoryReadTools
>
export type ClaudeMemoryMutationTools = ReturnType<
  typeof createClaudeMemoryMutationTools
>

export function createClaudeMemoryToolProvider(
  options: {
    store?: ClaudeMemoryStore
    includeMutations?: boolean
  } = {}
) {
  const store = options.store ?? new ClaudeMemoryStore()

  return {
    id: "claude-memory",
    kind: "memory",
    createTools(context: ClaudeMemoryToolContext) {
      const readTools = createClaudeMemoryReadTools({ store, ...context })

      if (!options.includeMutations) {
        return readTools
      }

      return {
        ...readTools,
        ...createClaudeMemoryMutationTools({ store, ...context }),
      }
    },
  } satisfies AgentToolProvider<ClaudeMemoryToolContext>
}

export function createClaudeMemoryMutationToolProvider(
  options: { store?: ClaudeMemoryStore } = {}
) {
  const store = options.store ?? new ClaudeMemoryStore()

  return {
    id: "claude-memory-mutations",
    kind: "memory",
    createTools(context: ClaudeMemoryToolContext) {
      return createClaudeMemoryMutationTools({ store, ...context })
    },
  } satisfies AgentToolProvider<
    ClaudeMemoryToolContext,
    ClaudeMemoryMutationTools
  >
}

export const claudeMemoryToolProvider = createClaudeMemoryToolProvider()
