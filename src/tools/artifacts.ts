import { GitHubClient } from '../client/github-client.js';
import { formatErrorForAI } from '../utils/error-handler.js';
import { formatSize, formatRelativeTime, sectionHeader } from '../utils/formatters.js';

export const artifactsTools = [
  {
    name: 'list_artifacts',
    description: 'List all build artifacts for the repository. Shows artifact names, sizes, expiration dates, and creation times. Useful for finding build outputs.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        name: { type: 'string', description: 'Filter artifacts by name' },
        per_page: { type: 'number', description: 'Results per page (max 100, default 30)' },
      },
      required: [],
    },
  },
  {
    name: 'get_artifact',
    description: 'Get details of a specific artifact including its name, size, expiration date, and download URL.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        artifact_id: { type: 'number', description: 'The artifact ID' },
      },
      required: ['artifact_id'],
    },
  },
  {
    name: 'list_run_artifacts',
    description: 'List all artifacts produced by a specific workflow run. Useful for reviewing build outputs from a particular CI run.',
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
    name: 'delete_artifact',
    description: 'Delete a specific artifact from the repository. Use to free up storage space.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        artifact_id: { type: 'number', description: 'The artifact ID to delete' },
      },
      required: ['artifact_id'],
    },
  },
];

export async function handleArtifactsTool(name: string, args: Record<string, unknown>, client: GitHubClient): Promise<string> {
  const owner = (args.owner as string) || client.owner;
  const repo = (args.repo as string) || client.repo;

  try {
    switch (name) {
      case 'list_artifacts': {
        const params: Record<string, string | number | boolean | undefined> = {
          per_page: (args.per_page as number) || 30,
        };
        if (args.name) params.name = args.name as string;
        const result = await client.get<any>(`/repos/${owner}/${repo}/actions/artifacts`, params);
        const artifacts = result.artifacts || [];
        if (artifacts.length === 0) return 'No artifacts found in this repository.';

        let output = sectionHeader(`Artifacts (${result.total_count} total)`);
        for (const a of artifacts) {
          output += `• ${a.name}\n`;
          output += `  ID: ${a.id} | Size: ${formatSize(a.size_in_bytes)} | Expired: ${a.expired ? 'Yes' : 'No'}\n`;
          output += `  Created: ${formatRelativeTime(a.created_at)} | Expires: ${a.expires_at ? formatRelativeTime(a.expires_at) : 'N/A'}\n\n`;
        }
        return output;
      }

      case 'get_artifact': {
        const a = await client.get<any>(`/repos/${owner}/${repo}/actions/artifacts/${args.artifact_id}`);
        let output = sectionHeader(`Artifact: ${a.name}`);
        output += `ID: ${a.id}\n`;
        output += `Size: ${formatSize(a.size_in_bytes)}\n`;
        output += `Expired: ${a.expired ? 'Yes' : 'No'}\n`;
        output += `Created: ${formatRelativeTime(a.created_at)}\n`;
        output += `Expires: ${a.expires_at ? formatRelativeTime(a.expires_at) : 'N/A'}\n`;
        output += `Archive URL: ${a.archive_download_url}\n`;
        return output;
      }

      case 'list_run_artifacts': {
        const result = await client.get<any>(`/repos/${owner}/${repo}/actions/runs/${args.run_id}/artifacts`);
        const artifacts = result.artifacts || [];
        if (artifacts.length === 0) return `No artifacts found for workflow run ${args.run_id}.`;

        let output = sectionHeader(`Artifacts for Run ${args.run_id} (${artifacts.length} artifacts)`);
        for (const a of artifacts) {
          output += `• ${a.name}\n`;
          output += `  ID: ${a.id} | Size: ${formatSize(a.size_in_bytes)}\n`;
          output += `  Created: ${formatRelativeTime(a.created_at)}\n`;
          output += `  Archive URL: ${a.archive_download_url}\n\n`;
        }
        return output;
      }

      case 'delete_artifact': {
        await client.delete(`/repos/${owner}/${repo}/actions/artifacts/${args.artifact_id}`);
        return `✅ Artifact ${args.artifact_id} has been deleted.`;
      }

      default:
        return `Unknown artifacts tool: ${name}`;
    }
  } catch (error) {
    return formatErrorForAI(error, name);
  }
}
