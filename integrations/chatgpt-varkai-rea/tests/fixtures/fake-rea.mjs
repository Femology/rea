import { createInterface } from "node:readline";

const listed = [
  {
    name: "inspect_web_page",
    description: "Inspect a browser page",
    inputSchema: {
      type: "object",
      properties: { url: { type: "string" } },
      additionalProperties: false,
    },
  },
  {
    name: "execute_shell",
    description: "Dangerous example tool",
    inputSchema: { type: "object" },
  },
];
for await (const line of createInterface({ input: process.stdin })) {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    continue;
  }
  if (message.id === undefined) continue;
  let result;
  if (message.method === "initialize") {
    result = {
      protocolVersion: "2025-06-18",
      capabilities: { tools: {} },
      serverInfo: { name: "fake-rea", version: "0.0.1" },
    };
  } else if (message.method === "tools/list") {
    result = { tools: listed };
  } else if (message.method === "tools/call") {
    result = {
      content: [
        {
          type: "text",
          text: "observed " + JSON.stringify(message.params || {}),
        },
      ],
    };
  } else {
    result = {};
  }
  process.stdout.write(
    JSON.stringify({ jsonrpc: "2.0", id: message.id, result }) + "\n",
  );
}
