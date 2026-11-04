import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const serverFile = resolve(dir, "../src/server.mjs");
const fixture = resolve(dir, "./fixtures/fake-rea.mjs");

async function start(extra = {}) {
  const child = spawn(process.execPath, [serverFile], {
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: "0",
      REA_ENTRY: fixture,
      ...extra,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let collected = "";
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });
  const port = await new Promise((resolvePort, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Startup timeout: " + stderr)),
      10000,
    );
    child.on("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error("Server exited: " + code + " " + stderr));
    });
    child.stdout.on("data", (chunk) => {
      collected += String(chunk);
      const match = collected.match(
        /listening on http:\/\/127\.0\.0\.1:(\d+)\/mcp/,
      );
      if (match) {
        clearTimeout(timeout);
        resolvePort(Number(match[1]));
      }
    });
  });
  return {
    child,
    url: "http://127.0.0.1:" + port,
    close: () => {
      child.kill("SIGTERM");
    },
  };
}
const rpc = (id, method, params) => ({ jsonrpc: "2.0", id, method, params });
async function post(url, object, headers = {}) {
  const response = await fetch(url + "/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify(object),
  });
  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

test("basic MCP protocol and read tool allowlist", async () => {
  const s = await start();
  try {
    const health = await fetch(s.url + "/health");
    assert.equal(health.status, 200);

    const init = await post(
      s.url,
      rpc(1, "initialize", {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "test", version: "0.0.1" },
      }),
    );
    assert.equal(init.status, 200);
    assert.equal(init.body.result.protocolVersion, "2025-06-18");

    const listed = await post(s.url, rpc(2, "tools/list", {}));
    assert.equal(listed.status, 200);
    assert.deepEqual(
      listed.body.result.tools.map((v) => v.name),
      ["inspect_web_page"],
    );
    assert.equal(listed.body.result.tools[0].annotations.readOnlyHint, true);

    const allowed = await post(
      s.url,
      rpc(3, "tools/call", {
        name: "inspect_web_page",
        arguments: { url: "https://example.org/" },
      }),
    );
    assert.equal(allowed.status, 200);
    assert.match(allowed.body.result.content[0].text, /inspect_web_page/);

    const denied = await post(
      s.url,
      rpc(4, "tools/call", { name: "execute_shell", arguments: {} }),
    );
    assert.equal(denied.status, 200);
    assert.equal(denied.body.error.code, -32602);

    const nope = await post(s.url, rpc(5, "tool/unknown", {}));
    assert.equal(nope.body.error.code, -32601);
    const notification = await fetch(s.url + "/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }),
    });
    assert.equal(notification.status, 202);
  } finally {
    s.close();
  }
});

test("token rejects requests without correct bearer value", async () => {
  const s = await start({ VARKAI_TOKEN: "local-test-secret" });
  try {
    const blocked = await post(s.url, rpc(1, "initialize", {}));
    assert.equal(blocked.status, 401);
    const permitted = await post(s.url, rpc(2, "initialize", {}), {
      authorization: "Bearer local-test-secret",
    });
    assert.equal(permitted.status, 200);
  } finally {
    s.close();
  }
});

test("non-loopback binding refused", async () => {
  const child = spawn(process.execPath, [serverFile], {
    env: { ...process.env, HOST: "0.0.0.0", PORT: "0", REA_ENTRY: fixture },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let text = "";
  child.stderr.on("data", (chunk) => {
    text += String(chunk);
  });
  const exitCode = await new Promise((resolveExit, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("refusal timeout"));
    }, 10000);
    child.on("exit", (code) => {
      clearTimeout(timeout);
      resolveExit(code);
    });
  });
  assert.notEqual(exitCode, 0);
  assert.match(text, /Refusing non-loopback bind/);
});
