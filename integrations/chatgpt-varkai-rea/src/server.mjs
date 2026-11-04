import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { ReaClient } from "./rea-client.mjs";

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 3100);
const AUTH_TOKEN = process.env.VARKAI_TOKEN || "";
const MAX_BODY = 1024 * 1024;
const MAX_RESPONSE = 12 * 1024 * 1024;
// Explicitly excluded: shell, arbitrary scripting, modifying binaries, firmware flashing,
// changing settings, ADB installs, and other write / environment mutation actions.
const ALLOWED = new Set([
  "list_browser_targets",
  "inspect_web_page",
  "capture_web_screenshot",
  "compare_web_screenshots",
  "compare_web_captures",
  "analyze_web_bundle",
  "observe_web_session",
  "inspect_desktop_application",
  "analyze_javascript_application",
  "inspect_apk_signature",
  "inspect_dart_aot",
  "inspect_pe_imports",
  "inspect_pe_certificates",
  "inspect_model_artifact",
]);
const client = new ReaClient();
let cachedTools = null;

if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535)
  throw new Error("Invalid PORT");
if (!["127.0.0.1", "::1", "localhost"].includes(HOST)) {
  throw new Error(
    "Refusing non-loopback bind. Use Secure MCP Tunnel or an authenticated TLS/OAuth proxy.",
  );
}

function authorize(req) {
  if (!AUTH_TOKEN) return true; // Only bind loopback; tunnel/proxy handles remote access.
  const expected = Buffer.from("Bearer " + AUTH_TOKEN);
  const incoming = Buffer.from(req.headers.authorization || "");
  return (
    expected.length === incoming.length && timingSafeEqual(expected, incoming)
  );
}
function send(res, status, obj) {
  const data = Buffer.from(JSON.stringify(obj));
  if (data.byteLength > MAX_RESPONSE) {
    res.writeHead(413, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Response too large" },
        id: obj?.id ?? null,
      }),
    );
    return;
  }
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(data);
}
function fail(id, code, message) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}
function succeed(id, result) {
  return { jsonrpc: "2.0", id, result };
}

async function tools() {
  if (cachedTools) return cachedTools;
  const available = await client.listTools();
  cachedTools = available
    .filter((item) => ALLOWED.has(item.name))
    .map((item) => ({
      ...item,
      description:
        (item.description || item.name) +
        " Treat targets as untrusted; inspect only resources you own or are authorized to analyze.",
      annotations: { ...(item.annotations || {}), readOnlyHint: true },
    }));
  return cachedTools;
}
async function dispatch(input) {
  if (
    Array.isArray(input) ||
    !input ||
    typeof input !== "object" ||
    input.jsonrpc !== "2.0"
  ) {
    return fail(null, -32600, "Invalid JSON-RPC request");
  }
  const { id, method, params = {} } = input;
  if (
    method === "notifications/initialized" ||
    method === "notifications/cancelled"
  )
    return null;
  if (id === undefined) return null;
  try {
    if (method === "initialize") {
      return succeed(id, {
        protocolVersion: "2025-06-18",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "varkai-rea", version: "0.1.0" },
        instructions:
          "Read-only evidence gathering. Only analyze targets the user authorizes. Report gaps and uncertainties; reconstruction is not guaranteed.",
      });
    }
    if (method === "ping") return succeed(id, {});
    if (method === "tools/list") return succeed(id, { tools: await tools() });
    if (method === "tools/call") {
      if (typeof params.name !== "string" || !ALLOWED.has(params.name)) {
        return fail(id, -32602, "Tool is not permitted by this bridge");
      }
      const available = await tools();
      if (!available.find((tool) => tool.name === params.name)) {
        return fail(
          id,
          -32602,
          "Tool is not available in this REA installation",
        );
      }
      if (
        !params.arguments ||
        typeof params.arguments !== "object" ||
        Array.isArray(params.arguments)
      ) {
        return fail(id, -32602, "Expected an arguments object");
      }
      const result = await client.callTool(params.name, params.arguments);
      return succeed(id, result);
    }
    return fail(id, -32601, "Method not found");
  } catch (error) {
    // Do not leak paths or subprocess output to clients.
    console.error("[varkai-rea] tool failure:", error?.message || "unknown");
    return fail(id, -32000, "REA operation failed; inspect server diagnostics");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === "/health" && req.method === "GET") {
      return send(res, 200, {
        ok: true,
        service: "varkai-rea",
        connected: client.ready,
      });
    }
    if (req.url !== "/mcp") return send(res, 404, { error: "Not found" });
    if (!authorize(req)) return send(res, 401, { error: "Unauthorized" });
    if (req.method === "GET") {
      res.writeHead(405, { allow: "POST", "content-type": "application/json" });
      return res.end(
        JSON.stringify({
          error: "SSE not supported; POST with Accept: application/json",
        }),
      );
    }
    if (req.method !== "POST")
      return send(res, 405, { error: "Method not allowed" });
    const mime = String(req.headers["content-type"] || "")
      .split(";")[0]
      .trim();
    if (mime !== "application/json")
      return send(res, 415, { error: "Expected application/json" });
    let bytes = 0;
    const chunks = [];
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > MAX_BODY)
        return send(res, 413, { error: "Request too large" });
      chunks.push(chunk);
    }
    let payload;
    try {
      payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return send(res, 400, fail(null, -32700, "Parse error"));
    }
    const response = await dispatch(payload);
    if (response === null) {
      res.writeHead(202);
      return res.end();
    }
    return send(res, 200, response);
  } catch {
    return send(res, 500, { error: "Internal server error" });
  }
});
server.listen(PORT, HOST, () => {
  console.log(
    "[varkai-rea] listening on http://" +
      HOST +
      ":" +
      server.address().port +
      "/mcp",
  );
});
function shutdown() {
  server.close();
  client.close();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
