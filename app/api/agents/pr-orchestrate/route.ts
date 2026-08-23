import {
  prOrchestrationRequestSchema,
  prOrchestrationService,
  type PrOrchestrationResult,
} from "@/lib/agents"
import { normalizeAgentError } from "@/lib/agents/errors"
import { authenticateLocalAgentRequest } from "@/lib/agents/local-auth"

export const runtime = "nodejs"

const MAX_REQUEST_BYTES = 16 * 1024

class RequestBodyTooLargeError extends Error {}

function json(data: unknown, status: number): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  })
}

async function readBoundedBody(request: Request): Promise<string> {
  const reader = request.body?.getReader()

  if (!reader) {
    return ""
  }

  const chunks: Uint8Array[] = []
  let totalBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      totalBytes += value.byteLength

      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined)
        throw new RequestBodyTooLargeError()
      }

      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  return Buffer.concat(chunks, totalBytes).toString("utf8")
}

function resultStatus(result: PrOrchestrationResult): number {
  if (result.status === "timed_out") {
    return 504
  }

  if (result.status === "cancelled") {
    return 499
  }

  switch (result.error?.code) {
    case "INVALID_REQUEST":
      return 400
    case "PROJECT_NOT_FOUND":
      return 404
    case "PROJECT_NOT_READY":
      return 409
    case "CONFIGURATION_ERROR":
      return 503
    case "PROVIDER_AUTH_ERROR":
    case "PROVIDER_ERROR":
    case "PROVIDER_RATE_LIMITED":
    case "PROVIDER_UNAVAILABLE":
    case "MODEL_NOT_FOUND":
      return 502
    default:
      return 500
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    if (!authenticateLocalAgentRequest(request)) {
      return json({ error: "Unauthorized." }, 401)
    }
  } catch (error) {
    return json({ error: normalizeAgentError(error) }, 503)
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0")

  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return json({ error: "Request body is too large." }, 413)
  }

  let input: unknown

  try {
    input = JSON.parse(await readBoundedBody(request))
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return json({ error: "Request body is too large." }, 413)
    }

    if (request.signal.aborted) {
      return json(
        {
          ok: false,
          error: normalizeAgentError(request.signal.reason, { aborted: true }),
        },
        499
      )
    }

    return json({ error: "Request body must be valid JSON." }, 400)
  }

  const parsed = prOrchestrationRequestSchema.safeParse(input)

  if (!parsed.success) {
    return json({ error: "PR orchestration request is invalid." }, 400)
  }

  const result = await prOrchestrationService.run(parsed.data, {
    signal: request.signal,
  })

  return json(result, result.ok ? 200 : resultStatus(result))
}
