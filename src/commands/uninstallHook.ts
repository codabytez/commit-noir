import * as vscode from "vscode";
import { uninstallHook } from "../core/hookInstaller";

export function uninstallHookCommand() {
  try {
    uninstallHook();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Commit Noir: ${msg}`);
  }
}
