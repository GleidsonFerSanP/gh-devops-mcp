export interface GitHubCredentials {
  token: string;
  owner: string;
  repo: string;
  apiUrl: string;
}

/**
 * Reads credentials from environment variables.
 * Returns null if GITHUB_TOKEN is not set.
 */
export function getCredentialsFromEnv(): GitHubCredentials | null {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;

  return {
    token,
    owner: process.env.GITHUB_OWNER || '',
    repo: process.env.GITHUB_REPO || '',
    apiUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
  };
}

/**
 * Validates that credentials have the minimum required fields (token).
 */
export function validateCredentials(credentials: GitHubCredentials): boolean {
  return !!credentials.token && credentials.token.length > 0;
}
