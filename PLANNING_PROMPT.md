# PLANNING_PROMPT.md — Prompt para Geração do Plano de Implementação

> **Como usar**: Copie TUDO abaixo e forneça como prompt a um AI agent (GitHub Copilot, Claude, GPT, Cursor, etc.)
> para que ele gere o `IMPLEMENTATION_PLAN.md` completo do projeto.

---

## PROMPT

```
Você é um arquiteto de software sênior. Sua missão é criar um IMPLEMENTATION_PLAN.md
extremamente detalhado para o projeto abaixo. O plano deve ser tão completo que um
time de AI agents consiga implementar o projeto inteiro SEM perguntas adicionais.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJETO: gh-devops-mcp
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VS Code Extension + MCP Server que integra o GitHub (Actions, Deployments, Environments,
Releases, Security Alerts, PRs, Branches, Packages e mais) ao GitHub Copilot Chat via
Model Context Protocol. Provê ~60+ ferramentas de DevOps/CI/CD para que AI agents
possam analisar pipelines, gerenciar deployments, investigar falhas de CI, monitorar
segurança e automatizar operações — tudo diretamente do editor.

REPOSITÓRIO: /Users/gleidsonfersanp/workspace/AI/gh-devops-mcp
REFERÊNCIA: O projeto /Users/gleidsonfersanp/workspace/AI/datadog-mcp segue a MESMA
arquitetura e deve ser usado como referência de padrões, estrutura e estilo.
REFERÊNCIA DE ARQUITETURA: O projeto /Users/gleidsonfersanp/workspace/AI/pdf-utilities-mcp
é o template original da arquitetura MCP Server + VS Code Extension.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
O QUE VOCÊ DEVE PRODUZIR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Crie um arquivo IMPLEMENTATION_PLAN.md com as seguintes seções:

1. **Visão Geral do Projeto** — Descrição, propósito, público-alvo
2. **Arquitetura** — Árvore de diretórios completa (tree) idêntica ao padrão datadog-mcp
3. **Domínios de API do GitHub Cobertos** — Lista TODAS as tools organizadas por domínio
4. **Autenticação** — Como funciona a auth do GitHub (PAT, GitHub App, GITHUB_TOKEN)
5. **STEPs de Implementação** — Passos numerados com código detalhado
6. **Grafo de Dependências** — Quais steps dependem de quais
7. **Paralelismo** — Quais steps podem rodar em paralelo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARQUITETURA OBRIGATÓRIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
gh-devops-mcp/
├── src/                              # MCP Server source
│   ├── index.ts                      # Main MCP server entry point
│   ├── client/
│   │   ├── github-client.ts          # HTTP client base para GitHub API
│   │   └── auth.ts                   # Autenticação (PAT / GitHub Token)
│   ├── tools/
│   │   ├── workflows.ts             # GitHub Actions Workflows
│   │   ├── workflow-runs.ts          # Workflow Runs & Jobs
│   │   ├── deployments.ts           # Deployments & Deployment Statuses
│   │   ├── environments.ts          # Environments & Protection Rules
│   │   ├── secrets.ts               # Actions Secrets & Variables
│   │   ├── releases.ts              # Releases & Release Assets
│   │   ├── branches.ts              # Branches & Protection Rules
│   │   ├── pull-requests.ts         # Pull Requests & Reviews
│   │   ├── checks.ts                # Check Runs & Check Suites
│   │   ├── security.ts              # Dependabot, Code Scanning, Secret Scanning
│   │   ├── packages.ts              # GitHub Packages
│   │   └── repository.ts            # Repository settings, webhooks, topics
│   └── utils/
│       ├── formatters.ts             # Formatação de respostas para AI
│       ├── time-helpers.ts           # Helpers de datas/timestamps
│       └── error-handler.ts          # Tratamento de erros padronizado
├── extension/                         # VS Code Extension
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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOMÍNIOS DE API — TODAS AS TOOLS A DEFINIR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPORTANTE: Pesquise a documentação da GitHub REST API (https://docs.github.com/en/rest)
para obter os endpoints EXATOS, parâmetros, e formatos de resposta. Para cada tool,
defina: nome, descrição rica para AI, inputSchema com types, endpoint HTTP exato,
e formato de resposta.

### Domínio 1: Workflows (GitHub Actions)
API Base: /repos/{owner}/{repo}/actions/workflows
Tools a cobrir:
- list_workflows — GET /repos/{owner}/{repo}/actions/workflows
- get_workflow — GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}
- dispatch_workflow — POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches
- enable_workflow — PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/enable
- disable_workflow — PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/disable
- get_workflow_usage — GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/timing

### Domínio 2: Workflow Runs & Jobs
API Base: /repos/{owner}/{repo}/actions/runs
Tools a cobrir:
- list_workflow_runs — GET /repos/{owner}/{repo}/actions/runs
  Params: actor, branch, event, status, created, per_page
- get_workflow_run — GET /repos/{owner}/{repo}/actions/runs/{run_id}
- cancel_workflow_run — POST /repos/{owner}/{repo}/actions/runs/{run_id}/cancel
- rerun_workflow_run — POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun
- rerun_failed_jobs — POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun-failed-jobs
- get_workflow_run_logs — GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs
  (retorna URL de download dos logs)
- list_workflow_jobs — GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs
- get_workflow_job — GET /repos/{owner}/{repo}/actions/jobs/{job_id}
- get_job_logs — GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs
- get_failed_runs — HIGH LEVEL TOOL: lista runs com status=failure, agrupa por workflow
  Descrição: "Get all recently failed workflow runs. This is the BEST starting point
  for investigating CI/CD pipeline failures."

### Domínio 3: Artifacts
API Base: /repos/{owner}/{repo}/actions/artifacts
Tools:
- list_artifacts — GET /repos/{owner}/{repo}/actions/artifacts
- get_artifact — GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}
- list_run_artifacts — GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts
- delete_artifact — DELETE /repos/{owner}/{repo}/actions/artifacts/{artifact_id}

### Domínio 4: Deployments
API Base: /repos/{owner}/{repo}/deployments
Tools:
- list_deployments — GET /repos/{owner}/{repo}/deployments
  Params: sha, ref, task, environment, per_page
- get_deployment — GET /repos/{owner}/{repo}/deployments/{deployment_id}
- create_deployment — POST /repos/{owner}/{repo}/deployments
  Body: ref, task, auto_merge, environment, description, required_contexts
- delete_deployment — DELETE /repos/{owner}/{repo}/deployments/{deployment_id}
- list_deployment_statuses — GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses
- create_deployment_status — POST /repos/{owner}/{repo}/deployments/{deployment_id}/statuses
  Body: state (error/failure/inactive/in_progress/queued/pending/success),
  description, environment_url, log_url, auto_inactive

### Domínio 5: Environments
API Base: /repos/{owner}/{repo}/environments
Tools:
- list_environments — GET /repos/{owner}/{repo}/environments
- get_environment — GET /repos/{owner}/{repo}/environments/{environment_name}
- create_environment — PUT /repos/{owner}/{repo}/environments/{environment_name}
  Body: wait_timer, reviewers, deployment_branch_policy
- delete_environment — DELETE /repos/{owner}/{repo}/environments/{environment_name}
- get_environment_protection_rules — Extraído de get_environment (protection_rules array)

### Domínio 6: Secrets & Variables
API Base: /repos/{owner}/{repo}/actions/secrets e /repos/{owner}/{repo}/actions/variables
Tools:
- list_repo_secrets — GET /repos/{owner}/{repo}/actions/secrets
- get_repo_secret — GET /repos/{owner}/{repo}/actions/secrets/{secret_name}
  (retorna metadata, NÃO o valor)
- create_or_update_secret — PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}
  Requer: obter public key primeiro (GET /repos/{owner}/{repo}/actions/secrets/public-key),
  encriptar com libsodium/tweetnacl
- delete_secret — DELETE /repos/{owner}/{repo}/actions/secrets/{secret_name}
- list_repo_variables — GET /repos/{owner}/{repo}/actions/variables
- get_repo_variable — GET /repos/{owner}/{repo}/actions/variables/{name}
- create_variable — POST /repos/{owner}/{repo}/actions/variables
- update_variable — PATCH /repos/{owner}/{repo}/actions/variables/{name}
- delete_variable — DELETE /repos/{owner}/{repo}/actions/variables/{name}
- list_environment_secrets — GET /repos/{owner}/{repo}/environments/{env}/secrets
- list_environment_variables — GET /repos/{owner}/{repo}/environments/{env}/variables

### Domínio 7: Releases
API Base: /repos/{owner}/{repo}/releases
Tools:
- list_releases — GET /repos/{owner}/{repo}/releases
- get_release — GET /repos/{owner}/{repo}/releases/{release_id}
- get_latest_release — GET /repos/{owner}/{repo}/releases/latest
- create_release — POST /repos/{owner}/{repo}/releases
  Body: tag_name, target_commitish, name, body, draft, prerelease, generate_release_notes
- update_release — PATCH /repos/{owner}/{repo}/releases/{release_id}
- delete_release — DELETE /repos/{owner}/{repo}/releases/{release_id}
- generate_release_notes — POST /repos/{owner}/{repo}/releases/generate-notes
  Body: tag_name, target_commitish, previous_tag_name, configuration_file_path

### Domínio 8: Branches & Protection
API Base: /repos/{owner}/{repo}/branches
Tools:
- list_branches — GET /repos/{owner}/{repo}/branches
- get_branch — GET /repos/{owner}/{repo}/branches/{branch}
- get_branch_protection — GET /repos/{owner}/{repo}/branches/{branch}/protection
- update_branch_protection — PUT /repos/{owner}/{repo}/branches/{branch}/protection
- delete_branch_protection — DELETE /repos/{owner}/{repo}/branches/{branch}/protection
- get_commit_status — GET /repos/{owner}/{repo}/commits/{ref}/status (combined status)
- list_commit_statuses — GET /repos/{owner}/{repo}/commits/{ref}/statuses

### Domínio 9: Pull Requests
API Base: /repos/{owner}/{repo}/pulls
Tools:
- list_pull_requests — GET /repos/{owner}/{repo}/pulls
  Params: state, head, base, sort, direction, per_page
- get_pull_request — GET /repos/{owner}/{repo}/pulls/{pull_number}
- list_pr_commits — GET /repos/{owner}/{repo}/pulls/{pull_number}/commits
- list_pr_files — GET /repos/{owner}/{repo}/pulls/{pull_number}/files
- list_pr_reviews — GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews
- merge_pull_request — PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge
  Body: commit_title, commit_message, merge_method (merge/squash/rebase)
- get_pr_ci_status — HIGH LEVEL TOOL
  Combina: GET checks + GET statuses para um PR e apresenta resumo unificado do CI

### Domínio 10: Check Runs & Suites
API Base: /repos/{owner}/{repo}/check-runs e /repos/{owner}/{repo}/check-suites
Tools:
- list_check_runs_for_ref — GET /repos/{owner}/{repo}/commits/{ref}/check-runs
- get_check_run — GET /repos/{owner}/{repo}/check-runs/{check_run_id}
- list_check_suites — GET /repos/{owner}/{repo}/commits/{ref}/check-suites
- rerequest_check_suite — POST /repos/{owner}/{repo}/check-suites/{check_suite_id}/rerequest

### Domínio 11: Security
API Base: /repos/{owner}/{repo}/
Tools:
- list_dependabot_alerts — GET /repos/{owner}/{repo}/dependabot/alerts
  Params: state, severity, ecosystem, package, scope, sort, direction
- get_dependabot_alert — GET /repos/{owner}/{repo}/dependabot/alerts/{alert_number}
- update_dependabot_alert — PATCH /repos/{owner}/{repo}/dependabot/alerts/{alert_number}
  Body: state (dismissed/open), dismissed_reason, dismissed_comment
- list_code_scanning_alerts — GET /repos/{owner}/{repo}/code-scanning/alerts
- get_code_scanning_alert — GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}
- list_secret_scanning_alerts — GET /repos/{owner}/{repo}/secret-scanning/alerts
- get_secret_scanning_alert — GET /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}
- get_security_overview — HIGH LEVEL TOOL
  Combina: dependabot + code scanning + secret scanning alerts em resumo unificado
  Descrição: "Get a comprehensive security overview of the repository including
  vulnerability counts by severity, secret leaks, and code quality issues."

### Domínio 12: Packages
API Base: /users/{username}/packages ou /orgs/{org}/packages
Tools:
- list_packages — GET /user/packages?package_type={type}
- get_package — GET /user/packages/{package_type}/{package_name}
- list_package_versions — GET /user/packages/{package_type}/{package_name}/versions
- delete_package_version — DELETE /user/packages/{package_type}/{package_name}/versions/{id}

### Domínio 13: Repository
API Base: /repos/{owner}/{repo}
Tools:
- get_repository — GET /repos/{owner}/{repo}
- list_webhooks — GET /repos/{owner}/{repo}/hooks
- create_webhook — POST /repos/{owner}/{repo}/hooks
- delete_webhook — DELETE /repos/{owner}/{repo}/hooks/{hook_id}
- list_repository_topics — GET /repos/{owner}/{repo}/topics
- get_repository_stats — HIGH LEVEL TOOL
  Combina: repo info + languages + contributors + commit activity
  Descrição: "Get comprehensive repository statistics including languages,
  contributors, recent activity, and health metrics."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUTENTICAÇÃO DO GITHUB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O GitHub API usa autenticação por token. O plano deve documentar:

1. **Personal Access Token (PAT)**:
   - Classic: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Fine-grained: `github_pat_xxxxxxxxxxxxxxxxxxxx`
   - Header: `Authorization: Bearer <token>`

2. **GITHUB_TOKEN** (em CI/CD): Funciona igual

3. **Headers obrigatórios**:
   - `Accept: application/vnd.github+json`
   - `X-GitHub-Api-Version: 2022-11-28`
   - `Authorization: Bearer <token>`

4. **API Base URL**: `https://api.github.com`
   - Enterprise: `https://{hostname}/api/v3`

