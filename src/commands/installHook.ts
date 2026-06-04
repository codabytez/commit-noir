import * as vscode from "vscode";
import { installHook } from "../core/hookInstaller";

export async function installHookCommand(context: vscode.ExtensionContext) {
  try {
    await installHook(context);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Commit Noir: ${msg}`);
  }
}
