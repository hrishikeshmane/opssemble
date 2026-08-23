import { APICallError } from "ai"
import { describe, expect, it } from "vitest"

import { normalizeAgentError } from "./errors"

describe("normalizeAgentError", () => {
  it("normalizes provider errors without leaking provider payloads", () => {
    const secret = "do-not-leak-this-token"
    const error = new APICallError({
      message: `Request failed with ${secret}`,
      url: `https://example.invalid?token=${secret}`,
      requestBodyValues: { apiKey: secret },
      responseBody: `credential=${secret}`,
      statusCode: 403,
    })

    const normalized = normalizeAgentError(error)

    expect(normalized).toEqual({
      code: "PROVIDER_AUTH_ERROR",
      message:
        "The model provider rejected the configured credentials or access.",
      retryable: false,
    })
    expect(JSON.stringify(normalized)).not.toContain(secret)
  })

  it("distinguishes timeout and caller cancellation", () => {
    expect(
      normalizeAgentError(new Error("secret"), { timedOut: true }).code
    ).toBe("TIMEOUT")
    expect(
      normalizeAgentError(new Error("secret"), { aborted: true }).code
    ).toBe("ABORTED")
  })
})