5. **Rate Limits**:
   - Autenticado: 5000 req/hora
   - Header de resposta: `X-RateLimit-Remaining`, `X-RateLimit-Reset`
   - Implementar retry com backoff em 403 com rate limit

6. **Variáveis de ambiente**:
   - `GITHUB_TOKEN` — Token de autenticação
   - `GITHUB_OWNER` — Owner do repositório (org ou user)
   - `GITHUB_REPO` — Nome do repositório
   - `GITHUB_API_URL` — URL base (default: https://api.github.com, para Enterprise)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VS CODE EXTENSION — ESPECIFICAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### extension/package.json — Contributes

```json
{
  "name": "gh-devops",
  "displayName": "GitHub DevOps for Copilot",
  "description": "AI-powered GitHub DevOps tools — Actions, Deployments, Releases, Security and more directly from GitHub Copilot Chat",
  "version": "1.0.0",
  "publisher": "GleidsonFerSanP",
  "icon": "icon.png",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["AI", "Other", "SCM Providers"],
  "keywords": ["github", "devops", "ci-cd", "github-actions", "deployments",
    "releases", "security", "mcp", "copilot", "model context protocol"],
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
  }
}
```

### Configuração — DIFERENCIAL: Auto-detect repo

A extension deve tentar detectar automaticamente o `owner` e `repo` a partir do
git remote do workspace aberto (`git remote get-url origin`). Isso elimina a
necessidade de configuração manual na maioria dos casos.

### Credenciais

- GitHub Token salvo no VS Code SecretStorage (key: `ghDevops.token`)
- Fallback para env var `GITHUB_TOKEN`
- Webview de configuração similar ao datadog-mcp com campo de token, API URL,
  owner, repo, e botão de teste

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COPILOT INSTRUCTIONS — TEMPLATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O instructions file (github-devops.instructions.md) deve incluir:

1. Fluxos de troubleshooting de CI/CD:
   "When investigating CI/CD failures:
    1) get_failed_runs to see recent failures
    2) get_workflow_run for details on the specific run
    3) list_workflow_jobs to find which job failed
    4) get_job_logs for the exact error output
    5) list_pr_files if related to a PR change"

