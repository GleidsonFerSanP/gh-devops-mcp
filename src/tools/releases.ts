import { GitHubClient } from '../client/github-client.js';
import { formatErrorForAI } from '../utils/error-handler.js';
import { formatSize, formatRelativeTime, sectionHeader } from '../utils/formatters.js';

export const releasesTools = [
  {
    name: 'list_releases',
    description: 'List all releases for the repository. Shows version tags, names, draft/pre-release status, asset counts, and publication dates.',
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
    name: 'get_release',
    description: 'Get details of a specific release including description, assets with download URLs, and publication info.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        release_id: { type: 'number', description: 'The release ID' },
      },
      required: ['release_id'],
    },
  },
  {
    name: 'get_latest_release',
    description: 'Get the latest published non-draft, non-prerelease release. Useful for quickly checking the current production version.',
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
    name: 'create_release',
    description: 'Create a new release. Can optionally auto-generate release notes from merged PRs.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        tag_name: { type: 'string', description: 'The git tag for the release (e.g., "v1.2.0")' },
        target_commitish: { type: 'string', description: 'Branch or SHA the tag should point to (default: default branch)' },
        name: { type: 'string', description: 'Release title' },
        body: { type: 'string', description: 'Release description/changelog text' },
        draft: { type: 'boolean', description: 'Create as draft? (default: false)' },
        prerelease: { type: 'boolean', description: 'Mark as pre-release? (default: false)' },
        generate_release_notes: { type: 'boolean', description: 'Auto-generate release notes from PRs? (default: false)' },
      },
      required: ['tag_name'],
    },
  },
  {
    name: 'update_release',
    description: 'Update an existing release. Change title, body, draft status, or pre-release flag.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        release_id: { type: 'number', description: 'The release ID to update' },
        tag_name: { type: 'string', description: 'New tag name' },
        name: { type: 'string', description: 'New release title' },
        body: { type: 'string', description: 'New release notes' },
        draft: { type: 'boolean', description: 'Set draft status' },
        prerelease: { type: 'boolean', description: 'Set pre-release status' },
      },
      required: ['release_id'],
    },
  },
  {
    name: 'delete_release',
    description: 'Delete a release (does not delete the associated git tag).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        release_id: { type: 'number', description: 'The release ID to delete' },
      },
      required: ['release_id'],
    },
  },
  {
    name: 'generate_release_notes',
    description: 'Generate release notes content based on merged pull requests. Returns suggested title and notes for a new release.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        tag_name: { type: 'string', description: 'The tag name for the release being generated' },
        target_commitish: { type: 'string', description: 'Branch to generate notes for (default: default branch)' },
        previous_tag_name: { type: 'string', description: 'Previous release tag to compare from' },
        configuration_file_path: { type: 'string', description: 'Path to .github/release.yml configuration file' },
      },
      required: ['tag_name'],
    },
  },
];

function formatRelease(r: any, includeBody = false): string {
  let output = '';
  const badges = [];
  if (r.draft) badges.push('[DRAFT]');
  if (r.prerelease) badges.push('[PRE-RELEASE]');
  const badgeStr = badges.length > 0 ? ' ' + badges.join(' ') : '';

  output += `• ${r.tag_name}${badgeStr} — ${r.name || 'No title'}\n`;
  output += `  ID: ${r.id} | Author: ${r.author?.login || 'N/A'}\n`;
  output += `  Published: ${formatRelativeTime(r.published_at || r.created_at)}\n`;
  if (r.assets && r.assets.length > 0) {
    output += `  Assets: ${r.assets.length}\n`;
  }
  output += `  URL: ${r.html_url}\n`;
  if (includeBody && r.body) {
    output += `\n${r.body}\n`;
  }
  return output;
}

