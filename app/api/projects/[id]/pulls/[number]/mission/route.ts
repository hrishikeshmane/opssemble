import {
  prOrchestrationRequestSchema,
  prOrchestrationService,
} from "@/lib/agents"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  context: RouteContext<"/api/projects/[id]/pulls/[number]/mission">
): Promise<Response> {
  const { id, number } = await context.params
  let input: unknown

  try {
    input = await request.json()
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    )
  }

  const customInstructions =
    typeof input === "object" &&
    input !== null &&
    "customInstructions" in input &&
    typeof input.customInstructions === "string"
      ? input.customInstructions.trim() || undefined
      : undefined
  const parsed = prOrchestrationRequestSchema.safeParse({
    projectId: id,
    pullRequestNumber: Number(number),
    demoSessionId: `pr-${id}-${number}`,
    customInstructions,
  })

  if (!parsed.success) {
    return Response.json(
      { error: "Mission request is invalid." },
      { status: 400 }
    )
  }

  const result = await prOrchestrationService.run(parsed.data, {
    signal: request.signal,
  })

  return Response.json(result, {
    status: result.ok ? 200 : 500,
    headers: { "Cache-Control": "no-store" },
  })
}