2. Fluxos de segurança:
   "When assessing repository security:
    1) get_security_overview for a full picture
    2) list_dependabot_alerts with severity=critical,high
    3) list_code_scanning_alerts for code quality
    4) list_secret_scanning_alerts for leaked secrets"

3. Fluxos de deployment:
   "When managing deployments:
    1) list_environments to see available targets
    2) list_deployments to check recent deployments
    3) create_deployment to deploy a ref
    4) list_deployment_statuses to track progress"

4. Fluxos de release:
   "When preparing a release:
    1) list_releases to see version history
    2) generate_release_notes for automatic changelog
    3) create_release with the generated notes
    4) list_workflow_runs to check release pipeline status"

5. Syntax de filtros e parâmetros comuns
6. Exemplos para cada grupo de tools

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEPS DE IMPLEMENTAÇÃO — ESTRUTURA ESPERADA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Organize os STEPs exatamente nesta ordem:

STEP 1: Scaffolding (package.json, tsconfig.json, .gitignore, LICENSE, pastas)
STEP 2: GitHub HTTP Client + Auth + Utils (github-client.ts, auth.ts, error-handler.ts,
        time-helpers.ts, formatters.ts)
STEP 3: Tools — Workflows (workflows.ts)
STEP 4: Tools — Workflow Runs & Jobs (workflow-runs.ts)
STEP 5: Tools — Deployments (deployments.ts)
STEP 6: Tools — Environments + Secrets & Variables (environments.ts, secrets.ts)
STEP 7: Tools — Releases + Branches (releases.ts, branches.ts)
STEP 8: Tools — Pull Requests + Checks (pull-requests.ts, checks.ts)
STEP 9: Tools — Security + Packages + Repository (security.ts, packages.ts, repository.ts)
STEP 10: MCP Server Entry Point (index.ts — integra todas as tools)
STEP 11: VS Code Extension (extension.ts, settings-webview.ts, types.ts, webview)
STEP 12: Ícone (icon.svg, icon.png, create-icon.js)
STEP 13: Documentação (instructions, README, CHANGELOG, .vscodeignore, BUILD_PUBLISH_GUIDE)
STEP 14: Build, QA & Git (compilar, testar, corrigir, commit, push)

