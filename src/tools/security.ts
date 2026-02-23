import { GitHubClient } from '../client/github-client.js';
import { formatErrorForAI } from '../utils/error-handler.js';
import { formatSeverity, formatRelativeTime, sectionHeader } from '../utils/formatters.js';

export const securityTools = [
  {
    name: 'list_dependabot_alerts',
    description: 'List Dependabot security alerts for the repository. Filter by severity, ecosystem, or state. Shows vulnerable dependencies and CVE details.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        state: { type: 'string', description: 'Filter by state: auto_dismissed, dismissed, fixed, open (default: open)' },
        severity: { type: 'string', description: 'Filter by severity: critical, high, medium, low' },
        ecosystem: { type: 'string', description: 'Filter by ecosystem: npm, pip, maven, etc.' },
        package: { type: 'string', description: 'Filter by package name' },
        sort: { type: 'string', description: 'Sort by: created (default), updated' },
        direction: { type: 'string', description: 'Sort direction: desc (default), asc' },
        per_page: { type: 'number', description: 'Results per page (default 30)' },
      },
      required: [],
    },
  },
  {
    name: 'get_dependabot_alert',
    description: 'Get details of a specific Dependabot alert including CVE information, CVSS score, and remediation advice.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        alert_number: { type: 'number', description: 'The alert number' },
      },
      required: ['alert_number'],
    },
  },
  {
    name: 'update_dependabot_alert',
    description: 'Update a Dependabot alert state (dismiss or reopen). When dismissing, provide a reason.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        alert_number: { type: 'number', description: 'The alert number' },
        state: { type: 'string', description: 'New state: dismissed or open' },
        dismissed_reason: { type: 'string', description: 'Dismiss reason: fix_started, inaccurate, no_bandwidth, not_used, tolerable_risk' },
        dismissed_comment: { type: 'string', description: 'Comment explaining the dismissal' },
      },
      required: ['alert_number', 'state'],
    },
  },
  {
    name: 'list_code_scanning_alerts',
    description: 'List code scanning alerts from tools like CodeQL, Semgrep, etc. Shows security vulnerabilities found in the code.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        state: { type: 'string', description: 'Filter by state: open (default), closed, dismissed, fixed' },
        severity: { type: 'string', description: 'Filter by severity: critical, high, medium, low, warning, note, error' },
        tool_name: { type: 'string', description: 'Filter by analysis tool name (e.g., "CodeQL")' },
        per_page: { type: 'number', description: 'Results per page (default 30)' },
      },
      required: [],
    },
  },
  {
    name: 'get_code_scanning_alert',
    description: 'Get details of a specific code scanning alert including affected file path, rule details, and remediation.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        alert_number: { type: 'number', description: 'The alert number' },
      },
      required: ['alert_number'],
    },
  },
  {
    name: 'list_secret_scanning_alerts',
    description: 'List secret scanning alerts for detected secrets/credentials exposed in the repository code.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        state: { type: 'string', description: 'Filter by state: open (default), resolved' },
        secret_type: { type: 'string', description: 'Filter by secret type pattern' },
        resolution: { type: 'string', description: 'Filter by resolution: false_positive, wont_fix, revoked, used_in_tests' },
        per_page: { type: 'number', description: 'Results per page (default 30)' },
      },
      required: [],
    },
  },
  {
    name: 'get_secret_scanning_alert',
    description: 'Get details of a specific secret scanning alert.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        alert_number: { type: 'number', description: 'The alert number' },
      },
      required: ['alert_number'],
    },
  },
  {
    name: 'get_security_overview',
    description: 'Get a comprehensive security overview of the repository. Combines Dependabot alerts, code scanning alerts, and secret scanning alerts into a unified dashboard.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
      },
      required: [],
    },
  },
];

