import { sql } from "drizzle-orm"
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

export const projectStatuses = [
  "cloning",
  "ready",
  "error",
  "archived",
] as const

export type ProjectStatus = (typeof projectStatuses)[number]

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull().default("github"),
    host: text("host").notNull().default("github.com"),
    owner: text("owner").notNull(),
    repository: text("repository").notNull(),
    providerRepositoryId: text("provider_repository_id"),
    remoteUrl: text("remote_url").notNull(),
    clonePath: text("clone_path").notNull(),
    defaultBranch: text("default_branch"),
    status: text("status", { enum: projectStatuses })
      .notNull()
      .default("cloning"),
    lastError: text("last_error"),
    lastSyncedAt: integer("last_synced_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("projects_provider_repository_unique").on(
      table.provider,
      table.host,
      table.owner,
      table.repository
    ),
    uniqueIndex("projects_clone_path_unique").on(table.clonePath),
  ]
)

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