GRAFO DE DEPENDÊNCIAS:
  STEP 1 → STEP 2 → [STEPs 3,4,5,6,7,8,9 em paralelo] + [STEP 12, STEP 13 em paralelo]
  → STEP 10 → STEP 11 → STEP 14

PARA CADA STEP, INCLUA:
- Descrição da missão
- Lista de arquivos a criar/editar
- Código detalhado ou pseudo-código com tipos TypeScript
- Endpoints HTTP exatos com params e body
- Dependências de outros steps
- Critério de sucesso testável

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REFERÊNCIAS PARA PESQUISA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. GitHub REST API Docs: https://docs.github.com/en/rest
   - Actions: https://docs.github.com/en/rest/actions
   - Deployments: https://docs.github.com/en/rest/deployments
   - Releases: https://docs.github.com/en/rest/releases
   - Branches: https://docs.github.com/en/rest/branches
   - Pull Requests: https://docs.github.com/en/rest/pulls
   - Checks: https://docs.github.com/en/rest/checks
   - Security: https://docs.github.com/en/rest/dependabot
   - Packages: https://docs.github.com/en/rest/packages

2. Autenticação: https://docs.github.com/en/rest/authentication

3. Rate Limits: https://docs.github.com/en/rest/rate-limit

4. MCP SDK: https://github.com/modelcontextprotocol/sdk

