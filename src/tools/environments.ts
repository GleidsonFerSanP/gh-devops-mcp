import { GitHubClient } from '../client/github-client.js';
import { formatErrorForAI } from '../utils/error-handler.js';
import { formatRelativeTime, sectionHeader } from '../utils/formatters.js';

export const environmentsTools = [
  {
    name: 'list_environments',
    description: 'List all deployment environments configured for the repository. Shows environment names, protection rules summary, and deployment branch policies.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        per_page: { type: 'number', description: 'Results per page (max 100, default 30)' },
      },
      required: [],
    },
  },
  {
    name: 'get_environment',
    description: 'Get details of a specific environment including protection rules, required reviewers, and deployment branch policy.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        environment_name: { type: 'string', description: 'The name of the environment' },
      },
      required: ['environment_name'],
    },
  },
  {
    name: 'create_environment',
    description: 'Create or update a deployment environment. Configure wait timers, required reviewers, and branch policies.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        environment_name: { type: 'string', description: 'The name of the environment to create' },
        wait_timer: { type: 'number', description: 'Time to wait before allowing deployments (0-43200 minutes)' },
        reviewers: { type: 'array', items: { type: 'object' }, description: 'Required reviewers array [{type: "User"|"Team", id: number}]' },
        deployment_branch_policy: { type: 'object', description: 'Branch policy: {protected_branches: bool, custom_branch_policies: bool}' },
      },
      required: ['environment_name'],
    },
  },
  {
    name: 'delete_environment',
    description: 'Delete a deployment environment from the repository.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        environment_name: { type: 'string', description: 'The name of the environment to delete' },
      },
      required: ['environment_name'],
    },
  },
  {
    name: 'get_environment_protection_rules',
    description: 'Get the protection rules configured for a specific environment. Shows wait timers, required reviewers, and branch policies.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        environment_name: { type: 'string', description: 'The name of the environment' },
      },
      required: ['environment_name'],
    },
  },
];

function formatEnvironment(env: any): string {
  let output = '';
  output += `• ${env.name}\n`;
  output += `  ID: ${env.id}\n`;
  if (env.protection_rules && env.protection_rules.length > 0) {
    output += `  Protection Rules: ${env.protection_rules.length}\n`;
    for (const rule of env.protection_rules) {
      if (rule.type === 'wait_timer') output += `    ⏱️ Wait Timer: ${rule.wait_timer} min\n`;
      if (rule.type === 'required_reviewers') output += `    👥 Required Reviewers: ${rule.reviewers?.length || 0}\n`;
      if (rule.type === 'branch_policy') output += `    🌿 Branch Policy\n`;
    }
  }
  if (env.deployment_branch_policy) {
    const policy = env.deployment_branch_policy;
    if (policy.protected_branches) output += `  🔒 Only protected branches\n`;
    if (policy.custom_branch_policies) output += `  🌿 Custom branch policies\n`;
  }
  return output;
}

export async function handleEnvironmentsTool(name: string, args: Record<string, unknown>, client: GitHubClient): Promise<string> {
  const owner = (args.owner as string) || client.owner;
  const repo = (args.repo as string) || client.repo;

  try {
    switch (name) {
      case 'list_environments': {
        const params: Record<string, string | number | boolean | undefined> = {
          per_page: (args.per_page as number) || 30,
        };
        const result = await client.get<any>(`/repos/${owner}/${repo}/environments`, params);
        const environments = result.environments || [];
        if (environments.length === 0) return 'No environments configured for this repository.';

        let output = sectionHeader(`Environments (${result.total_count || environments.length} total)`);
        for (const env of environments) {
          output += formatEnvironment(env);
          output += '\n';
        }
        return output;
      }

      case 'get_environment': {
        const env = await client.get<any>(`/repos/${owner}/${repo}/environments/${args.environment_name}`);
        let output = sectionHeader(`Environment: ${env.name}`);
        output += `ID: ${env.id}\n`;
        output += `Created: ${formatRelativeTime(env.created_at)}\n`;
        output += `Updated: ${formatRelativeTime(env.updated_at)}\n`;
        if (env.html_url) output += `URL: ${env.html_url}\n`;
        if (env.protection_rules && env.protection_rules.length > 0) {
          output += sectionHeader('Protection Rules');
          for (const rule of env.protection_rules) {
            if (rule.type === 'wait_timer') output += `• Wait Timer: ${rule.wait_timer} minutes\n`;
            if (rule.type === 'required_reviewers') {
              output += `• Required Reviewers (${rule.reviewers?.length || 0}):\n`;
              for (const r of rule.reviewers || []) {
                output += `  - ${r.reviewer?.login || r.reviewer?.name || 'Unknown'} (${r.type})\n`;
              }
            }
            if (rule.type === 'branch_policy') output += `• Branch Policy\n`;
          }
        }
        if (env.deployment_branch_policy) {
          output += sectionHeader('Deployment Branch Policy');
          if (env.deployment_branch_policy.protected_branches) output += '• Only protected branches allowed\n';
          if (env.deployment_branch_policy.custom_branch_policies) output += '• Custom branch policies enabled\n';
        }
        return output;
      }

      case 'create_environment': {
        const body: Record<string, unknown> = {};
        if (args.wait_timer !== undefined) body.wait_timer = args.wait_timer;
        if (args.reviewers) body.reviewers = args.reviewers;
        if (args.deployment_branch_policy) body.deployment_branch_policy = args.deployment_branch_policy;
        const env = await client.put<any>(`/repos/${owner}/${repo}/environments/${args.environment_name}`, body);
        return `✅ Environment "${args.environment_name}" created/updated.\nID: ${env.id}\nCreated: ${formatRelativeTime(env.created_at)}`;
      }

      case 'delete_environment': {
        await client.delete(`/repos/${owner}/${repo}/environments/${args.environment_name}`);
        return `✅ Environment "${args.environment_name}" has been deleted.`;
      }

      case 'get_environment_protection_rules': {
        const env = await client.get<any>(`/repos/${owner}/${repo}/environments/${args.environment_name}`);
        const rules = env.protection_rules || [];
        if (rules.length === 0) return `Environment "${args.environment_name}" has no protection rules configured.`;

        let output = sectionHeader(`Protection Rules for "${args.environment_name}"`);
        for (const rule of rules) {
          switch (rule.type) {
            case 'wait_timer':
              output += `⏱️ Wait Timer: ${rule.wait_timer} minutes\n`;
              break;
            case 'required_reviewers':
              output += `👥 Required Reviewers:\n`;
              for (const r of rule.reviewers || []) {
                output += `  - ${r.reviewer?.login || r.reviewer?.name || 'Unknown'} (${r.type})\n`;
              }
              break;
            case 'branch_policy':
              output += `🌿 Branch Policy applied\n`;
              break;
            default:
              output += `• Rule type: ${rule.type}\n`;
          }
        }
        if (env.deployment_branch_policy) {
          output += sectionHeader('Deployment Branch Policy');
          const policy = env.deployment_branch_policy;
          if (policy.protected_branches) output += '• Only protected branches\n';
          if (policy.custom_branch_policies) output += '• Custom branch policies\n';
        }
        return output;
      }

      default:
        return `Unknown environments tool: ${name}`;
    }
  } catch (error) {
    return formatErrorForAI(error, name);
  }
}
