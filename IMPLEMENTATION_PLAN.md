# IMPLEMENTATION_PLAN.md — gh-devops-mcp

> Plano de implementação completo para o projeto **gh-devops-mcp**: uma VS Code Extension + MCP Server que integra GitHub DevOps (Actions, Deployments, Environments, Releases, Security, PRs, Branches, Packages e mais) ao GitHub Copilot Chat via Model Context Protocol.

---

## 1. Visão Geral do Projeto

### Descrição

**gh-devops-mcp** é uma extensão para VS Code que expõe ~65 ferramentas de DevOps/CI/CD do GitHub como MCP (Model Context Protocol) tools, permitindo que AI agents (GitHub Copilot Chat) analisem pipelines, gerenciem deployments, investiguem falhas de CI, monitorem segurança e automatizem operações — tudo diretamente do editor.

### Propósito

* Eliminar context-switching entre VS Code e GitHub UI/CLI
* Permitir que AI agents respondam perguntas como "por que meu CI falhou?", "qual o status do meu deploy?", "tenho vulnerabilidades críticas?"
* Automatizar workflows de DevOps via linguagem natural

### Público-alvo

* Desenvolvedores que usam GitHub Actions para CI/CD
* DevOps engineers gerenciando múltiplos repositórios
* Security teams monitorando vulnerabilidades via Dependabot/Code Scanning
* Qualquer pessoa usando GitHub Copilot Chat no VS Code

### Stack Tecnológico

| Componente | Tecnologia |
|---|---|
| MCP Server | TypeScript, ESM, Node.js 18+, `@modelcontextprotocol/sdk` |
| VS Code Extension | TypeScript, CommonJS, VS Code API |
| HTTP Client | Native `fetch` (Node 18+) — sem axios/got |
| Transporte MCP | Stdio (stdin/stdout) |
| Autenticação | GitHub PAT via SecretStorage + env vars |

---

## 2. Arquitetura

### Árvore de Diretórios Completa

```
gh-devops-mcp/
├── src/                              # MCP Server source (ESM, NodeNext)
│   ├── index.ts                      # Main MCP server entry point
│   ├── client/
│   │   ├── github-client.ts          # HTTP client base para GitHub API
│   │   └── auth.ts                   # Autenticação (PAT / GitHub Token)
│   ├── tools/
│   │   ├── workflows.ts             # GitHub Actions Workflows (6 tools)
│   │   ├── workflow-runs.ts          # Workflow Runs & Jobs (10 tools)
│   │   ├── artifacts.ts             # Artifacts (4 tools)
│   │   ├── deployments.ts           # Deployments & Statuses (6 tools)
│   │   ├── environments.ts          # Environments & Protection Rules (5 tools)
│   │   ├── secrets.ts               # Actions Secrets & Variables (11 tools)
│   │   ├── releases.ts              # Releases & Release Notes (7 tools)
│   │   ├── branches.ts              # Branches & Protection (7 tools)
│   │   ├── pull-requests.ts         # Pull Requests & Reviews (7 tools)
│   │   ├── checks.ts                # Check Runs & Check Suites (4 tools)
│   │   ├── security.ts              # Dependabot, Code Scanning, Secret Scanning (8 tools)
│   │   ├── packages.ts              # GitHub Packages (4 tools)
│   │   └── repository.ts            # Repository settings, webhooks, topics (6 tools)
│   └── utils/
│       ├── formatters.ts             # Formatação de respostas para AI
│       ├── time-helpers.ts           # Helpers de datas/timestamps
│       └── error-handler.ts          # Tratamento de erros padronizado
├── extension/                         # VS Code Extension (CommonJS)
│   ├── src/
│   │   ├── extension.ts              # Extension activation & MCP registration
│   │   ├── settings-webview.ts       # Webview para configuração
│   │   └── types.ts                  # TypeScript definitions
│   ├── resources/
│   │   └── instructions/
│   │       └── github-devops.instructions.md
│   ├── webview/
│   │   └── settings.html
│   ├── dist/
│   ├── mcp-server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── icon.svg
│   ├── icon.png
│   ├── create-icon.js
│   ├── .vscodeignore
│   ├── CHANGELOG.md
│   └── README.md
├── dist/
├── package.json
├── tsconfig.json
├── .gitignore
├── LICENSE
├── AGENTS.md
├── README.md
└── IMPLEMENTATION_PLAN.md
```

### Dois Projetos TypeScript Separados

| Aspecto | MCP Server (root) | Extension (extension/) |
|---|---|---|
| Module system | **ESM** ( `"type": "module"` ) | **CommonJS** |
| `tsconfig.module` | `NodeNext` | `CommonJS` |
| `moduleResolution` | `NodeNext` | `node` |
| Entry point | `dist/index.js` | `dist/extension.js` |
| Import style | `.js` extensions obrigatórias | Standard imports |
| Dependências | `@modelcontextprotocol/sdk` | `@types/vscode` |

### Fluxo de Build

```
1. npm run build          → tsc compila src/ → dist/ (ESM)
2. npm run copy-to-extension → copia dist/ + node_modules → extension/mcp-server/
3. cd extension && npm run compile → tsc compila extension/src/ → extension/dist/ (CJS)
4. cd extension && npm run package → vsce package → .vsix
```

---

## 3. Domínios de API do GitHub Cobertos

### Resumo por Domínio (65 tools total)

| # | Domínio | Arquivo | Tools | Descrição |
|---|---|---|---|---|
| 1 | Workflows | `workflows.ts` | 6 | GitHub Actions workflow CRUD + dispatch |
| 2 | Workflow Runs & Jobs | `workflow-runs.ts` | 10 | Runs, jobs, logs, rerun, cancel |
| 3 | Artifacts | `artifacts.ts` | 4 | Build artifacts management |
| 4 | Deployments | `deployments.ts` | 6 | Deployment CRUD + statuses |
| 5 | Environments | `environments.ts` | 5 | Env CRUD + protection rules |
| 6 | Secrets & Variables | `secrets.ts` | 11 | Repo/env secrets + variables |
| 7 | Releases | `releases.ts` | 7 | Release CRUD + notes generation |
| 8 | Branches & Protection | `branches.ts` | 7 | Branch CRUD + protection + commit status |
| 9 | Pull Requests | `pull-requests.ts` | 7 | PR CRUD + reviews + CI status |
| 10 | Check Runs & Suites | `checks.ts` | 4 | Check runs/suites + rerequest |
| 11 | Security | `security.ts` | 8 | Dependabot + Code Scanning + Secret Scanning |
| 12 | Packages | `packages.ts` | 4 | GitHub Packages management |
| 13 | Repository | `repository.ts` | 6 | Repo info + webhooks + topics + stats |

---

### Domínio 1: Workflows (6 tools)

| Tool | Method | Endpoint | Params/Body |
|---|---|---|---|
| `list_workflows` | GET | `/repos/{owner}/{repo}/actions/workflows` | `per_page` (default 30) |
| `get_workflow` | GET | `/repos/{owner}/{repo}/actions/workflows/{workflow_id}` | `workflow_id` (number or filename) |
| `dispatch_workflow` | POST | `/repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches` | Body: `ref` , `inputs` (object) |
| `enable_workflow` | PUT | `/repos/{owner}/{repo}/actions/workflows/{workflow_id}/enable` | `workflow_id` |
| `disable_workflow` | PUT | `/repos/{owner}/{repo}/actions/workflows/{workflow_id}/disable` | `workflow_id` |
| `get_workflow_usage` | GET | `/repos/{owner}/{repo}/actions/workflows/{workflow_id}/timing` | `workflow_id` |

### Domínio 2: Workflow Runs & Jobs (10 tools)

| Tool | Method | Endpoint | Params/Body |
|---|---|---|---|
| `list_workflow_runs` | GET | `/repos/{owner}/{repo}/actions/runs` | `actor` , `branch` , `event` , `status` , `created` , `per_page` |
| `get_workflow_run` | GET | `/repos/{owner}/{repo}/actions/runs/{run_id}` | `run_id` |
| `cancel_workflow_run` | POST | `/repos/{owner}/{repo}/actions/runs/{run_id}/cancel` | `run_id` |
| `rerun_workflow_run` | POST | `/repos/{owner}/{repo}/actions/runs/{run_id}/rerun` | `run_id` |
| `rerun_failed_jobs` | POST | `/repos/{owner}/{repo}/actions/runs/{run_id}/rerun-failed-jobs` | `run_id` |
| `get_workflow_run_logs` | GET | `/repos/{owner}/{repo}/actions/runs/{run_id}/logs` | `run_id` (returns download URL) |
| `list_workflow_jobs` | GET | `/repos/{owner}/{repo}/actions/runs/{run_id}/jobs` | `run_id` , `filter` (latest/all) |
| `get_workflow_job` | GET | `/repos/{owner}/{repo}/actions/jobs/{job_id}` | `job_id` |
| `get_job_logs` | GET | `/repos/{owner}/{repo}/actions/jobs/{job_id}/logs` | `job_id` (returns plain text) |
| `get_failed_runs` | GET | `/repos/{owner}/{repo}/actions/runs?status=failure` | HIGH-LEVEL: groups by workflow |

### Domínio 3: Artifacts (4 tools)

| Tool | Method | Endpoint | Params/Body |
|---|---|---|---|
| `list_artifacts` | GET | `/repos/{owner}/{repo}/actions/artifacts` | `per_page` , `name` |
| `get_artifact` | GET | `/repos/{owner}/{repo}/actions/artifacts/{artifact_id}` | `artifact_id` |
| `list_run_artifacts` | GET | `/repos/{owner}/{repo}/actions/runs/{run_id}/artifacts` | `run_id` |
| `delete_artifact` | DELETE | `/repos/{owner}/{repo}/actions/artifacts/{artifact_id}` | `artifact_id` |

### Domínio 4: Deployments (6 tools)

| Tool | Method | Endpoint | Params/Body |
|---|---|---|---|
| `list_deployments` | GET | `/repos/{owner}/{repo}/deployments` | `sha` , `ref` , `task` , `environment` , `per_page` |
| `get_deployment` | GET | `/repos/{owner}/{repo}/deployments/{deployment_id}` | `deployment_id` |
| `create_deployment` | POST | `/repos/{owner}/{repo}/deployments` | Body: `ref` , `task` , `auto_merge` , `environment` , `description` , `required_contexts` |
| `delete_deployment` | DELETE | `/repos/{owner}/{repo}/deployments/{deployment_id}` | `deployment_id` |
| `list_deployment_statuses` | GET | `/repos/{owner}/{repo}/deployments/{deployment_id}/statuses` | `deployment_id` |
| `create_deployment_status` | POST | `/repos/{owner}/{repo}/deployments/{deployment_id}/statuses` | Body: `state` , `description` , `environment_url` , `log_url` , `auto_inactive` |

### Domínio 5: Environments (5 tools)

| Tool | Method | Endpoint | Params/Body |
|---|---|---|---|
| `list_environments` | GET | `/repos/{owner}/{repo}/environments` | `per_page` |
| `get_environment` | GET | `/repos/{owner}/{repo}/environments/{environment_name}` | `environment_name` |
| `create_environment` | PUT | `/repos/{owner}/{repo}/environments/{environment_name}` | Body: `wait_timer` , `reviewers` , `deployment_branch_policy` |
| `delete_environment` | DELETE | `/repos/{owner}/{repo}/environments/{environment_name}` | `environment_name` |
| `get_environment_protection_rules` | GET | `/repos/{owner}/{repo}/environments/{environment_name}` | Extracts `protection_rules` from get_environment response |

