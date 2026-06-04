import * as vscode from "vscode";
import * as fs from "fs";
import { CommitResult } from "../types";
import { readLastResult, watchResult } from "../core/resultReader";
import { getWebviewContent } from "./template";

export class CommitNoirPanel {
  public static currentPanel: CommitNoirPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _watcher: fs.FSWatcher | null = null;
  public static lastResult: CommitResult | null = null;

  public static createOrShow(context: vscode.ExtensionContext) {
    const col = vscode.ViewColumn.Beside;
    if (CommitNoirPanel.currentPanel) {
      CommitNoirPanel.currentPanel._panel.reveal(col);
      return CommitNoirPanel.currentPanel;
    }
    const panel = vscode.window.createWebviewPanel(
      "commitNoir",
      "Commit Noir",
      col,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    CommitNoirPanel.currentPanel = new CommitNoirPanel(panel, context);
    return CommitNoirPanel.currentPanel;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    private context: vscode.ExtensionContext
  ) {
    this._panel = panel;
    const result = readLastResult();
    CommitNoirPanel.lastResult = result;
    this._panel.webview.html = getWebviewContent(result);
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._watcher = watchResult((newResult) => {
      CommitNoirPanel.lastResult = newResult;
      this._panel.webview.html = getWebviewContent(newResult);
      if (newResult.blocked) {
        vscode.window.showWarningMessage(
          `Commit Noir: Commit blocked. Score: ${newResult.score}/${newResult.threshold}`
        );
      }
    });

    this._panel.webview.onDidReceiveMessage(
      (msg) => {
        this._handleMessage(msg);
      },
      null,
      this._disposables
    );
  }

  public update(result: CommitResult) {
    CommitNoirPanel.lastResult = result;
    this._panel.webview.html = getWebviewContent(result);
  }

  private _handleMessage(msg: { command: string; file?: string; line?: number }) {
    if (msg.command === "openFile") {
      const wf = vscode.workspace.workspaceFolders?.[0];
      if (!wf || !msg.file) return;
      const uri = vscode.Uri.joinPath(wf.uri, msg.file);
      vscode.window.showTextDocument(uri, {
        selection: new vscode.Range(
          (msg.line ?? 1) - 1,
          0,
          (msg.line ?? 1) - 1,
          0
        ),
      });
    }
  }

  public dispose() {
    CommitNoirPanel.currentPanel = undefined;
    this._watcher?.close();
    this._panel.dispose();
    this._disposables.forEach((d) => d.dispose());
  }
}
