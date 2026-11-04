# Varkai REA — handoff to Plugin Creator

Create a **private personal ChatGPT plugin** named **Varkai REA** from the existing GitHub development work:

- Repository: https://github.com/Femology/rea
- Branch: feat/chatgpt-varkai-rea-mcp-bridge
- Plugin root: integrations/chatgpt-varkai-rea/
- Portable manifest: integrations/chatgpt-varkai-rea/plugin.json
- Skills:
  - integrations/chatgpt-varkai-rea/skills/setup/SKILL.md
  - integrations/chatgpt-varkai-rea/skills/engineering-workflow/SKILL.md
  - integrations/chatgpt-varkai-rea/skills/visual-reconstruction/SKILL.md
- MCP bridge: integrations/chatgpt-varkai-rea/src/server.mjs
- REA subprocess client: integrations/chatgpt-varkai-rea/src/rea-client.mjs
- Test suite: integrations/chatgpt-varkai-rea/tests/bridge.test.mjs

Objectives:

1. Package the existing portable plugin rather than generating unrelated starter code.
2. Include all three workflow skills. Preserve attribution and the MIT license.
3. Help the user register the REA MCP server through a **private Secure MCP Tunnel**, where their account permits; never claim that the GitHub plugin manifest itself establishes a live MCP connection.
4. Preserve the gateway's read-only allowlist. Keep it loopback-only; do not turn it into an unauthenticated public endpoint.
5. Before calling REA, verify it is connected and serving the advertised tools. If no real endpoint/tunnel or appropriate workspace access is available, install/test the **skills-only** package and state the missing step.
6. Treat connected Kernel, GitHub, Vercel and Render tools as separate apps. The plugin's engineering skill may coordinate tools actually available in the conversation; it must not imply they are bundled into REA.
7. Test REA on an authorized website, then create a reproducible observation report. Do not claim the UI matches perfectly without image+interaction checks.
8. Test the plugin end-to-end in ChatGPT and only then mark a release candidate. Do not submit it to the public directory, claim it is production ready, or request new secrets in the conversation without user approval.
9. Clearly disclose plan/workspace limits, provider quotas and limits on reverse-engineering inaccessible private internals.

Acceptance criteria: plugin is discoverable to the user, all skills load, actual REA MCP tool discovery succeeds through authorized connection, an inspect request returns valid evidence, blocked tools remain blocked, and a real browser or artifact analysis can be repeated.