5. Projeto referência (mesma arquitetura):
   - /Users/gleidsonfersanp/workspace/AI/datadog-mcp/IMPLEMENTATION_PLAN.md
   - /Users/gleidsonfersanp/workspace/AI/pdf-utilities-mcp/ (template original)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PADRÕES DE CÓDIGO (do projeto referência)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cada arquivo de tools deve exportar:
- export const xyzTools: Array de { name, description, inputSchema }
- export async function handleXyzTool(name: string, args: any, client: GitHubClient): Promise<string>

O index.ts deve:
- Usar shebang #!/usr/bin/env node
- Importar Server e StdioServerTransport do MCP SDK
- Criar classe principal que unifica todas as tools
- Usar Map<string, handler> para routing eficiente
- Ler credenciais de env vars

A extension deve:
- Registrar MCP Server via vscode.lm.registerMcpServerDefinitionProvider
- Usar vscode.McpStdioServerDefinition
- Salvar token no SecretStorage
- Auto-detectar repo do git remote
- Ter status bar item e webview de configuração

Typescript config:
- target: ES2022
- module: NodeNext
- moduleResolution: NodeNext
- strict: true
- type: "module" no package.json

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUISITOS DO OUTPUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. O IMPLEMENTATION_PLAN.md deve ter pelo menos 800 linhas
2. Deve cobrir TODOS os 60+ tools listados acima com endpoints exatos
3. Cada STEP deve ser auto-contido — um AI agent deve poder implementá-lo sozinho
4. Inclua exemplos de inputSchema JSON Schema para cada tool
5. Inclua exemplos de resposta formatada para o AI
6. Salve o arquivo em /Users/gleidsonfersanp/workspace/AI/gh-devops-mcp/IMPLEMENTATION_PLAN.md
7. Após criar o plano, faça git add, commit e push para o repositório

PRODUZA O IMPLEMENTATION_PLAN.md AGORA.
```
