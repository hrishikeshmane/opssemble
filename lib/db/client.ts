import "server-only"

import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"

import * as schema from "./schema"

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url) {
  throw new Error("TURSO_DATABASE_URL is required")
}

if (url.startsWith("libsql://") && !authToken) {
  throw new Error("TURSO_AUTH_TOKEN is required for a remote Turso database")
}

export const turso = createClient({
  url,
  authToken,
})

export const db = drizzle(turso, { schema })
