---
name: visual-reconstruction
description: Reconstruct authorized website UI, interactions and motion with observed evidence and repeatable visual regression tests.
---

# Varkai visual reconstruction

This workflow reconstructs **observable behavior**, not the original proprietary source.

1. Set a bounded target: exact URL/feature, user-provided visual reference, permissions, browsers, resolutions, states and user interactions.
2. Use authorized browser tooling to capture the baseline in at least desktop and mobile viewports. Record frame dimensions, fonts/assets if legally reusable, color tokens, layout constraints, interactive states, page transitions and scrolling.
3. Sample animations at multiple known timestamps and document duration, easing, triggers, transform origins and scroll response where those properties are observable. Never infer a precise easing curve from one still image.
4. Use REA if connected to inspect accessible JavaScript modules, source maps and captured network evidence. Discriminate original asset bytes from approximations. Keep evidence citations and unknowns.
5. Generate an original component tree and state-machine model. Choose existing open-source libraries with compatible licenses. No copyrighted asset redistribution without permission.
6. Implement one feature at a time and test user-visible behavior. Do not claim a screenshot match proves accessibility, keyboard semantics, backend behavior or responsiveness.
7. Compare full-page images at fixed viewports and interaction states, including reduced-motion mode. Inspect pixel differences, overlay candidates, layout metrics and interaction outcomes.
8. Report separately: confirmed equivalent behavior, visually similar appearance, accessible keyboard behavior, unknown/private behavior and unresolved discrepancies.
9. Include reproduction instructions, a record of the sampled conditions and a reviewable GitHub PR.

For WebGL/3D/canvas, capture multiple frames and input states; shader/assets and scene hierarchy may remain unavailable. For inaccessible server logic or encrypted content, document the boundary instead of inventing implementation facts.
