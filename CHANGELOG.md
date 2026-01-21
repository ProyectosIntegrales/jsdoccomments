# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] – 2026-01-20

### Added

- C# support via GitHub Copilot Chat prompts:
  - `/csdoc` to apply C# XML documentation comments (///) in-place.
  - `/csdoc_text` to generate C# XML docs text only (no edits).
- Codex CLI fallback commands (Windows) to apply documentation automatically:
  - Apply C# XML docs via `codex exec`.
  - Apply JSDoc via `codex exec`.
- C# prompt context enhancement: include the enclosing type signature (class/struct/interface) as non-editable context to improve doc quality.
- Codex availability pre-check with a user-friendly error message when Codex CLI is missing.

### Changed

- Codex CLI integration updated to use `codex exec` (non-interactive) with workspace-write sandbox for automatic application of edits.
- Documentation generation now routes by language (JS/TS → JSDoc; C# → XML docs).

### Fixed

- Improved reliability when no explicit selection is made by reusing “enclosing symbol” expansion for both Copilot and Codex workflows.

---

## [0.1.0] – 2026-01-19

### Added

- Editor context menu command to apply JSDoc using GitHub Copilot Chat via `/jsdoc`.
- Editor context menu command to generate JSDoc text only via `/jsdoc_text` (no file edits).
- Keyboard shortcuts:
  - `Ctrl+Alt+J` – Apply JSDoc.
  - `Ctrl+Alt+Shift+J` – Generate JSDoc text only.
- Automatic expansion to the enclosing function/method when no code is selected.
- Commands scoped to TypeScript, JavaScript, TSX, and JSX editors.
- Safe review workflow with Copilot-proposed edits (`Keep / Undo`).

---

## [Unreleased]

### Planned

- Optional namespace context for C# (non-editable) to improve XML doc generation.
- Improved handling for overloaded methods and constructors.
- User settings for preferred provider (Copilot vs Codex) and default action (apply vs generate-only).
