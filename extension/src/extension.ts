import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SettingsWebviewProvider } from './settings-webview';

let outputChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;

function log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
  const logMessage = `[${timestamp}] ${prefix} ${message}`;
  outputChannel.appendLine(logMessage);
  if (level === 'error') { console.error(logMessage); }
  else if (level === 'warn') { console.warn(logMessage); }
  else { console.log(logMessage); }
}

export function activate(context: vscode.ExtensionContext) {
  // Output Channel — aparece em View > Output > "GitHub DevOps MCP"
  outputChannel = vscode.window.createOutputChannel('GitHub DevOps MCP', { log: true });
  context.subscriptions.push(outputChannel);

  log('GitHub DevOps MCP extension is now active!');
  log(`Extension path: ${context.extensionPath}`);

  // Status Bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'ghDevops.configure';
  context.subscriptions.push(statusBarItem);

  // MCP server path — copy-to-extension copia dist/* direto para mcp-server/
  const mcpServerPath = path.join(context.extensionPath, 'mcp-server', 'index.js');

  // Async init
  (async () => {
    const token = await context.secrets.get('ghDevops.token');
    const config = vscode.workspace.getConfiguration('ghDevops');
    const defaultOwner = config.get<string>('defaultOwner') || detectOwnerFromGit();
    const defaultRepo = config.get<string>('defaultRepo') || detectRepoFromGit();
    const apiUrl = config.get<string>('apiUrl') || 'https://api.github.com';
    const autoStart = config.get<boolean>('autoStart', true);
    const hasToken = !!token;

    updateStatusBarState(hasToken);

    if (!hasToken) {
      log('GitHub token not configured. Use "Configure GitHub Token" command.', 'warn');
    }

    log(`MCP Server path: ${mcpServerPath}`);
    if (!fs.existsSync(mcpServerPath)) {
      log(`MCP Server file not found at: ${mcpServerPath}`, 'warn');
    } else {
      log('MCP Server file found successfully');
    }

    // Register MCP Server Definition Provider
    if (autoStart) {
      try {
        if (typeof (vscode.lm as any)?.registerMcpServerDefinitionProvider === 'function') {
          const env: Record<string, string> = {};
          if (token) { env.GITHUB_TOKEN = token; }
          if (defaultOwner) { env.GITHUB_OWNER = defaultOwner; }
          if (defaultRepo) { env.GITHUB_REPO = defaultRepo; }
          if (apiUrl !== 'https://api.github.com') { env.GITHUB_API_URL = apiUrl; }

          log(`Registering MCP provider — owner: ${defaultOwner || '(auto)'}, repo: ${defaultRepo || '(auto)'}`);

          context.subscriptions.push(
            (vscode.lm as any).registerMcpServerDefinitionProvider('gh-devops', {
              provideMcpServerDefinitions() {
                log('Providing MCP Server definitions...');
                return [
                  new (vscode as any).McpStdioServerDefinition(
                    'gh-devops',
                    'node',
                    [mcpServerPath],
                    env
                  )
                ];
              }
            })
          );
          log('MCP Server Definition Provider registered successfully');
        } else {
          log('MCP API (vscode.lm.registerMcpServerDefinitionProvider) not available in this VS Code version', 'warn');
          log('Update VS Code to 1.99+ to use MCP tools', 'warn');
        }
      } catch (error) {
        log(`MCP registration failed: ${error}`, 'warn');
        log('Extension will continue without MCP');
      }
    }

    // Welcome message on first install / update
    const currentVersion = context.extension.packageJSON.version || '1.0.0';
    const welcomeShown = context.globalState.get<string>('welcomeShownForVersion', '');
    if (welcomeShown !== currentVersion) {
      const message = hasToken
        ? `GitHub DevOps MCP v${currentVersion} is ready! 85+ tools available in Copilot Chat.`
        : 'GitHub DevOps MCP installed! Configure your GitHub token to enable all 85 tools.';
      vscode.window.showInformationMessage(message, hasToken ? 'View Docs' : 'Configure Now', 'Got it')
        .then(selection => {
          if (selection === 'Configure Now') { vscode.commands.executeCommand('ghDevops.configure'); }
          else if (selection === 'View Docs') { vscode.commands.executeCommand('ghDevops.viewDocs'); }
        });
      context.globalState.update('welcomeShownForVersion', currentVersion);
    }
  })();

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
          log(`Token validated — authenticated as @${user.login}`);
        } else {
          vscode.window.showErrorMessage(`❌ Connection failed: ${response.status} ${response.statusText}`);
          log(`Token test failed: ${response.status} ${response.statusText}`, 'error');
        }
      } catch (err) {
        vscode.window.showErrorMessage(`❌ Connection error: ${err instanceof Error ? err.message : String(err)}`);
        log(`Connection error: ${err}`, 'error');
      }
    }),

    vscode.commands.registerCommand('ghDevops.restart', () => {
      vscode.window.showInformationMessage('Reloading VS Code window to restart GitHub DevOps MCP server...');
      log('Reloading window to restart MCP server...');
      vscode.commands.executeCommand('workbench.action.reloadWindow');
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
        log(`Default repository updated to ${owner}/${repoName}. Reload window to apply.`);
        vscode.window.showInformationMessage(`✅ Default repository set to: ${repo}. Reload window to apply.`);
      }
    }),

    vscode.commands.registerCommand('ghDevops.viewDocs', () => {
      vscode.env.openExternal(vscode.Uri.parse('https://github.com/GleidsonFerSanP/gh-devops-mcp#readme'));
    }),
  );
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

function updateStatusBarState(hasToken: boolean): void {
  if (hasToken) {
    statusBarItem.text = '$(github) DevOps ✓';
    statusBarItem.tooltip = 'GitHub DevOps MCP — Connected. Click to configure.';
    statusBarItem.backgroundColor = undefined;
  } else {
    statusBarItem.text = '$(github) DevOps';
    statusBarItem.tooltip = 'GitHub DevOps MCP — Not configured. Click to set up.';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }
  statusBarItem.show();
}

export function deactivate() {
  // subscriptions are auto-disposed by VS Code
}