export async function handleReleasesTool(name: string, args: Record<string, unknown>, client: GitHubClient): Promise<string> {
  const owner = (args.owner as string) || client.owner;
  const repo = (args.repo as string) || client.repo;

  try {
    switch (name) {
      case 'list_releases': {
        const params: Record<string, string | number | boolean | undefined> = {
          per_page: (args.per_page as number) || 30,
        };
        const releases = await client.get<any[]>(`/repos/${owner}/${repo}/releases`, params);
        if (!releases || releases.length === 0) return 'No releases found for this repository.';

        let output = sectionHeader(`Releases (${releases.length})`);
        for (const r of releases) {
          output += formatRelease(r);
          output += '\n';
        }
        return output;
      }

      case 'get_release': {
        const r = await client.get<any>(`/repos/${owner}/${repo}/releases/${args.release_id}`);
        let output = sectionHeader(`Release: ${r.tag_name}`);
        output += `ID: ${r.id}\n`;
        output += `Name: ${r.name || 'No title'}\n`;
        if (r.draft) output += `📋 Draft release\n`;
        if (r.prerelease) output += `⚠️ Pre-release\n`;
        output += `Author: ${r.author?.login || 'N/A'}\n`;
        output += `Created: ${formatRelativeTime(r.created_at)}\n`;
        output += `Published: ${r.published_at ? formatRelativeTime(r.published_at) : 'Not published'}\n`;
        output += `Target: ${r.target_commitish}\n`;
        output += `URL: ${r.html_url}\n`;
        if (r.assets && r.assets.length > 0) {
          output += sectionHeader(`Assets (${r.assets.length})`);
          for (const asset of r.assets) {
            output += `• ${asset.name} — ${formatSize(asset.size)}\n`;
            output += `  Downloads: ${asset.download_count}\n`;
            output += `  URL: ${asset.browser_download_url}\n`;
          }
        }
        if (r.body) {
          output += sectionHeader('Release Notes');
          output += `${r.body}\n`;
        }
        return output;
      }

      case 'get_latest_release': {
        const r = await client.get<any>(`/repos/${owner}/${repo}/releases/latest`);
        let output = sectionHeader(`Latest Release: ${r.tag_name}`);
        output += formatRelease(r, true);
        return output;
      }

      case 'create_release': {
        const body: Record<string, unknown> = { tag_name: args.tag_name };
        if (args.target_commitish) body.target_commitish = args.target_commitish;
        if (args.name) body.name = args.name;
        if (args.body) body.body = args.body;
        if (args.draft !== undefined) body.draft = args.draft;
        if (args.prerelease !== undefined) body.prerelease = args.prerelease;
        if (args.generate_release_notes !== undefined) body.generate_release_notes = args.generate_release_notes;
        const r = await client.post<any>(`/repos/${owner}/${repo}/releases`, body);
        return `✅ Release "${r.tag_name}" created.\nID: ${r.id}\n${r.draft ? '📋 Saved as draft\n' : ''}URL: ${r.html_url}`;
      }

      case 'update_release': {
        const body: Record<string, unknown> = {};
        if (args.tag_name) body.tag_name = args.tag_name;
        if (args.name) body.name = args.name;
        if (args.body) body.body = args.body;
        if (args.draft !== undefined) body.draft = args.draft;
        if (args.prerelease !== undefined) body.prerelease = args.prerelease;
        const r = await client.patch<any>(`/repos/${owner}/${repo}/releases/${args.release_id}`, body);
        return `✅ Release ${args.release_id} updated.\nTag: ${r.tag_name} | URL: ${r.html_url}`;
      }

      case 'delete_release': {
        await client.delete(`/repos/${owner}/${repo}/releases/${args.release_id}`);
        return `✅ Release ${args.release_id} deleted. (The git tag was not deleted.)`;
      }

      case 'generate_release_notes': {
        const body: Record<string, unknown> = { tag_name: args.tag_name };
        if (args.target_commitish) body.target_commitish = args.target_commitish;
        if (args.previous_tag_name) body.previous_tag_name = args.previous_tag_name;
        if (args.configuration_file_path) body.configuration_file_path = args.configuration_file_path;
        const notes = await client.post<any>(`/repos/${owner}/${repo}/releases/generate-notes`, body);
        let output = sectionHeader(`Generated Release Notes for ${args.tag_name}`);
        output += `Suggested Title: ${notes.name}\n\n`;
        output += `Notes:\n${notes.body}\n`;
        return output;
      }

      default:
        return `Unknown releases tool: ${name}`;
    }
  } catch (error) {
    return formatErrorForAI(error, name);
  }
}
