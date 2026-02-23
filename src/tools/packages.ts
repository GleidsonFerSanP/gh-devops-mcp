import { GitHubClient } from '../client/github-client.js';
import { formatErrorForAI } from '../utils/error-handler.js';
import { formatRelativeTime, sectionHeader } from '../utils/formatters.js';

export const packagesTools = [
  {
    name: 'list_packages',
    description: 'List packages for the authenticated user. Specify the package type to list (npm, maven, docker, nuget, container, rubygems).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        package_type: { type: 'string', description: 'Package type: npm, maven, docker, nuget, container, rubygems' },
        visibility: { type: 'string', description: 'Filter by visibility: public, private, or internal' },
      },
      required: ['package_type'],
    },
  },
  {
    name: 'get_package',
    description: 'Get details of a specific package including version count, visibility, and links.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        package_type: { type: 'string', description: 'Package type: npm, maven, docker, nuget, container, rubygems' },
        package_name: { type: 'string', description: 'The package name' },
      },
      required: ['package_type', 'package_name'],
    },
  },
  {
    name: 'list_package_versions',
    description: 'List all versions of a specific package.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        package_type: { type: 'string', description: 'Package type: npm, maven, docker, nuget, container, rubygems' },
        package_name: { type: 'string', description: 'The package name' },
        state: { type: 'string', description: 'Filter by state: active (default) or deleted' },
      },
      required: ['package_type', 'package_name'],
    },
  },
  {
    name: 'delete_package_version',
    description: 'Delete a specific version of a package. This action is irreversible.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        package_type: { type: 'string', description: 'Package type: npm, maven, docker, nuget, container, rubygems' },
        package_name: { type: 'string', description: 'The package name' },
        package_version_id: { type: 'number', description: 'The version ID to delete' },
      },
      required: ['package_type', 'package_name', 'package_version_id'],
    },
  },
];

export async function handlePackagesTool(name: string, args: Record<string, unknown>, client: GitHubClient): Promise<string> {
  try {
    switch (name) {
      case 'list_packages': {
        const params: Record<string, string | number | boolean | undefined> = {
          package_type: args.package_type as string,
        };
        if (args.visibility) params.visibility = args.visibility as string;
        const packages = await client.get<any[]>(`/user/packages`, params);
        if (!packages || packages.length === 0) return `No ${args.package_type} packages found.`;

        let output = sectionHeader(`Packages (${packages.length}) — Type: ${args.package_type}`);
        for (const p of packages) {
          output += `• ${p.name}\n`;
          output += `  ID: ${p.id} | Visibility: ${p.visibility}\n`;
          output += `  Versions: ${p.version_count || 'N/A'}\n`;
          output += `  Updated: ${formatRelativeTime(p.updated_at)}\n`;
          if (p.html_url) output += `  URL: ${p.html_url}\n`;
          output += '\n';
        }
        return output;
      }

      case 'get_package': {
        const p = await client.get<any>(`/user/packages/${args.package_type}/${args.package_name}`);
        let output = sectionHeader(`Package: ${p.name}`);
        output += `Type: ${p.package_type}\n`;
        output += `Visibility: ${p.visibility}\n`;
        output += `ID: ${p.id}\n`;
        output += `Version Count: ${p.version_count || 'N/A'}\n`;
        output += `Created: ${formatRelativeTime(p.created_at)}\n`;
        output += `Updated: ${formatRelativeTime(p.updated_at)}\n`;
        if (p.html_url) output += `URL: ${p.html_url}\n`;
        return output;
      }

      case 'list_package_versions': {
        const params: Record<string, string | number | boolean | undefined> = {};
        if (args.state) params.state = args.state as string;
        const versions = await client.get<any[]>(`/user/packages/${args.package_type}/${args.package_name}/versions`, params);
        if (!versions || versions.length === 0) return `No versions found for package "${args.package_name}".`;

        let output = sectionHeader(`Versions of ${args.package_name} (${versions.length})`);
        for (const v of versions) {
          output += `• v${v.name || v.id}\n`;
          output += `  ID: ${v.id}\n`;
          output += `  Created: ${formatRelativeTime(v.created_at)}\n`;
          output += `  Updated: ${formatRelativeTime(v.updated_at)}\n`;
          if (v.metadata?.package_type) output += `  Type: ${v.metadata.package_type}\n`;
          output += '\n';
        }
        return output;
      }

      case 'delete_package_version': {
        await client.delete(`/user/packages/${args.package_type}/${args.package_name}/versions/${args.package_version_id}`);
        return `✅ Package version ${args.package_version_id} of "${args.package_name}" has been deleted. This action is permanent.`;
      }

      default:
        return `Unknown packages tool: ${name}`;
    }
  } catch (error) {
    return formatErrorForAI(error, name);
  }
}
