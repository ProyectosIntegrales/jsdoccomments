import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

type Target = { text: string; langId: string; source: "selection" | "symbol"; context?: string; };


const execFileAsync = promisify(execFile);

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand("jsdoccomments.runJsdocOnSelection", async () => {
			await runCopilotSlashCommand("jsdoc");
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("jsdoccomments.generateJsdocForSelection", async () => {
			await runCopilotSlashCommand("jsdoc_text");
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("jsdoccomments.codexApplyCsDoc", async () => {
			await runCodexCli("csharp");
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("jsdoccomments.codexApplyJsDoc", async () => {
			await runCodexCli("javascript");
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("jsdoccomments.runCsDocOnSelection", async () => {
			await runCopilotSlashCommand("csdoc");
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("jsdoccomments.generateCsDocForSelection", async () => {
			await runCopilotSlashCommand("csdoc_text");
		})
	);

}

export function deactivate() { }

function escapeForCmdArg(value: string): string {
	// cmd.exe quoting: wrap in "..." and double any internal quotes
	// (cmd does NOT support backslash-escaping quotes)
	return `"${value.replace(/"/g, '""')}"`;
}



async function runCodexExecViaCmdExe(
	codexCmdPath: string,
	workspaceRoot: string,
	prompt: string
) {
	const cmdLine =
		`${escapeForCmdArg(codexCmdPath)} ` +
		`--full-auto --sandbox workspace-write ` +
		`--cd ${escapeForCmdArg(workspaceRoot)} ` +
		`exec ${escapeForCmdArg(prompt)}`;

	await execFileAsync(
		"cmd.exe",
		["/d", "/c", cmdLine],
		{
			windowsHide: true,
			maxBuffer: 1024 * 1024 * 20,
			env: { ...process.env, NODE_NO_WARNINGS: "1" }
		}
	);
}


async function runCopilotSlashCommand(slashName: "jsdoc" | "jsdoc_text" | "csdoc" | "csdoc_text") {
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

	const contextBlock =
		target.langId === "csharp" && target.context
			? `\n\n// Context (do not edit):\n// ${target.context}\n`
			: "";

	const prompt = `/${slashName}${contextBlock}\n\n\`\`\`${target.langId}\n${target.text}\n\`\`\``;


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

function stripOuterQuotes(s: string): string {
	const t = s.trim();
	if (t.startsWith('"') && t.endsWith('"')) { return t.slice(1, -1); }
	return t;
}

async function resolveCodexCmdPath(): Promise<string | null> {
	try {
		const { stdout } = await execFileAsync("where.exe", ["codex"], { windowsHide: true });

		const matches = stdout
			.split(/\r?\n/)
			.map(s => stripOuterQuotes(s.trim()))
			.filter(Boolean);

		const cmd = matches.find(p => p.toLowerCase().endsWith(".cmd"));
		return cmd ?? matches[0] ?? null;
	} catch {
		return null;
	}
}


async function ensureCodexCliAvailable(): Promise<string | null> {
	const codexPath = await resolveCodexCmdPath();
	if (!codexPath) {
		vscode.window.showErrorMessage(
			"Codex CLI not found. Install it with: npm install -g @openai/codex, then restart VS Code."
		);
		return null;
	}

	try {
		// Use cmd.exe to run the .cmd shim reliably
		// Note: pass arguments separately; avoid /c + cmdLine quoting pitfalls
		await execFileAsync(
			"cmd.exe",
			["/d", "/c", "call", codexPath, "--version"],
			{ windowsHide: true }
		);

		return codexPath;
	} catch (err: any) {
		const msg = err?.stderr || err?.message || String(err);
		vscode.window.showErrorMessage(`Codex CLI found but failed to run: ${msg}`);
		return null;
	}

}

function hasGitRepoRoot(dir: string): boolean {
	try {
		return fs.existsSync(path.join(dir, ".git"));
	} catch {
		return false;
	}
}


async function runCodexCli(targetKind: "csharp" | "javascript") {
	const codexPath = await ensureCodexCliAvailable();
	if (!codexPath) { return; }

	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showWarningMessage("No active editor.");
		return;
	}

	const doc = editor.document;
	if (doc.isUntitled) {
		vscode.window.showWarningMessage("Please save the file before running Codex CLI.");
		return;
	}

	const target = await getTarget(editor);
	if (!target?.text) {
		vscode.window.showWarningMessage(
			"No selection, and no enclosing function/method symbol was found at the cursor."
		);
		return;
	}

	const filePath = doc.uri.fsPath;

	const instruction =
		targetKind === "csharp"
			? buildCsDocInstruction(filePath, target.text, target.context)
			: buildJsDocInstruction(filePath, target.text);

	const workspaceRoot =
		vscode.workspace.getWorkspaceFolder(doc.uri)?.uri.fsPath ?? path.dirname(filePath);

	// Put instructions inside workspace so Codex can access it under workspace-write sandbox
	const codexDir = path.join(workspaceRoot, ".codex");
	fs.mkdirSync(codexDir, { recursive: true });

	const instructionPath = path.join(codexDir, `doc-instructions-${Date.now()}.md`);
	fs.writeFileSync(instructionPath, instruction, "utf8");

	const shortPrompt = `Read the instructions in ${instructionPath} and apply the requested documentation edits.`;

	try {
		await vscode.window.withProgress(
			{ location: vscode.ProgressLocation.Notification, title: "Codex: applying documentation…" },
			async () => {
				const before = fs.readFileSync(filePath, "utf8");

				const { stdout, stderr } = await execFileAsync(
					"cmd.exe",
					[
						"/d", "/c", "call", codexPath,
						"--full-auto",
						"--sandbox", "workspace-write",
						"--cd", workspaceRoot,
						"exec",
						...(hasGitRepoRoot(workspaceRoot) ? [] : ["--skip-git-repo-check"]),
						shortPrompt
					],
					{
						windowsHide: true,
						maxBuffer: 1024 * 1024 * 20,
						env: { ...process.env, NODE_NO_WARNINGS: "1" }
					}
				);

				const after = fs.readFileSync(filePath, "utf8");

				if (before === after) {
					const out = vscode.window.createOutputChannel("JSDocComments");
					out.show(true);
					out.appendLine("Codex finished but the target file did not change.");
					if (stdout) { out.appendLine("\nSTDOUT:\n" + stdout); }
					if (stderr) { out.appendLine("\nSTDERR:\n" + stderr); }
					vscode.window.showWarningMessage("Codex ran but did not modify the file. See Output: JSDocComments.");
					return;
				}

			}
		);

		vscode.window.showInformationMessage(
			`Codex completed (${target.source === "selection" ? "selection" : "enclosing symbol"}). Review your changes.`
		);
	} catch (err: any) {
		const msg = err?.stderr || err?.message || String(err);
		vscode.window.showErrorMessage(`Codex CLI failed: ${msg}`);
	} finally {
		try { fs.unlinkSync(instructionPath); } catch { /* ignore */ }
	}
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

	let context: string | undefined;

	if (langId === "csharp") {
		const containingType = findSmallestEnclosingType(symbols, cursor);
		if (containingType) {
			const sig = extractTypeSignatureLine(doc, containingType);
			if (sig) { context = sig; }
		}
	}

	return { text, langId, source: "symbol", context };

}

function findSmallestEnclosingCallable(
	symbols: vscode.DocumentSymbol[],
	pos: vscode.Position
): vscode.DocumentSymbol | null {
	let best: vscode.DocumentSymbol | null = null;

	const visit = (sym: vscode.DocumentSymbol) => {
		if (!sym.range.contains(pos)) { return; }

		if (isCallableKind(sym.kind)) {
			if (!best) { best = sym; }
			else if (rangeSize(sym.range) < rangeSize(best.range)) { best = sym; }
		}

		for (const child of sym.children ?? []) { visit(child); }
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
	return (r.end.line - r.start.line) * 10000 + (r.end.character - r.start.character);
}

function buildCsDocInstruction(filePath: string, code: string, context?: string): string {
	const contextLines = context ? ["", "Context (read-only):", context, ""] : [];

	return [
		"You are editing a local workspace. You MUST apply changes directly to the file on disk.",
		"",
		`Target file (MUST EDIT THIS FILE): ${filePath}`,
		"",
		"Task:",
		"- Find the exact member below in the target file (match by signature/body).",
		"- Insert C# XML documentation comments (///) immediately above it.",
		"- Save the file.",
		"",
		"Rules:",
		"- Add /// <summary> (1–2 sentences, high-signal, no restating the name).",
		"- Add /// <param name=\"...\"> for each parameter (meaning/constraints; not types).",
		"- Add /// <returns> only if non-void (or Task<T>/ValueTask<T>).",
		"- Do not change runtime logic.",
		"- Do not reformat code beyond adding comments.",
		...contextLines,
		"",
		"Member snippet to locate (do not edit this snippet directly; locate it in the file):",
		"```csharp",
		code,
		"```",
		""
	].join("\n");
}


function buildJsDocInstruction(filePath: string, code: string): string {
	return [
		"You are editing a local workspace. You MUST apply changes directly to the file on disk.",
		"",
		`Target file (MUST EDIT THIS FILE): ${filePath}`,
		"",
		"Task:",
		"- Find the exact function/method below in the target file (match by signature/body).",
		"- Insert concise JSDoc immediately above it.",
		"- Save the file.",
		"",
		"Rules:",
		"- High-signal only; avoid restating the function name or types.",
		"- 1–2 sentence summary.",
		"- @param for each parameter; @returns only if non-void.",
		"- Do not change runtime logic.",
		"- Do not reformat code beyond adding comments.",
		"",
		"Member snippet to locate (do not edit this snippet directly; locate it in the file):",
		"```typescript",
		code,
		"```",
		""
	].join("\n");
}


function isTypeKind(kind: vscode.SymbolKind): boolean {
	return (
		kind === vscode.SymbolKind.Class ||
		kind === vscode.SymbolKind.Struct ||
		kind === vscode.SymbolKind.Interface
		// VS Code SymbolKind may not have Record; record often comes through as Class
	);
}

function findSmallestEnclosingType(
	symbols: vscode.DocumentSymbol[],
	pos: vscode.Position
): vscode.DocumentSymbol | null {
	let best: vscode.DocumentSymbol | null = null;

	const visit = (sym: vscode.DocumentSymbol) => {
		if (!sym.range.contains(pos)) { return; }

		if (isTypeKind(sym.kind)) {
			if (!best) { best = sym; }
			else if (rangeSize(sym.range) < rangeSize(best.range)) { best = sym; }
		}

		for (const child of sym.children ?? []) { visit(child); }
	};

	for (const s of symbols) { visit(s); }
	return best;
}

function extractTypeSignatureLine(doc: vscode.TextDocument, typeSym: vscode.DocumentSymbol): string | null {
	// Start near the symbol name; capture a compact signature up to '{'
	const start = typeSym.selectionRange.start;
	const lineText = doc.lineAt(start.line).text;

	// Try to get the declaration portion up to '{' (or full line if no '{')
	const idx = lineText.indexOf("{");
	const signature = (idx >= 0 ? lineText.substring(0, idx) : lineText).trim();

	// Keep it short; it’s just context
	return signature.length ? signature : null;
}


