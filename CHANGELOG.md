# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] – 2026-01-19

### Added

- Editor context menu command to **apply JSDoc** using GitHub Copilot Chat via `/jsdoc`.
- Editor context menu command to **generate JSDoc text only** via `/jsdoc_text` (no file edits).
- Keyboard shortcuts:
  - `Ctrl+Alt+J` – Apply JSDoc.
  - `Ctrl+Alt+Shift+J` – Generate JSDoc text only.
- Automatic expansion to the **enclosing function/method** when no code is selected.
- Support for TypeScript, JavaScript, TSX, and JSX editors only (scoped UI).
- Safe edit workflow with Copilot review (`Keep / Undo`).

### Changed

- Improved prompt instructions to enforce concise, high-signal JSDoc output.
- Command titles standardized for clarity and discoverability.

### Fixed

- Prevented unintended edits by separating “apply” vs “generate-only” flows.
- Eliminated unsupported prompt metadata that caused inconsistent behavior.

---

## [Unreleased]

### Planned

- Optional class-level JSDoc generation.
- Improved handling for overloaded methods.
- Customizable keyboard shortcuts via extension settings.
