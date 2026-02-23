# GitHub DevOps MCP — Copilot Instructions

You have access to 85+ GitHub DevOps tools via the gh-devops-mcp MCP server.

## Available Tool Categories

### 🔄 Workflows (6 tools)

- `list_workflows` — List all workflows in the repository
- `get_workflow` — Get details of a specific workflow
- `dispatch_workflow` — Trigger a workflow_dispatch event
- `enable_workflow` / `disable_workflow` — Enable/disable a workflow
- `get_workflow_usage` — Get billing usage for a workflow

### 🏃 Workflow Runs (10 tools)

- `list_workflow_runs` — List runs with filters (branch, status, actor, time)
- `get_workflow_run` — Get run details
- `cancel_workflow_run` / `rerun_workflow_run` / `rerun_failed_jobs`
- `get_workflow_run_logs` — Download run logs
- `list_workflow_jobs` / `get_workflow_job` / `get_job_logs`
- `get_failed_runs` — **HIGH-LEVEL**: Summarize failed runs by workflow

### 📦 Artifacts (4 tools)

- `list_artifacts` / `get_artifact` / `list_run_artifacts` / `delete_artifact`

### 🚀 Deployments (6 tools)

- `list_deployments` / `get_deployment` / `create_deployment` / `delete_deployment`
- `list_deployment_statuses` / `create_deployment_status`

### 🌍 Environments (5 tools)

- `list_environments` / `get_environment` / `create_environment` / `delete_environment`
- `get_environment_protection_rules`

### 🔐 Secrets & Variables (11 tools)

- `list_repo_secrets` / `get_repo_secret` / `create_or_update_secret` / `delete_secret`
- `list_repo_variables` / `get_repo_variable` / `create_variable` / `update_variable` / `delete_variable`
- `list_environment_secrets` / `list_environment_variables`

### 🏷️ Releases (7 tools)

- `list_releases` / `get_release` / `get_latest_release`
- `create_release` / `update_release` / `delete_release`
- `generate_release_notes` — Auto-generate release notes from commits

### 🌿 Branches (7 tools)

- `list_branches` / `get_branch`
- `get_branch_protection` / `update_branch_protection` / `delete_branch_protection`
- `get_commit_status` / `list_commit_statuses`

### 🔀 Pull Requests (7 tools)

- `list_pull_requests` / `get_pull_request`
- `list_pr_commits` / `list_pr_files` / `list_pr_reviews`
- `merge_pull_request`
- `get_pr_ci_status` — **HIGH-LEVEL**: Unified CI status for a PR

### ✅ Checks (4 tools)

- `list_check_runs_for_ref` / `get_check_run`
- `list_check_suites` / `rerequest_check_suite`

### 🛡️ Security (8 tools)

- `list_dependabot_alerts` / `get_dependabot_alert` / `update_dependabot_alert`
- `list_code_scanning_alerts` / `get_code_scanning_alert`
- `list_secret_scanning_alerts` / `get_secret_scanning_alert`
- `get_security_overview` — **HIGH-LEVEL**: Complete security dashboard

### 📦 Packages (4 tools)

- `list_packages` / `get_package` / `list_package_versions` / `delete_package_version`

### 📊 Repository (6 tools)

- `get_repository` / `list_webhooks` / `create_webhook` / `delete_webhook`
- `list_repository_topics`
- `get_repository_stats` — **HIGH-LEVEL**: Languages, contributors, commit activity

---

## Troubleshooting Flows

### 1. "Why is my deployment failing?"

1. Use `get_failed_runs` with `since: "1h"` to find recent failures
2. Use `get_workflow_run_logs` to get the full log
3. Use `get_deployment` and `list_deployment_statuses` to check deployment state
4. Use `get_environment_protection_rules` to verify environment gates

### 2. "Is my PR ready to merge?"

1. Use `get_pr_ci_status` — this is the BEST single-tool solution
2. Check `list_pr_reviews` for approval status
3. Use `get_branch_protection` to see required status checks

### 3. "What's broken in CI?"

1. Use `list_workflow_runs` with `status: failure` and `branch: main`
2. Use `list_workflow_jobs` to find the failing job
3. Use `get_job_logs` to read the error

### 4. "Are there security vulnerabilities?"

1. Use `get_security_overview` for a complete dashboard
2. Use `list_dependabot_alerts` with `severity: critical` for critical issues
3. Use `list_secret_scanning_alerts` for leaked credentials

### 5. "How do I trigger a deployment?"

1. Use `list_environments` to see available environments
2. Use `dispatch_workflow` to trigger a deploy workflow
3. OR use `create_deployment` followed by `create_deployment_status`

---

## Common Patterns

- Most tools accept `owner` and `repo` parameters. If not provided, uses the configured defaults.
- Time filters accept: `"1h"`, `"6h"`, `"24h"`, `"7d"`, `"2w"`
- HIGH-LEVEL tools (prefixed in descriptions) combine multiple API calls for comprehensive output
