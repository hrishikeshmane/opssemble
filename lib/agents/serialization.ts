import type { SerializableValue } from "./types"

const MAX_DEPTH = 8
const MAX_ARRAY_ITEMS = 500
const MAX_OBJECT_KEYS = 200

export function toSerializableValue(
  value: unknown,
  depth = 0
): SerializableValue {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return value
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : String(value)
  }

  if (typeof value === "bigint") {
    return value.toString()
  }

  if (depth >= MAX_DEPTH) {
    return "[truncated]"
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => toSerializableValue(item, depth + 1))
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, MAX_OBJECT_KEYS)
        .map(([key, item]) => [key, toSerializableValue(item, depth + 1)])
    )
  }

  return String(value)
}
