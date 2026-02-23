import sodium from 'libsodium-wrappers';
import { GitHubClient } from '../client/github-client.js';
import { formatErrorForAI } from '../utils/error-handler.js';
import { formatRelativeTime, sectionHeader } from '../utils/formatters.js';

export const secretsTools = [
  {
    name: 'list_repo_secrets',
    description: 'List all Actions secrets for the repository. Returns secret names and metadata (not values — secrets are never exposed). Use to audit what secrets are configured.',
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
    name: 'get_repo_secret',
    description: 'Get metadata for a specific repository secret. Returns name and timestamps only (not the secret value).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        secret_name: { type: 'string', description: 'The name of the secret' },
      },
      required: ['secret_name'],
    },
  },
  {
    name: 'create_or_update_secret',
    description: 'Create or update a repository Actions secret. The value will be encrypted before storage. Fetches the public key automatically.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        secret_name: { type: 'string', description: 'The name of the secret' },
        value: { type: 'string', description: 'The secret value to encrypt and store' },
      },
      required: ['secret_name', 'value'],
    },
  },
  {
    name: 'delete_secret',
    description: 'Delete a repository Actions secret.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        secret_name: { type: 'string', description: 'The name of the secret to delete' },
      },
      required: ['secret_name'],
    },
  },
  {
    name: 'list_repo_variables',
    description: 'List all Actions variables for the repository. Variables are not secret — their values are visible.',
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
    name: 'get_repo_variable',
    description: 'Get a specific repository Actions variable including its current value.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        name: { type: 'string', description: 'The variable name' },
      },
      required: ['name'],
    },
  },
  {
    name: 'create_variable',
    description: 'Create a new repository Actions variable.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        name: { type: 'string', description: 'Variable name' },
        value: { type: 'string', description: 'Variable value' },
      },
      required: ['name', 'value'],
    },
  },
  {
    name: 'update_variable',
    description: 'Update an existing repository Actions variable.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        name: { type: 'string', description: 'Variable name' },
        value: { type: 'string', description: 'New variable value' },
      },
      required: ['name', 'value'],
    },
  },
  {
    name: 'delete_variable',
    description: 'Delete a repository Actions variable.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        name: { type: 'string', description: 'Variable name to delete' },
      },
      required: ['name'],
    },
  },
  {
    name: 'list_environment_secrets',
    description: 'List all secrets for a specific deployment environment.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        environment_name: { type: 'string', description: 'The environment name' },
        per_page: { type: 'number', description: 'Results per page (default 30)' },
      },
      required: ['environment_name'],
    },
  },
  {
    name: 'list_environment_variables',
    description: 'List all variables for a specific deployment environment.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        environment_name: { type: 'string', description: 'The environment name' },
        per_page: { type: 'number', description: 'Results per page (default 30)' },
      },
      required: ['environment_name'],
    },
  },
];

/**
 * Encrypts a secret value using the repository's public key (libsodium crypto_box_seal).
 * This is required by GitHub's Secrets API to securely upload secret values.
 */
async function encryptSecret(publicKeyBase64: string, secretValue: string): Promise<string> {
  await sodium.ready;
  const binKey = sodium.from_base64(publicKeyBase64, sodium.base64_variants.ORIGINAL);
  const binSec = sodium.from_string(secretValue);
  const encBytes = sodium.crypto_box_seal(binSec, binKey);
  return sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);
}

