import { describe, expect, it } from "vitest"

import { toSerializableValue } from "./serialization"

describe("agent result serialization", () => {
  it("preserves JSON primitive types", () => {
    expect(
      toSerializableValue({
        enabled: true,
        retryable: false,
        count: 2,
        mode: "simulated",
      })
    ).toEqual({
      enabled: true,
      retryable: false,
      count: 2,
      mode: "simulated",
    })
  })

  it("normalizes non-finite numbers", () => {
    expect(toSerializableValue([Number.NaN, Infinity, -Infinity])).toEqual([
      "NaN",
      "Infinity",
      "-Infinity",
    ])
  })
})