### Domínio 6: Secrets & Variables (11 tools)

| Tool | Method | Endpoint | Params/Body |
|---|---|---|---|
| `list_repo_secrets` | GET | `/repos/{owner}/{repo}/actions/secrets` | `per_page` |
| `get_repo_secret` | GET | `/repos/{owner}/{repo}/actions/secrets/{secret_name}` | `secret_name` (metadata only) |
| `create_or_update_secret` | PUT | `/repos/{owner}/{repo}/actions/secrets/{secret_name}` | Body: `encrypted_value` , `key_id` (requires public key fetch first) |
| `delete_secret` | DELETE | `/repos/{owner}/{repo}/actions/secrets/{secret_name}` | `secret_name` |
| `list_repo_variables` | GET | `/repos/{owner}/{repo}/actions/variables` | `per_page` |
| `get_repo_variable` | GET | `/repos/{owner}/{repo}/actions/variables/{name}` | `name` |
| `create_variable` | POST | `/repos/{owner}/{repo}/actions/variables` | Body: `name` , `value` |
| `update_variable` | PATCH | `/repos/{owner}/{repo}/actions/variables/{name}` | Body: `value` |
| `delete_variable` | DELETE | `/repos/{owner}/{repo}/actions/variables/{name}` | `name` |
| `list_environment_secrets` | GET | `/repos/{owner}/{repo}/environments/{environment_name}/secrets` | `environment_name` |
| `list_environment_variables` | GET | `/repos/{owner}/{repo}/environments/{environment_name}/variables` | `environment_name` |

### Domínio 7: Releases (7 tools)

| Tool | Method | Endpoint | Params/Body |
|---|---|---|---|
| `list_releases` | GET | `/repos/{owner}/{repo}/releases` | `per_page` |
| `get_release` | GET | `/repos/{owner}/{repo}/releases/{release_id}` | `release_id` |
| `get_latest_release` | GET | `/repos/{owner}/{repo}/releases/latest` | — |
| `create_release` | POST | `/repos/{owner}/{repo}/releases` | Body: `tag_name` , `target_commitish` , `name` , `body` , `draft` , `prerelease` , `generate_release_notes` |
| `update_release` | PATCH | `/repos/{owner}/{repo}/releases/{release_id}` | Body: `tag_name` , `name` , `body` , `draft` , `prerelease` |
| `delete_release` | DELETE | `/repos/{owner}/{repo}/releases/{release_id}` | `release_id` |
| `generate_release_notes` | POST | `/repos/{owner}/{repo}/releases/generate-notes` | Body: `tag_name` , `target_commitish` , `previous_tag_name` , `configuration_file_path` |

### Domínio 8: Branches & Protection (7 tools)

| Tool | Method | Endpoint | Params/Body |
|---|---|---|---|
| `list_branches` | GET | `/repos/{owner}/{repo}/branches` | `protected` , `per_page` |
| `get_branch` | GET | `/repos/{owner}/{repo}/branches/{branch}` | `branch` |
| `get_branch_protection` | GET | `/repos/{owner}/{repo}/branches/{branch}/protection` | `branch` |
| `update_branch_protection` | PUT | `/repos/{owner}/{repo}/branches/{branch}/protection` | Body: `required_status_checks` , `enforce_admins` , `required_pull_request_reviews` , `restrictions` |
| `delete_branch_protection` | DELETE | `/repos/{owner}/{repo}/branches/{branch}/protection` | `branch` |
| `get_commit_status` | GET | `/repos/{owner}/{repo}/commits/{ref}/status` | `ref` (combined status) |
| `list_commit_statuses` | GET | `/repos/{owner}/{repo}/commits/{ref}/statuses` | `ref` , `per_page` |

### Domínio 9: Pull Requests (7 tools)

| Tool | Method | Endpoint | Params/Body |
|---|---|---|---|
| `list_pull_requests` | GET | `/repos/{owner}/{repo}/pulls` | `state` , `head` , `base` , `sort` , `direction` , `per_page` |
| `get_pull_request` | GET | `/repos/{owner}/{repo}/pulls/{pull_number}` | `pull_number` |
| `list_pr_commits` | GET | `/repos/{owner}/{repo}/pulls/{pull_number}/commits` | `pull_number` |
| `list_pr_files` | GET | `/repos/{owner}/{repo}/pulls/{pull_number}/files` | `pull_number` |
| `list_pr_reviews` | GET | `/repos/{owner}/{repo}/pulls/{pull_number}/reviews` | `pull_number` |
| `merge_pull_request` | PUT | `/repos/{owner}/{repo}/pulls/{pull_number}/merge` | Body: `commit_title` , `commit_message` , `merge_method` (merge/squash/rebase) |
| `get_pr_ci_status` | — | HIGH-LEVEL: combines checks + statuses | `pull_number` |

### Domínio 10: Check Runs & Suites (4 tools)

| Tool | Method | Endpoint | Params/Body |
|---|---|---|---|
| `list_check_runs_for_ref` | GET | `/repos/{owner}/{repo}/commits/{ref}/check-runs` | `ref` , `check_name` , `status` , `filter` |
| `get_check_run` | GET | `/repos/{owner}/{repo}/check-runs/{check_run_id}` | `check_run_id` |
| `list_check_suites` | GET | `/repos/{owner}/{repo}/commits/{ref}/check-suites` | `ref` , `app_id` , `check_name` |
| `rerequest_check_suite` | POST | `/repos/{owner}/{repo}/check-suites/{check_suite_id}/rerequest` | `check_suite_id` |

### Domínio 11: Security (8 tools)

| Tool | Method | Endpoint | Params/Body |
|---|---|---|---|
| `list_dependabot_alerts` | GET | `/repos/{owner}/{repo}/dependabot/alerts` | `state` , `severity` , `ecosystem` , `package` , `scope` , `sort` , `direction` |
| `get_dependabot_alert` | GET | `/repos/{owner}/{repo}/dependabot/alerts/{alert_number}` | `alert_number` |
| `update_dependabot_alert` | PATCH | `/repos/{owner}/{repo}/dependabot/alerts/{alert_number}` | Body: `state` , `dismissed_reason` , `dismissed_comment` |
| `list_code_scanning_alerts` | GET | `/repos/{owner}/{repo}/code-scanning/alerts` | `state` , `severity` , `tool_name` |
| `get_code_scanning_alert` | GET | `/repos/{owner}/{repo}/code-scanning/alerts/{alert_number}` | `alert_number` |
| `list_secret_scanning_alerts` | GET | `/repos/{owner}/{repo}/secret-scanning/alerts` | `state` , `secret_type` , `resolution` |
| `get_secret_scanning_alert` | GET | `/repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}` | `alert_number` |
| `get_security_overview` | — | HIGH-LEVEL: combines all 3 scanning tools | Summary overview |

### Domínio 12: Packages (4 tools)

| Tool | Method | Endpoint | Params/Body |
|---|---|---|---|
| `list_packages` | GET | `/user/packages?package_type={type}` | `package_type` (npm/maven/docker/etc.) |
| `get_package` | GET | `/user/packages/{package_type}/{package_name}` | `package_type` , `package_name` |
| `list_package_versions` | GET | `/user/packages/{package_type}/{package_name}/versions` | `package_type` , `package_name` |
| `delete_package_version` | DELETE | `/user/packages/{package_type}/{package_name}/versions/{package_version_id}` | `package_type` , `package_name` , `package_version_id` |

### Domínio 13: Repository (6 tools)

| Tool | Method | Endpoint | Params/Body |
|---|---|---|---|
| `get_repository` | GET | `/repos/{owner}/{repo}` | — |
| `list_webhooks` | GET | `/repos/{owner}/{repo}/hooks` | `per_page` |
| `create_webhook` | POST | `/repos/{owner}/{repo}/hooks` | Body: `config` (url, content_type, secret), `events` , `active` |
| `delete_webhook` | DELETE | `/repos/{owner}/{repo}/hooks/{hook_id}` | `hook_id` |
| `list_repository_topics` | GET | `/repos/{owner}/{repo}/topics` | — |
| `get_repository_stats` | — | HIGH-LEVEL: combines repo + languages + contributors + activity | Summary overview |

---

## 4. Autenticação

### Método de Autenticação

O GitHub REST API usa autenticação via **Bearer Token** no header HTTP.

### Tipos de Token Suportados

1. **Personal Access Token (PAT) — Classic**: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
2. **Personal Access Token (PAT) — Fine-grained**: `github_pat_xxxxxxxxxxxxxxxxxxxx`
3. **GITHUB_TOKEN** (em CI/CD — GitHub Actions): funciona igual

### Headers HTTP Obrigatórios

```
Authorization: Bearer <token>
Accept: application/vnd.github+json
X-GitHub-Api-Version: 2022-11-28
```

### URL Base

* **GitHub.com**: `https://api.github.com`
* **GitHub Enterprise**: `https://{hostname}/api/v3`

### Rate Limits

| Tipo | Limite |
|---|---|
| Autenticado | 5.000 req/hora |
| Não-autenticado | 60 req/hora |

**Headers de Rate Limit na resposta:**
* `X-RateLimit-Limit` — Limite total
* `X-RateLimit-Remaining` — Restante
* `X-RateLimit-Reset` — Unix timestamp de quando reseta
* `X-RateLimit-Used` — Já utilizado

**Estratégia de retry**: Ao receber HTTP 403 com `X-RateLimit-Remaining: 0` , aguardar até `X-RateLimit-Reset` antes de tentar novamente. Implementar retry com backoff exponencial (3 tentativas, base 1s).

### Variáveis de Ambiente

| Variável | Descrição | Obrigatória |
|---|---|---|
| `GITHUB_TOKEN` | Token de autenticação (PAT ou GITHUB_TOKEN) | **Sim** |
| `GITHUB_OWNER` | Owner do repositório (org ou user) | Não (fallback: auto-detect de git remote) |
| `GITHUB_REPO` | Nome do repositório | Não (fallback: auto-detect de git remote) |
| `GITHUB_API_URL` | API base URL (default: `https://api.github.com` ) | Não |

### Interface de Credenciais (auth.ts)

```typescript
export interface GitHubCredentials {
  token: string;
  owner: string;
  repo: string;
  apiUrl: string;
}
```

### Armazenamento de Credenciais na Extension

* **Token**: Salvo via `context.secrets.store('ghDevops.token', token)` — SecretStorage do VS Code
* **Owner/Repo**: Em `vscode.workspace.getConfiguration('ghDevops')` ou auto-detect
* **API URL**: Em `vscode.workspace.getConfiguration('ghDevops').apiUrl`

---

## 5. STEPs de Implementação

---

### STEP 1: Scaffolding

**Missão**: Criar a estrutura de diretórios, package.json (root + extension), tsconfig.json, .gitignore, LICENSE e AGENTS.md.

**Arquivos a criar**:
* `package.json` (root)
* `tsconfig.json` (root)
* `extension/package.json`
* `extension/tsconfig.json`
* `.gitignore`
* `LICENSE`
* `AGENTS.md`

