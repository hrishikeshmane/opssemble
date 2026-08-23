import { createMCPClient } from "@ai-sdk/mcp";

const baseUrl = (process.env.MCP_BASE_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
const token = process.env.MCP_TOKEN ?? "test-mcp-token";
const expected = {
  control: ["get_demo_state", "list_scenarios", "reset_demo_session", "set_scenario"],
  planner: ["get_change_context", "list_changes"],
  agent: ["get_events", "get_logs", "get_metrics", "get_traces"],
  actions: ["execute_action", "get_action_status"],
};

for (const [profile, expectedTools] of Object.entries(expected)) {
  const client = await createMCPClient({
    clientName: "opssemble-ai-sdk-smoke",
    version: "1.0.0",
    transport: {
      type: "http",
      url: `${baseUrl}/mcp/${profile}/`,
      headers: { authorization: `Bearer ${token}` },
    },
  });
  try {
    const tools = await client.tools();
    const actual = Object.keys(tools).sort();
    if (JSON.stringify(actual) !== JSON.stringify(expectedTools)) {
      throw new Error(`${profile}: expected ${expectedTools.join(", ")}; received ${actual.join(", ")}`);
    }
  } finally {
    await client.close();
  }
}

console.log("AI SDK createMCPClient smoke passed for all four profiles");
