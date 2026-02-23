/**
 * Parses relative time string to ISO 8601.
 * Supports: "1h", "30m", "7d", "2w", "now", ISO 8601 strings.
 */
export function parseRelativeTime(input: string): string {
  if (!input || input === 'now') return new Date().toISOString();

  // Already ISO 8601
  if (input.includes('T') || (input.includes('-') && input.length > 7)) {
    return new Date(input).toISOString();
  }

  const match = input.match(/^(\d+)([smhdw])$/);
  if (!match) return new Date().toISOString();

  const value = parseInt(match[1], 10);
  const unit = match[2];
  const now = new Date();

  switch (unit) {
    case 's': now.setSeconds(now.getSeconds() - value); break;
    case 'm': now.setMinutes(now.getMinutes() - value); break;
    case 'h': now.setHours(now.getHours() - value); break;
    case 'd': now.setDate(now.getDate() - value); break;
    case 'w': now.setDate(now.getDate() - (value * 7)); break;
  }

  return now.toISOString();
}

/**
 * Builds a GitHub "created" filter string for workflow runs.
 * Example: ">=2024-01-15T00:00:00Z"
 */
export function buildCreatedFilter(since?: string): string | undefined {
  if (!since) return undefined;
  const date = parseRelativeTime(since);
  return `>=${date}`;
}

/**
 * Returns the current timestamp as ISO 8601.
 */
export function nowISO(): string {
  return new Date().toISOString();
}