**Dependências**: Nenhuma (primeiro step)

**Critério de sucesso**: `npm install` no root e `cd extension && npm install` funcionam sem erros.

#### package.json (root — MCP Server)

```json
{
  "name": "gh-devops-mcp",
  "version": "1.0.0",
  "description": "GitHub DevOps MCP Server — CI/CD, Deployments, Releases, Security and more for AI agents",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "gh-devops-mcp": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js",
    "copy-to-extension": "mkdir -p extension/mcp-server && cp -r dist/* extension/mcp-server/ && cp -r node_modules extension/mcp-server/ && echo '{\"type\":\"module\"}' > extension/mcp-server/package.json"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.1"
  },
  "devDependencies": {
    "@types/node": "^22.15.21",
    "typescript": "^5.8.3"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

#### tsconfig.json (root — MCP Server)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "extension"]
}
```

#### extension/package.json

```json
{
  "name": "gh-devops",
  "displayName": "GitHub DevOps for Copilot",
  "description": "AI-powered GitHub DevOps tools — Actions, Deployments, Releases, Security and more directly from GitHub Copilot Chat",
  "version": "1.0.0",
  "publisher": "GleidsonFerSanP",
  "icon": "icon.png",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": ["AI", "Other", "SCM Providers"],
  "keywords": [
    "github", "devops", "ci-cd", "github-actions", "deployments",
    "releases", "security", "mcp", "copilot", "model context protocol"
  ],
  "activationEvents": ["onStartupFinished"],
  "main": "./dist/extension.js",
  "contributes": {
    "mcpServerDefinitionProviders": [{
      "id": "gh-devops",
      "label": "GitHub DevOps"
    }],
    "chatInstructions": [{
      "name": "GitHubDevOpsGuidelines",
      "description": "Guidelines for using GitHub DevOps MCP tools",
      "path": "resources/instructions/github-devops.instructions.md"
    }],
    "commands": [
      { "command": "ghDevops.configure", "title": "Configure GitHub Token" },
      { "command": "ghDevops.testConnection", "title": "Test GitHub Connection" },
      { "command": "ghDevops.restart", "title": "Restart GitHub DevOps MCP Server" },
      { "command": "ghDevops.selectRepo", "title": "Select Repository" },
      { "command": "ghDevops.viewDocs", "title": "Open GitHub DevOps Documentation" }
    ],
    "configuration": {
      "title": "GitHub DevOps",
      "properties": {
        "ghDevops.apiUrl": {
          "type": "string",
          "default": "https://api.github.com",
          "description": "GitHub API base URL (change for GitHub Enterprise)"
        },
        "ghDevops.defaultOwner": {
          "type": "string",
          "default": "",
          "description": "Default repository owner (org or user)"
        },
        "ghDevops.defaultRepo": {
          "type": "string",
          "default": "",
          "description": "Default repository name"
        },
        "ghDevops.logLevel": {
          "type": "string",
          "enum": ["error", "warn", "info", "debug"],
          "default": "info"
        },
        "ghDevops.autoStart": {
          "type": "boolean",
          "default": true
        },
        "ghDevops.maxResults": {
          "type": "number",
          "default": 30,
          "description": "Maximum results per API call"
        },
        "ghDevops.autoDetectRepo": {
          "type": "boolean",
          "default": true,
          "description": "Auto-detect owner/repo from git remote in workspace"
        }
      }
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile && npm run copy-server",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "copy-server": "cd .. && npm run build && npm run copy-to-extension",
    "package": "vsce package",
    "publish": "vsce publish"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "typescript": "^5.8.3",
    "@vscode/vsce": "^3.5.0"
  }
}
```

#### extension/tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "mcp-server"]
}
```

#### .gitignore

```
node_modules/
dist/
extension/dist/
extension/mcp-server/
extension/node_modules/
*.vsix
.env
.DS_Store
*.log
```

#### LICENSE

MIT License com `Copyright (c) 2025 GleidsonFerSanP` .

#### AGENTS.md

```markdown
# AGENTS.md — gh-devops-mcp

## Arquitetura

- MCP Server: `src/` (ESM, NodeNext)
- VS Code Extension: `extension/` (CommonJS)
- Dois projetos TypeScript separados com module systems diferentes

## Convenções

- Tool names: snake_case (ex: `list_workflows`, `get_workflow_run`)
- Arquivos: kebab-case (ex: `github-client.ts`, `workflow-runs.ts`)
- Arrays de tools exportados: camelCase + `Tools` (ex: `workflowsTools`)
- Handlers exportados: `handle` + PascalCase + `Tool` (ex: `handleWorkflowsTool`)
- Respostas: plain text formatado para AI, nunca JSON bruto
- Imports ESM: sempre com `.js` extension

## Build

1. `npm install` (root)
2. `npm run build` (compila MCP server)
3. `npm run copy-to-extension` (copia para extension/mcp-server/)
4. `cd extension && npm install && npm run compile` (compila extension)
5. `cd extension && npm run package` (gera .vsix)

## Env vars

- `GITHUB_TOKEN` — token obrigatório
- `GITHUB_OWNER` — owner do repo (opcional, auto-detect)
- `GITHUB_REPO` — repo name (opcional, auto-detect)
- `GITHUB_API_URL` — API base URL (default: https://api.github.com)
```

---

### STEP 2: GitHub HTTP Client + Auth + Utils

**Missão**: Criar o HTTP client para a GitHub API, módulo de auth, e utilitários compartilhados (error handling, formatters, time helpers).

**Arquivos a criar**:
* `src/client/auth.ts`
* `src/client/github-client.ts`
* `src/utils/error-handler.ts`
* `src/utils/formatters.ts`
* `src/utils/time-helpers.ts`

**Dependências**: STEP 1

**Critério de sucesso**: O projeto compila com `npm run build` sem erros.

#### src/client/auth.ts

```typescript
export interface GitHubCredentials {
  token: string;
  owner: string;
  repo: string;
  apiUrl: string;
}

/**
 * Reads credentials from environment variables.
 * Returns null fields for missing optional values.
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
```

#### src/client/github-client.ts

```typescript
import { GitHubCredentials } from './auth.js';
import { GitHubAPIError, handleAPIError } from '../utils/error-handler.js';

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

  /**
   * Replaces {owner} and {repo} placeholders in path with actual values.
   * Allows override via explicit owner/repo args.
   */
  private resolvePath(path: string, owner?: string, repo?: string): string {
    return path
      .replace('{owner}', owner || this.credentials.owner)
      .replace('{repo}', repo || this.credentials.repo);
  }

  private async request<T>(method: string, path: string, options?: RequestOptions): Promise<T> {
    const resolvedPath = this.resolvePath(path);
    const url = new URL(resolvedPath, this.baseUrl);

    // Add query params
    if (options?.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined && value !== '') {
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
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url.toString(), {
          method,
          headers,
          body: options?.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        // Handle rate limiting
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

        return await response.json() as T;

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
```

#### src/utils/error-handler.ts

```typescript
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
```

#### src/utils/formatters.ts

```typescript
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
```

#### src/utils/time-helpers.ts

```typescript
/**
 * Parses relative time string to ISO 8601.
 * Supports: "1h", "30m", "7d", "2w", "now", ISO 8601 strings.
 */
export function parseRelativeTime(input: string): string {
  if (!input || input === 'now') return new Date().toISOString();

  // Already ISO 8601
  if (input.includes('T') || input.includes('-')) {
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
```

---

### STEP 3: Tools — Workflows (workflows.ts)

**Missão**: Implementar as 6 tools do domínio GitHub Actions Workflows.

**Arquivo**: `src/tools/workflows.ts`

**Dependências**: STEP 2

**Critério de sucesso**: O arquivo exporta `workflowsTools` (array de 6 definições) e `handleWorkflowsTool` (handler function).

```typescript
import { GitHubClient } from '../client/github-client.js';
import { formatErrorForAI } from '../utils/error-handler.js';
import { truncateResults, formatRelativeTime, sectionHeader } from '../utils/formatters.js';

export const workflowsTools = [
  {
    name: 'list_workflows',
    description: 'List all GitHub Actions workflows in the repository. Shows workflow names, states (active/disabled), filenames, and URLs. Use this to discover available CI/CD pipelines.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner (org or user). Uses default if not provided.' },
        repo: { type: 'string', description: 'Repository name. Uses default if not provided.' },
        per_page: { type: 'number', description: 'Results per page (max 100, default 30)' },
      },
      required: [],
    },
  },
  {
    name: 'get_workflow',
    description: 'Get details of a specific GitHub Actions workflow by ID or filename (e.g., "ci.yml"). Returns workflow name, state, path, creation date, and URL.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        workflow_id: { type: 'string', description: 'Workflow ID (number) or filename (e.g., "ci.yml")' },
      },
      required: ['workflow_id'],
    },
  },
  {
    name: 'dispatch_workflow',
    description: 'Manually trigger a workflow run via workflow_dispatch event. Requires the workflow to have a workflow_dispatch trigger defined. You can pass custom inputs.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        workflow_id: { type: 'string', description: 'Workflow ID or filename' },
        ref: { type: 'string', description: 'Branch or tag to run on (e.g., "main")' },
        inputs: { type: 'object', description: 'Key-value input parameters for the workflow' },
      },
      required: ['workflow_id', 'ref'],
    },
  },
  {
    name: 'enable_workflow',
    description: 'Enable a disabled GitHub Actions workflow. Use when a workflow has been disabled and needs to be re-activated.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        workflow_id: { type: 'string', description: 'Workflow ID or filename' },
      },
      required: ['workflow_id'],
    },
  },
  {
    name: 'disable_workflow',
    description: 'Disable a GitHub Actions workflow. The workflow will no longer run on triggers but can be re-enabled later.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        workflow_id: { type: 'string', description: 'Workflow ID or filename' },
      },
      required: ['workflow_id'],
    },
  },
  {
    name: 'get_workflow_usage',
    description: 'Get the billable usage (timing) of a specific workflow. Shows time consumed per runner OS (Ubuntu, macOS, Windows) in milliseconds.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        workflow_id: { type: 'string', description: 'Workflow ID or filename' },
      },
      required: ['workflow_id'],
    },
  },
];

