import { GitHubClient } from '../client/github-client.js';
import { formatErrorForAI } from '../utils/error-handler.js';
import { formatPRState, formatCheckConclusion, formatRelativeTime, sectionHeader } from '../utils/formatters.js';

export const pullRequestsTools = [
  {
    name: 'list_pull_requests',
    description: 'List pull requests for the repository. Filter by state, branch, base, and sorting. Shows PR titles, authors, labels, and CI status.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        state: { type: 'string', description: 'Filter by state: open (default), closed, or all' },
        head: { type: 'string', description: 'Filter by head branch (user:branch format)' },
        base: { type: 'string', description: 'Filter by base branch' },
        sort: { type: 'string', description: 'Sort by: created (default), updated, popularity, long-running' },
        direction: { type: 'string', description: 'Sort direction: desc (default) or asc' },
        per_page: { type: 'number', description: 'Results per page (max 100, default 30)' },
      },
      required: [],
    },
  },
  {
    name: 'get_pull_request',
    description: 'Get details of a specific pull request including description, reviewers, labels, milestones, and merge status.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        pull_number: { type: 'number', description: 'The PR number' },
      },
      required: ['pull_number'],
    },
  },
  {
    name: 'list_pr_commits',
    description: 'List all commits in a pull request. Shows commit messages, authors, and SHAs.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        pull_number: { type: 'number', description: 'The PR number' },
      },
      required: ['pull_number'],
    },
  },
  {
    name: 'list_pr_files',
    description: 'List all files changed in a pull request. Shows file names, status (added/modified/deleted), and diff stats.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        pull_number: { type: 'number', description: 'The PR number' },
      },
      required: ['pull_number'],
    },
  },
  {
    name: 'list_pr_reviews',
    description: 'List all reviews for a pull request. Shows reviewer names, states (approved/changes_requested/commented), and submitted dates.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        pull_number: { type: 'number', description: 'The PR number' },
      },
      required: ['pull_number'],
    },
  },
  {
    name: 'merge_pull_request',
    description: 'Merge a pull request. Choose between merge, squash, or rebase merge methods.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        pull_number: { type: 'number', description: 'The PR number to merge' },
        merge_method: { type: 'string', description: 'Merge method: merge, squash, or rebase (default: merge)' },
        commit_title: { type: 'string', description: 'Custom merge commit title' },
        commit_message: { type: 'string', description: 'Custom merge commit message' },
      },
      required: ['pull_number'],
    },
  },
  {
    name: 'get_pr_ci_status',
    description: 'Get a unified CI/CD status summary for a pull request. Combines check runs AND commit statuses into a single view. BEST tool for understanding if a PR is ready to merge.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        pull_number: { type: 'number', description: 'The PR number' },
      },
      required: ['pull_number'],
    },
  },
];

