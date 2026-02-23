import { GitHubClient } from '../client/github-client.js';
import { formatErrorForAI } from '../utils/error-handler.js';
import { formatRelativeTime, sectionHeader } from '../utils/formatters.js';

export const workflowsTools = [
  {
    name: 'list_workflows',
    description: 'List all GitHub Actions workflows in the repository. Shows workflow names, states (active/disabled), filenames, and URLs. Use this to discover available CI/CD pipelines.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner (org or user). Uses default if not provided.' },
        repo: { type: 'string', description: 'Repository name. Uses default if not provided.' },
        per_page: { type: 'number', description: 'Results per page (max 100, default 30)' },
      },
      required: [],
    },
  },
  {
    name: 'get_workflow',
    description: 'Get details of a specific GitHub Actions workflow by ID or filename (e.g., "ci.yml"). Returns workflow name, state, path, creation date, and URL.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        workflow_id: { type: 'string', description: 'Workflow ID (number) or filename (e.g., "ci.yml")' },
      },
      required: ['workflow_id'],
    },
  },
  {
    name: 'dispatch_workflow',
    description: 'Manually trigger a workflow run via workflow_dispatch event. Requires the workflow to have a workflow_dispatch trigger defined. You can pass custom inputs.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        workflow_id: { type: 'string', description: 'Workflow ID or filename' },
        ref: { type: 'string', description: 'Branch or tag to run on (e.g., "main")' },
        inputs: { type: 'object', description: 'Key-value input parameters for the workflow' },
      },
      required: ['workflow_id', 'ref'],
    },
  },
  {
    name: 'enable_workflow',
    description: 'Enable a disabled GitHub Actions workflow. Use when a workflow has been disabled and needs to be re-activated.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        workflow_id: { type: 'string', description: 'Workflow ID or filename' },
      },
      required: ['workflow_id'],
    },
  },
  {
    name: 'disable_workflow',
    description: 'Disable a GitHub Actions workflow. The workflow will no longer run on triggers but can be re-enabled later.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        workflow_id: { type: 'string', description: 'Workflow ID or filename' },
      },
      required: ['workflow_id'],
    },
  },
  {
    name: 'get_workflow_usage',
    description: 'Get the billable usage (timing) of a specific workflow. Shows time consumed per runner OS (Ubuntu, macOS, Windows) in milliseconds.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        workflow_id: { type: 'string', description: 'Workflow ID or filename' },
      },
      required: ['workflow_id'],
    },
  },
];

export async function handleWorkflowsTool(name: string, args: Record<string, unknown>, client: GitHubClient): Promise<string> {
  const owner = (args.owner as string) || client.owner;
  const repo = (args.repo as string) || client.repo;

  try {
    switch (name) {
      case 'list_workflows': {
        const perPage = (args.per_page as number) || 30;
        const result = await client.get<any>(`/repos/${owner}/${repo}/actions/workflows`, { per_page: perPage });
        const workflows = result.workflows || [];
        if (workflows.length === 0) return 'No workflows found in this repository.';

        let output = sectionHeader(`Workflows (${result.total_count} total)`);
        for (const wf of workflows) {
          output += `• [${wf.state === 'active' ? '✅' : '⚫'}] ${wf.name}\n`;
          output += `  ID: ${wf.id} | File: ${wf.path} | State: ${wf.state}\n`;
          output += `  Created: ${formatRelativeTime(wf.created_at)} | URL: ${wf.html_url}\n\n`;
        }
        return output;
      }

      case 'get_workflow': {
        const wf = await client.get<any>(`/repos/${owner}/${repo}/actions/workflows/${args.workflow_id}`);
        let output = sectionHeader(`Workflow: ${wf.name}`);
        output += `ID: ${wf.id}\n`;
        output += `State: ${wf.state === 'active' ? '✅ Active' : '⚫ Disabled'}\n`;
        output += `File: ${wf.path}\n`;
        output += `Created: ${formatRelativeTime(wf.created_at)}\n`;
        output += `Updated: ${formatRelativeTime(wf.updated_at)}\n`;
        output += `URL: ${wf.html_url}\n`;
        return output;
      }

      case 'dispatch_workflow': {
        await client.post(`/repos/${owner}/${repo}/actions/workflows/${args.workflow_id}/dispatches`, {
          ref: args.ref,
          inputs: args.inputs || {},
        });
        return `✅ Workflow dispatch triggered successfully.\nWorkflow: ${args.workflow_id}\nRef: ${args.ref}\nInputs: ${JSON.stringify(args.inputs || {})}\n\nUse list_workflow_runs to check the status.`;
      }

      case 'enable_workflow': {
        await client.put(`/repos/${owner}/${repo}/actions/workflows/${args.workflow_id}/enable`);
        return `✅ Workflow ${args.workflow_id} has been enabled.`;
      }

      case 'disable_workflow': {
        await client.put(`/repos/${owner}/${repo}/actions/workflows/${args.workflow_id}/disable`);
        return `✅ Workflow ${args.workflow_id} has been disabled.`;
      }

      case 'get_workflow_usage': {
        const usage = await client.get<any>(`/repos/${owner}/${repo}/actions/workflows/${args.workflow_id}/timing`);
        let output = sectionHeader('Workflow Usage (Billable Time)');
        const billable = usage.billable || {};
        for (const [os, data] of Object.entries(billable) as [string, any][]) {
          output += `• ${os}: ${data.total_ms ? Math.round(data.total_ms / 60000) + ' min' : '0 min'}\n`;
        }
        if (Object.keys(billable).length === 0) output += 'No billable usage recorded.\n';
        return output;
      }

      default:
        return `Unknown workflows tool: ${name}`;
    }
  } catch (error) {
    return formatErrorForAI(error, name);
  }
}
