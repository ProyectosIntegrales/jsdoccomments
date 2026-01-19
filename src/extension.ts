import * as vscode from "vscode";

type Target = { text: string; langId: string; source: "selection" | "symbol"; };

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand("jsdoccomments.runJsdocOnSelection", async () => {
			await runCopilotSlashCommand("jsdoc"); // applies edits via your /jsdoc prompt
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("jsdoccomments.generateJsdocForSelection", async () => {
			await runCopilotSlashCommand("jsdoc_text"); // generates JSDoc text only
		})
	);
}

export function deactivate() { }

async function runCopilotSlashCommand(slashName: "jsdoc" | "jsdoc_text") {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showWarningMessage("No active editor.");
		return;
	}

	const target = await getTarget(editor);
	if (!target?.text) {
		vscode.window.showWarningMessage(
			"No selection, and no enclosing function/method symbol was found at the cursor."
		);
		return;
	}

	const prompt = `/${slashName}\n\n\`\`\`${target.langId}\n${target.text}\n\`\`\``;

	// Try: open chat with prefilled prompt
	try {
		await vscode.commands.executeCommand("workbench.action.chat.open", prompt);
		return;
	} catch {
		// Fallback: clipboard + open chat
	}

	await vscode.env.clipboard.writeText(prompt);
	await vscode.commands.executeCommand("workbench.action.chat.open");

	vscode.window.showInformationMessage(
		`Copied /${slashName} + ${target.source === "selection" ? "selection" : "enclosing symbol"} to clipboard. Paste into Copilot Chat and press Enter.`
	);
}

async function getTarget(editor: vscode.TextEditor): Promise<Target | null> {
	const doc = editor.document;
	const langId = doc.languageId;

	// 1) Prefer explicit selection
	const selected = doc.getText(editor.selection).trim();
	if (selected) { return { text: selected, langId, source: "selection" }; }

	// 2) No selection: attempt to expand to enclosing symbol (function/method/constructor)
	const cursor = editor.selection.active;
	const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
		"vscode.executeDocumentSymbolProvider",
		doc.uri
	);

	if (!symbols?.length) { return null; }

	const enclosing = findSmallestEnclosingCallable(symbols, cursor);
	if (!enclosing) { return null; }

	const text = doc.getText(enclosing.range).trim();
	if (!text) { return null; }

	return { text, langId, source: "symbol" };
}

function findSmallestEnclosingCallable(
	symbols: vscode.DocumentSymbol[],
	pos: vscode.Position
): vscode.DocumentSymbol | null {
	let best: vscode.DocumentSymbol | null = null;

	const visit = (sym: vscode.DocumentSymbol) => {
		// Check containment
		if (sym.range.contains(pos)) {
			// Consider callables
			if (isCallableKind(sym.kind)) {
				if (!best) { best = sym; }
				else {
					// choose the smallest range that still contains the cursor
					const bestSize = rangeSize(best.range);
					const symSize = rangeSize(sym.range);
					if (symSize < bestSize) { best = sym; }
				}
			}

			// Recurse into children to find a smaller enclosing callable
			for (const child of sym.children ?? []) { visit(child); }
		}
	};

	for (const s of symbols) { visit(s); }
	return best;
}

function isCallableKind(kind: vscode.SymbolKind): boolean {
	return (
		kind === vscode.SymbolKind.Function ||
		kind === vscode.SymbolKind.Method ||
		kind === vscode.SymbolKind.Constructor
	);
}

function rangeSize(r: vscode.Range): number {
	// crude but effective size metric
	return (r.end.line - r.start.line) * 10000 + (r.end.character - r.start.character);
}
