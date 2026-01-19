---
name: jsdoc
description: Add concise, high-signal JSDoc to the provided TypeScript function or method.
tools: ["edit"]
---

Add JSDoc immediately above the provided function/method and apply the change in place.

Style rules:

- High-signal only; do not restate the function name or obvious types.
- 1–2 sentence summary (max 3 lines).
- Prefer imperative voice.
- @param for each parameter (describe meaning, not type).
- @returns only if non-void.
- Do not modify runtime logic.
- Do not add TODOs.

The function code is provided below in the chat message.
