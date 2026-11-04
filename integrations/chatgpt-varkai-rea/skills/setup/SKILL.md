---
name: setup
description: Configure and verify a private Varkai REA server connection for authorized software analysis.
---

# Varkai REA setup

The user wants ChatGPT to investigate software with evidence and avoid unnecessary coding-agent quota consumption.

1. Confirm the user is permitted to analyze the selected target. Do not inspect another person's private device or application without permission.
2. Before any tool call, determine whether the connected varkai-rea MCP server is actually installed and available. The presence of this skill alone is **not** an active connection.
3. If unavailable, explain that REA 6.8.0 must run on a supported host with Node.js 22.23.4+/24.22.1+/26.12.1+, plus the specific optional providers (Chrome, JADX, Ghidra, etc.) that the investigation requires.
4. For ChatGPT web connections, recommend a private Secure MCP Tunnel to the local REA stdio server or the integration's local Streamable HTTP gateway; do not expose unauthenticated REA on a public URL.
5. ChatGPT plugin creation and custom MCP permissions are plan/workspace dependent. A plugin package in GitHub does not mean it is installed in ChatGPT.
6. Investigate by collecting observable evidence first: DOM, accessibility tree, JavaScript, source maps if exposed, screenshots, browser interaction states, network captures where authorized, APK or native-binary artifacts when supplied.
7. Maintain an evidence ledger with: target, exact observation, tool/command, evidence identifier, confidence (observed/derived/inferred/unknown), and limitations.
8. Never claim recovery of original source code or complete reverse engineering from partial observations. UI/animation reproduction and behavioral equivalence must be tested at explicitly declared viewports, actions and conditions.
9. Distinguish REA's evidence from Kernel browser interaction results. Use the separately connected Kernel plugin for browser automation; it is not bundled by this package and is not a component inside REA.
10. Avoid API secrets, passwords, session cookies and access tokens in reports or commits. Do not modify protected third-party software, defeat licensing/DRM, or redistribute proprietary resources. Use independent implementations and licensed assets.
11. No tool should silently write or deploy code; require a separate authorized GitHub, execution or deployment tool and explicit user-requested action.
