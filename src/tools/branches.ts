import { GitHubClient } from '../client/github-client.js';
import { formatErrorForAI } from '../utils/error-handler.js';
import { formatRelativeTime, sectionHeader } from '../utils/formatters.js';

export const branchesTools = [
  {
    name: 'list_branches',
    description: 'List all branches for the repository. Shows branch names, protection status, and latest commit SHA.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        protected: { type: 'boolean', description: 'Filter to only protected branches (true) or unprotected (false)' },
        per_page: { type: 'number', description: 'Results per page (max 100, default 30)' },
      },
      required: [],
    },
  },
  {
    name: 'get_branch',
    description: 'Get details of a specific branch including latest commit info and protection status.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        branch: { type: 'string', description: 'The branch name' },
      },
      required: ['branch'],
    },
  },
  {
    name: 'get_branch_protection',
    description: 'Get the branch protection rules for a specific branch. Shows required reviews, status checks, restrictions, and more.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        branch: { type: 'string', description: 'The branch name' },
      },
      required: ['branch'],
    },
  },
  {
    name: 'update_branch_protection',
    description: 'Update or set branch protection rules. Configure required reviews, status checks, and restrictions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        branch: { type: 'string', description: 'The branch name' },
        required_status_checks: {
          type: 'object',
          description: 'Required status checks: {strict: bool, contexts: string[]}',
          properties: {
            strict: { type: 'boolean' },
            contexts: { type: 'array', items: { type: 'string' } },
          },
        },
        enforce_admins: { type: 'boolean', description: 'Enforce rules for admins too' },
        required_pull_request_reviews: {
          type: 'object',
          description: 'PR review requirements',
          properties: {
            required_approving_review_count: { type: 'number' },
            dismiss_stale_reviews: { type: 'boolean' },
          },
        },
        restrictions: { type: 'object', description: 'Push restrictions (null to disable): {users: [], teams: [], apps: []}' },
      },
      required: ['branch'],
    },
  },
  {
    name: 'delete_branch_protection',
    description: 'Remove all branch protection rules from a branch.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        branch: { type: 'string', description: 'The branch name' },
      },
      required: ['branch'],
    },
  },
  {
    name: 'get_commit_status',
    description: 'Get the combined commit status for a specific ref (branch, tag, or SHA). Returns the overall state (success/failure/pending) with individual status counts.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        ref: { type: 'string', description: 'The ref (branch name, tag, or commit SHA)' },
      },
      required: ['ref'],
    },
  },
  {
    name: 'list_commit_statuses',
    description: 'List all individual commit statuses for a specific ref. Shows each CI system\'s status with description and target URL.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        ref: { type: 'string', description: 'The ref (branch, tag, or SHA)' },
        per_page: { type: 'number', description: 'Results per page (default 30)' },
      },
      required: ['ref'],
    },
  },
];