export async function handleWorkflowsTool(name: string, args: any, client: GitHubClient): Promise<string> {
  const owner = args.owner || client.owner;
  const repo = args.repo || client.repo;

  try {
    switch (name) {
      case 'list_workflows': {
        const perPage = args.per_page || 30;
        const result = await client.get<any>(`/repos/${owner}/${repo}/actions/workflows`, { per_page: perPage });
        const workflows = result.workflows || [];
        if (workflows.length === 0) return 'No workflows found in this repository.';

        let output = sectionHeader(`Workflows (${result.total_count} total)`);
        for (const wf of workflows) {
          output += `• [${wf.state === 'active' ? '✅' : '⚫'}] ${wf.name}\n`;
          output += `  ID: ${wf.id} | File: ${wf.path} | State: ${wf.state}\n`;
          output += `  Created: ${formatRelativeTime(wf.created_at)} | URL: ${wf.html_url}\n\n`;
        }
        return output;
      }

      case 'get_workflow': {
        const wf = await client.get<any>(`/repos/${owner}/${repo}/actions/workflows/${args.workflow_id}`);
        let output = sectionHeader(`Workflow: ${wf.name}`);
        output += `ID: ${wf.id}\n`;
        output += `State: ${wf.state === 'active' ? '✅ Active' : '⚫ Disabled'}\n`;
        output += `File: ${wf.path}\n`;
        output += `Created: ${formatRelativeTime(wf.created_at)}\n`;
        output += `Updated: ${formatRelativeTime(wf.updated_at)}\n`;
        output += `URL: ${wf.html_url}\n`;
        return output;
      }

      case 'dispatch_workflow': {
        await client.post(`/repos/${owner}/${repo}/actions/workflows/${args.workflow_id}/dispatches`, {
          ref: args.ref,
          inputs: args.inputs || {},
        });
        return `✅ Workflow dispatch triggered successfully.\nWorkflow: ${args.workflow_id}\nRef: ${args.ref}\nInputs: ${JSON.stringify(args.inputs || {})}\n\nUse list_workflow_runs to check the status.`;
      }

      case 'enable_workflow': {
        await client.put(`/repos/${owner}/${repo}/actions/workflows/${args.workflow_id}/enable`);
        return `✅ Workflow ${args.workflow_id} has been enabled.`;
      }

      case 'disable_workflow': {
        await client.put(`/repos/${owner}/${repo}/actions/workflows/${args.workflow_id}/disable`);
        return `✅ Workflow ${args.workflow_id} has been disabled.`;
      }

      case 'get_workflow_usage': {
        const usage = await client.get<any>(`/repos/${owner}/${repo}/actions/workflows/${args.workflow_id}/timing`);
        let output = sectionHeader('Workflow Usage (Billable Time)');
        const billable = usage.billable || {};
        for (const [os, data] of Object.entries(billable) as [string, any][]) {
          output += `• ${os}: ${data.total_ms ? Math.round(data.total_ms / 60000) + ' min' : '0 min'}\n`;
        }
        if (Object.keys(billable).length === 0) output += 'No billable usage recorded.\n';
        return output;
      }

      default:
        return `Unknown workflows tool: ${name}`;
    }
  } catch (error) {
    return formatErrorForAI(error, name);
  }
}
```

---

### STEP 4: Tools — Workflow Runs & Jobs (workflow-runs.ts)

**Missão**: Implementar as 10 tools de workflow runs, jobs, e logs.

**Arquivo**: `src/tools/workflow-runs.ts`

**Dependências**: STEP 2

**Critério de sucesso**: Exporta `workflowRunsTools` (10 definições) e `handleWorkflowRunsTool` .

```typescript
import { GitHubClient } from '../client/github-client.js';
import { formatErrorForAI } from '../utils/error-handler.js';
import { truncateResults, formatRunStatus, formatRelativeTime, calculateDuration, sectionHeader } from '../utils/formatters.js';
import { buildCreatedFilter } from '../utils/time-helpers.js';

export const workflowRunsTools = [
  {
    name: 'list_workflow_runs',
    description: 'List workflow runs for the repository. Filter by actor, branch, event type, status, or creation date. Great for monitoring CI/CD pipeline activity.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        actor: { type: 'string', description: 'Filter by user who triggered the run' },
        branch: { type: 'string', description: 'Filter by branch name' },
        event: { type: 'string', description: 'Filter by event type (push, pull_request, workflow_dispatch, schedule, etc.)' },
        status: { type: 'string', description: 'Filter by status (completed, action_required, cancelled, failure, neutral, skipped, stale, success, timed_out, in_progress, queued, requested, waiting, pending)' },
        created: { type: 'string', description: 'Filter by creation date. Supports ISO 8601 or relative (e.g., ">=2024-01-01", "1h", "7d")' },
        workflow_id: { type: 'number', description: 'Filter by workflow ID' },
        per_page: { type: 'number', description: 'Results per page (max 100, default 30)' },
      },
      required: [],
    },
  },
  {
    name: 'get_workflow_run',
    description: 'Get details of a specific workflow run including status, conclusion, timing, trigger event, and actor. Essential for investigating specific CI/CD executions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        run_id: { type: 'number', description: 'The workflow run ID' },
      },
      required: ['run_id'],
    },
  },
  {
    name: 'cancel_workflow_run',
    description: 'Cancel a workflow run that is in progress or queued. Useful for stopping stuck or unnecessary runs.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        run_id: { type: 'number', description: 'The workflow run ID to cancel' },
      },
      required: ['run_id'],
    },
  },
  {
    name: 'rerun_workflow_run',
    description: 'Re-run all jobs in a workflow run. Creates a new run attempt. Useful for retrying after transient failures.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        run_id: { type: 'number', description: 'The workflow run ID to rerun' },
      },
      required: ['run_id'],
    },
  },
  {
    name: 'rerun_failed_jobs',
    description: 'Re-run only the failed jobs in a workflow run (not all jobs). More efficient than rerunning the entire workflow.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        run_id: { type: 'number', description: 'The workflow run ID' },
      },
      required: ['run_id'],
    },
  },
  {
    name: 'get_workflow_run_logs',
    description: 'Get the download URL for workflow run logs (ZIP archive). Returns the URL to download the complete log archive.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        run_id: { type: 'number', description: 'The workflow run ID' },
      },
      required: ['run_id'],
    },
  },
  {
    name: 'list_workflow_jobs',
    description: 'List all jobs for a workflow run. Shows job names, statuses, conclusions, runner info, and step details. Essential for debugging failed runs.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        run_id: { type: 'number', description: 'The workflow run ID' },
        filter: { type: 'string', description: 'Filter: "latest" (default) or "all" (includes previous attempts)' },
      },
      required: ['run_id'],
    },
  },
  {
    name: 'get_workflow_job',
    description: 'Get details of a specific workflow job including all its steps, timing, runner labels, and conclusion.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        job_id: { type: 'number', description: 'The job ID' },
      },
      required: ['job_id'],
    },
  },
  {
    name: 'get_job_logs',
    description: 'Get the raw text log output of a specific workflow job. Returns the full log content as plain text. This is the BEST tool for seeing exact error messages from CI failures.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        job_id: { type: 'number', description: 'The job ID' },
      },
      required: ['job_id'],
    },
  },
  {
    name: 'get_failed_runs',
    description: 'Get all recently failed workflow runs, grouped by workflow. This is the BEST starting point for investigating CI/CD pipeline failures. Shows failure patterns, frequency, and affected branches.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        since: { type: 'string', description: 'How far back to look. Default: "24h". Supports: "1h", "7d", "30d", ISO 8601.' },
        per_page: { type: 'number', description: 'Max results (default 30)' },
      },
      required: [],
    },
  },
];

