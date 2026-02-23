import { GitHubCredentials } from './auth.js';
import { GitHubAPIError } from '../utils/error-handler.js';

interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  rawResponse?: boolean;
}

export class GitHubClient {
  private readonly baseUrl: string;
  private readonly credentials: GitHubCredentials;
  private readonly maxRetries = 3;
  private readonly timeoutMs = 30000;

  constructor(credentials: GitHubCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.apiUrl.replace(/\/+$/, '');
  }

  get owner(): string { return this.credentials.owner; }
  get repo(): string { return this.credentials.repo; }

  private async request<T>(method: string, path: string, options?: RequestOptions): Promise<T> {
    const fullPath = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const url = new URL(fullPath);

    // Add query params
    if (options?.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined && value !== '' && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.credentials.token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'gh-devops-mcp/1.0.0',
      ...options?.headers,
    };

    if (options?.body) {
      headers['Content-Type'] = 'application/json';
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url.toString(), {
          method,
          headers,
          body: options?.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
          redirect: 'manual',
        });

        clearTimeout(timeoutId);

        // Handle rate limiting (403 with X-RateLimit-Remaining: 0)
        if (response.status === 403) {
          const remaining = response.headers.get('X-RateLimit-Remaining');
          if (remaining === '0') {
            const resetTime = parseInt(response.headers.get('X-RateLimit-Reset') || '0', 10);
            const waitMs = Math.max(0, (resetTime * 1000) - Date.now()) + 1000;
            if (attempt < this.maxRetries - 1) {
              await this.sleep(Math.min(waitMs, 60000));
              continue;
            }
          }
        }

        // Handle 429 Too Many Requests
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
          if (attempt < this.maxRetries - 1) {
            await this.sleep(retryAfter * 1000);
            continue;
          }
        }

        // 204 No Content
        if (response.status === 204) {
          return undefined as T;
        }

        // 302 Redirect (for log downloads)
        if (response.status === 302) {
          const location = response.headers.get('Location');
          return { download_url: location } as T;
        }

        // Check for error responses
        if (!response.ok) {
          const body = await response.text();
          throw new GitHubAPIError(
            `GitHub API error: ${response.status} ${response.statusText}`,
            response.status,
            url.pathname,
            body
          );
        }

        // Raw text response (for logs)
        if (options?.rawResponse) {
          const text = await response.text();
          return text as T;
        }

        const text = await response.text();
        if (!text) return {} as T;
        return JSON.parse(text) as T;

      } catch (error) {
        lastError = error as Error;
        if (error instanceof GitHubAPIError) throw error;
        if ((error as Error).name === 'AbortError') {
          throw new GitHubAPIError('Request timed out', 408, path);
        }
        // Retry on network errors
        if (attempt < this.maxRetries - 1) {
          await this.sleep(Math.pow(2, attempt) * 1000);
          continue;
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('GET', path, { params, headers });
  }

  async post<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('POST', path, { body, headers });
  }

  async put<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('PUT', path, { body, headers });
  }

  async patch<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('PATCH', path, { body, headers });
  }

  async delete<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('DELETE', path, { params });
  }

  async getRaw(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<string> {
    return this.request<string>('GET', path, { params, rawResponse: true });
  }
}