export async function handleSecurityTool(name: string, args: Record<string, unknown>, client: GitHubClient): Promise<string> {
  const owner = (args.owner as string) || client.owner;
  const repo = (args.repo as string) || client.repo;

  try {
    switch (name) {
      case 'list_dependabot_alerts': {
        const params: Record<string, string | number | boolean | undefined> = {
          state: (args.state as string) || 'open',
          sort: (args.sort as string) || 'created',
          direction: (args.direction as string) || 'desc',
          per_page: (args.per_page as number) || 30,
        };
        if (args.severity) params.severity = args.severity as string;
        if (args.ecosystem) params.ecosystem = args.ecosystem as string;
        if (args.package) params.package = args.package as string;
        const alerts = await client.get<any[]>(`/repos/${owner}/${repo}/dependabot/alerts`, params);
        if (!alerts || alerts.length === 0) return 'No Dependabot alerts found.';

        let output = sectionHeader(`Dependabot Alerts (${alerts.length})`);
        for (const a of alerts) {
          const severity = a.security_advisory?.severity || a.security_vulnerability?.severity || 'unknown';
          output += `${formatSeverity(severity)} #${a.number}: ${a.security_advisory?.summary || 'N/A'}\n`;
          output += `  Package: ${a.security_vulnerability?.package?.name || 'N/A'} (${a.security_vulnerability?.package?.ecosystem || ''}) @ ${a.security_vulnerability?.vulnerable_version_range || 'N/A'}\n`;
          output += `  CVE: ${a.security_advisory?.cve_id || 'N/A'} | CVSS: ${a.security_advisory?.cvss?.score || 'N/A'}\n`;
          output += `  State: ${a.state} | Created: ${formatRelativeTime(a.created_at)}\n\n`;
        }
        return output;
      }

      case 'get_dependabot_alert': {
        const a = await client.get<any>(`/repos/${owner}/${repo}/dependabot/alerts/${args.alert_number}`);
        const severity = a.security_advisory?.severity || 'unknown';
        let output = sectionHeader(`Dependabot Alert #${a.number}`);
        output += `${formatSeverity(severity)}\n`;
        output += `Summary: ${a.security_advisory?.summary || 'N/A'}\n`;
        output += `CVE: ${a.security_advisory?.cve_id || 'N/A'}\n`;
        output += `CVSS Score: ${a.security_advisory?.cvss?.score || 'N/A'}\n`;
        output += `Package: ${a.security_vulnerability?.package?.name || 'N/A'}\n`;
        output += `Ecosystem: ${a.security_vulnerability?.package?.ecosystem || 'N/A'}\n`;
        output += `Vulnerable: ${a.security_vulnerability?.vulnerable_version_range || 'N/A'}\n`;
        output += `Fixed in: ${a.security_vulnerability?.first_patched_version?.identifier || 'N/A'}\n`;
        output += `State: ${a.state}\n`;
        output += `Auto dismissed at: ${a.auto_dismissed_at ? formatRelativeTime(a.auto_dismissed_at) : 'N/A'}\n`;
        if (a.security_advisory?.description) {
          output += sectionHeader('Description');
          output += `${a.security_advisory.description.substring(0, 500)}${a.security_advisory.description.length > 500 ? '...' : ''}\n`;
        }
        return output;
      }

      case 'update_dependabot_alert': {
        const body: Record<string, unknown> = { state: args.state };
        if (args.dismissed_reason) body.dismissed_reason = args.dismissed_reason;
        if (args.dismissed_comment) body.dismissed_comment = args.dismissed_comment;
        const a = await client.patch<any>(`/repos/${owner}/${repo}/dependabot/alerts/${args.alert_number}`, body);
        return `✅ Dependabot alert #${a.number} updated to state: ${a.state}`;
      }

      case 'list_code_scanning_alerts': {
        const params: Record<string, string | number | boolean | undefined> = {
          state: (args.state as string) || 'open',
          per_page: (args.per_page as number) || 30,
        };
        if (args.severity) params.severity = args.severity as string;
        if (args.tool_name) params.tool_name = args.tool_name as string;
        const alerts = await client.get<any[]>(`/repos/${owner}/${repo}/code-scanning/alerts`, params);
        if (!alerts || alerts.length === 0) return 'No code scanning alerts found.';

        let output = sectionHeader(`Code Scanning Alerts (${alerts.length})`);
        for (const a of alerts) {
          const severity = a.rule?.severity || 'unknown';
          output += `${formatSeverity(severity)} #${a.number}: ${a.rule?.description || a.rule?.id || 'N/A'}\n`;
          output += `  Tool: ${a.tool?.name || 'N/A'} | File: ${a.most_recent_instance?.location?.path || 'N/A'}\n`;
          output += `  State: ${a.state} | Ref: ${a.most_recent_instance?.ref || 'N/A'}\n\n`;
        }
        return output;
      }

      case 'get_code_scanning_alert': {
        const a = await client.get<any>(`/repos/${owner}/${repo}/code-scanning/alerts/${args.alert_number}`);
        let output = sectionHeader(`Code Scanning Alert #${a.number}`);
        output += `Rule: ${a.rule?.id || 'N/A'} — ${a.rule?.description || 'N/A'}\n`;
        output += `Severity: ${formatSeverity(a.rule?.severity)}\n`;
        output += `Tool: ${a.tool?.name || 'N/A'} ${a.tool?.version || ''}\n`;
        output += `State: ${a.state}\n`;
        if (a.most_recent_instance?.location) {
          const loc = a.most_recent_instance.location;
          output += `Location: ${loc.path}:${loc.start_line}-${loc.end_line}\n`;
        }
        if (a.rule?.help) {
          output += sectionHeader('Help');
          output += `${a.rule.help.substring(0, 300)}...\n`;
        }
        return output;
      }

      case 'list_secret_scanning_alerts': {
        const params: Record<string, string | number | boolean | undefined> = {
          state: (args.state as string) || 'open',
          per_page: (args.per_page as number) || 30,
        };
        if (args.secret_type) params.secret_type = args.secret_type as string;
        if (args.resolution) params.resolution = args.resolution as string;
        const alerts = await client.get<any[]>(`/repos/${owner}/${repo}/secret-scanning/alerts`, params);
        if (!alerts || alerts.length === 0) return 'No secret scanning alerts found.';

        let output = sectionHeader(`Secret Scanning Alerts (${alerts.length})`);
        for (const a of alerts) {
          output += `🔑 #${a.number}: ${a.secret_type_display_name || a.secret_type || 'Unknown'}\n`;
          output += `  State: ${a.state} | Created: ${formatRelativeTime(a.created_at)}\n`;
          if (a.resolution) output += `  Resolution: ${a.resolution}\n`;
          output += '\n';
        }
        return output;
      }

      case 'get_secret_scanning_alert': {
        const a = await client.get<any>(`/repos/${owner}/${repo}/secret-scanning/alerts/${args.alert_number}`);
        let output = sectionHeader(`Secret Scanning Alert #${a.number}`);
        output += `Type: ${a.secret_type_display_name || a.secret_type || 'Unknown'}\n`;
        output += `State: ${a.state}\n`;
        output += `Created: ${formatRelativeTime(a.created_at)}\n`;
        output += `Updated: ${formatRelativeTime(a.updated_at)}\n`;
        if (a.resolution) output += `Resolution: ${a.resolution}\n`;
        if (a.resolved_at) output += `Resolved: ${formatRelativeTime(a.resolved_at)}\n`;
        if (a.resolved_by) output += `Resolved by: ${a.resolved_by.login}\n`;
        return output;
      }

      case 'get_security_overview': {
        // Use allSettled since some repos may not have code scanning enabled
        const [dependabotResult, codeScanningResult, secretScanningResult] = await Promise.allSettled([
          client.get<any[]>(`/repos/${owner}/${repo}/dependabot/alerts`, { state: 'open', per_page: 100 }),
          client.get<any[]>(`/repos/${owner}/${repo}/code-scanning/alerts`, { state: 'open', per_page: 100 }),
          client.get<any[]>(`/repos/${owner}/${repo}/secret-scanning/alerts`, { state: 'open', per_page: 100 }),
        ]);

        const dependabotAlerts = dependabotResult.status === 'fulfilled' ? dependabotResult.value || [] : [];
        const codeScanningAlerts = codeScanningResult.status === 'fulfilled' ? codeScanningResult.value || [] : null;
        const secretScanningAlerts = secretScanningResult.status === 'fulfilled' ? secretScanningResult.value || [] : [];

        let output = sectionHeader(`Security Overview: ${owner}/${repo}`);
        output += '\n📊 Summary:\n';

        // Dependabot
        if (dependabotAlerts.length > 0) {
          const bySeverity = dependabotAlerts.reduce((acc, a) => {
            const sev = a.security_advisory?.severity || 'unknown';
            acc[sev] = (acc[sev] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          output += `  Dependabot: ${dependabotAlerts.length} open alerts`;
          const parts = [];
          if (bySeverity.critical) parts.push(`${bySeverity.critical} critical`);
          if (bySeverity.high) parts.push(`${bySeverity.high} high`);
          if (bySeverity.medium) parts.push(`${bySeverity.medium} medium`);
          if (bySeverity.low) parts.push(`${bySeverity.low} low`);
          if (parts.length > 0) output += ` (${parts.join(', ')})`;
        } else if (dependabotResult.status === 'fulfilled') {
          output += `  Dependabot: ✅ No open alerts`;
        } else {
          output += `  Dependabot: ⚠️ Not available`;
        }
        output += '\n';

        // Code Scanning
        if (codeScanningAlerts === null) {
          output += `  Code Scanning: ⚠️ Not enabled\n`;
        } else if (codeScanningAlerts.length > 0) {
          output += `  Code Scanning: ${codeScanningAlerts.length} open alerts\n`;
        } else {
          output += `  Code Scanning: ✅ No open alerts\n`;
        }

        // Secret Scanning
        if (secretScanningAlerts.length > 0) {
          output += `  Secret Scanning: ${secretScanningAlerts.length} open alert(s) — IMMEDIATE ACTION REQUIRED\n`;
        } else if (secretScanningResult.status === 'fulfilled') {
          output += `  Secret Scanning: ✅ No open alerts\n`;
        } else {
          output += `  Secret Scanning: ⚠️ Not available\n`;
        }

        // Critical Dependabot
        const criticalDependabot = dependabotAlerts.filter((a: any) => a.security_advisory?.severity === 'critical');
        if (criticalDependabot.length > 0) {
          output += sectionHeader('🔴 Critical Vulnerabilities');
          for (const a of criticalDependabot.slice(0, 5)) {
            output += `  • ${a.security_advisory?.cve_id || 'N/A'} in ${a.security_vulnerability?.package?.name || 'N/A'} — ${a.security_advisory?.summary || ''}\n`;
          }
        }

        // High Dependabot
        const highDependabot = dependabotAlerts.filter((a: any) => a.security_advisory?.severity === 'high');
        if (highDependabot.length > 0) {
          output += sectionHeader('🟠 High Severity Vulnerabilities');
          for (const a of highDependabot.slice(0, 3)) {
            output += `  • ${a.security_advisory?.cve_id || 'N/A'} in ${a.security_vulnerability?.package?.name || 'N/A'} — ${a.security_advisory?.summary || ''}\n`;
          }
        }

        // Secret Leaks
        if (secretScanningAlerts.length > 0) {
          output += sectionHeader('⚠️ Secret Leaks');
          for (const a of secretScanningAlerts.slice(0, 5)) {
            output += `  • ${a.secret_type_display_name || a.secret_type} detected\n`;
          }
        }

        output += sectionHeader('💡 Recommendations');
        if (criticalDependabot.length > 0) output += '  1. Address critical Dependabot alerts immediately\n';
        if (secretScanningAlerts.length > 0) output += '  2. Review and rotate exposed secrets immediately\n';
        if (codeScanningAlerts && codeScanningAlerts.length > 0) output += '  3. Fix high-severity code scanning issues\n';
        if (criticalDependabot.length === 0 && secretScanningAlerts.length === 0) {
          output += '  ✅ Repository is in good security standing\n';
        }

        return output;
      }

      default:
        return `Unknown security tool: ${name}`;
    }
  } catch (error) {
    return formatErrorForAI(error, name);
  }
}