export async function handleWorkflowRunsTool(name: string, args: any, client: GitHubClient): Promise<string> {
  const owner = args.owner || client.owner;
  const repo = args.repo || client.repo;

  try {
    switch (name) {
      case 'list_workflow_runs': {
        const params: Record<string, any> = { per_page: args.per_page || 30 };
        if (args.actor) params.actor = args.actor;
        if (args.branch) params.branch = args.branch;
        if (args.event) params.event = args.event;
        if (args.status) params.status = args.status;
        if (args.created) params.created = args.created;
        if (args.workflow_id) params.workflow_id = args.workflow_id;

        const result = await client.get<any>(`/repos/${owner}/${repo}/actions/runs`, params);
        const runs = result.workflow_runs || [];
        if (runs.length === 0) return 'No workflow runs found matching the criteria.';

        let output = sectionHeader(`Workflow Runs (${result.total_count} total)`);
        for (const run of runs) {
          output += `${formatRunStatus(run.status, run.conclusion)} | Run #${run.run_number} — ${run.name}\n`;
          output += `  ID: ${run.id} | Branch: ${run.head_branch} | Event: ${run.event}\n`;
          output += `  Actor: ${run.actor?.login || 'N/A'} | Started: ${formatRelativeTime(run.created_at)}\n`;
          output += `  Duration: ${calculateDuration(run.run_started_at, run.updated_at)} | URL: ${run.html_url}\n\n`;
        }
        return output;
      }

      case 'get_workflow_run': {
        const run = await client.get<any>(`/repos/${owner}/${repo}/actions/runs/${args.run_id}`);
        let output = sectionHeader(`Workflow Run #${run.run_number}: ${run.name}`);
        output += `Status: ${formatRunStatus(run.status, run.conclusion)}\n`;
        output += `ID: ${run.id} | Attempt: ${run.run_attempt}\n`;
        output += `Branch: ${run.head_branch} | SHA: ${run.head_sha?.substring(0, 7)}\n`;
        output += `Event: ${run.event} | Actor: ${run.actor?.login || 'N/A'}\n`;
        output += `Created: ${formatRelativeTime(run.created_at)}\n`;
        output += `Duration: ${calculateDuration(run.run_started_at, run.updated_at)}\n`;
        output += `URL: ${run.html_url}\n`;
        if (run.conclusion === 'failure') {
          output += '\n💡 Tip: Use list_workflow_jobs to find which job failed, then get_job_logs for the error details.\n';
        }
        return output;
      }

      case 'cancel_workflow_run': {
        await client.post(`/repos/${owner}/${repo}/actions/runs/${args.run_id}/cancel`);
        return `✅ Workflow run ${args.run_id} has been cancelled.`;
      }

      case 'rerun_workflow_run': {
        await client.post(`/repos/${owner}/${repo}/actions/runs/${args.run_id}/rerun`);
        return `✅ Workflow run ${args.run_id} has been triggered to rerun (all jobs).`;
      }

      case 'rerun_failed_jobs': {
        await client.post(`/repos/${owner}/${repo}/actions/runs/${args.run_id}/rerun-failed-jobs`);
        return `✅ Failed jobs in workflow run ${args.run_id} have been triggered to rerun.`;
      }

      case 'get_workflow_run_logs': {
        const result = await client.get<any>(`/repos/${owner}/${repo}/actions/runs/${args.run_id}/logs`);
        return `📦 Log download URL: ${result.download_url || 'URL returned in redirect header'}\n\nNote: Logs are in ZIP format.`;
      }

      case 'list_workflow_jobs': {
        const params: Record<string, any> = { filter: args.filter || 'latest' };
        const result = await client.get<any>(`/repos/${owner}/${repo}/actions/runs/${args.run_id}/jobs`, params);
        const jobs = result.jobs || [];
        if (jobs.length === 0) return 'No jobs found for this workflow run.';

        let output = sectionHeader(`Jobs for Run ${args.run_id} (${jobs.length} jobs)`);
        for (const job of jobs) {
          output += `${formatRunStatus(job.status, job.conclusion)} ${job.name}\n`;
          output += `  ID: ${job.id} | Runner: ${job.runner_name || 'N/A'} | Labels: ${(job.labels || []).join(', ')}\n`;
          output += `  Duration: ${calculateDuration(job.started_at, job.completed_at)}\n`;
          if (job.steps) {
            for (const step of job.steps) {
              const stepStatus = formatRunStatus(step.status, step.conclusion);
              output += `    ${stepStatus} Step ${step.number}: ${step.name}\n`;
            }
          }
          output += '\n';
        }
        return output;
      }

      case 'get_workflow_job': {
        const job = await client.get<any>(`/repos/${owner}/${repo}/actions/jobs/${args.job_id}`);
        let output = sectionHeader(`Job: ${job.name}`);
        output += `Status: ${formatRunStatus(job.status, job.conclusion)}\n`;
        output += `ID: ${job.id} | Run ID: ${job.run_id}\n`;
        output += `Runner: ${job.runner_name || 'N/A'} | Labels: ${(job.labels || []).join(', ')}\n`;
        output += `Duration: ${calculateDuration(job.started_at, job.completed_at)}\n`;
        if (job.steps) {
          output += sectionHeader('Steps');
          for (const step of job.steps) {
            output += `${formatRunStatus(step.status, step.conclusion)} Step ${step.number}: ${step.name}\n`;
            output += `  Duration: ${calculateDuration(step.started_at, step.completed_at)}\n`;
          }
        }
        return output;
      }

      case 'get_job_logs': {
        try {
          const logs = await client.getRaw(`/repos/${owner}/${repo}/actions/jobs/${args.job_id}/logs`);
          const maxLength = 15000;
          if (logs.length > maxLength) {
            return `📋 Job Logs (truncated — showing last ${maxLength} chars):\n\n...${logs.slice(-maxLength)}`;
          }
          return `📋 Job Logs:\n\n${logs}`;
        } catch {
          return `Could not retrieve logs for job ${args.job_id}. The logs may have expired (logs are retained for 90 days).`;
        }
      }

      case 'get_failed_runs': {
        const created = buildCreatedFilter(args.since || '24h');
        const params: Record<string, any> = {
          status: 'failure',
          per_page: args.per_page || 30,
        };
        if (created) params.created = created;

        const result = await client.get<any>(`/repos/${owner}/${repo}/actions/runs`, params);
        const runs = result.workflow_runs || [];
        if (runs.length === 0) return '✅ No failed workflow runs found in the specified time period. All pipelines are green!';

        // Group by workflow name
        const byWorkflow = new Map<string, any[]>();
        for (const run of runs) {
          const key = run.name || 'Unknown';
          if (!byWorkflow.has(key)) byWorkflow.set(key, []);
          byWorkflow.get(key)!.push(run);
        }

        let output = sectionHeader(`Failed Runs (${runs.length} failures)`);
        for (const [workflowName, failedRuns] of byWorkflow) {
          output += `\n🔴 ${workflowName} — ${failedRuns.length} failure(s)\n`;
          for (const run of failedRuns.slice(0, 5)) {
            output += `  • Run #${run.run_number} | Branch: ${run.head_branch} | ${formatRelativeTime(run.created_at)}\n`;
            output += `    Actor: ${run.actor?.login} | ID: ${run.id}\n`;
          }
        }
        output += '\n💡 Use get_workflow_run + list_workflow_jobs + get_job_logs to investigate specific failures.\n';
        return output;
      }

      default:
        return `Unknown workflow runs tool: ${name}`;
    }
  } catch (error) {
    return formatErrorForAI(error, name);
  }
}
```

---

### STEP 5: Tools — Artifacts + Deployments (artifacts.ts, deployments.ts)

**Missão**: Implementar 4 tools de artifacts e 6 tools de deployments.

**Arquivos**: `src/tools/artifacts.ts` , `src/tools/deployments.ts`

**Dependências**: STEP 2

**Critério de sucesso**: Ambos exportam arrays de tools e handlers.

#### src/tools/artifacts.ts

Exporta `artifactsTools` (4 definições) e `handleArtifactsTool` .

Tools:
* `list_artifacts`: GET `/repos/{owner}/{repo}/actions/artifacts` — Lista artefatos de build
* `get_artifact`: GET `/repos/{owner}/{repo}/actions/artifacts/{artifact_id}` — Detalhes de um artefato
* `list_run_artifacts`: GET `/repos/{owner}/{repo}/actions/runs/{run_id}/artifacts` — Artefatos de uma run
* `delete_artifact`: DELETE `/repos/{owner}/{repo}/actions/artifacts/{artifact_id}` — Remove artefato

Input schemas seguem o mesmo padrão de STEP 3, com `owner` , `repo` opcionais e IDs required.

Formato de resposta: lista com nome, tamanho (formatSize), data de criação, expiração, URL.

#### src/tools/deployments.ts

Exporta `deploymentsTools` (6 definições) e `handleDeploymentsTool` .

Tools e seus input schemas:

```typescript
export const deploymentsTools = [
  {
    name: 'list_deployments',
    description: 'List deployments for the repository. Filter by SHA, ref, environment, or task. Shows deployment targets, status, and history.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        sha: { type: 'string', description: 'Filter by commit SHA' },
        ref: { type: 'string', description: 'Filter by ref (branch, tag, or SHA)' },
        task: { type: 'string', description: 'Filter by task (e.g., "deploy")' },
        environment: { type: 'string', description: 'Filter by environment name (e.g., "production")' },
        per_page: { type: 'number', description: 'Results per page (default 30)' },
      },
      required: [],
    },
  },
  {
    name: 'get_deployment',
    description: 'Get details of a specific deployment including ref, environment, creator, and timestamps.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        deployment_id: { type: 'number', description: 'The deployment ID' },
      },
      required: ['deployment_id'],
    },
  },
  {
    name: 'create_deployment',
    description: 'Create a new deployment for a given ref (branch, tag, or SHA). This triggers any configured deployment hooks/Actions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        ref: { type: 'string', description: 'The ref to deploy (branch, tag, or SHA)' },
        task: { type: 'string', description: 'Task name (default: "deploy")' },
        auto_merge: { type: 'boolean', description: 'Auto-merge the default branch into the ref if behind (default: true)' },
        environment: { type: 'string', description: 'Target environment (default: "production")' },
        description: { type: 'string', description: 'Description of the deployment' },
        required_contexts: { type: 'array', items: { type: 'string' }, description: 'Required status check contexts that must pass' },
      },
      required: ['ref'],
    },
  },
  {
    name: 'delete_deployment',
    description: 'Delete a deployment. Only inactive deployments can be deleted. Set the deployment status to inactive first.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        deployment_id: { type: 'number', description: 'The deployment ID to delete' },
      },
      required: ['deployment_id'],
    },
  },
  {
    name: 'list_deployment_statuses',
    description: 'List status history for a deployment. Shows progression from pending → in_progress → success/failure with timestamps and URLs.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        deployment_id: { type: 'number', description: 'The deployment ID' },
      },
      required: ['deployment_id'],
    },
  },
  {
    name: 'create_deployment_status',
    description: 'Create a new deployment status (e.g., mark as "success", "failure", "in_progress"). Updates the deployment state.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        deployment_id: { type: 'number', description: 'The deployment ID' },
        state: { type: 'string', description: 'State: error, failure, inactive, in_progress, queued, pending, success' },
        description: { type: 'string', description: 'Status description' },
        environment_url: { type: 'string', description: 'URL of the deployed environment' },
        log_url: { type: 'string', description: 'URL for deployment logs' },
        auto_inactive: { type: 'boolean', description: 'Mark previous non-transient deployments as inactive (default: true)' },
      },
      required: ['deployment_id', 'state'],
    },
  },
];
```

Handler segue o mesmo padrão switch/case dos steps anteriores, usando `formatDeploymentState` para status e `formatRelativeTime` para timestamps.

---

### STEP 6: Tools — Environments + Secrets & Variables (environments.ts, secrets.ts)

**Missão**: Implementar 5 tools de environments e 11 tools de secrets/variables.

**Arquivos**: `src/tools/environments.ts` , `src/tools/secrets.ts`

**Dependências**: STEP 2

#### src/tools/environments.ts

Exporta `environmentsTools` (5 definições) e `handleEnvironmentsTool` .

Tools incluem `list_environments` , `get_environment` , `create_environment` , `delete_environment` , `get_environment_protection_rules` .

Para `create_environment` , o body aceita `wait_timer` (0-43200 minutes), `reviewers` (array de `{type, id}` ), e `deployment_branch_policy` ({protected_branches, custom_branch_policies}).

Para `get_environment_protection_rules` , extrair o array `protection_rules` da resposta de get_environment e formatar com detalhes de cada regra (wait timer, required reviewers, branch policy).

#### src/tools/secrets.ts

Exporta `secretsTools` (11 definições) e `handleSecretsTool` .

**IMPORTANTE**: A tool `create_or_update_secret` requer:
1. Primeiro buscar a public key: `GET /repos/{owner}/{repo}/actions/secrets/public-key`
2. Encriptar o valor com `tweetnacl` (libsodium) usando a public key
3. Enviar `encrypted_value` + `key_id` via PUT

Para simplificar, a tool aceita `value` como input e faz a encriptação internamente. Adicionar `tweetnacl` nas dependências:

```json
"dependencies": {
  "@modelcontextprotocol/sdk": "^1.12.1",
  "tweetnacl": "^1.0.3"
}
```

Se a encriptação for complexa, uma alternativa é documentar que a tool precisa da dependência e implementar a encriptação inline com `tweetnacl.box` ou usar `crypto` nativo se possível.

Tools de variables ( `list_repo_variables` , `get_repo_variable` , `create_variable` , `update_variable` , `delete_variable` ) são CRUD simples e retornam metadata (nome, valor, timestamps).

Tools de environment secrets/variables ( `list_environment_secrets` , `list_environment_variables` ) usam endpoints com `{environment_name}` no path.

---

### STEP 7: Tools — Releases + Branches (releases.ts, branches.ts)

**Missão**: Implementar 7 tools de releases e 7 tools de branches/protection.

**Arquivos**: `src/tools/releases.ts` , `src/tools/branches.ts`

**Dependências**: STEP 2

#### src/tools/releases.ts

Exporta `releasesTools` (7 definições) e `handleReleasesTool` .

Tools:
* `list_releases` — com formatação de tag, nome, draft/prerelease badges, data, autor, assets count
* `get_release` — detalhes completos incluindo body (changelog), assets com download URLs
* `get_latest_release` — atalho para a release mais recente
* `create_release` — POST com `tag_name`,  `target_commitish`,  `name`,  `body`,  `draft`,  `prerelease`,  `generate_release_notes`
* `update_release` — PATCH para editar release existente
* `delete_release` — DELETE
* `generate_release_notes` — POST para `/releases/generate-notes`, retorna `name` e `body` gerados automaticamente

#### src/tools/branches.ts

Exporta `branchesTools` (7 definições) e `handleBranchesTool` .

Tools:
* `list_branches` — lista com proteção status, commit SHA
* `get_branch` — detalhes incluindo commit, proteção
* `get_branch_protection` — regras de proteção detalhadas (required reviews, status checks, restrictions)
* `update_branch_protection` — PUT com body complexo:
  

```typescript
  inputSchema: {
    type: 'object' as const,
    properties: {
      branch: { type: 'string', description: 'Branch name' },
      required_status_checks: {
        type: 'object',
        properties: {
          strict: { type: 'boolean' },
          contexts: { type: 'array', items: { type: 'string' } }
        }
      },
      enforce_admins: { type: 'boolean' },
      required_pull_request_reviews: {
        type: 'object',
        properties: {
          required_approving_review_count: { type: 'number' },
          dismiss_stale_reviews: { type: 'boolean' }
        }
      },
      restrictions: { type: 'object', description: 'null to disable' },
    },
    required: ['branch'],
  }
  ```

* `delete_branch_protection` — remove proteção
* `get_commit_status` — combined status de um ref (state: success/failure/pending)
* `list_commit_statuses` — lista individual statuses com context, state, description, target_url

---

### STEP 8: Tools — Pull Requests + Checks (pull-requests.ts, checks.ts)

**Missão**: Implementar 7 tools de PRs e 4 tools de check runs/suites.

**Arquivos**: `src/tools/pull-requests.ts` , `src/tools/checks.ts`

**Dependências**: STEP 2

#### src/tools/pull-requests.ts

Exporta `pullRequestsTools` (7 definições) e `handlePullRequestsTool` .

A tool `get_pr_ci_status` é uma HIGH-LEVEL tool que:
1. Busca o PR para obter o head SHA: `GET /repos/{owner}/{repo}/pulls/{pull_number}`
2. Busca check runs: `GET /repos/{owner}/{repo}/commits/{sha}/check-runs`
3. Busca combined status: `GET /repos/{owner}/{repo}/commits/{sha}/status`
4. Combina e formata tudo em um resumo unificado

Exemplo de output formatado para `get_pr_ci_status` :

```
━━━ CI Status for PR #42: "Add feature X" ━━━

