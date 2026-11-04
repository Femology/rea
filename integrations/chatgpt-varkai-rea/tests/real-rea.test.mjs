import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const serverFile = fileURLToPath(new URL("../src/server.mjs", import.meta.url));

async function startServer(entry) {
  const child = spawn(process.env.REA_NODE || process.execPath, [serverFile], {
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: "0",
      REA_ENTRY: resolve(entry),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  let errorOutput = "";
  child.stderr.setEncoding("utf8").on("data", (data) => {
    errorOutput += data;
  });
  const port = await new Promise((resolvePort, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Real REA bridge startup timed out"));
    }, 15_000);
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error("Bridge exited " + code + ": " + errorOutput));
    });
    child.stdout.setEncoding("utf8").on("data", (chunk) => {
      output += chunk;
      const found = output.match(
        /listening on http:\/\/127\.0\.0\.1:(\d+)\/mcp/u,
      );
      if (found) {
        clearTimeout(timer);
        resolvePort(Number(found[1]));
      }
    });
  });
  return {
    url: "http://127.0.0.1:" + port + "/mcp",
    close() {
      child.kill("SIGTERM");
    },
  };
}

async function post(url, id, method, params = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    signal: AbortSignal.timeout(90_000),
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.error, undefined, JSON.stringify(result.error));
  return result.result;
}

test(
  "real REA discovers tools and analyzes owned JavaScript with evidence",
  { timeout: 110_000 },
  async (t) => {
    if (!process.env.REA_ENTRY) {
      t.skip("REA_ENTRY must identify the installed REA launcher");
      return;
    }

    const directory = await mkdtemp(join(tmpdir(), "varkai-rea-owned-"));
    const server = await startServer(process.env.REA_ENTRY);
    try {
      await writeFile(
        join(directory, "feature.mjs"),
        "export function add(a, b) { return a + b; }\n",
      );
      const discovered = await post(server.url, 1, "tools/list");
      const names = discovered.tools.map((tool) => tool.name);
      assert.ok(names.includes("analyze_javascript_application"));
      assert.ok(names.includes("inspect_web_page"));
      assert.ok(!names.includes("execute_shell"));

      const inspected = await post(server.url, 2, "tools/call", {
        name: "analyze_javascript_application",
        arguments: {
          input_path: directory,
          source_paths: ["feature.mjs"],
          detail: "summary",
          analysis_timeout_ms: 30_000,
        },
      });

      assert.equal(inspected.isError, undefined);
      assert.match(inspected.structuredContent.evidence_id, /^ev_/u);
      assert.equal(
        inspected.structuredContent.normalized_result.parent_operation,
        "analyze_javascript_application",
      );

      const forbidden = await fetch(server.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name: "execute_shell", arguments: {} },
        }),
      }).then((value) => value.json());
      assert.equal(forbidden.error.code, -32602);
    } finally {
      server.close();
      await rm(directory, { recursive: true, force: true });
    }
  },
);
