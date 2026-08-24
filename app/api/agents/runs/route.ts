import { agentRunRequestSchema, agentRunService } from "@/lib/agents"
import { normalizeAgentError } from "@/lib/agents/errors"
import { authenticateLocalAgentRequest } from "@/lib/agents/local-auth"

export const runtime = "nodejs"

const MAX_REQUEST_BYTES = 16 * 1024

function json(data: unknown, status: number): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  })
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
    const body = await request.text()

    if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BYTES) {
      return json({ error: "Request body is too large." }, 413)
    }

    input = JSON.parse(body)
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400)
  }

  const parsed = agentRunRequestSchema.safeParse(input)

  if (!parsed.success) {
    return json({ error: "Agent run request is invalid." }, 400)
  }

  const result = await agentRunService.run(parsed.data, {
    signal: request.signal,
  })

  if (result.ok) {
    return json(result, 200)
  }

  const status =
    result.error.code === "PROJECT_NOT_FOUND"
      ? 404
      : result.error.code === "INVALID_REQUEST"
        ? 400
        : result.status === "timed_out"
          ? 504
          : result.status === "cancelled"
            ? 499
            : result.error.code === "PROVIDER_AUTH_ERROR"
              ? 502
              : 500

  return json(result, status)
}