Overall: ❌ Some checks failed

Check Runs:
  ✅ build (5m 23s)
  ✅ lint (1m 12s)
  ❌ test-integration (12m 45s)
  🔄 deploy-preview (in progress)

Commit Statuses:
  ✅ ci/circleci: build
  🟡 codecov/project: pending

Summary: 2/4 checks passed, 1 failed, 1 in progress
```

#### src/tools/checks.ts

Exporta `checksTools` (4 definições) e `handleChecksTool` .

* `list_check_runs_for_ref` — formatação com nome, status, conclusão, duração, app name
* `get_check_run` — detalhes incluindo output (title, summary, annotations)
* `list_check_suites` — lista de suites com app, status, conclusão
* `rerequest_check_suite` — POST, retorna confirmação

---

### STEP 9: Tools — Security + Packages + Repository (security.ts, packages.ts, repository.ts)

**Missão**: Implementar 8 tools de security, 4 de packages, 6 de repository.

**Arquivos**: `src/tools/security.ts` , `src/tools/packages.ts` , `src/tools/repository.ts`

**Dependências**: STEP 2

#### src/tools/security.ts

Exporta `securityTools` (8 definições) e `handleSecurityTool` .

A tool `get_security_overview` é HIGH-LEVEL:
1. Fetch dependabot alerts: `GET /repos/{owner}/{repo}/dependabot/alerts?state=open&per_page=100`
2. Fetch code scanning alerts: `GET /repos/{owner}/{repo}/code-scanning/alerts?state=open&per_page=100`
3. Fetch secret scanning alerts: `GET /repos/{owner}/{repo}/secret-scanning/alerts?state=open&per_page=100`
4. Agregar counts por severidade
5. Formatar resumo

Exemplo de output:

```
━━━ Security Overview ━━━

📊 Summary:
  Dependabot: 12 open alerts (2 critical, 5 high, 3 medium, 2 low)
  Code Scanning: 3 open alerts (0 critical, 1 high, 2 medium)
  Secret Scanning: 1 open alert

🔴 Critical Vulnerabilities:
  • CVE-2024-1234 in lodash@4.17.20 (npm) — Prototype Pollution
  • CVE-2024-5678 in express@4.18.1 (npm) — Path Traversal

⚠️ Secret Leaks:
  • GitHub Personal Access Token detected in src/config.js

💡 Recommendations:
  1. Address critical Dependabot alerts immediately
  2. Review and rotate exposed secrets
  3. Fix high-severity code scanning issues
```

Implementar try/catch individual para cada tipo de scan (alguns repos podem não ter code scanning habilitado — retornar "not enabled" ao invés de erro).

#### src/tools/packages.ts

Exporta `packagesTools` (4 definições) e `handlePackagesTool` .

Nota: Os endpoints de packages usam `/user/packages` (para o user autenticado) ou `/orgs/{org}/packages` . O input schema deve aceitar um `package_type` (npm, maven, docker, nuget, container, rubygems).

#### src/tools/repository.ts

Exporta `repositoryTools` (6 definições) e `handleRepositoryTool` .

A tool `get_repository_stats` é HIGH-LEVEL:
1. Fetch repo info: `GET /repos/{owner}/{repo}`
2. Fetch languages: `GET /repos/{owner}/{repo}/languages`
3. Fetch contributors: `GET /repos/{owner}/{repo}/contributors?per_page=10`
4. Fetch commit activity: `GET /repos/{owner}/{repo}/stats/commit_activity` (last 52 weeks)
5. Formatar resumo

Exemplo de output:

```
━━━ Repository Stats: owner/repo ━━━

📋 Info:
  Description: A cool project
  Default Branch: main | Stars: 1,234 | Forks: 567
  Open Issues: 23 | License: MIT
  Created: 2023-01-15 | Last Push: 2h ago

💻 Languages:
  TypeScript: 65.3% | JavaScript: 20.1% | HTML: 10.2% | CSS: 4.4%

👥 Top Contributors:
  1. user1 — 234 contributions
  2. user2 — 156 contributions
  3. user3 — 89 contributions

📈 Recent Activity (last 4 weeks):
  Week 1: 23 commits | Week 2: 45 commits | Week 3: 12 commits | Week 4: 34 commits
```

---

### STEP 10: MCP Server Entry Point (index.ts)

**Missão**: Criar o arquivo principal que unifica todas as tools e handlers.

**Arquivo**: `src/index.ts`

**Dependências**: STEPs 2, 3, 4, 5, 6, 7, 8, 9

**Critério de sucesso**: `npm run build` compila sem erros; `node dist/index.js` inicia o server.

```typescript
#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { GitHubClient } from './client/github-client.js';
import { getCredentialsFromEnv } from './client/auth.js';

// Import all tool domains
import { workflowsTools, handleWorkflowsTool } from './tools/workflows.js';
import { workflowRunsTools, handleWorkflowRunsTool } from './tools/workflow-runs.js';
import { artifactsTools, handleArtifactsTool } from './tools/artifacts.js';
import { deploymentsTools, handleDeploymentsTool } from './tools/deployments.js';
import { environmentsTools, handleEnvironmentsTool } from './tools/environments.js';
import { secretsTools, handleSecretsTool } from './tools/secrets.js';
import { releasesTools, handleReleasesTool } from './tools/releases.js';
import { branchesTools, handleBranchesTool } from './tools/branches.js';
import { pullRequestsTools, handlePullRequestsTool } from './tools/pull-requests.js';
import { checksTools, handleChecksTool } from './tools/checks.js';
import { securityTools, handleSecurityTool } from './tools/security.js';
import { packagesTools, handlePackagesTool } from './tools/packages.js';
import { repositoryTools, handleRepositoryTool } from './tools/repository.js';

type ToolHandler = (name: string, args: any, client: GitHubClient) => Promise<string>;

class GitHubDevOpsServer {
  private server: Server;
  private client: GitHubClient | null = null;
  private toolHandlers: Map<string, ToolHandler>;

