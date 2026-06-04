import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

export async function installHook(
  context: vscode.ExtensionContext
): Promise<void> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) throw new Error("No workspace open");

  const gitHooksDir = path.join(workspaceRoot, ".git", "hooks");
  const hookDest = path.join(gitHooksDir, "pre-commit");
  const hookSrc = path.join(context.extensionPath, "hook", "pre-commit.js");

  if (!fs.existsSync(path.join(workspaceRoot, ".git"))) {
    throw new Error("No .git directory found. Is this a git repository?");
  }

  if (!fs.existsSync(gitHooksDir)) {
    fs.mkdirSync(gitHooksDir, { recursive: true });
  }

  if (fs.existsSync(hookDest)) {
    const answer = await vscode.window.showWarningMessage(
      "A pre-commit hook already exists. Overwrite?",
      "Yes, overwrite",
      "Cancel"
    );
    if (answer !== "Yes, overwrite") return;
  }

  const hookContent = fs.readFileSync(hookSrc, "utf8");
  fs.writeFileSync(hookDest, hookContent, { mode: 0o755 });
  vscode.window.showInformationMessage(
    "✓ Commit Noir hook installed. It will run before every git commit."
  );
}

export function uninstallHook(): void {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) throw new Error("No workspace open");

  const hookPath = path.join(workspaceRoot, ".git", "hooks", "pre-commit");
  if (!fs.existsSync(hookPath)) {
    vscode.window.showWarningMessage("No Commit Noir hook found.");
    return;
  }
  fs.unlinkSync(hookPath);
  vscode.window.showInformationMessage("✓ Commit Noir hook uninstalled.");
}

export function isHookInstalled(): boolean {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) return false;
  return fs.existsSync(
    path.join(workspaceRoot, ".git", "hooks", "pre-commit")
  );
}
