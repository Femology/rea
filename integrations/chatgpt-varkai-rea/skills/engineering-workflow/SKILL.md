---
name: engineering-workflow
description: Build, test and verify a software feature from ChatGPT by coordinating connected GitHub, Kernel, REA and deployment tools without unnecessary Codex sessions.
---

# Varkai engineering workflow

## Goal
Use ChatGPT as the orchestration surface for deliberate, testable software engineering. Model reasoning is not a replacement for execution or verification.

## Discovery and permissions
- Inventory the tools available in the **current session**. A bundled plugin is not proof that a connector is installed, authorized or working.
- Determine the repository, task scope, current branch, baseline tests, target environment and deployment permissions. Reuse known facts from the active conversation.
- Check whether the user owns the target or has authorization to inspect it, especially for third-party apps and private web pages.
- Never claim that normal chat, provider tools, or hosted browser sessions have unlimited context, compute, concurrency or API calls.

## Investigation
- For live website behavior, use a connected browser tool such as Kernel. Capture screenshots at declared viewport dimensions, investigate accessible DOM and interactions, log network behavior without exposing credentials, and store artifacts.
- For bytecode or source-bundle analysis, use the connected REA tool only if available. Distinguish static source-derived claims from runtime observations.
- Do not assume Kernel's browser can be reached directly over CDP by an independent REA process.
- Report evidence and unknowns explicitly. When a website's private backend is inaccessible, test observable behavior rather than claim to have recovered its internals.

## Implement
- Work on a feature branch rather than changing the default branch unless the user expressly requests the latter.
- Before coding, identify affected files, runtime, test command, expected behavior and constraints.
- Use available execution environments with a clearly defined workspace and command allowlist, rather than shell access to unrestricted hosts.
- Prefer small reversible patches and deterministic dependencies. Never expose secrets in chat, logs or source control.
- For original applications, do not copy protected third-party source, trademarks, assets or bypass license restrictions.

## Verify and deliver
- Run the tests on the actual branch. Check output and exit statuses rather than asserting tests passed because they were added.
- For frontend tasks, run at least one browser interaction, responsive viewport check and visual capture if the tool allows it.
- For backend tasks, test representative valid and invalid requests, auth boundaries and expected persistence.
- For deployments, check status and an actual reachable URL before claiming success.
- Summarize code changes, exact verification evidence, remaining risks and PR/deployment URLs. Keep durable checkpoints in GitHub so conversation length does not erase progress.

## Optional extension
- Use a private REA MCP tunnel for read-oriented analysis when eligible.
- Add user-scoped code-execution workers, build queues and deployment integrations only with independently authenticated authorization and sandboxing.
- Avoid expensive broad sweeps; analyze one feature or bounded scenario before expanding.
