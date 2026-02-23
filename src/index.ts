#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';

import { getCredentialsFromEnv, validateCredentials } from './client/auth.js';
import { GitHubClient } from './client/github-client.js';

import { workflowsTools, handleWorkflowsTool } from './tools/workflows.js';
import { workflowRunsTools, handleWorkflowRunsTool } from './tools/workflow-runs.js';
import { artifactsTools, handleArtifactsTool } from './tools/artifacts.js';
import { deploymentsTools, handleDeploymentsTool } from './tools/deployments.js';
import { environmentsTools, handleEnvironmentsTool } from './tools/environments.js';
import { secretsTools, handleSecretsTool } from './tools/secrets.js';
import { releasesTools, handleReleasesTool } from './tools/releases.js';
import { branchesTools, handleBranchesTool } from './tools/branches.js';
import { pullRequestsTools, handlePullRequestsTool } from './tools/pull-requests.js';
import { checksTools, handleChecksTool } from './tools/checks.js';
import { securityTools, handleSecurityTool } from './tools/security.js';
import { packagesTools, handlePackagesTool } from './tools/packages.js';
import { repositoryTools, handleRepositoryTool } from './tools/repository.js';

type ToolHandler = (name: string, args: Record<string, unknown>, client: GitHubClient) => Promise<string>;

class GitHubDevOpsServer {
  private server: Server;
  private client: GitHubClient | null = null;
  private toolHandlerMap: Map<string, ToolHandler>;

  constructor() {
    this.server = new Server(
      { name: 'gh-devops-mcp', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    this.toolHandlerMap = this.buildToolHandlerMap();
    this.setupHandlers();
  }

  private buildToolHandlerMap(): Map<string, ToolHandler> {
    const map = new Map<string, ToolHandler>();

    const toolHandlerPairs: [any[], ToolHandler][] = [
      [workflowsTools, handleWorkflowsTool],
      [workflowRunsTools, handleWorkflowRunsTool],
      [artifactsTools, handleArtifactsTool],
      [deploymentsTools, handleDeploymentsTool],
      [environmentsTools, handleEnvironmentsTool],
      [secretsTools, handleSecretsTool],
      [releasesTools, handleReleasesTool],
      [branchesTools, handleBranchesTool],
      [pullRequestsTools, handlePullRequestsTool],
      [checksTools, handleChecksTool],
      [securityTools, handleSecurityTool],
      [packagesTools, handlePackagesTool],
      [repositoryTools, handleRepositoryTool],
    ];

    for (const [tools, handler] of toolHandlerPairs) {
      for (const tool of tools) {
        map.set(tool.name, handler);
      }
    }

    return map;
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          ...workflowsTools,
          ...workflowRunsTools,
          ...artifactsTools,
          ...deploymentsTools,
          ...environmentsTools,
          ...secretsTools,
          ...releasesTools,
          ...branchesTools,
          ...pullRequestsTools,
          ...checksTools,
          ...securityTools,
          ...packagesTools,
          ...repositoryTools,
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<{ content: CallToolResult['content'] }> => {
      const { name, arguments: args = {} } = request.params;

      if (!this.client) {
        return {
          content: [
            {
              type: 'text' as const,
              text: [
                '⚠️ GitHub token not configured.',
                '',
                'To use gh-devops-mcp, you need to set the GITHUB_TOKEN environment variable.',
                '',
                '1. Create a Personal Access Token at: https://github.com/settings/tokens',
                '',
                '2. Required scopes:',
                '   • repo (full control of private repositories)',
                '   • workflow (update GitHub Action workflows)',
                '   • write:packages (upload packages)',
                '   • security_events (read and write security events)',
                '',
                '3. Set the environment variable:',
                '   export GITHUB_TOKEN=your_token_here',
                '',
                '4. Optionally set defaults:',
                '   export GITHUB_OWNER=your_username',
                '   export GITHUB_REPO=your_default_repo',
              ].join('\n'),
            },
          ],
        };
      }

      const handler = this.toolHandlerMap.get(name);
      if (!handler) {
        return {
          content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
        };
      }

      const result = await handler(name, args as Record<string, unknown>, this.client);
      return {
        content: [{ type: 'text' as const, text: result }],
      };
    });
  }

  async run(): Promise<void> {
    const credentials = getCredentialsFromEnv();
    const isValid = credentials ? validateCredentials(credentials) : false;

    if (!credentials || !isValid) {
      process.stderr.write('[gh-devops-mcp] Warning: GITHUB_TOKEN not set or invalid.\n');
      process.stderr.write('[gh-devops-mcp] Server starting without authentication. Tools will return setup instructions.\n');
    } else {
      this.client = new GitHubClient(credentials);
      process.stderr.write(`[gh-devops-mcp] Authenticated as owner: ${credentials.owner || 'default'}, repo: ${credentials.repo || 'default'}\n`);
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    process.stderr.write('[gh-devops-mcp] MCP server running on stdio\n');
  }
}

const server = new GitHubDevOpsServer();
server.run().catch((error) => {
  process.stderr.write(`[gh-devops-mcp] Fatal error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
