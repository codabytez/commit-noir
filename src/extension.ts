import * as vscode from "vscode";
import { showResult } from "./commands/showResult";
import { installHookCommand } from "./commands/installHook";
import { uninstallHookCommand } from "./commands/uninstallHook";
import { isHookInstalled } from "./core/hookInstaller";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("commit-noir.showResult", () => {
      showResult(context);
    }),
    vscode.commands.registerCommand("commit-noir.installHook", () => {
      installHookCommand(context);
    }),
    vscode.commands.registerCommand("commit-noir.uninstallHook", () => {
      uninstallHookCommand();
    })
  );

  promptInstallIfMissing(context);
}

function promptInstallIfMissing(context: vscode.ExtensionContext) {
  if (isHookInstalled()) return;

  const hasWorkspace = vscode.workspace.workspaceFolders?.length ?? 0;
  if (!hasWorkspace) return;

  vscode.window
    .showInformationMessage(
      "Commit Noir: No pre-commit hook detected in this repo. Install it now?",
      "Install Hook",
      "Not Now"
    )
    .then((choice) => {
      if (choice === "Install Hook") {
        installHookCommand(context);
      }
    });
}

export function deactivate() {}
