import { GitHubClient } from '../client/github-client.js';
import { formatErrorForAI } from '../utils/error-handler.js';
import { formatCheckConclusion, formatRelativeTime, sectionHeader } from '../utils/formatters.js';

export const checksTools = [
  {
    name: 'list_check_runs_for_ref',
    description: 'List all check runs for a specific ref (branch, tag, or SHA). Shows check names, statuses, conclusions, and run URLs.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        ref: { type: 'string', description: 'The ref (branch, tag, or commit SHA)' },
        check_name: { type: 'string', description: 'Filter by check name' },
        status: { type: 'string', description: 'Filter by status: queued, in_progress, or completed' },
        filter: { type: 'string', description: 'Filter: latest (default) or all' },
        per_page: { type: 'number', description: 'Results per page (default 30)' },
      },
      required: ['ref'],
    },
  },
  {
    name: 'get_check_run',
    description: 'Get details of a specific check run including all output, annotations, and external links.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        check_run_id: { type: 'number', description: 'The check run ID' },
      },
      required: ['check_run_id'],
    },
  },
  {
    name: 'list_check_suites',
    description: 'List check suites for a specific ref. Check suites group related check runs together by app (e.g., all GitHub Actions runs).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        ref: { type: 'string', description: 'The ref (branch, tag, or SHA)' },
        app_id: { type: 'number', description: 'Filter by GitHub App installation ID' },
        check_name: { type: 'string', description: 'Filter by check name' },
      },
      required: ['ref'],
    },
  },
  {
    name: 'rerequest_check_suite',
    description: 'Re-trigger a check suite to run its checks again. Useful for retrying failed CI checks.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        check_suite_id: { type: 'number', description: 'The check suite ID to rerequest' },
      },
      required: ['check_suite_id'],
    },
  },
];

export async function handleChecksTool(name: string, args: Record<string, unknown>, client: GitHubClient): Promise<string> {
  const owner = (args.owner as string) || client.owner;
  const repo = (args.repo as string) || client.repo;

  try {
    switch (name) {
      case 'list_check_runs_for_ref': {
        const params: Record<string, string | number | boolean | undefined> = {
          filter: (args.filter as string) || 'latest',
          per_page: (args.per_page as number) || 30,
        };
        if (args.check_name) params.check_name = args.check_name as string;
        if (args.status) params.status = args.status as string;
        const result = await client.get<any>(`/repos/${owner}/${repo}/commits/${args.ref}/check-runs`, params);
        const checkRuns = result.check_runs || [];
        if (checkRuns.length === 0) return `No check runs found for ref "${args.ref}".`;

        let output = sectionHeader(`Check Runs for ${args.ref} (${result.total_count} total)`);
        for (const c of checkRuns) {
          output += `${formatCheckConclusion(c.conclusion)} ${c.name}\n`;
          output += `  ID: ${c.id} | App: ${c.app?.name || 'N/A'}\n`;
          output += `  Status: ${c.status} | Started: ${formatRelativeTime(c.started_at)}\n`;
          if (c.details_url) output += `  URL: ${c.details_url}\n`;
          output += '\n';
        }
        return output;
      }

      case 'get_check_run': {
        const c = await client.get<any>(`/repos/${owner}/${repo}/check-runs/${args.check_run_id}`);
        let output = sectionHeader(`Check Run: ${c.name}`);
        output += `ID: ${c.id}\n`;
        output += `Status: ${c.status}\n`;
        output += `Conclusion: ${formatCheckConclusion(c.conclusion)}\n`;
        output += `App: ${c.app?.name || 'N/A'}\n`;
        output += `Started: ${formatRelativeTime(c.started_at)}\n`;
        if (c.completed_at) output += `Completed: ${formatRelativeTime(c.completed_at)}\n`;
        if (c.html_url) output += `URL: ${c.html_url}\n`;
        if (c.details_url) output += `Details URL: ${c.details_url}\n`;

        if (c.output) {
          output += sectionHeader('Output');
          if (c.output.title) output += `Title: ${c.output.title}\n`;
          if (c.output.summary) output += `Summary: ${c.output.summary}\n`;
          if (c.output.annotations_count > 0) {
            output += `Annotations: ${c.output.annotations_count}\n`;
          }
        }
        return output;
      }

      case 'list_check_suites': {
        const params: Record<string, string | number | boolean | undefined> = {};
        if (args.app_id) params.app_id = args.app_id as number;
        if (args.check_name) params.check_name = args.check_name as string;
        const result = await client.get<any>(`/repos/${owner}/${repo}/commits/${args.ref}/check-suites`, params);
        const suites = result.check_suites || [];
        if (suites.length === 0) return `No check suites found for ref "${args.ref}".`;

        let output = sectionHeader(`Check Suites for ${args.ref} (${result.total_count} total)`);
        for (const s of suites) {
          output += `${formatCheckConclusion(s.conclusion)} Suite ${s.id}\n`;
          output += `  App: ${s.app?.name || 'N/A'}\n`;
          output += `  Status: ${s.status} | Branch: ${s.head_branch || 'N/A'}\n`;
          output += `  SHA: ${s.head_sha?.substring(0, 7)}\n\n`;
        }
        return output;
      }

      case 'rerequest_check_suite': {
        await client.post(`/repos/${owner}/${repo}/check-suites/${args.check_suite_id}/rerequest`);
        return `✅ Check suite ${args.check_suite_id} has been rerequested. Checks will be re-run.`;
      }

      default:
        return `Unknown checks tool: ${name}`;
    }
  } catch (error) {
    return formatErrorForAI(error, name);
  }
}
