import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SettingsWebviewProvider } from './settings-webview';

let statusBarItem: vscode.StatusBarItem;
let mcpServerDefinitionDisposable: vscode.Disposable | undefined;

export function activate(context: vscode.ExtensionContext) {
  // Status Bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'ghDevops.configure';
  context.subscriptions.push(statusBarItem);
  updateStatusBar(context);

  // Register MCP Server Definition Provider
  registerMcpProvider(context);

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('ghDevops.configure', () => {
      SettingsWebviewProvider.createOrShow(context);
    }),

    vscode.commands.registerCommand('ghDevops.testConnection', async () => {
      const token = await context.secrets.get('ghDevops.token');
      if (!token) {
        vscode.window.showWarningMessage('GitHub DevOps: No token configured. Run "Configure GitHub DevOps" first.');
        return;
      }
      try {
        const response = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });
        if (response.ok) {
          const user = await response.json() as { login: string };
          vscode.window.showInformationMessage(`✅ Connected to GitHub as: ${user.login}`);
        } else {
          vscode.window.showErrorMessage(`❌ Connection failed: ${response.status} ${response.statusText}`);
        }
      } catch (err) {
        vscode.window.showErrorMessage(`❌ Connection error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }),

    vscode.commands.registerCommand('ghDevops.restart', async () => {
      if (mcpServerDefinitionDisposable) {
        mcpServerDefinitionDisposable.dispose();
      }
      registerMcpProvider(context);
      vscode.window.showInformationMessage('✅ GitHub DevOps MCP server restarted.');
    }),

    vscode.commands.registerCommand('ghDevops.selectRepo', async () => {
      const repo = await vscode.window.showInputBox({
        prompt: 'Enter repository (owner/repo format)',
        placeHolder: 'e.g., octocat/hello-world',
      });
      if (repo) {
        const [owner, repoName] = repo.split('/');
        const config = vscode.workspace.getConfiguration('ghDevops');
        await config.update('defaultOwner', owner, vscode.ConfigurationTarget.Global);
        await config.update('defaultRepo', repoName, vscode.ConfigurationTarget.Global);
        registerMcpProvider(context);
        vscode.window.showInformationMessage(`✅ Default repository set to: ${repo}`);
      }
    }),

    vscode.commands.registerCommand('ghDevops.viewDocs', () => {
      vscode.env.openExternal(vscode.Uri.parse('https://github.com/gleidsonfersanp/gh-devops-mcp#readme'));
    }),
  );

  updateStatusBar(context);
}

async function registerMcpProvider(context: vscode.ExtensionContext): Promise<void> {
  if (mcpServerDefinitionDisposable) {
    mcpServerDefinitionDisposable.dispose();
    mcpServerDefinitionDisposable = undefined;
  }

  const token = await context.secrets.get('ghDevops.token');
  const config = vscode.workspace.getConfiguration('ghDevops');
  const defaultOwner = config.get<string>('defaultOwner') || detectOwnerFromGit();
  const defaultRepo = config.get<string>('defaultRepo') || detectRepoFromGit();
  const apiUrl = config.get<string>('apiUrl') || 'https://api.github.com';

  const mcpServerPath = path.join(context.extensionPath, 'mcp-server', 'dist', 'index.js');

  if (!fs.existsSync(mcpServerPath)) {
    console.error(`[gh-devops-mcp] MCP server not found at: ${mcpServerPath}`);
    return;
  }

  const env: Record<string, string> = {};
  if (token) env.GITHUB_TOKEN = token;
  if (defaultOwner) env.GITHUB_OWNER = defaultOwner;
  if (defaultRepo) env.GITHUB_REPO = defaultRepo;
  if (apiUrl !== 'https://api.github.com') env.GITHUB_API_URL = apiUrl;

  try {
    // @ts-ignore — vscode.lm may not have types in older SDK
    mcpServerDefinitionDisposable = vscode.lm.registerMcpServerDefinitionProvider(
      'gh-devops',
      {
        onDidChangeMcpServerDefinitions: new vscode.EventEmitter<void>().event,
        provideMcpServerDefinitions: async () => {
          // @ts-ignore
          return [new vscode.McpStdioServerDefinition(
            'gh-devops',
            'node',
            [mcpServerPath],
            env,
          )];
        },
      },
    );
    context.subscriptions.push(mcpServerDefinitionDisposable);
  } catch (err) {
    console.error('[gh-devops-mcp] Failed to register MCP provider:', err);
  }

  updateStatusBar(context);
}

function detectRepoFromGit(): string {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) return '';
    const gitConfigPath = path.join(workspaceFolders[0].uri.fsPath, '.git', 'config');
    if (!fs.existsSync(gitConfigPath)) return '';
    const content = fs.readFileSync(gitConfigPath, 'utf8');
    // Match HTTPS: github.com/owner/repo.git
    const httpsMatch = content.match(/url\s*=\s*https:\/\/github\.com\/[^/]+\/([^.]+)(?:\.git)?/);
    if (httpsMatch) return httpsMatch[1].trim();
    // Match SSH: git@github.com:owner/repo.git
    const sshMatch = content.match(/url\s*=\s*git@github\.com:[^/]+\/([^.]+)(?:\.git)?/);
    if (sshMatch) return sshMatch[1].trim();
    return '';
  } catch {
    return '';
  }
}

function detectOwnerFromGit(): string {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) return '';
    const gitConfigPath = path.join(workspaceFolders[0].uri.fsPath, '.git', 'config');
    if (!fs.existsSync(gitConfigPath)) return '';
    const content = fs.readFileSync(gitConfigPath, 'utf8');
    const httpsMatch = content.match(/url\s*=\s*https:\/\/github\.com\/([^/]+)\//);
    if (httpsMatch) return httpsMatch[1].trim();
    const sshMatch = content.match(/url\s*=\s*git@github\.com:([^/]+)\//);
    if (sshMatch) return sshMatch[1].trim();
    return '';
  } catch {
    return '';
  }
}

function updateStatusBar(context: vscode.ExtensionContext): void {
  context.secrets.get('ghDevops.token').then((token) => {
    if (token) {
      statusBarItem.text = '$(github) DevOps ✓';
      statusBarItem.tooltip = 'GitHub DevOps MCP — Connected. Click to configure.';
      statusBarItem.backgroundColor = undefined;
    } else {
      statusBarItem.text = '$(github) DevOps';
      statusBarItem.tooltip = 'GitHub DevOps MCP — Not configured. Click to set up.';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
    statusBarItem.show();
  });
}

export function deactivate() {
  if (mcpServerDefinitionDisposable) {
    mcpServerDefinitionDisposable.dispose();
  }
}
