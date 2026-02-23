export class GitHubAPIError extends Error {
  public readonly statusCode: number;
  public readonly endpoint: string;
  public readonly responseBody: string;

  constructor(message: string, statusCode: number, endpoint: string, responseBody?: string) {
    super(message);
    this.name = 'GitHubAPIError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    this.responseBody = responseBody || '';
  }
}

export function handleAPIError(error: unknown, toolName: string): never {
  if (error instanceof GitHubAPIError) {
    const details = error.responseBody ? `\nDetails: ${error.responseBody}` : '';
    throw new Error(
      `[${toolName}] GitHub API Error (${error.statusCode}) at ${error.endpoint}: ${error.message}${details}`
    );
  }
  if (error instanceof Error) {
    throw new Error(`[${toolName}] Error: ${error.message}`);
  }
  throw new Error(`[${toolName}] Unknown error occurred`);
}

export function formatErrorForAI(error: unknown, toolName: string): string {
  if (error instanceof GitHubAPIError) {
    switch (error.statusCode) {
      case 401:
        return `❌ Authentication failed for ${toolName}. Check your GITHUB_TOKEN is valid and not expired.`;
      case 403:
        return `❌ Access denied for ${toolName}. Your token may lack required permissions, or you've hit the rate limit.`;
      case 404:
        return `❌ Not found for ${toolName}. Check that the owner, repo, and resource ID are correct.`;
      case 422:
        return `❌ Validation error for ${toolName}: ${error.responseBody}`;
      default:
        return `❌ GitHub API error (${error.statusCode}) for ${toolName}: ${error.message}`;
    }
  }
  if (error instanceof Error) {
    return `❌ Error in ${toolName}: ${error.message}`;
  }
  return `❌ Unknown error in ${toolName}`;
}
