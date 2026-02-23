import { GitHubClient } from '../client/github-client.js';
import { formatErrorForAI } from '../utils/error-handler.js';
import { formatDeploymentState, formatRelativeTime, sectionHeader } from '../utils/formatters.js';

export const deploymentsTools = [
  {
    name: 'list_deployments',
    description: 'List deployments for the repository. Filter by SHA, ref, environment, or task. Shows deployment targets, status, and history.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        sha: { type: 'string', description: 'Filter by commit SHA' },
        ref: { type: 'string', description: 'Filter by ref (branch, tag, or SHA)' },
        task: { type: 'string', description: 'Filter by task (e.g., "deploy")' },
        environment: { type: 'string', description: 'Filter by environment name (e.g., "production")' },
        per_page: { type: 'number', description: 'Results per page (default 30)' },
      },
      required: [],
    },
  },
  {
    name: 'get_deployment',
    description: 'Get details of a specific deployment including ref, environment, creator, and timestamps.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        deployment_id: { type: 'number', description: 'The deployment ID' },
      },
      required: ['deployment_id'],
    },
  },
  {
    name: 'create_deployment',
    description: 'Create a new deployment for a given ref (branch, tag, or SHA). This triggers any configured deployment hooks/Actions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        ref: { type: 'string', description: 'The ref to deploy (branch, tag, or SHA)' },
        task: { type: 'string', description: 'Task name (default: "deploy")' },
        auto_merge: { type: 'boolean', description: 'Auto-merge the default branch into the ref if behind (default: true)' },
        environment: { type: 'string', description: 'Target environment (default: "production")' },
        description: { type: 'string', description: 'Description of the deployment' },
        required_contexts: { type: 'array', items: { type: 'string' }, description: 'Required status check contexts that must pass' },
      },
      required: ['ref'],
    },
  },
  {
    name: 'delete_deployment',
    description: 'Delete a deployment. Only inactive deployments can be deleted. Set the deployment status to inactive first.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        deployment_id: { type: 'number', description: 'The deployment ID to delete' },
      },
      required: ['deployment_id'],
    },
  },
  {
    name: 'list_deployment_statuses',
    description: 'List status history for a deployment. Shows progression from pending → in_progress → success/failure with timestamps and URLs.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        deployment_id: { type: 'number', description: 'The deployment ID' },
      },
      required: ['deployment_id'],
    },
  },
  {
    name: 'create_deployment_status',
    description: 'Create a new deployment status (e.g., mark as "success", "failure", "in_progress"). Updates the deployment state.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        deployment_id: { type: 'number', description: 'The deployment ID' },
        state: { type: 'string', description: 'State: error, failure, inactive, in_progress, queued, pending, success' },
        description: { type: 'string', description: 'Status description' },
        environment_url: { type: 'string', description: 'URL of the deployed environment' },
        log_url: { type: 'string', description: 'URL for deployment logs' },
        auto_inactive: { type: 'boolean', description: 'Mark previous non-transient deployments as inactive (default: true)' },
      },
      required: ['deployment_id', 'state'],
    },
  },
];

export async function handleDeploymentsTool(name: string, args: Record<string, unknown>, client: GitHubClient): Promise<string> {
  const owner = (args.owner as string) || client.owner;
  const repo = (args.repo as string) || client.repo;

  try {
    switch (name) {
      case 'list_deployments': {
        const params: Record<string, string | number | boolean | undefined> = {
          per_page: (args.per_page as number) || 30,
        };
        if (args.sha) params.sha = args.sha as string;
        if (args.ref) params.ref = args.ref as string;
        if (args.task) params.task = args.task as string;
        if (args.environment) params.environment = args.environment as string;
        const deployments = await client.get<any[]>(`/repos/${owner}/${repo}/deployments`, params);
        if (!deployments || deployments.length === 0) return 'No deployments found.';

        let output = sectionHeader(`Deployments (${deployments.length})`);
        for (const d of deployments) {
          output += `• ID: ${d.id} | Ref: ${d.ref} | Env: ${d.environment || 'N/A'}\n`;
          output += `  Task: ${d.task} | SHA: ${d.sha?.substring(0, 7)}\n`;
          output += `  Creator: ${d.creator?.login || 'N/A'} | Created: ${formatRelativeTime(d.created_at)}\n`;
          if (d.description) output += `  Description: ${d.description}\n`;
          output += '\n';
        }
        return output;
      }

      case 'get_deployment': {
        const d = await client.get<any>(`/repos/${owner}/${repo}/deployments/${args.deployment_id}`);
        let output = sectionHeader(`Deployment ${d.id}`);
        output += `Ref: ${d.ref}\n`;
        output += `Environment: ${d.environment || 'N/A'}\n`;
        output += `Task: ${d.task}\n`;
        output += `SHA: ${d.sha?.substring(0, 7)}\n`;
        output += `Creator: ${d.creator?.login || 'N/A'}\n`;
        output += `Created: ${formatRelativeTime(d.created_at)}\n`;
        output += `Updated: ${formatRelativeTime(d.updated_at)}\n`;
        if (d.description) output += `Description: ${d.description}\n`;
        return output;
      }

      case 'create_deployment': {
        const body: Record<string, unknown> = { ref: args.ref };
        if (args.task) body.task = args.task;
        if (args.auto_merge !== undefined) body.auto_merge = args.auto_merge;
        if (args.environment) body.environment = args.environment;
        if (args.description) body.description = args.description;
        if (args.required_contexts) body.required_contexts = args.required_contexts;
        const d = await client.post<any>(`/repos/${owner}/${repo}/deployments`, body);
        return `✅ Deployment created.\nID: ${d.id} | Ref: ${d.ref} | Env: ${d.environment || 'N/A'}\nCreated: ${formatRelativeTime(d.created_at)}`;
      }

      case 'delete_deployment': {
        await client.delete(`/repos/${owner}/${repo}/deployments/${args.deployment_id}`);
        return `✅ Deployment ${args.deployment_id} has been deleted.`;
      }

      case 'list_deployment_statuses': {
        const statuses = await client.get<any[]>(`/repos/${owner}/${repo}/deployments/${args.deployment_id}/statuses`);
        if (!statuses || statuses.length === 0) return `No statuses found for deployment ${args.deployment_id}.`;

        let output = sectionHeader(`Deployment ${args.deployment_id} Status History`);
        for (const s of statuses) {
          output += `${formatDeploymentState(s.state)}\n`;
          output += `  Created: ${formatRelativeTime(s.created_at)}\n`;
          if (s.description) output += `  Description: ${s.description}\n`;
          if (s.environment_url) output += `  Environment URL: ${s.environment_url}\n`;
          if (s.log_url) output += `  Log URL: ${s.log_url}\n`;
          output += '\n';
        }
        return output;
      }

      case 'create_deployment_status': {
        const body: Record<string, unknown> = { state: args.state };
        if (args.description) body.description = args.description;
        if (args.environment_url) body.environment_url = args.environment_url;
        if (args.log_url) body.log_url = args.log_url;
        if (args.auto_inactive !== undefined) body.auto_inactive = args.auto_inactive;
        const s = await client.post<any>(`/repos/${owner}/${repo}/deployments/${args.deployment_id}/statuses`, body);
        return `✅ Deployment status created.\nState: ${formatDeploymentState(s.state)}\nID: ${s.id}`;
      }

      default:
        return `Unknown deployments tool: ${name}`;
    }
  } catch (error) {
    return formatErrorForAI(error, name);
  }
}
