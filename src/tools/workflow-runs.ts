import { GitHubClient } from '../client/github-client.js';
import { formatErrorForAI } from '../utils/error-handler.js';
import { formatRunStatus, formatRelativeTime, calculateDuration, sectionHeader } from '../utils/formatters.js';
import { buildCreatedFilter } from '../utils/time-helpers.js';

export const workflowRunsTools = [
  {
    name: 'list_workflow_runs',
    description: 'List workflow runs for the repository. Filter by actor, branch, event type, status, or creation date. Great for monitoring CI/CD pipeline activity.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        actor: { type: 'string', description: 'Filter by user who triggered the run' },
        branch: { type: 'string', description: 'Filter by branch name' },
        event: { type: 'string', description: 'Filter by event type (push, pull_request, workflow_dispatch, schedule, etc.)' },
        status: { type: 'string', description: 'Filter by status (completed, action_required, cancelled, failure, neutral, skipped, stale, success, timed_out, in_progress, queued, requested, waiting, pending)' },
        created: { type: 'string', description: 'Filter by creation date. Supports ISO 8601 or relative (e.g., ">=2024-01-01", "1h", "7d")' },
        workflow_id: { type: 'number', description: 'Filter by workflow ID' },
        per_page: { type: 'number', description: 'Results per page (max 100, default 30)' },
      },
      required: [],
    },
  },
  {
    name: 'get_workflow_run',
    description: 'Get details of a specific workflow run including status, conclusion, timing, trigger event, and actor. Essential for investigating specific CI/CD executions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        run_id: { type: 'number', description: 'The workflow run ID' },
      },
      required: ['run_id'],
    },
  },
  {
    name: 'cancel_workflow_run',
    description: 'Cancel a workflow run that is in progress or queued. Useful for stopping stuck or unnecessary runs.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        run_id: { type: 'number', description: 'The workflow run ID to cancel' },
      },
      required: ['run_id'],
    },
  },
  {
    name: 'rerun_workflow_run',
    description: 'Re-run all jobs in a workflow run. Creates a new run attempt. Useful for retrying after transient failures.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        run_id: { type: 'number', description: 'The workflow run ID to rerun' },
      },
      required: ['run_id'],
    },
  },
  {
    name: 'rerun_failed_jobs',
    description: 'Re-run only the failed jobs in a workflow run (not all jobs). More efficient than rerunning the entire workflow.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        run_id: { type: 'number', description: 'The workflow run ID' },
      },
      required: ['run_id'],
    },
  },
  {
    name: 'get_workflow_run_logs',
    description: 'Get the download URL for workflow run logs (ZIP archive). Returns the URL to download the complete log archive.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        run_id: { type: 'number', description: 'The workflow run ID' },
      },
      required: ['run_id'],
    },
  },
  {
    name: 'list_workflow_jobs',
    description: 'List all jobs for a workflow run. Shows job names, statuses, conclusions, runner info, and step details. Essential for debugging failed runs.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        run_id: { type: 'number', description: 'The workflow run ID' },
        filter: { type: 'string', description: 'Filter: "latest" (default) or "all" (includes previous attempts)' },
      },
      required: ['run_id'],
    },
  },
  {
    name: 'get_workflow_job',
    description: 'Get details of a specific workflow job including all its steps, timing, runner labels, and conclusion.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        job_id: { type: 'number', description: 'The job ID' },
      },
      required: ['job_id'],
    },
  },
  {
    name: 'get_job_logs',
    description: 'Get the raw text log output of a specific workflow job. Returns the full log content as plain text. This is the BEST tool for seeing exact error messages from CI failures.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        job_id: { type: 'number', description: 'The job ID' },
      },
      required: ['job_id'],
    },
  },
  {
    name: 'get_failed_runs',
    description: 'Get all recently failed workflow runs, grouped by workflow. This is the BEST starting point for investigating CI/CD pipeline failures. Shows failure patterns, frequency, and affected branches.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        since: { type: 'string', description: 'How far back to look. Default: "24h". Supports: "1h", "7d", "30d", ISO 8601.' },
        per_page: { type: 'number', description: 'Max results (default 30)' },
      },
      required: [],
    },
  },
];

