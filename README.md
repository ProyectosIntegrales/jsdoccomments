# JSDocComments

Adds two commands to generate JSDoc for the selected code (or the enclosing function/method if nothing is selected) using GitHub Copilot Chat prompt files.

## Features

- **Apply JSDoc (/jsdoc)**: Opens Copilot Chat with `/jsdoc` and the selected code (or enclosing symbol) to apply JSDoc in-place.
- **Generate JSDoc Text Only (/jsdoc_text)**: Opens Copilot Chat with `/jsdoc_text` and the selected code to generate only the JSDoc block (no edits).

## Usage

### Context menu

In TypeScript/JavaScript editors:

1. Select a function/method (optional).
2. Right-click in the editor.
3. Choose:
   - **JSDocComments: Apply JSDoc (/jsdoc) for Selection/Enclosing Symbol**, or
   - **JSDocComments: Generate JSDoc Text Only (/jsdoc_text)**

### Keyboard shortcuts

- Apply JSDoc: `Ctrl+Alt+J`
- Generate text only: `Ctrl+Alt+Shift+J`

> Note: If these shortcuts conflict with your environment, rebind them in VS Code Keyboard Shortcuts.

## Requirements

- VS Code / VS Code Insiders
- GitHub Copilot and GitHub Copilot Chat extensions installed and signed in
- Prompt files available in the workspace:
  - `.github/prompts/jsdoc.prompt.md` (invoked as `/jsdoc`)
  - `.github/prompts/jsdoc_text.prompt.md` (invoked as `/jsdoc_text`)

## How it works

This extension reads the current selection (or expands to the smallest enclosing function/method symbol), then opens the VS Code Chat view with the appropriate slash command and the code snippet.

If the environment does not support pre-filling chat input programmatically, the extension copies the prompt to the clipboard and opens chat.

## Known limitations

- Copilot may prompt to allow edits depending on workspace trust and file sensitivity.
- Auto-expansion relies on VS Code’s document symbol provider for the current language.

## Release notes

### 0.0.1

- Initial release with context menu items and keyboard shortcuts for JSDoc generation.
