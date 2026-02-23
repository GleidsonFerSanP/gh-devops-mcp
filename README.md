# gh-devops-mcp

**GitHub DevOps MCP Server** — VS Code Extension that exposes 85+ GitHub DevOps tools to GitHub Copilot Chat via the Model Context Protocol.

## Quick Start

```bash
npm install
npm run build
cd extension && npm install && npm run compile
cd extension && npm run package
```

## Architecture

```
gh-devops-mcp/
├── src/                        # MCP Server (TypeScript ESM)
│   ├── index.ts                # Server entry point
│   ├── client/
│   │   ├── auth.ts             # GitHub credentials
│   │   └── github-client.ts   # HTTP client (native fetch, retry, rate limiting)
│   ├── utils/
│   │   ├── error-handler.ts   # Error formatting
│   │   ├── formatters.ts      # Text formatters for AI output
│   │   └── time-helpers.ts    # Date parsing utilities
│   └── tools/                 # 13 tool modules (85 tools total)
├── extension/                  # VS Code Extension (TypeScript CJS)
│   ├── src/
│   │   ├── extension.ts       # Activation, MCP registration
│   │   ├── settings-webview.ts # Settings panel
│   │   └── types.ts           # Shared types
│   └── webview/
│       └── settings.html      # Settings UI
└── dist/                      # Build output
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GITHUB_TOKEN` | Yes | GitHub Personal Access Token |
| `GITHUB_OWNER` | No | Default repository owner |
| `GITHUB_REPO` | No | Default repository name |
| `GITHUB_API_URL` | No | GitHub Enterprise Server URL |

## Development

```bash
# Watch mode (auto-rebuild)
npm run dev

# Run server directly
GITHUB_TOKEN=ghp_xxx npm start

# Build extension
npm run build && npm run copy-to-extension
cd extension && npm install && npm run compile && npm run package
```

## Required PAT Scopes

* `repo` — Full repository access
* `workflow` — GitHub Actions management
* `write:packages` — Package registry management
* `security_events` — Security alerts