export async function handleWorkflowRunsTool(name: string, args: Record<string, unknown>, client: GitHubClient): Promise<string> {
  const owner = (args.owner as string) || client.owner;
  const repo = (args.repo as string) || client.repo;

  try {
    switch (name) {
      case 'list_workflow_runs': {
        const params: Record<string, unknown> = { per_page: (args.per_page as number) || 30 };
        if (args.actor) params.actor = args.actor;
        if (args.branch) params.branch = args.branch;
        if (args.event) params.event = args.event;
        if (args.status) params.status = args.status;
        if (args.created) params.created = args.created;
        if (args.workflow_id) params.workflow_id = args.workflow_id;

        const result = await client.get<any>(`/repos/${owner}/${repo}/actions/runs`, params as Record<string, string | number | boolean | undefined>);
        const runs = result.workflow_runs || [];
        if (runs.length === 0) return 'No workflow runs found matching the criteria.';

        let output = sectionHeader(`Workflow Runs (${result.total_count} total)`);
        for (const run of runs) {
          output += `${formatRunStatus(run.status, run.conclusion)} | Run #${run.run_number} — ${run.name}\n`;
          output += `  ID: ${run.id} | Branch: ${run.head_branch} | Event: ${run.event}\n`;
          output += `  Actor: ${run.actor?.login || 'N/A'} | Started: ${formatRelativeTime(run.created_at)}\n`;
          output += `  Duration: ${calculateDuration(run.run_started_at, run.updated_at)} | URL: ${run.html_url}\n\n`;
        }
        return output;
      }

      case 'get_workflow_run': {
        const run = await client.get<any>(`/repos/${owner}/${repo}/actions/runs/${args.run_id}`);
        let output = sectionHeader(`Workflow Run #${run.run_number}: ${run.name}`);
        output += `Status: ${formatRunStatus(run.status, run.conclusion)}\n`;
        output += `ID: ${run.id} | Attempt: ${run.run_attempt}\n`;
        output += `Branch: ${run.head_branch} | SHA: ${run.head_sha?.substring(0, 7)}\n`;
        output += `Event: ${run.event} | Actor: ${run.actor?.login || 'N/A'}\n`;
        output += `Created: ${formatRelativeTime(run.created_at)}\n`;
        output += `Duration: ${calculateDuration(run.run_started_at, run.updated_at)}\n`;
        output += `URL: ${run.html_url}\n`;
        if (run.conclusion === 'failure') {
          output += '\n💡 Tip: Use list_workflow_jobs to find which job failed, then get_job_logs for the error details.\n';
        }
        return output;
      }

      case 'cancel_workflow_run': {
        await client.post(`/repos/${owner}/${repo}/actions/runs/${args.run_id}/cancel`);
        return `✅ Workflow run ${args.run_id} has been cancelled.`;
      }

      case 'rerun_workflow_run': {
        await client.post(`/repos/${owner}/${repo}/actions/runs/${args.run_id}/rerun`);
        return `✅ Workflow run ${args.run_id} has been triggered to rerun (all jobs).`;
      }

      case 'rerun_failed_jobs': {
        await client.post(`/repos/${owner}/${repo}/actions/runs/${args.run_id}/rerun-failed-jobs`);
        return `✅ Failed jobs in workflow run ${args.run_id} have been triggered to rerun.`;
      }

      case 'get_workflow_run_logs': {
        const result = await client.get<any>(`/repos/${owner}/${repo}/actions/runs/${args.run_id}/logs`);
        const url = result?.download_url || result;
        return `📦 Log download URL: ${url || 'URL returned in redirect header'}\n\nNote: Logs are in ZIP format. Download and extract to view full logs.`;
      }

      case 'list_workflow_jobs': {
        const params: Record<string, string | number | boolean | undefined> = { filter: (args.filter as string) || 'latest' };
        const result = await client.get<any>(`/repos/${owner}/${repo}/actions/runs/${args.run_id}/jobs`, params);
        const jobs = result.jobs || [];
        if (jobs.length === 0) return 'No jobs found for this workflow run.';

        let output = sectionHeader(`Jobs for Run ${args.run_id} (${jobs.length} jobs)`);
        for (const job of jobs) {
          output += `${formatRunStatus(job.status, job.conclusion)} ${job.name}\n`;
          output += `  ID: ${job.id} | Runner: ${job.runner_name || 'N/A'} | Labels: ${(job.labels || []).join(', ')}\n`;
          output += `  Duration: ${calculateDuration(job.started_at, job.completed_at)}\n`;
          if (job.steps && job.steps.length > 0) {
            for (const step of job.steps) {
              const stepStatus = formatRunStatus(step.status, step.conclusion);
              output += `    ${stepStatus} Step ${step.number}: ${step.name}\n`;
            }
          }
          output += '\n';
        }
        return output;
      }

      case 'get_workflow_job': {
        const job = await client.get<any>(`/repos/${owner}/${repo}/actions/jobs/${args.job_id}`);
        let output = sectionHeader(`Job: ${job.name}`);
        output += `Status: ${formatRunStatus(job.status, job.conclusion)}\n`;
        output += `ID: ${job.id} | Run ID: ${job.run_id}\n`;
        output += `Runner: ${job.runner_name || 'N/A'} | Labels: ${(job.labels || []).join(', ')}\n`;
        output += `Duration: ${calculateDuration(job.started_at, job.completed_at)}\n`;
        if (job.steps && job.steps.length > 0) {
          output += sectionHeader('Steps');
          for (const step of job.steps) {
            output += `${formatRunStatus(step.status, step.conclusion)} Step ${step.number}: ${step.name}\n`;
            output += `  Duration: ${calculateDuration(step.started_at, step.completed_at)}\n`;
          }
        }
        return output;
      }

      case 'get_job_logs': {
        try {
          const logs = await client.getRaw(`/repos/${owner}/${repo}/actions/jobs/${args.job_id}/logs`);
          const maxLength = 15000;
          if (logs.length > maxLength) {
            return `📋 Job Logs (truncated — showing last ${maxLength} chars):\n\n...${logs.slice(-maxLength)}`;
          }
          return `📋 Job Logs:\n\n${logs}`;
        } catch {
          return `Could not retrieve logs for job ${args.job_id}. The logs may have expired (logs are retained for 90 days).`;
        }
      }

      case 'get_failed_runs': {
        const created = buildCreatedFilter((args.since as string) || '24h');
        const params: Record<string, string | number | boolean | undefined> = {
          status: 'failure',
          per_page: (args.per_page as number) || 30,
        };
        if (created) params.created = created;

        const result = await client.get<any>(`/repos/${owner}/${repo}/actions/runs`, params);
        const runs = result.workflow_runs || [];
        if (runs.length === 0) return '✅ No failed workflow runs found in the specified time period. All pipelines are green!';

        // Group by workflow name
        const byWorkflow = new Map<string, any[]>();
        for (const run of runs) {
          const key = run.name || 'Unknown';
          if (!byWorkflow.has(key)) byWorkflow.set(key, []);
          byWorkflow.get(key)!.push(run);
        }

        let output = sectionHeader(`Failed Runs (${runs.length} failures)`);
        for (const [workflowName, failedRuns] of byWorkflow) {
          output += `\n🔴 ${workflowName} — ${failedRuns.length} failure(s)\n`;
          for (const run of failedRuns.slice(0, 5)) {
            output += `  • Run #${run.run_number} | Branch: ${run.head_branch} | ${formatRelativeTime(run.created_at)}\n`;
            output += `    Actor: ${run.actor?.login} | ID: ${run.id}\n`;
          }
        }
        output += '\n💡 Use get_workflow_run + list_workflow_jobs + get_job_logs to investigate specific failures.\n';
        return output;
      }

      default:
        return `Unknown workflow runs tool: ${name}`;
    }
  } catch (error) {
    return formatErrorForAI(error, name);
  }
}
