import { normalizeAgentError } from "@/lib/agents/errors"
import { authenticateLocalAgentRequest } from "@/lib/agents/local-auth"
import { mcpSmokeRequestSchema, mcpSmokeService } from "@/lib/agents/mcp-smoke"

export const runtime = "nodejs"

const MAX_REQUEST_BYTES = 8 * 1024

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

function runtimeFailureStatus(code: string): number {
  if (code === "CONFIGURATION_ERROR") {
    return 503
  }

  if (code === "TIMEOUT") {
    return 504
  }

  if (code === "ABORTED") {
    return 499
  }

  return 500
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

  const parsed = mcpSmokeRequestSchema.safeParse(input)

  if (!parsed.success) {
    return json({ error: "MCP smoke request is invalid." }, 400)
  }

  const result = await mcpSmokeService.run(parsed.data, {
    signal: request.signal,
  })

  return json(result, result.ok ? 200 : runtimeFailureStatus(result.error.code))
}
