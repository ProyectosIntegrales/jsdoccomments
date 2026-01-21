---
name: csdoc
description: Add concise C# XML documentation comments (///) to the provided member and apply in place.
tools: ["edit"]
---

Add C# XML documentation comments immediately above the provided symbol and apply the change in place.

Rules:

- Use XML doc comments with triple slashes (///).
- Include:
  - <summary> (1–2 sentences, high-signal, do not restate the member name)
  - <param name="..."> for each parameter (meaning/constraints; do not repeat the type)
  - <returns> only if non-void (or Task<T>/ValueTask<T>)
- Do not change runtime logic.
- Do not reformat code beyond adding comments.
- Do not add TODOs.

If context is provided, use it to improve accuracy but do not edit it.
