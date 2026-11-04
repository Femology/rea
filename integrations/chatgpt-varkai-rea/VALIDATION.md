# Varkai REA validation report — 2026-11-04

This report records **observed** checks on the private Varkai REA ChatGPT bridge prototype. It is not a public-plugin readiness certificate. No private account, application or third-party protected binary was analyzed in these checks.

## Tested implementation

- Fork: `Femology/rea`, pull request #1, branch `feat/chatgpt-varkai-rea-mcp-bridge`.
- REA release: `rea-agents@6.8.0`.
- Runtime: Node.js `v24.22.1`.
- Browser: isolated Kernel Chrome session, local CDP on loopback `127.0.0.1:9222`.
- Gateway: `integrations/chatgpt-varkai-rea/src/server.mjs`, loopback-only MCP HTTP adapter to a persistent REA stdio process.

## Observed test results

| Check                                       | Result                | What it proves                                                                                                                                        |
| ------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fake REA protocol tests                     | 3/3 pass              | MCP initialize, tool selection, forbidden-tool rejection, optional bearer token, and refusing non-loopback listeners                                  |
| Real REA source analysis smoke test         | 1/1 pass              | The gateway can discover actual REA tools and invoke `analyze_javascript_application` on an owned JavaScript fixture; structured evidence is returned |
| Real REA tool discovery                     | 14 allowed tools      | The allowlist matches tool names advertised by REA 6.8.0                                                                                              |
| Kernel Chrome target discovery              | Pass                  | REA can attach to the disposable Kernel Chrome CDP endpoint **when it runs in the same browser VM**                                                   |
| Real website DOM / accessibility inspection | Pass                  | `inspect_web_page` inspected a disposable public `https://example.org/` tab                                                                           |
| Real browser screenshot                     | Pass                  | `capture_web_screenshot` produced image evidence for the test tab                                                                                     |
| Independent MCP Inspector strict tools/list | 0 errors, 32 warnings | The exposed tools were discoverable via Inspector; warnings concerned permissive schemas inherited from the REA catalog                               |

The browser and REA evidence IDs from the disposable tests were:

- Source analysis: `ev_1e4bf8ea015889937658dda6d2c537f844fe68f080ef6602b32bf1bc29c3443c`
- Browser page inspection: `ev_97fd38f8bc13f7adbcbb9cc5b60c843c5d47c9e320faea5e60b2267f6a2decfd`
- Screenshot: `ev_b147916eb957fd075e9d938dc88c9f6bebf75620e393022fdb35d7f604acd5c8`

These IDs are local evidence markers. They are **not** permanent public links, cannot be treated as authenticated remote records, and may disappear when the disposable runtime ends.

## Reproduce the tests

On a trusted system with compatible Node.js and REA installed, and from the repository checkout:

```sh
node --test integrations/chatgpt-varkai-rea/tests/bridge.test.mjs
REA_ENTRY=/absolute/path/to/rea-agents/scripts/rea.mjs node --test integrations/chatgpt-varkai-rea/tests/real-rea.test.mjs
```

If REA is run using an alternate compatible Node executable, set `REA_NODE=/absolute/path/to/node`.

The GitHub Actions workflow `.github/workflows/varkai-rea-plugin.yml` installs REA 6.8.0 and runs both test suites on PR changes.

## Product and security limitations

- This is **not yet** registered as a ChatGPT custom MCP plugin. The current conversation cannot invoke its tools directly as a single installed plugin.
- Neither a stable HTTPS MCP endpoint nor a Secure MCP Tunnel has been configured for the user's ChatGPT workspace.
- The disposable Kernel VM is not a persistent or production-grade REA host. Direct CDP access was demonstrated only where REA and Chrome shared that VM.
- The gateway is loopback-only and optionally protects its local endpoint with a bearer token. This is **not** a production OAuth implementation.
- The gateway offers a fixed read-oriented tool allowlist. Even read calls can access sensitive local artifacts if the worker is given broad filesystem permissions. Run only in dedicated, least-privilege environments with explicit target boundaries.
- ChatGPT plan permissions, tool limits, MCP connection permissions and provider quotas still apply. Installing an MCP plugin does not remove usage limits.
- Browser observations cannot recover private backend source or guarantee identical proprietary behavior.

## Next gated milestones

1. Choose a dedicated persistent host (not an incidental browser session) and restrict its artifact roots and browser targets.
2. Configure a private OpenAI Secure MCP Tunnel or an authenticated public HTTPS MCP proxy, according to current workspace permissions.
3. Add the custom MCP server under ChatGPT Plugins, review the exposed 14 tools, and verify actual tool invocation **from ChatGPT**.
4. Package the manifest and skills with Plugin Creator after the registered MCP server yields a `plugin_asdk_app...` ID.
5. Run a controlled frontend reconstruction exercise with explicit viewports, user actions, accessibility checks, and visual diffs.

Upstream REA is MIT licensed; preserve copyright and license attribution. Use reverse engineering only on authorized material.