export async function handleSecretsTool(name: string, args: Record<string, unknown>, client: GitHubClient): Promise<string> {
  const owner = (args.owner as string) || client.owner;
  const repo = (args.repo as string) || client.repo;

  try {
    switch (name) {
      case 'list_repo_secrets': {
        const params: Record<string, string | number | boolean | undefined> = {
          per_page: (args.per_page as number) || 30,
        };
        const result = await client.get<any>(`/repos/${owner}/${repo}/actions/secrets`, params);
        const secrets = result.secrets || [];
        if (secrets.length === 0) return 'No secrets configured for this repository.';

        let output = sectionHeader(`Repository Secrets (${result.total_count} total)`);
        output += '⚠️ Secret values are never exposed. Showing metadata only.\n\n';
        for (const s of secrets) {
          output += `• ${s.name}\n`;
          output += `  Created: ${formatRelativeTime(s.created_at)} | Updated: ${formatRelativeTime(s.updated_at)}\n`;
        }
        return output;
      }

      case 'get_repo_secret': {
        const s = await client.get<any>(`/repos/${owner}/${repo}/actions/secrets/${args.secret_name}`);
        let output = sectionHeader(`Secret: ${s.name}`);
        output += '⚠️ Secret value is never exposed.\n\n';
        output += `Created: ${formatRelativeTime(s.created_at)}\n`;
        output += `Updated: ${formatRelativeTime(s.updated_at)}\n`;
        return output;
      }

      case 'create_or_update_secret': {
        // Step 1: Get public key
        const keyData = await client.get<any>(`/repos/${owner}/${repo}/actions/secrets/public-key`);
        // Step 2: Encrypt the secret
        const encrypted = await encryptSecret(keyData.key, args.value as string);
        // Step 3: Create/update the secret
        await client.put(`/repos/${owner}/${repo}/actions/secrets/${args.secret_name}`, {
          encrypted_value: encrypted,
          key_id: keyData.key_id,
        });
        return `✅ Secret "${args.secret_name}" has been created/updated successfully.\n⚠️ The value is encrypted and stored securely.`;
      }

      case 'delete_secret': {
        await client.delete(`/repos/${owner}/${repo}/actions/secrets/${args.secret_name}`);
        return `✅ Secret "${args.secret_name}" has been deleted.`;
      }

      case 'list_repo_variables': {
        const params: Record<string, string | number | boolean | undefined> = {
          per_page: (args.per_page as number) || 30,
        };
        const result = await client.get<any>(`/repos/${owner}/${repo}/actions/variables`, params);
        const variables = result.variables || [];
        if (variables.length === 0) return 'No variables configured for this repository.';

        let output = sectionHeader(`Repository Variables (${result.total_count} total)`);
        for (const v of variables) {
          output += `• ${v.name}: ${v.value}\n`;
          output += `  Created: ${formatRelativeTime(v.created_at)} | Updated: ${formatRelativeTime(v.updated_at)}\n`;
        }
        return output;
      }

      case 'get_repo_variable': {
        const v = await client.get<any>(`/repos/${owner}/${repo}/actions/variables/${args.name}`);
        let output = sectionHeader(`Variable: ${v.name}`);
        output += `Value: ${v.value}\n`;
        output += `Created: ${formatRelativeTime(v.created_at)}\n`;
        output += `Updated: ${formatRelativeTime(v.updated_at)}\n`;
        return output;
      }

      case 'create_variable': {
        await client.post(`/repos/${owner}/${repo}/actions/variables`, {
          name: args.name,
          value: args.value,
        });
        return `✅ Variable "${args.name}" created with value "${args.value}".`;
      }

      case 'update_variable': {
        await client.patch(`/repos/${owner}/${repo}/actions/variables/${args.name}`, {
          name: args.name,
          value: args.value,
        });
        return `✅ Variable "${args.name}" updated to "${args.value}".`;
      }

      case 'delete_variable': {
        await client.delete(`/repos/${owner}/${repo}/actions/variables/${args.name}`);
        return `✅ Variable "${args.name}" has been deleted.`;
      }

      case 'list_environment_secrets': {
        const params: Record<string, string | number | boolean | undefined> = {
          per_page: (args.per_page as number) || 30,
        };
        const result = await client.get<any>(`/repos/${owner}/${repo}/environments/${args.environment_name}/secrets`, params);
        const secrets = result.secrets || [];
        if (secrets.length === 0) return `No secrets configured for environment "${args.environment_name}".`;

        let output = sectionHeader(`Secrets for Environment "${args.environment_name}" (${result.total_count} total)`);
        output += '⚠️ Secret values are never exposed.\n\n';
        for (const s of secrets) {
          output += `• ${s.name}\n`;
          output += `  Updated: ${formatRelativeTime(s.updated_at)}\n`;
        }
        return output;
      }

      case 'list_environment_variables': {
        const params: Record<string, string | number | boolean | undefined> = {
          per_page: (args.per_page as number) || 30,
        };
        const result = await client.get<any>(`/repos/${owner}/${repo}/environments/${args.environment_name}/variables`, params);
        const variables = result.variables || [];
        if (variables.length === 0) return `No variables configured for environment "${args.environment_name}".`;

        let output = sectionHeader(`Variables for Environment "${args.environment_name}" (${result.total_count} total)`);
        for (const v of variables) {
          output += `• ${v.name}: ${v.value}\n`;
          output += `  Updated: ${formatRelativeTime(v.updated_at)}\n`;
        }
        return output;
      }

      default:
        return `Unknown secrets tool: ${name}`;
    }
  } catch (error) {
    return formatErrorForAI(error, name);
  }
}