export async function handlePullRequestsTool(name: string, args: Record<string, unknown>, client: GitHubClient): Promise<string> {
  const owner = (args.owner as string) || client.owner;
  const repo = (args.repo as string) || client.repo;

  try {
    switch (name) {
      case 'list_pull_requests': {
        const params: Record<string, string | number | boolean | undefined> = {
          state: (args.state as string) || 'open',
          sort: (args.sort as string) || 'created',
          direction: (args.direction as string) || 'desc',
          per_page: (args.per_page as number) || 30,
        };
        if (args.head) params.head = args.head as string;
        if (args.base) params.base = args.base as string;
        const prs = await client.get<any[]>(`/repos/${owner}/${repo}/pulls`, params);
        if (!prs || prs.length === 0) return 'No pull requests found.';

        let output = sectionHeader(`Pull Requests (${prs.length})`);
        for (const pr of prs) {
          output += `${formatPRState(pr.state, pr.merged)} #${pr.number}: ${pr.title}\n`;
          output += `  Author: ${pr.user?.login || 'N/A'} | ${pr.head?.label} → ${pr.base?.label}\n`;
          output += `  Created: ${formatRelativeTime(pr.created_at)}\n`;
          if (pr.labels?.length > 0) {
            output += `  Labels: ${pr.labels.map((l: any) => l.name).join(', ')}\n`;
          }
          output += `  URL: ${pr.html_url}\n\n`;
        }
        return output;
      }

      case 'get_pull_request': {
        const pr = await client.get<any>(`/repos/${owner}/${repo}/pulls/${args.pull_number}`);
        let output = sectionHeader(`PR #${pr.number}: ${pr.title}`);
        output += `State: ${formatPRState(pr.state, pr.merged)}\n`;
        output += `Author: ${pr.user?.login || 'N/A'}\n`;
        output += `${pr.head?.label} → ${pr.base?.label}\n`;
        output += `SHA: ${pr.head?.sha?.substring(0, 7)}\n`;
        output += `Commits: ${pr.commits} | Files: ${pr.changed_files} | +${pr.additions}/-${pr.deletions}\n`;
        output += `Created: ${formatRelativeTime(pr.created_at)} | Updated: ${formatRelativeTime(pr.updated_at)}\n`;
        if (pr.merged_at) output += `Merged: ${formatRelativeTime(pr.merged_at)} by ${pr.merged_by?.login || 'N/A'}\n`;
        if (pr.labels?.length > 0) output += `Labels: ${pr.labels.map((l: any) => l.name).join(', ')}\n`;
        if (pr.milestone) output += `Milestone: ${pr.milestone.title}\n`;
        if (pr.body) {
          output += sectionHeader('Description');
          output += `${pr.body.substring(0, 500)}${pr.body.length > 500 ? '...' : ''}\n`;
        }
        output += `URL: ${pr.html_url}\n`;
        return output;
      }

      case 'list_pr_commits': {
        const commits = await client.get<any[]>(`/repos/${owner}/${repo}/pulls/${args.pull_number}/commits`);
        if (!commits || commits.length === 0) return `No commits found for PR #${args.pull_number}.`;

        let output = sectionHeader(`Commits in PR #${args.pull_number} (${commits.length})`);
        for (const c of commits) {
          output += `• ${c.sha?.substring(0, 7)} — ${c.commit?.message?.split('\n')[0] || ''}\n`;
          output += `  Author: ${c.commit?.author?.name || 'N/A'} | ${formatRelativeTime(c.commit?.author?.date)}\n`;
        }
        return output;
      }

      case 'list_pr_files': {
        const files = await client.get<any[]>(`/repos/${owner}/${repo}/pulls/${args.pull_number}/files`);
        if (!files || files.length === 0) return `No files found for PR #${args.pull_number}.`;

        const statusEmoji: Record<string, string> = {
          added: '✅',
          modified: '📝',
          deleted: '❌',
          renamed: '🔄',
          copied: '📋',
          changed: '📝',
        };
        let output = sectionHeader(`Files Changed in PR #${args.pull_number} (${files.length} files)`);
        for (const f of files) {
          const emoji = statusEmoji[f.status] || '•';
          output += `${emoji} ${f.filename} (+${f.additions}/-${f.deletions})\n`;
        }
        return output;
      }

      case 'list_pr_reviews': {
        const reviews = await client.get<any[]>(`/repos/${owner}/${repo}/pulls/${args.pull_number}/reviews`);
        if (!reviews || reviews.length === 0) return `No reviews found for PR #${args.pull_number}.`;

        const stateEmoji: Record<string, string> = {
          APPROVED: '✅',
          CHANGES_REQUESTED: '❌',
          COMMENTED: '💬',
          DISMISSED: '⚫',
          PENDING: '🟡',
        };
        let output = sectionHeader(`Reviews for PR #${args.pull_number} (${reviews.length})`);
        for (const r of reviews) {
          const emoji = stateEmoji[r.state] || '•';
          output += `${emoji} ${r.user?.login || 'N/A'} — ${r.state}\n`;
          output += `  Submitted: ${formatRelativeTime(r.submitted_at)}\n`;
          if (r.body) output += `  "${r.body.substring(0, 100)}${r.body.length > 100 ? '...' : ''}"\n`;
          output += '\n';
        }
        return output;
      }

      case 'merge_pull_request': {
        const body: Record<string, unknown> = {
          merge_method: (args.merge_method as string) || 'merge',
        };
        if (args.commit_title) body.commit_title = args.commit_title;
        if (args.commit_message) body.commit_message = args.commit_message;
        const result = await client.put<any>(`/repos/${owner}/${repo}/pulls/${args.pull_number}/merge`, body);
        return `✅ PR #${args.pull_number} merged successfully.\nSHA: ${result.sha}\nMessage: ${result.message}`;
      }

      case 'get_pr_ci_status': {
        // Fetch PR, check-runs, and statuses in parallel
        const [pr, checkRunsResult, combinedStatus] = await Promise.all([
          client.get<any>(`/repos/${owner}/${repo}/pulls/${args.pull_number}`),
          client.get<any>(`/repos/${owner}/${repo}/commits/${(await client.get<any>(`/repos/${owner}/${repo}/pulls/${args.pull_number}`)).head.sha}/check-runs`).catch(() => ({ check_runs: [], total_count: 0 })),
          client.get<any>(`/repos/${owner}/${repo}/commits/${(await client.get<any>(`/repos/${owner}/${repo}/pulls/${args.pull_number}`)).head.sha}/status`).catch(() => ({ state: 'unknown', statuses: [], total_count: 0 })),
        ]);

        const sha = pr.head?.sha;

        // Re-fetch with actual SHA (avoid duplicate requests by using cached pr)
        const [checkRuns, status] = await Promise.all([
          client.get<any>(`/repos/${owner}/${repo}/commits/${sha}/check-runs`).catch(() => ({ check_runs: [], total_count: 0 })),
          client.get<any>(`/repos/${owner}/${repo}/commits/${sha}/status`).catch(() => ({ state: 'unknown', statuses: [], total_count: 0 })),
        ]);

        const checks = checkRuns.check_runs || [];
        const statuses = status.statuses || [];

        const passedChecks = checks.filter((c: any) => c.conclusion === 'success').length;
        const failedChecks = checks.filter((c: any) => c.conclusion === 'failure' || c.conclusion === 'timed_out').length;
        const pendingChecks = checks.filter((c: any) => !c.conclusion || c.status === 'in_progress' || c.status === 'queued').length;

        const hasFailures = failedChecks > 0 || status.state === 'failure' || status.state === 'error';
        const hasPending = pendingChecks > 0 || status.state === 'pending';
        const overall = hasFailures ? '❌ Some checks failed' : hasPending ? '🟡 Checks in progress' : '✅ All checks passed';

        let output = sectionHeader(`CI Status for PR #${pr.number}: "${pr.title}"`);
        output += `Overall: ${overall}\n`;
        output += `SHA: ${sha?.substring(0, 7)}\n\n`;

        if (checks.length > 0) {
          output += 'Check Runs:\n';
          for (const c of checks) {
            output += `  ${formatCheckConclusion(c.conclusion)} ${c.name}`;
            if (c.started_at && c.completed_at) {
              const durationSecs = Math.floor((new Date(c.completed_at).getTime() - new Date(c.started_at).getTime()) / 1000);
              output += ` (${Math.floor(durationSecs / 60)}m ${durationSecs % 60}s)`;
            }
            output += '\n';
          }
          output += '\n';
        }

        if (statuses.length > 0) {
          output += 'Commit Statuses:\n';
          const stateEmoji: Record<string, string> = { success: '✅', failure: '❌', error: '❌', pending: '🟡' };
          for (const s of statuses) {
            output += `  ${stateEmoji[s.state] || '🔘'} ${s.context}: ${s.description || s.state}\n`;
          }
          output += '\n';
        }

        output += `Summary: ${passedChecks}/${checks.length} checks passed`;
        if (failedChecks > 0) output += `, ${failedChecks} failed`;
        if (pendingChecks > 0) output += `, ${pendingChecks} in progress`;
        output += '\n';

        return output;
      }

      default:
        return `Unknown pull requests tool: ${name}`;
    }
  } catch (error) {
    return formatErrorForAI(error, name);
  }
}
