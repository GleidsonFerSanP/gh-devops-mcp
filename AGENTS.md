# AGENTS.md — gh-devops-mcp

## Arquitetura

* MCP Server: `src/` (ESM, NodeNext)
* VS Code Extension: `extension/` (CommonJS)
* Dois projetos TypeScript separados com module systems diferentes

## Convenções

* Tool names: snake_case (ex: `list_workflows`,  `get_workflow_run`)
* Arquivos: kebab-case (ex: `github-client.ts`,  `workflow-runs.ts`)
* Arrays de tools exportados: camelCase + `Tools` (ex: `workflowsTools`)
* Handlers exportados: `handle` + PascalCase + `Tool` (ex: `handleWorkflowsTool`)
* Respostas: plain text formatado para AI, nunca JSON bruto
* Imports ESM: sempre com `.js` extension

## Build

1. `npm install` (root)
2. `npm run build` (compila MCP server)
3. `npm run copy-to-extension` (copia para extension/mcp-server/)
4. `cd extension && npm install && npm run compile` (compila extension)
5. `cd extension && npm run package` (gera .vsix)

## Env vars

* `GITHUB_TOKEN` — token obrigatório
* `GITHUB_OWNER` — owner do repo (opcional, auto-detect)
* `GITHUB_REPO` — repo name (opcional, auto-detect)
* `GITHUB_API_URL` — API base URL (default: https://api.github.com)
