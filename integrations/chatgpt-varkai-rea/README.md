# Varkai REA — ChatGPT integration (prototype)

A small, **private and read-focused** bridge between the existing REA stdio MCP server and ChatGPT-compatible Streamable HTTP clients. This does NOT modify REA's reverse-engineering engine.

**Status:** Fake-process tests, real REA 6.8.0 analysis, Kernel CDP inspection and MCP Inspector checks have passed. Not yet registered with ChatGPT or deployed as a persistent service. See [validation report](VALIDATION.md).

## Included

- Portable Agent Plugins manifest: [plugin.json](plugin.json)
- Onboarding and evidence-first workflow instructions: [skills/setup/SKILL.md](skills/setup/SKILL.md)
- Persistent REA stdio client: [src/rea-client.mjs](src/rea-client.mjs)
- Stateless JSON-response MCP HTTP gateway: [src/server.mjs](src/server.mjs)
- Deterministic fake REA process and protocol tests: [tests/](tests/)

The bridge exposes only an explicit allowlist of read-oriented REA tools that are present in the actual REA catalog at runtime. This protects against accidentally exporting invasive REA commands, but is **not** sufficient by itself to secure file-system access or browser target selection. Even read calls can disclose local information. Run on a dedicated, low-privilege analysis machine with disposable browser profiles and an isolated artifact directory.

## Local requirements

1. Node.js meeting REA 6.8.0 requirements: 22.x >= 22.23.4, 24.x >= 24.22.1, or 26.12.1+.
2. REA installed in a trusted, pinned directory. Do not rely on a mutable npx cache for production.
3. Optional REA providers, e.g. Chromium, JADX/JDK or Ghidra, depending on target. These do not come with the bridge.
4. A ChatGPT workspace/account authorized to add a custom MCP server and access permitted MCP tools.

## Start a private analysis gateway

From a trusted Linux/macOS host that already has Node.js installed:

    npm install --global rea-agents@6.8.0
    export REA_ENTRY="$(npm root -g)/rea-agents/scripts/rea.mjs"
    export HOST=127.0.0.1
    export PORT=3100
    node integrations/chatgpt-varkai-rea/src/server.mjs

This command assumes you are running in the REA checkout. When running elsewhere, supply the absolute path to server.mjs. The gateway binds only to loopback and refuses public interfaces.

    curl http://127.0.0.1:3100/health

An actual tool catalog request starts the REA subprocess. Example:

    curl -sS http://127.0.0.1:3100/mcp \
      -H 'Content-Type: application/json' \
      -H 'Accept: application/json, text/event-stream' \
      --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"probe","version":"1.0.0"}}}'

For private ChatGPT access, prefer a **Secure MCP Tunnel** that reaches the local gateway without a public bind. Check current ChatGPT workspace permissions; only then add a custom MCP server in ChatGPT Plugins, select Tunnel, and review the discovered tools. A tunnel or a separately authenticated reverse proxy must be configured by its operator; this repository does not create one automatically.

If using a remote HTTPS deployment, place a **trusted TLS/OAuth 2.1 gateway** in front of this loopback service and verify identity and per-user authorization there. Never expose the loopback service directly to the public internet. A static token can be enabled with VARKAI_TOKEN for local proxy testing, but this does not implement OAuth, multi-tenant isolation, or production access controls.

ChatGPT can connect to remote MCP services only where account/workspace permissions permit it; publication in the Plugin Directory and full write access are separate approval paths. This package being in GitHub does not mean the plugin is installed or connected.

## Verify

    node --test integrations/chatgpt-varkai-rea/tests/bridge.test.mjs

These tests launch a fake REA MCP subprocess to verify protocol, authentication and tool allowlisting. To test actual REA, install version 6.8.0 and run `REA_ENTRY=/absolute/path/to/rea-agents/scripts/rea.mjs node --test integrations/chatgpt-varkai-rea/tests/real-rea.test.mjs`. A successful real REA test does **not** establish a live ChatGPT plugin connection. Read the [validation report](VALIDATION.md).

## Kernel integration

Kernel is a _separately connected_ browser-automation provider in ChatGPT. A direct Chrome DevTools Protocol test succeeded when REA was installed **inside the same disposable Kernel browser VM** as Chrome; REA discovered the page, inspected its DOM and captured a screenshot. This arrangement is not an always-on ChatGPT plugin connection. A persistent worker, private tunnel and workspace authorization are still required. In other environments, use authorized exported browser artifacts rather than assuming a shared CDP endpoint.

## Reconstruction workflow

1. Define the authorized target and a bounded feature (not the entire product).
2. Capture screenshots, DOM, accessibility, scripts and interaction states; retain version/hash evidence.
3. Explain which assertions are directly observed vs inferred vs unknown.
4. Produce an independent implementation using licensed and owned material.
5. Compare functional behavior, animation frames/timing and responsive screenshots.
6. Record a reproducible verification report and remaining discrepancies.

**No universal perfect reverse engineering claim:** private server logic, protected material, deleted assets and missing observations are not recoverable from an arbitrary URL. Target-specific behavioral equivalence can be demonstrated under declared conditions; original-source identity cannot generally be proven.

## Next production tasks

- Add OAuth 2.1, user authorization, workspace separation, audit logs and rate limits.
- Add explicit filesystem-root and origin allowlists before exposing local artifacts to remote clients.
- Validate the HTTP transport against official MCP Inspector and a real ChatGPT plugin connection.
- Add browser-visual replay adapters to reconcile Kernel screenshots with REA evidence.
- Add scoped write workers (build/test/deploy) **only** after authorization and isolated execution; avoid exposing arbitrary shell execution as an agent tool.
- Integrate CI, real REA provider tests, reproducibility and performance budgets.

Upstream REA is MIT-licensed, copyright (c) 2026 morluto; preserve existing license and attribution. Analyze third-party software only within your authority, applicable law, licenses and platform terms.
