---
name: csdoc_text
description: Generate C# XML documentation comments (///) only (no edits).
---

Generate ONLY the XML doc comment block (triple-slash form) for the provided symbol.

Rules:

- Output ONLY the XML doc comments (no code).
- Include <summary>, <param> entries, and <returns> only if needed.
- No file edits; no extra explanation.
