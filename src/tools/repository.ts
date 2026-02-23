import { GitHubClient } from '../client/github-client.js';
import { formatErrorForAI } from '../utils/error-handler.js';
import { formatRelativeTime, formatSize, sectionHeader } from '../utils/formatters.js';

export const repositoryTools = [
  {
    name: 'get_repository',
    description: 'Get comprehensive information about the repository including description, default branch, stars, forks, issues, license, and settings.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
      },
      required: [],
    },
  },
  {
    name: 'list_webhooks',
    description: 'List all webhooks configured for the repository. Shows webhook URLs, events they listen to, and active status.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        per_page: { type: 'number', description: 'Results per page (default 30)' },
      },
      required: [],
    },
  },
  {
    name: 'create_webhook',
    description: 'Create a new webhook for the repository to receive event notifications.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        url: { type: 'string', description: 'The webhook payload URL' },
        content_type: { type: 'string', description: 'Content type: json (default) or form' },
        secret: { type: 'string', description: 'Webhook secret for HMAC signature verification' },
        events: { type: 'array', items: { type: 'string' }, description: 'Events to subscribe to (default: ["push"])' },
        active: { type: 'boolean', description: 'Whether the webhook is active (default: true)' },
      },
      required: ['url'],
    },
  },
  {
    name: 'delete_webhook',
    description: 'Delete a webhook from the repository.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        hook_id: { type: 'number', description: 'The webhook ID to delete' },
      },
      required: ['hook_id'],
    },
  },
  {
    name: 'list_repository_topics',
    description: 'List all topics (tags) associated with the repository.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
      },
      required: [],
    },
  },
  {
    name: 'get_repository_stats',
    description: 'Get comprehensive repository statistics including languages, top contributors, weekly commit activity, and key metrics. HIGH-LEVEL summary tool.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
      },
      required: [],
    },
  },
];

