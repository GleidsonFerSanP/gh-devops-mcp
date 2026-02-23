# GitHub DevOps MCP

**VS Code Extension exposing 85+ GitHub DevOps tools to GitHub Copilot Chat via the Model Context Protocol.**

Ask Copilot things like:
* *"Show me failed workflows in the last 24 hours"*
* *"List open critical Dependabot alerts"*
* *"Merge PR #42 with squash"*
* *"Deploy v1.2.0 to production environment"*

## 🚀 Features

| Category | Tools | Count |
|---|---|---|
| Workflows | List, get, dispatch, enable/disable, get usage | 6 |
| Workflow Runs | List, get, cancel, rerun, rerun-failed, logs, jobs | 10 |
| Artifacts | List, get, delete | 4 |
| Deployments | List, get, create, delete, statuses | 6 |
| Environments | List, get, create, delete, protection rules | 5 |
| Secrets & Variables | Repo secrets, variables, env secrets | 11 |
| Releases | List, get, create, update, delete, notes | 7 |
| Branches | List, get, protection rules, commit status | 7 |
| Pull Requests | List, get, commits, files, reviews, merge, CI status | 7 |
| Checks | Check runs, check suites, rerequest | 4 |
| Security | Dependabot, code scanning, secret scanning | 8 |
| Packages | List, get, versions, delete | 4 |
| Repository | Info, webhooks, topics, stats | 6 |

**Total: 85 tools**

## Installation

1. Install the extension from the VS Code Marketplace
2. Click the `$(github) DevOps` status bar item to configure
3. Enter your GitHub Personal Access Token
4. Ask Copilot to use your GitHub DevOps tools

## Authentication

Create a PAT at [github.com/settings/tokens](https://github.com/settings/tokens) with these scopes:
* `repo` — Full repository access
* `workflow` — Manage GitHub Actions workflows
* `write:packages` — Manage packages
* `security_events` — Read/write security events

## Configuration

| Setting | Default | Description |
|---|---|---|
| `ghDevops.defaultOwner` | *(auto-detect)* | GitHub username or org |
| `ghDevops.defaultRepo` | *(auto-detect)* | Default repository name |
| `ghDevops.apiUrl` | `https://api.github.com` | GitHub Enterprise URL |

## Usage Examples

```
@workspace /GitHub show failed workflow runs in the last 6 hours
@workspace /GitHub list open high severity Dependabot alerts
@workspace /GitHub get CI status for PR #23
@workspace /GitHub create release v2.0.0 with latest release notes
@workspace /GitHub security overview for this repo
```

## Requirements

* VS Code 1.85+
* GitHub Personal Access Token
* GitHub Copilot Chat

## License

MIT
