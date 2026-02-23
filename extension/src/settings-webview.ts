import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { WebviewMessage, WebviewResponse } from './types';

export class SettingsWebviewProvider {
  private static currentPanel: SettingsWebviewProvider | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly context: vscode.ExtensionContext;
  private disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this.panel = panel;
    this.context = context;

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      (message: WebviewMessage) => this.handleMessage(message),
      null,
      this.disposables,
    );

    this.panel.webview.html = this.getHtmlContent();
  }

  static createOrShow(context: vscode.ExtensionContext): void {
    const column = vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;

    if (SettingsWebviewProvider.currentPanel) {
      SettingsWebviewProvider.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'ghDevopsSettings',
      'GitHub DevOps — Configure',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    SettingsWebviewProvider.currentPanel = new SettingsWebviewProvider(panel, context);
  }

  private async handleMessage(message: WebviewMessage): Promise<void> {
    switch (message.command) {
      case 'ready': {
        // Send current config to webview
        const token = await this.context.secrets.get('ghDevops.token');
        const config = vscode.workspace.getConfiguration('ghDevops');
        const response: WebviewResponse = {
          command: 'init',
          config: {
            token: token ? '••••••••••••' : '',
            apiUrl: config.get<string>('apiUrl') || 'https://api.github.com',
            defaultOwner: config.get<string>('defaultOwner') || '',
            defaultRepo: config.get<string>('defaultRepo') || '',
          },
        };
        this.panel.webview.postMessage(response);
        break;
      }

      case 'saveToken': {
        if (message.token) {
          await this.context.secrets.store('ghDevops.token', message.token);
          const response: WebviewResponse = { command: 'tokenSaved', success: true, message: '✅ Token saved securely.' };
          this.panel.webview.postMessage(response);
          vscode.commands.executeCommand('ghDevops.restart');
        }
        break;
      }

      case 'testConnection': {
        const tokenToTest = message.token || await this.context.secrets.get('ghDevops.token');
        if (!tokenToTest || tokenToTest === '••••••••••••') {
          const response: WebviewResponse = { command: 'connectionResult', success: false, message: '❌ No token to test.' };
          this.panel.webview.postMessage(response);
          return;
        }
        try {
          const resp = await fetch('https://api.github.com/user', {
            headers: {
              Authorization: `Bearer ${tokenToTest}`,
              Accept: 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
          });
          if (resp.ok) {
            const user = await resp.json() as { login: string; name?: string };
            const response: WebviewResponse = {
              command: 'connectionResult',
              success: true,
              message: `✅ Connected as: ${user.name || user.login} (@${user.login})`,
            };
            this.panel.webview.postMessage(response);
          } else {
            const response: WebviewResponse = {
              command: 'connectionResult',
              success: false,
              message: `❌ Connection failed: ${resp.status} ${resp.statusText}`,
            };
            this.panel.webview.postMessage(response);
          }
        } catch (err) {
          const response: WebviewResponse = {
            command: 'connectionResult',
            success: false,
            message: `❌ Error: ${err instanceof Error ? err.message : String(err)}`,
          };
          this.panel.webview.postMessage(response);
        }
        break;
      }

      case 'saveSettings': {
        const config = vscode.workspace.getConfiguration('ghDevops');
        if (message.apiUrl !== undefined) {
          await config.update('apiUrl', message.apiUrl, vscode.ConfigurationTarget.Global);
        }
        if (message.defaultOwner !== undefined) {
          await config.update('defaultOwner', message.defaultOwner, vscode.ConfigurationTarget.Global);
        }
        if (message.defaultRepo !== undefined) {
          await config.update('defaultRepo', message.defaultRepo, vscode.ConfigurationTarget.Global);
        }
        const response: WebviewResponse = { command: 'settingsSaved', success: true, message: '✅ Settings saved.' };
        this.panel.webview.postMessage(response);
        vscode.commands.executeCommand('ghDevops.restart');
        break;
      }
    }
  }

  private getHtmlContent(): string {
    const htmlPath = path.join(this.context.extensionPath, 'webview', 'settings.html');
    if (fs.existsSync(htmlPath)) {
      return fs.readFileSync(htmlPath, 'utf8');
    }
    return this.getFallbackHtml();
  }

  private getFallbackHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GitHub DevOps Settings</title>
  <style>
    body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-foreground); padding: 16px; }
    h2 { color: var(--vscode-textLink-foreground); }
    p { color: var(--vscode-descriptionForeground); }
  </style>
</head>
<body>
  <h2>GitHub DevOps MCP</h2>
  <p>Settings UI not found. Please rebuild the extension.</p>
</body>
</html>`;
  }

  private dispose(): void {
    SettingsWebviewProvider.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) d.dispose();
    }
  }
}
