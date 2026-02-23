/**
 * Truncates an array of items and returns truncation info.
 */
export function truncateResults<T>(items: T[], maxItems: number): { data: T[]; truncated: boolean; total: number } {
  return {
    data: items.slice(0, maxItems),
    truncated: items.length > maxItems,
    total: items.length,
  };
}

/**
 * Formats a workflow run status with emoji.
 */
export function formatRunStatus(status: string, conclusion: string | null): string {
  if (status === 'completed') {
    switch (conclusion) {
      case 'success': return '✅ Success';
      case 'failure': return '❌ Failure';
      case 'cancelled': return '⏹️ Cancelled';
      case 'skipped': return '⏭️ Skipped';
      case 'timed_out': return '⏰ Timed Out';
      default: return `🔘 ${conclusion || 'Unknown'}`;
    }
  }
  switch (status) {
    case 'queued': return '🟡 Queued';
    case 'in_progress': return '🔄 In Progress';
    case 'waiting': return '⏳ Waiting';
    default: return `🔘 ${status}`;
  }
}

/**
 * Formats a deployment state with emoji.
 */
export function formatDeploymentState(state: string): string {
  switch (state) {
    case 'success': return '✅ Success';
    case 'error': return '❌ Error';
    case 'failure': return '❌ Failure';
    case 'pending': return '🟡 Pending';
    case 'queued': return '🟡 Queued';
    case 'in_progress': return '🔄 In Progress';
    case 'inactive': return '⚪ Inactive';
    default: return `🔘 ${state}`;
  }
}

/**
 * Formats alert severity with emoji.
 */
export function formatSeverity(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'critical': return '🔴 Critical';
    case 'high': return '🟠 High';
    case 'medium': return '🟡 Medium';
    case 'low': return '🟢 Low';
    default: return `⚪ ${severity || 'Unknown'}`;
  }
}

/**
 * Formats a check run conclusion with emoji.
 */
export function formatCheckConclusion(conclusion: string | null): string {
  switch (conclusion) {
    case 'success': return '✅ Passed';
    case 'failure': return '❌ Failed';
    case 'neutral': return '⚪ Neutral';
    case 'cancelled': return '⏹️ Cancelled';
    case 'skipped': return '⏭️ Skipped';
    case 'timed_out': return '⏰ Timed Out';
    case 'action_required': return '⚠️ Action Required';
    case null: return '🔄 In Progress';
    default: return `🔘 ${conclusion}`;
  }
}

/**
 * Formats a PR state with emoji.
 */
export function formatPRState(state: string, merged: boolean): string {
  if (merged) return '🟣 Merged';
  switch (state) {
    case 'open': return '🟢 Open';
    case 'closed': return '🔴 Closed';
    default: return `🔘 ${state}`;
  }
}

/**
 * Formats file size in human-readable format.
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Formats a date string to a human-readable relative time.
 */
export function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toISOString().split('T')[0];
}

/**
 * Formats duration in seconds to human-readable.
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

/**
 * Calculates duration between two ISO timestamps.
 */
export function calculateDuration(start: string, end: string | null): string {
  if (!start) return 'N/A';
  if (!end) return 'ongoing';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffSecs = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
  return formatDuration(diffSecs);
}

/**
 * Creates a section header for formatted output.
 */
export function sectionHeader(title: string): string {
  return `\n━━━ ${title} ━━━\n`;
}