export async function handleBranchesTool(name: string, args: Record<string, unknown>, client: GitHubClient): Promise<string> {
  const owner = (args.owner as string) || client.owner;
  const repo = (args.repo as string) || client.repo;

  try {
    switch (name) {
      case 'list_branches': {
        const params: Record<string, string | number | boolean | undefined> = {
          per_page: (args.per_page as number) || 30,
        };
        if (args.protected !== undefined) params.protected = args.protected as boolean;
        const branches = await client.get<any[]>(`/repos/${owner}/${repo}/branches`, params);
        if (!branches || branches.length === 0) return 'No branches found.';

        let output = sectionHeader(`Branches (${branches.length})`);
        for (const b of branches) {
          const protectedBadge = b.protected ? '🔒' : '  ';
          output += `${protectedBadge} ${b.name}\n`;
          output += `  SHA: ${b.commit?.sha?.substring(0, 7) || 'N/A'}\n`;
        }
        return output;
      }

      case 'get_branch': {
        const b = await client.get<any>(`/repos/${owner}/${repo}/branches/${args.branch}`);
        let output = sectionHeader(`Branch: ${b.name}`);
        output += `Protected: ${b.protected ? '🔒 Yes' : 'No'}\n`;
        if (b.commit) {
          output += `Latest Commit:\n`;
          output += `  SHA: ${b.commit.sha?.substring(0, 7)}\n`;
          output += `  Author: ${b.commit.commit?.author?.name || 'N/A'}\n`;
          output += `  Date: ${formatRelativeTime(b.commit.commit?.author?.date)}\n`;
          output += `  Message: ${b.commit.commit?.message?.split('\n')[0] || ''}\n`;
        }
        return output;
      }

      case 'get_branch_protection': {
        const p = await client.get<any>(`/repos/${owner}/${repo}/branches/${args.branch}/protection`);
        let output = sectionHeader(`Branch Protection: ${args.branch}`);

        if (p.required_status_checks) {
          output += `✅ Required Status Checks:\n`;
          output += `  Strict: ${p.required_status_checks.strict ? 'Yes' : 'No'}\n`;
          const checks = p.required_status_checks.checks || p.required_status_checks.contexts || [];
          if (checks.length > 0) {
            output += `  Checks: ${checks.map((c: any) => c.context || c).join(', ')}\n`;
          }
        }
        if (p.required_pull_request_reviews) {
          const pr = p.required_pull_request_reviews;
          output += `\n👥 Required PR Reviews:\n`;
          output += `  Required approvals: ${pr.required_approving_review_count}\n`;
          output += `  Dismiss stale: ${pr.dismiss_stale_reviews ? 'Yes' : 'No'}\n`;
          output += `  Require code owner: ${pr.require_code_owner_reviews ? 'Yes' : 'No'}\n`;
        }
        if (p.enforce_admins?.enabled) {
          output += `\n🔐 Enforced for admins: Yes\n`;
        }
        if (p.restrictions) {
          output += `\n🔒 Push Restrictions:\n`;
          output += `  Users: ${p.restrictions.users?.map((u: any) => u.login).join(', ') || 'None'}\n`;
          output += `  Teams: ${p.restrictions.teams?.map((t: any) => t.slug).join(', ') || 'None'}\n`;
        }
        if (p.allow_force_pushes?.enabled) {
          output += `⚠️ Force pushes allowed\n`;
        }
        if (p.allow_deletions?.enabled) {
          output += `⚠️ Branch deletions allowed\n`;
        }
        return output;
      }

      case 'update_branch_protection': {
        const body: Record<string, unknown> = {
          enforce_admins: args.enforce_admins ?? null,
          required_pull_request_reviews: args.required_pull_request_reviews || null,
          required_status_checks: args.required_status_checks || null,
          restrictions: args.restrictions || null,
        };
        await client.put(`/repos/${owner}/${repo}/branches/${args.branch}/protection`, body);
        return `✅ Branch protection updated for "${args.branch}".`;
      }

      case 'delete_branch_protection': {
        await client.delete(`/repos/${owner}/${repo}/branches/${args.branch}/protection`);
        return `✅ Branch protection removed from "${args.branch}".`;
      }

      case 'get_commit_status': {
        const status = await client.get<any>(`/repos/${owner}/${repo}/commits/${args.ref}/status`);
        const stateEmoji: Record<string, string> = {
          success: '✅',
          failure: '❌',
          error: '❌',
          pending: '🟡',
        };
        const emoji = stateEmoji[status.state] || '🔘';
        let output = sectionHeader(`Combined Status for ${args.ref}`);
        output += `Overall: ${emoji} ${status.state?.toUpperCase()}\n`;
        output += `Total: ${status.total_count} statuses\n`;

        if (status.statuses && status.statuses.length > 0) {
          output += '\nIndividual Statuses:\n';
          for (const s of status.statuses) {
            const sEmoji = stateEmoji[s.state] || '🔘';
            output += `  ${sEmoji} ${s.context}: ${s.description || s.state}\n`;
          }
        }
        return output;
      }

      case 'list_commit_statuses': {
        const params: Record<string, string | number | boolean | undefined> = {
          per_page: (args.per_page as number) || 30,
        };
        const statuses = await client.get<any[]>(`/repos/${owner}/${repo}/commits/${args.ref}/statuses`, params);
        if (!statuses || statuses.length === 0) return `No statuses found for ref "${args.ref}".`;

        const stateEmoji: Record<string, string> = {
          success: '✅',
          failure: '❌',
          error: '❌',
          pending: '🟡',
        };
        let output = sectionHeader(`Commit Statuses for ${args.ref} (${statuses.length})`);
        for (const s of statuses) {
          const emoji = stateEmoji[s.state] || '🔘';
          output += `${emoji} ${s.context}\n`;
          output += `  State: ${s.state} | ${s.description || ''}\n`;
          output += `  Created: ${formatRelativeTime(s.created_at)}\n`;
          if (s.target_url) output += `  URL: ${s.target_url}\n`;
          output += '\n';
        }
        return output;
      }

      default:
        return `Unknown branches tool: ${name}`;
    }
  } catch (error) {
    return formatErrorForAI(error, name);
  }
}