export async function handleRepositoryTool(name: string, args: Record<string, unknown>, client: GitHubClient): Promise<string> {
  const owner = (args.owner as string) || client.owner;
  const repo = (args.repo as string) || client.repo;

  try {
    switch (name) {
      case 'get_repository': {
        const r = await client.get<any>(`/repos/${owner}/${repo}`);
        let output = sectionHeader(`Repository: ${r.full_name}`);
        if (r.description) output += `Description: ${r.description}\n`;
        output += `Default Branch: ${r.default_branch}\n`;
        output += `Language: ${r.language || 'N/A'}\n`;
        output += `Stars: ${r.stargazers_count} | Forks: ${r.forks_count} | Watchers: ${r.watchers_count}\n`;
        output += `Open Issues: ${r.open_issues_count}\n`;
        output += `Topics: ${r.topics?.join(', ') || 'None'}\n`;
        output += `License: ${r.license?.spdx_id || 'None'}\n`;
        output += `Visibility: ${r.visibility}\n`;
        output += `Size: ${formatSize(r.size * 1024)}\n`;
        output += `Created: ${formatRelativeTime(r.created_at)}\n`;
        output += `Last Push: ${formatRelativeTime(r.pushed_at)}\n`;
        output += `URL: ${r.html_url}\n`;
        return output;
      }

      case 'list_webhooks': {
        const params: Record<string, string | number | boolean | undefined> = {
          per_page: (args.per_page as number) || 30,
        };
        const webhooks = await client.get<any[]>(`/repos/${owner}/${repo}/hooks`, params);
        if (!webhooks || webhooks.length === 0) return 'No webhooks configured for this repository.';

        let output = sectionHeader(`Webhooks (${webhooks.length})`);
        for (const h of webhooks) {
          output += `• ID: ${h.id} | Active: ${h.active ? '✅' : '⚫'}\n`;
          output += `  URL: ${h.config?.url || 'N/A'}\n`;
          output += `  Events: ${h.events?.join(', ') || 'None'}\n`;
          output += `  Created: ${formatRelativeTime(h.created_at)}\n\n`;
        }
        return output;
      }

      case 'create_webhook': {
        const body: Record<string, unknown> = {
          name: 'web',
          active: args.active !== undefined ? args.active : true,
          events: args.events || ['push'],
          config: {
            url: args.url,
            content_type: args.content_type || 'json',
            insecure_ssl: '0',
          },
        };
        if (args.secret) (body.config as Record<string, string>).secret = args.secret as string;
        const h = await client.post<any>(`/repos/${owner}/${repo}/hooks`, body);
        return `✅ Webhook created.\nID: ${h.id}\nURL: ${h.config?.url}\nEvents: ${h.events?.join(', ')}\nActive: ${h.active}`;
      }

      case 'delete_webhook': {
        await client.delete(`/repos/${owner}/${repo}/hooks/${args.hook_id}`);
        return `✅ Webhook ${args.hook_id} has been deleted.`;
      }

      case 'list_repository_topics': {
        const result = await client.get<any>(`/repos/${owner}/${repo}/topics`, undefined, {
          'Accept': 'application/vnd.github.mercy-preview+json',
        });
        const topics = result.names || [];
        if (topics.length === 0) return 'No topics found for this repository.';
        return `Repository Topics:\n${topics.map((t: string) => `• ${t}`).join('\n')}`;
      }

      case 'get_repository_stats': {
        // Fetch all stats in parallel
        const [repoInfo, languages, contributors, commitActivity] = await Promise.all([
          client.get<any>(`/repos/${owner}/${repo}`),
          client.get<any>(`/repos/${owner}/${repo}/languages`),
          client.get<any[]>(`/repos/${owner}/${repo}/contributors`, { per_page: 10, anon: false }).catch(() => []),
          client.get<any[]>(`/repos/${owner}/${repo}/stats/commit_activity`).catch(() => []),
        ]);

        let output = sectionHeader(`Repository Stats: ${owner}/${repo}`);
        output += '\n📋 Info:\n';
        output += `  Description: ${repoInfo.description || 'No description'}\n`;
        output += `  Default Branch: ${repoInfo.default_branch} | Stars: ${repoInfo.stargazers_count} | Forks: ${repoInfo.forks_count}\n`;
        output += `  Open Issues: ${repoInfo.open_issues_count} | License: ${repoInfo.license?.spdx_id || 'None'}\n`;
        output += `  Created: ${formatRelativeTime(repoInfo.created_at)} | Last Push: ${formatRelativeTime(repoInfo.pushed_at)}\n`;

        // Languages
        if (languages && Object.keys(languages).length > 0) {
          output += '\n💻 Languages:\n';
          const total = Object.values(languages as Record<string, number>).reduce((a, b) => a + b, 0);
          const sorted = Object.entries(languages as Record<string, number>).sort((a, b) => b[1] - a[1]);
          const percentages = sorted.map(([lang, bytes]) => `${lang}: ${((bytes / total) * 100).toFixed(1)}%`);
          output += `  ${percentages.join(' | ')}\n`;
        }

        // Top Contributors
        if (contributors && Array.isArray(contributors) && contributors.length > 0) {
          output += '\n👥 Top Contributors:\n';
          for (let i = 0; i < Math.min(10, contributors.length); i++) {
            const c = contributors[i];
            output += `  ${i + 1}. ${c.login || 'N/A'} — ${c.contributions} contributions\n`;
          }
        }

        // Commit Activity (last 4 weeks)
        if (commitActivity && Array.isArray(commitActivity) && commitActivity.length > 0) {
          output += '\n📈 Recent Activity (last 4 weeks):\n';
          const recentWeeks = commitActivity.slice(-4);
          const weekLabels = recentWeeks.map((w: any, i: number) => `Week ${i + 1}: ${w.total} commits`);
          output += `  ${weekLabels.join(' | ')}\n`;
        }

        return output;
      }

      default:
        return `Unknown repository tool: ${name}`;
    }
  } catch (error) {
    return formatErrorForAI(error, name);
  }
}
