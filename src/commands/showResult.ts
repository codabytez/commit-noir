import * as vscode from "vscode";
import { CommitNoirPanel } from "../webview/panel";

export function showResult(context: vscode.ExtensionContext) {
  CommitNoirPanel.createOrShow(context);
}