  constructor() {
    // Read credentials from environment
    const credentials = getCredentialsFromEnv();
    if (credentials) {
      this.client = new GitHubClient(credentials);
      console.error(`[gh-devops-mcp] Connected to GitHub API at ${credentials.apiUrl}`);
      if (credentials.owner && credentials.repo) {
        console.error(`[gh-devops-mcp] Default repo: ${credentials.owner}/${credentials.repo}`);
      }
    } else {
      console.error('[gh-devops-mcp] No GITHUB_TOKEN found. Tools will return setup instructions.');
    }

    this.server = new Server(
      { name: 'gh-devops-mcp', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    this.toolHandlers = this.buildToolHandlerMap();
    this.setupHandlers();
    this.setupErrorHandling();
  }

  private buildToolHandlerMap(): Map<string, ToolHandler> {
    const map = new Map<string, ToolHandler>();

    const register = (tools: Array<{ name: string }>, handler: ToolHandler) => {
      for (const tool of tools) {
        map.set(tool.name, handler);
      }
    };

    register(workflowsTools, handleWorkflowsTool);
    register(workflowRunsTools, handleWorkflowRunsTool);
    register(artifactsTools, handleArtifactsTool);
    register(deploymentsTools, handleDeploymentsTool);
    register(environmentsTools, handleEnvironmentsTool);
    register(secretsTools, handleSecretsTool);
    register(releasesTools, handleReleasesTool);
    register(branchesTools, handleBranchesTool);
    register(pullRequestsTools, handlePullRequestsTool);
    register(checksTools, handleChecksTool);
    register(securityTools, handleSecurityTool);
    register(packagesTools, handlePackagesTool);
    register(repositoryTools, handleRepositoryTool);

    return map;
  }

  private setupHandlers(): void {
    // List all available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          ...workflowsTools,
          ...workflowRunsTools,
          ...artifactsTools,
          ...deploymentsTools,
          ...environmentsTools,
          ...secretsTools,
          ...releasesTools,
          ...branchesTools,
          ...pullRequestsTools,
          ...checksTools,
          ...securityTools,
          ...packagesTools,
          ...repositoryTools,
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Check credentials
      if (!this.client) {
        return {
          content: [{
            type: 'text',
            text: `⚠️ GitHub token not configured. To use ${name}:\n\n` +
              '1. Set the GITHUB_TOKEN environment variable, OR\n' +
              '2. Configure your token in VS Code: Command Palette → "Configure GitHub Token"\n\n' +
              'Your token needs appropriate scopes:\n' +
              '• repo (full control of repositories)\n' +
              '• workflow (update GitHub Actions workflows)\n' +
              '• read:packages (read packages)\n' +
              '• admin:repo_hook (webhooks)\n' +
              '• security_events (security alerts)',
          }],
        };
      }

      const handler = this.toolHandlers.get(name);
      if (!handler) {
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
      }

      try {
        const result = await handler(name, args || {}, this.client);
        return {
          content: [{ type: 'text', text: result }],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error executing ${name}: ${errorMessage}` }],
          isError: true,
        };
      }
    });
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[gh-devops-mcp] Server running on stdio');
  }
}

const server = new GitHubDevOpsServer();
server.run().catch(console.error);
```

---

### STEP 11: VS Code Extension (extension.ts, settings-webview.ts, types.ts)

**Missão**: Criar a extensão VS Code que registra o MCP Server, gerencia credenciais, detecta repo do git remote, e oferece webview de configuração.

**Arquivos**:
* `extension/src/extension.ts`
* `extension/src/settings-webview.ts`
* `extension/src/types.ts`
* `extension/webview/settings.html`

**Dependências**: STEP 1

**Critério de sucesso**: `cd extension && npm run compile` sem erros.

#### extension/src/types.ts

```typescript
export interface GitHubDevOpsConfig {
  token: string;
  owner: string;
  repo: string;
  apiUrl: string;
  autoDetectRepo: boolean;
  maxResults: number;
  logLevel: string;
  autoStart: boolean;
}

export interface WebviewMessage {
  type: 'saveToken' | 'testConnection' | 'saveSettings' | 'getSettings';
  token?: string;
  owner?: string;
  repo?: string;
  apiUrl?: string;
}

export interface WebviewResponse {
  type: 'settingsLoaded' | 'tokenSaved' | 'connectionResult' | 'error';
  success?: boolean;
  message?: string;
  settings?: Partial<GitHubDevOpsConfig>;
}
```

#### extension/src/extension.ts

```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

let outputChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;

function log(message: string, level: string = 'info') {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  outputChannel?.appendLine(formatted);
  if (level === 'error') console.error(formatted);
}

function updateStatusBar(configured: boolean) {
  if (statusBarItem) {
    statusBarItem.text = configured ? '$(github) GH DevOps' : '$(github) GH DevOps ⚠️';
    statusBarItem.tooltip = configured
      ? 'GitHub DevOps MCP — Connected'
      : 'GitHub DevOps MCP — Token not configured';
    statusBarItem.show();
  }
}

/**
 * Auto-detect owner/repo from git remote in workspace.
 */
function detectRepoFromGit(): { owner: string; repo: string } | null {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) return null;

    const cwd = workspaceFolders[0].uri.fsPath;
    const remoteUrl = execSync('git remote get-url origin', { cwd, encoding: 'utf8' }).trim();

    // Parse HTTPS or SSH URLs
    // https://github.com/owner/repo.git
    // git@github.com:owner/repo.git
    const httpsMatch = remoteUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
    const sshMatch = remoteUrl.match(/github\.com:([^\/]+)\/([^\/\.]+)/);
    const match = httpsMatch || sshMatch;

    if (match) {
      return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
    }
  } catch {
    // Git not available or not a git repo
  }
  return null;
}

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('GitHub DevOps', { log: true });
  context.subscriptions.push(outputChannel);

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'ghDevops.configure';
  context.subscriptions.push(statusBarItem);

  (async () => {
    // Read stored token
    const token = await context.secrets.get('ghDevops.token');
    const config = vscode.workspace.getConfiguration('ghDevops');
    const apiUrl = config.get<string>('apiUrl') || 'https://api.github.com';
    const autoDetect = config.get<boolean>('autoDetectRepo', true);
    const logLevel = config.get<string>('logLevel') || 'info';
    const maxResults = config.get<number>('maxResults') || 30;

    // Determine owner/repo
    let owner = config.get<string>('defaultOwner') || '';
    let repo = config.get<string>('defaultRepo') || '';

    if (autoDetect && (!owner || !repo)) {
      const detected = detectRepoFromGit();
      if (detected) {
        owner = owner || detected.owner;
        repo = repo || detected.repo;
        log(`Auto-detected repository: ${detected.owner}/${detected.repo}`);
      }
    }

    // Build env vars for MCP server
    const env: Record<string, string> = {};
    if (token) env.GITHUB_TOKEN = token;
    if (process.env.GITHUB_TOKEN && !token) env.GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    if (owner) env.GITHUB_OWNER = owner;
    if (repo) env.GITHUB_REPO = repo;
    if (apiUrl !== 'https://api.github.com') env.GITHUB_API_URL = apiUrl;

    updateStatusBar(!!env.GITHUB_TOKEN);

    // Register MCP Server
    const mcpServerPath = path.join(context.extensionPath, 'mcp-server', 'index.js');

    if (fs.existsSync(mcpServerPath)) {
      if (typeof vscode.lm?.registerMcpServerDefinitionProvider === 'function') {
        context.subscriptions.push(
          vscode.lm.registerMcpServerDefinitionProvider('gh-devops', {
            provideMcpServerDefinitions() {
              return [
                new vscode.McpStdioServerDefinition(
                  'gh-devops',
                  'node',
                  [mcpServerPath],
                  env
                )
              ];
            }
          })
        );
        log('MCP Server registered successfully');
      } else {
        log('VS Code MCP API not available. Make sure you have VS Code 1.85+', 'warn');
      }
    } else {
      log(`MCP server not found at: ${mcpServerPath}`, 'error');
    }

    // Welcome message (first activation)
    const version = context.extension?.packageJSON?.version || '1.0.0';
    const lastVersion = context.globalState.get<string>('ghDevops.lastVersion');
    if (lastVersion !== version) {
      vscode.window.showInformationMessage(
        `GitHub DevOps for Copilot v${version} is active! ${env.GITHUB_TOKEN ? '✅ Token configured.' : '⚠️ Configure your GitHub token to get started.'}`
      );
      context.globalState.update('ghDevops.lastVersion', version);
    }
  })();

  // Command: Configure Token
  const configureCmd = vscode.commands.registerCommand('ghDevops.configure', async () => {
    const token = await vscode.window.showInputBox({
      title: 'GitHub Token',
      prompt: 'Enter your GitHub Personal Access Token',
      password: true,
      placeHolder: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    });

    if (token) {
      await context.secrets.store('ghDevops.token', token);
      updateStatusBar(true);
      log('GitHub token saved successfully');
      vscode.window.showInformationMessage('GitHub token saved. Restart the MCP server to apply.');
    }
  });

  // Command: Test Connection
  const testConnectionCmd = vscode.commands.registerCommand('ghDevops.testConnection', async () => {
    const token = await context.secrets.get('ghDevops.token') || process.env.GITHUB_TOKEN;
    if (!token) {
      vscode.window.showErrorMessage('No GitHub token configured. Run "Configure GitHub Token" first.');
      return;
    }

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
        },
      });

      if (response.ok) {
        const user = await response.json() as any;
        vscode.window.showInformationMessage(`✅ Connected to GitHub as ${user.login}`);
        log(`Connection test successful: ${user.login}`);
      } else {
        vscode.window.showErrorMessage(`❌ Connection failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`❌ Connection error: ${(error as Error).message}`);
    }
  });

  // Command: Restart
  const restartCmd = vscode.commands.registerCommand('ghDevops.restart', () => {
    vscode.commands.executeCommand('workbench.action.reloadWindow');
  });

  // Command: Select Repo
  const selectRepoCmd = vscode.commands.registerCommand('ghDevops.selectRepo', async () => {
    const owner = await vscode.window.showInputBox({
      title: 'Repository Owner',
      prompt: 'Enter the GitHub owner (org or username)',
      value: vscode.workspace.getConfiguration('ghDevops').get<string>('defaultOwner') || '',
    });
    if (!owner) return;

    const repo = await vscode.window.showInputBox({
      title: 'Repository Name',
      prompt: 'Enter the repository name',
      value: vscode.workspace.getConfiguration('ghDevops').get<string>('defaultRepo') || '',
    });
    if (!repo) return;

    const config = vscode.workspace.getConfiguration('ghDevops');
    await config.update('defaultOwner', owner, vscode.ConfigurationTarget.Workspace);
    await config.update('defaultRepo', repo, vscode.ConfigurationTarget.Workspace);
    vscode.window.showInformationMessage(`Repository set to ${owner}/${repo}. Restart the MCP server to apply.`);
  });

  // Command: View Docs
  const viewDocsCmd = vscode.commands.registerCommand('ghDevops.viewDocs', () => {
    vscode.env.openExternal(vscode.Uri.parse('https://github.com/GleidsonFerSanP/gh-devops-mcp'));
  });

  context.subscriptions.push(configureCmd, testConnectionCmd, restartCmd, selectRepoCmd, viewDocsCmd);
}

export function deactivate() {
  log('GitHub DevOps extension deactivated');
}
```

#### extension/src/settings-webview.ts

Módulo que cria um `WebviewPanel` para configuração visual. Inclui campos para token, API URL, owner, repo, e botão de teste de conexão. Usa o padrão de mensagens `postMessage` / `onDidReceiveMessage` entre webview e extension.

#### extension/webview/settings.html

HTML completo com formulário estilizado (tema dark compatível com VS Code) com:
* Campo de token (password)
* Campo de API URL
* Campo de owner
* Campo de repo
* Botão "Test Connection"
* Botão "Save"
* Área de status/feedback

---

### STEP 12: Ícone (icon.svg, icon.png, create-icon.js)

**Missão**: Criar o ícone da extensão.

**Arquivos**:
* `extension/icon.svg` — SVG com ícone do GitHub + engrenagem DevOps
* `extension/create-icon.js` — Script Node.js para converter SVG → PNG (128x128)
* `extension/icon.png` — PNG gerado pelo script

**Dependências**: Nenhuma (pode rodar em paralelo)

O `create-icon.js` usa canvas ou sharp para converter SVG para PNG. Alternativa simples: criar um SVG inline e usar um encoder SVG→PNG simples.

---

### STEP 13: Documentação

**Missão**: Criar instructions, README, CHANGELOG, .vscodeignore.

**Arquivos**:
* `extension/resources/instructions/github-devops.instructions.md`
* `extension/.vscodeignore`
* `extension/CHANGELOG.md`
* `extension/README.md`
* `README.md` (root)

**Dependências**: Nenhuma (pode rodar em paralelo)

#### extension/resources/instructions/github-devops.instructions.md

```markdown
# GitHub DevOps — Copilot Instructions

## Overview

This extension provides 65+ GitHub DevOps tools for CI/CD management, deployments,
security monitoring, and repository operations directly in GitHub Copilot Chat.

## Quick Reference — Common Workflows

### Investigating CI/CD Failures

When a user asks about CI/CD failures, build errors, or pipeline problems:

1. `get_failed_runs` — Start here to see all recent failures
2. `get_workflow_run` — Get details on a specific failed run
3. `list_workflow_jobs` — Find which job failed
4. `get_job_logs` — Get the exact error output from the failed job
5. `list_pr_files` — If the failure is related to a PR change

### Assessing Repository Security

When a user asks about security, vulnerabilities, or compliance:

1. `get_security_overview` — Full picture of all security alerts
2. `list_dependabot_alerts` with severity=critical,high — Focus on critical issues
3. `list_code_scanning_alerts` — Code quality and security issues
4. `list_secret_scanning_alerts` — Check for leaked secrets

### Managing Deployments

When a user asks about deployments, releases, or environments:

1. `list_environments` — See available deployment targets
2. `list_deployments` — Check recent deployment history
3. `create_deployment` — Deploy a specific ref to an environment
4. `list_deployment_statuses` — Track deployment progress

### Preparing a Release

When a user wants to create or manage releases:

1. `list_releases` — See version history
2. `generate_release_notes` — Auto-generate changelog
3. `create_release` — Create the release with generated notes
4. `list_workflow_runs` — Check if release pipeline succeeded

### Monitoring CI/CD Pipelines

When a user asks about pipeline health or workflow status:

1. `list_workflows` — See all configured workflows
2. `list_workflow_runs` — Recent runs with status filters
3. `get_workflow_usage` — Billable time consumption

### Pull Request CI Status

When a user asks about PR status or checks:

1. `get_pr_ci_status` — Combined check runs + statuses for a PR
2. `list_pr_reviews` — See review status
3. `list_pr_files` — Files changed in the PR
4. `merge_pull_request` — Merge when ready

## Available Tools by Category

### Workflows (GitHub Actions)

- `list_workflows` — List all workflows
- `get_workflow` — Get workflow details
- `dispatch_workflow` — Trigger a workflow manually
- `enable_workflow` / `disable_workflow` — Toggle workflow state
- `get_workflow_usage` — Billable usage

### Workflow Runs & Jobs

- `list_workflow_runs` — List runs with filters (status, branch, actor, event)
- `get_workflow_run` — Run details
- `cancel_workflow_run` — Cancel a running workflow
- `rerun_workflow_run` — Rerun all jobs
- `rerun_failed_jobs` — Rerun only failed jobs
- `list_workflow_jobs` — Jobs in a run  
- `get_workflow_job` — Job details with steps
- `get_job_logs` — Raw log output (BEST for error investigation)
- `get_failed_runs` — All recent failures grouped by workflow

### Artifacts

- `list_artifacts` / `get_artifact` / `list_run_artifacts` / `delete_artifact`

### Deployments

- `list_deployments` / `get_deployment` / `create_deployment` / `delete_deployment`
- `list_deployment_statuses` / `create_deployment_status`

### Environments

- `list_environments` / `get_environment` / `create_environment` / `delete_environment`
- `get_environment_protection_rules`

### Secrets & Variables

- `list_repo_secrets` / `get_repo_secret` / `create_or_update_secret` / `delete_secret`
- `list_repo_variables` / `get_repo_variable` / `create_variable` / `update_variable` / `delete_variable`
- `list_environment_secrets` / `list_environment_variables`

### Releases

- `list_releases` / `get_release` / `get_latest_release`
- `create_release` / `update_release` / `delete_release`
- `generate_release_notes`

### Branches & Protection

- `list_branches` / `get_branch`
- `get_branch_protection` / `update_branch_protection` / `delete_branch_protection`
- `get_commit_status` / `list_commit_statuses`

### Pull Requests

- `list_pull_requests` / `get_pull_request`
- `list_pr_commits` / `list_pr_files` / `list_pr_reviews`
- `merge_pull_request`
- `get_pr_ci_status` — Unified CI status for a PR

### Check Runs & Suites

- `list_check_runs_for_ref` / `get_check_run`
- `list_check_suites` / `rerequest_check_suite`

### Security

- `list_dependabot_alerts` / `get_dependabot_alert` / `update_dependabot_alert`
- `list_code_scanning_alerts` / `get_code_scanning_alert`
- `list_secret_scanning_alerts` / `get_secret_scanning_alert`
- `get_security_overview` — Unified security dashboard

### Packages

- `list_packages` / `get_package` / `list_package_versions` / `delete_package_version`

### Repository

- `get_repository` / `list_webhooks` / `create_webhook` / `delete_webhook`
- `list_repository_topics` / `get_repository_stats`

## Parameter Conventions

- `owner` and `repo` are optional in most tools — they default to the configured/auto-detected repository
- Date/time parameters support ISO 8601 and relative formats: "1h", "30m", "7d", "2w"
- `per_page` defaults to 30 (max 100)
- Status filters: completed, in_progress, queued, failure, success, cancelled
- Severity filters: critical, high, medium, low

## Configuration

- Token: Stored in VS Code SecretStorage (Command: "Configure GitHub Token")
- Fallback: GITHUB_TOKEN environment variable
- Auto-detect: Owner/repo auto-detected from git remote by default
```

#### extension/.vscodeignore

```
.vscode/**
.vscode-test/**
src/**
.gitignore
tsconfig.json
node_modules/**
!mcp-server/node_modules/**
*.vsix
.env
.DS_Store
*.log
```

#### extension/CHANGELOG.md

```markdown
# Changelog

## [1.0.0] — 2025-XX-XX

### Added

- Initial release
- 65+ GitHub DevOps tools via MCP
- GitHub Actions: Workflows, Runs, Jobs, Logs, Artifacts
- Deployments & Deployment Statuses
- Environments & Protection Rules
- Secrets & Variables (repo + environment level)
- Releases & Release Notes generation
- Branches & Branch Protection
- Pull Requests & Reviews with CI status
- Check Runs & Check Suites
- Security: Dependabot, Code Scanning, Secret Scanning
- GitHub Packages management
- Repository info, webhooks, topics
- Auto-detect repository from git remote
- Copilot Chat instructions for troubleshooting workflows
```

---

### STEP 14: Build, QA & Git

**Missão**: Compilar tudo, corrigir erros, testar, e fazer git add/commit/push.

**Dependências**: Todos os STEPs anteriores

**Procedimento**:

```bash
# 1. Install dependencies (root)
cd /Users/gleidsonfersanp/workspace/AI/gh-devops-mcp
npm install

# 2. Build MCP Server
npm run build

# 3. Fix any TypeScript errors, re-build

# 4. Copy server to extension
npm run copy-to-extension

# 5. Install extension dependencies
cd extension
npm install

# 6. Compile extension
npm run compile

# 7. Fix any TS errors, re-compile

# 8. Package .vsix (optional)
npm run package

# 9. Git
cd ..
git add -A
git commit -m "feat: initial implementation of gh-devops-mcp - 65+ GitHub DevOps tools via MCP"
git push origin main
```

**Critério de sucesso**:
* `npm run build` (root) — zero errors
* `npm run compile` (extension) — zero errors
* `node dist/index.js` — starts without crash (with missing env vars shows warning, not crash)
* git commit and push successful

---

## 6. Grafo de Dependências

```
STEP 1 (Scaffolding)
  │
  ├──► STEP 2 (Client + Auth + Utils)
  │       │
  │       ├──► STEP 3  (Workflows)          ─┐
  │       ├──► STEP 4  (Workflow Runs)       │
  │       ├──► STEP 5  (Artifacts+Deploy)    │
  │       ├──► STEP 6  (Envs+Secrets)        ├──► STEP 10 (index.ts)
  │       ├──► STEP 7  (Releases+Branches)   │         │
  │       ├──► STEP 8  (PRs+Checks)          │         ├──► STEP 14 (Build+QA+Git)
  │       └──► STEP 9  (Security+Pkg+Repo)  ─┘         │
  │                                                     │
  ├──► STEP 11 (Extension) ────────────────────────────►┤
  ├──► STEP 12 (Icon)      ────────────────────────────►┤
  └──► STEP 13 (Docs)      ────────────────────────────►┘
```

### Dependências Explícitas

| STEP | Depende de |
|---|---|
| STEP 1 | — |
| STEP 2 | STEP 1 |
| STEP 3 | STEP 2 |
| STEP 4 | STEP 2 |
| STEP 5 | STEP 2 |
| STEP 6 | STEP 2 |
| STEP 7 | STEP 2 |
| STEP 8 | STEP 2 |
| STEP 9 | STEP 2 |
| STEP 10 | STEPs 3–9 |
| STEP 11 | STEP 1 |
| STEP 12 | — |
| STEP 13 | — |
| STEP 14 | STEPs 10, 11, 12, 13 |

---

## 7. Paralelismo

### Fase 1 (Sequencial)

* **STEP 1** → **STEP 2** (sequencial, cada um depende do anterior)

### Fase 2 (Máximo Paralelismo — 10 STEPs simultâneos)

Após STEP 2 completar, os seguintes podem rodar em paralelo:
* **STEP 3** (Workflows)
* **STEP 4** (Workflow Runs)
* **STEP 5** (Artifacts + Deployments)
* **STEP 6** (Environments + Secrets)
* **STEP 7** (Releases + Branches)
* **STEP 8** (Pull Requests + Checks)
* **STEP 9** (Security + Packages + Repository)
* **STEP 11** (Extension)
* **STEP 12** (Icon)
* **STEP 13** (Docs)

### Fase 3 (Sequencial)

* **STEP 10** (index.ts — precisa de STEPs 3–9 completos)

### Fase 4 (Sequencial)

* **STEP 14** (Build + QA + Git — precisa de tudo)

### Diagrama de Paralelismo

```
Time ──────────────────────────────────────────────────────►

STEP 1 ▓▓▓▓
         STEP 2 ▓▓▓▓▓▓
                      STEP 3  ▓▓▓▓▓▓▓▓  ─┐
                      STEP 4  ▓▓▓▓▓▓▓▓   │
                      STEP 5  ▓▓▓▓▓▓▓▓   │
                      STEP 6  ▓▓▓▓▓▓▓▓   ├─► STEP 10 ▓▓▓▓▓ ─┐
                      STEP 7  ▓▓▓▓▓▓▓▓   │                    │
                      STEP 8  ▓▓▓▓▓▓▓▓   │                    ├─► STEP 14 ▓▓▓▓
                      STEP 9  ▓▓▓▓▓▓▓▓  ─┘                    │
                      STEP 11 ▓▓▓▓▓▓▓▓ ──────────────────────►│
                      STEP 12 ▓▓▓▓ ──────────────────────────►│
                      STEP 13 ▓▓▓▓▓▓ ────────────────────────►┘
```

### Estimativa de Tempo (AI agent)

| Fase | STEPs | Tempo estimado |
|---|---|---|
| Fase 1 | 1, 2 | ~10 min |
| Fase 2 | 3–9, 11, 12, 13 (paralelo) | ~20 min |
| Fase 3 | 10 | ~5 min |
| Fase 4 | 14 | ~10 min |
| **Total** | | **~45 min** |

---

## Apêndice A: Convenções de Nomenclatura

| Item | Convenção | Exemplo |
|---|---|---|
| Tool names | `snake_case` | `list_workflows` , `get_workflow_run` |
| File names | `kebab-case` | `github-client.ts` , `workflow-runs.ts` |
| Exported tool arrays | `camelCase` + `Tools` | `workflowsTools` , `workflowRunsTools` |
| Exported handlers | `handle` + `PascalCase` + `Tool` | `handleWorkflowsTool` |
| VS Code commands | `camelCase` dot-delimited | `ghDevops.configure` |
| Settings keys | `camelCase` dot-delimited | `ghDevops.apiUrl` |
| Env vars | `SCREAMING_SNAKE_CASE` | `GITHUB_TOKEN` , `GITHUB_OWNER` |
| Error class | `PascalCase` + `Error` | `GitHubAPIError` |
| Client class | `PascalCase` | `GitHubClient` |
| Server class | `PascalCase` + `Server` | `GitHubDevOpsServer` |
| MCP Server ID | `kebab-case` | `gh-devops` |
| npm package (root) | `kebab-case` + `-mcp` | `gh-devops-mcp` |
| npm package (ext) | `kebab-case` | `gh-devops` |

## Apêndice B: Permissões de Token Necessárias

Para funcionalidade completa, o PAT precisa dos seguintes scopes:

### Classic PAT

| Scope | Usado por |
|---|---|
| `repo` | Todas as tools de repos (workflows, runs, deployments, branches, PRs, etc.) |
| `workflow` | `dispatch_workflow` , `enable_workflow` , `disable_workflow` |
| `read:packages` | `list_packages` , `get_package` , `list_package_versions` |
| `delete:packages` | `delete_package_version` |
| `admin:repo_hook` | `list_webhooks` , `create_webhook` , `delete_webhook` |
| `security_events` | Tools de security (dependabot, code scanning, secret scanning) |

### Fine-grained PAT

| Permission | Access | Usado por |
|---|---|---|
| Actions | Read & Write | Workflows, runs, jobs, artifacts, secrets, variables |
| Deployments | Read & Write | Deployments, environments |
| Contents | Read | Branches, commits |
| Pull Requests | Read & Write | PRs, reviews, merge |
| Checks | Read | Check runs, check suites |
| Security events | Read | Dependabot, code scanning, secret scanning |
| Webhooks | Read & Write | Webhook management |
| Metadata | Read | Repository info, topics |
