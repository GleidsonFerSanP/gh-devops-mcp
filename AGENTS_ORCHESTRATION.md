# AGENTS_ORCHESTRATION.md — Multi-Agent Execution Prompt

> **Como usar**: Forneça este arquivo como prompt ao sistema multi-agent de sua escolha
> (Copilot Agent Mode, CrewAI, AutoGen, LangGraph, Cursor, etc.).
> O Orchestrator lerá o `IMPLEMENTATION_PLAN.md` e coordenará os agents em 4 fases.

---

`

```
════════════════════════════════════════════════════════════════════════
MULTI-AGENT ORCHESTRATION PROMPT — gh-devops-mcp
════════════════════════════════════════════════════════════════════════

Você é o ORCHESTRATOR de um time de AI agents. Sua missão é coordenar a
implementação completa do projeto gh-devops-mcp seguindo o IMPLEMENTATION_PLAN.md
localizado em /Users/gleidsonfersanp/workspace/AI/gh-devops-mcp/IMPLEMENTATION_PLAN.md.

LEIA O PLANO COMPLETO ANTES DE INICIAR.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGRAS GLOBAIS (todos os agents devem seguir)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. JAMAIS pergunte ao usuário — deduza pelo plano e pelos projetos de
   referência (datadog-mcp em /Users/gleidsonfersanp/workspace/AI/datadog-mcp).
2. JAMAIS crie arquivos fora da árvore definida no plano.
3. Todo arquivo TypeScript do MCP Server usa ESM (import com '.js').
4. Todo arquivo TypeScript da extension/ usa CommonJS.
5. Após criar cada arquivo, verifique erros de compilação antes de
   reportar conclusão ao Orchestrator.
6. Respostas de tools MCP são SEMPRE plain text formatado, nunca JSON bruto.
7. Nunca use bibliotecas externas além das listadas no plano (sem axios, sem got).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AGENTES E RESPONSABILIDADES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────────────────────┐
│ ORCHESTRATOR (você)                                                 │
│ • Lê o IMPLEMENTATION_PLAN.md completo                              │
│ • Dispara agents nas fases corretas                                 │
│ • Aguarda sinais de conclusão antes de avançar fases                │
│ • Detecta e corrige conflitos e erros reportados pelos agents       │
│ • Executa o STEP 14 (build, QA, git) pessoalmente após tudo pronto  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ AGENT-SCAFFOLD (STEP 1)                                             │
│ Cria toda a estrutura de arquivos de configuração                   │
│ Entregáveis: package.json (root), tsconfig.json (root),             │
│   extension/package.json, extension/tsconfig.json,                 │
│   .gitignore, LICENSE, AGENTS.md                                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ AGENT-CLIENT (STEP 2)                                               │
│ Cria o HTTP client e utilitários compartilhados                     │
│ Entregáveis: src/client/auth.ts, src/client/github-client.ts,       │
│   src/utils/error-handler.ts, src/utils/formatters.ts,             │
│   src/utils/time-helpers.ts                                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ AGENT-TOOLS-WORKFLOWS (STEP 3)                                      │
│ Entregável: src/tools/workflows.ts (6 tools)                        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ AGENT-TOOLS-RUNS (STEP 4)                                           │
│ Entregável: src/tools/workflow-runs.ts (10 tools)                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ AGENT-TOOLS-DEPLOY (STEP 5)                                         │
│ Entregáveis: src/tools/artifacts.ts (4 tools),                      │
│   src/tools/deployments.ts (6 tools)                                │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ AGENT-TOOLS-ENVS (STEP 6)                                           │
│ Entregáveis: src/tools/environments.ts (5 tools),                   │
│   src/tools/secrets.ts (11 tools, inclui tweetnacl para encrypt)    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ AGENT-TOOLS-RELEASES (STEP 7)                                       │
│ Entregáveis: src/tools/releases.ts (7 tools),                       │
│   src/tools/branches.ts (7 tools)                                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ AGENT-TOOLS-PRS (STEP 8)                                            │
│ Entregáveis: src/tools/pull-requests.ts (7 tools),                  │
│   src/tools/checks.ts (4 tools)                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ AGENT-TOOLS-SECURITY (STEP 9)                                       │
│ Entregáveis: src/tools/security.ts (8 tools),                       │
│   src/tools/packages.ts (4 tools),                                  │
│   src/tools/repository.ts (6 tools)                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ AGENT-EXTENSION (STEP 11)                                           │
│ Entregáveis: extension/src/extension.ts, settings-webview.ts,      │
│   types.ts, extension/webview/settings.html                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ AGENT-ICON (STEP 12)                                                │
│ Entregáveis: extension/icon.svg, extension/create-icon.js,          │
│   extension/icon.png                                                │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ AGENT-DOCS (STEP 13)                                                │
│ Entregáveis: extension/resources/instructions/                      │
│   github-devops.instructions.md, extension/.vscodeignore,           │
│   extension/CHANGELOG.md, extension/README.md, README.md           │
└─────────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PLANO DE EXECUÇÃO — 4 FASES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

╔══════════════════════════════════════════════════════════════════════╗
║ FASE 1 — FUNDAÇÃO (sequencial)                                       ║
╚══════════════════════════════════════════════════════════════════════╝

[ORCHESTRATOR] Dispara AGENT-SCAFFOLD.

PROMPT PARA AGENT-SCAFFOLD:
"""
Você é AGENT-SCAFFOLD. Leia a seção "STEP 1: Scaffolding" do arquivo
/Users/gleidsonfersanp/workspace/AI/gh-devops-mcp/IMPLEMENTATION_PLAN.md
e execute TODOS os itens listados.

Crie exatamente os seguintes arquivos no repositório
/Users/gleidsonfersanp/workspace/AI/gh-devops-mcp/:

1. package.json (root) — conforme o JSON do plano
2. tsconfig.json (root) — conforme o JSON do plano
3. extension/package.json — conforme o JSON do plano (com todos os contributes)
4. extension/tsconfig.json — conforme o JSON do plano
5. .gitignore — conforme o plano
6. LICENSE — MIT License, Copyright (c) 2025 GleidsonFerSanP
7. AGENTS.md — conforme o plano

Após criar cada arquivo, verifique se o JSON é válido (package.json, tsconfig.json).
Ao concluir, execute `npm install` no root e reporte o resultado.

Sinal de conclusão: escreva "AGENT-SCAFFOLD: DONE" ao terminar.
"""

[ORCHESTRATOR] Aguarda "AGENT-SCAFFOLD: DONE".
[ORCHESTRATOR] Dispara AGENT-CLIENT.

PROMPT PARA AGENT-CLIENT:
"""
Você é AGENT-CLIENT. Leia a seção "STEP 2: GitHub HTTP Client + Auth + Utils"
do arquivo /Users/gleidsonfersanp/workspace/AI/gh-devops-mcp/IMPLEMENTATION_PLAN.md
e implemente todos os arquivos descritos.

Crie exatamente:
1. src/client/auth.ts — interface GitHubCredentials + getCredentialsFromEnv + validateCredentials
2. src/client/github-client.ts — classe GitHubClient com retry, timeout, rate limit handling
3. src/utils/error-handler.ts — classe GitHubAPIError + handleAPIError + formatErrorForAI
4. src/utils/formatters.ts — todas as funções de formatação listadas
5. src/utils/time-helpers.ts — parseRelativeTime + buildCreatedFilter + nowISO

Requisitos críticos:
- Todos os imports usam extensão .js (ESM)
- GitHubClient usa native fetch (Node 18+) — sem axios, sem got
- Retry: 3 tentativas com backoff exponencial
- Timeout: 30 segundos via AbortController
- Rate limit 403/429: aguarda X-RateLimit-Reset antes de retry
- Status 204: retorna undefined
- Status 302: retorna { download_url: location }

Ao concluir, execute `npm run build` e confirme zero erros TypeScript.
Reporte quaisquer erros encontrados e como os corrigiu.

Sinal de conclusão: escreva "AGENT-CLIENT: DONE" ao terminar.
"""

[ORCHESTRATOR] Aguarda "AGENT-CLIENT: DONE".

╔══════════════════════════════════════════════════════════════════════╗
║ FASE 2 — IMPLEMENTAÇÃO PARALELA (10 agents simultâneos)              ║
╚══════════════════════════════════════════════════════════════════════╝

[ORCHESTRATOR] Dispara TODOS os seguintes agents SIMULTANEAMENTE:
AGENT-TOOLS-WORKFLOWS, AGENT-TOOLS-RUNS, AGENT-TOOLS-DEPLOY,
AGENT-TOOLS-ENVS, AGENT-TOOLS-RELEASES, AGENT-TOOLS-PRS,
AGENT-TOOLS-SECURITY, AGENT-EXTENSION, AGENT-ICON, AGENT-DOCS

─────────────────────────────────────────────────────────────────────
PROMPT PARA AGENT-TOOLS-WORKFLOWS:
"""
Você é AGENT-TOOLS-WORKFLOWS. Leia a seção "STEP 3: Tools — Workflows"
do IMPLEMENTATION_PLAN.md em
/Users/gleidsonfersanp/workspace/AI/gh-devops-mcp/IMPLEMENTATION_PLAN.md.

Crie o arquivo src/tools/workflows.ts com:
- Export const workflowsTools: array com 6 definições de tools
- Export async function handleWorkflowsTool(name, args, client): Promise<string>

6 tools obrigatórias:
  list_workflows, get_workflow, dispatch_workflow,
  enable_workflow, disable_workflow, get_workflow_usage

Padrões obrigatórios:
- inputSchema: { type: 'object' as const, properties: {...}, required: [...] }
- owner e repo são SEMPRE opcionais (fallback: client.owner / client.repo)
- Respostas são plain text com emojis e formatação legível para AI
- Imports usam .js (ESM)
- Erros capturados via formatErrorForAI de '../utils/error-handler.js'

Sinal de conclusão: escreva "AGENT-TOOLS-WORKFLOWS: DONE" ao terminar.
"""

─────────────────────────────────────────────────────────────────────
PROMPT PARA AGENT-TOOLS-RUNS:
"""
Você é AGENT-TOOLS-RUNS. Leia a seção "STEP 4: Tools — Workflow Runs & Jobs"
do IMPLEMENTATION_PLAN.md.

Crie src/tools/workflow-runs.ts com:
- Export const workflowRunsTools (10 tools)
- Export async function handleWorkflowRunsTool(name, args, client): Promise<string>

10 tools obrigatórias:
  list_workflow_runs, get_workflow_run, cancel_workflow_run,
  rerun_workflow_run, rerun_failed_jobs, get_workflow_run_logs,
  list_workflow_jobs, get_workflow_job, get_job_logs, get_failed_runs

Atenção especial:
- get_failed_runs: HIGH-LEVEL tool que filtra status=failure e agrupa por workflow name
- get_job_logs: usa client.getRaw() para obter texto puro; trunca em 15.000 chars
    mostrando os ÚLTIMOS chars (onde os erros costumam aparecer)
- list_workflow_runs: suporta filtros actor, branch, event, status, created, per_page
- Inclui tip de diagnóstico quando run.conclusion === 'failure'

Sinal de conclusão: escreva "AGENT-TOOLS-RUNS: DONE" ao terminar.
"""

─────────────────────────────────────────────────────────────────────
PROMPT PARA AGENT-TOOLS-DEPLOY:
"""
Você é AGENT-TOOLS-DEPLOY. Leia a seção "STEP 5" do IMPLEMENTATION_PLAN.md.

Crie 2 arquivos:

1. src/tools/artifacts.ts
   - Export const artifactsTools (4 tools)
   - Export async function handleArtifactsTool(...)
   - Tools: list_artifacts, get_artifact, list_run_artifacts, delete_artifact
   - Endpoints: /repos/{owner}/{repo}/actions/artifacts (+ /{id}, +/runs/{run_id}/artifacts)

2. src/tools/deployments.ts
   - Export const deploymentsTools (6 tools)
   - Export async function handleDeploymentsTool(...)
   - Tools: list_deployments, get_deployment, create_deployment, delete_deployment,
            list_deployment_statuses, create_deployment_status
   - create_deployment_status: state deve ser enum
     (error/failure/inactive/in_progress/queued/pending/success)
   - Usa formatDeploymentState de formatters.ts para exibir estado

Sinal de conclusão: escreva "AGENT-TOOLS-DEPLOY: DONE" ao terminar.
"""

─────────────────────────────────────────────────────────────────────
PROMPT PARA AGENT-TOOLS-ENVS:
"""
Você é AGENT-TOOLS-ENVS. Leia a seção "STEP 6" do IMPLEMENTATION_PLAN.md.

Crie 2 arquivos:

1. src/tools/environments.ts
   - Export const environmentsTools (5 tools)
   - Export async function handleEnvironmentsTool(...)
   - Tools: list_environments, get_environment, create_environment,
            delete_environment, get_environment_protection_rules
   - get_environment_protection_rules extrai o array protection_rules
     da resposta de /repos/{owner}/{repo}/environments/{name}

2. src/tools/secrets.ts
   - Export const secretsTools (11 tools)
   - Export async function handleSecretsTool(...)
   - Tools: list_repo_secrets, get_repo_secret, create_or_update_secret,
            delete_secret, list_repo_variables, get_repo_variable,
            create_variable, update_variable, delete_variable,
            list_environment_secrets, list_environment_variables
   - create_or_update_secret: antes de criar o secret, busca a public key em
     GET /repos/{owner}/{repo}/actions/secrets/public-key e encripta o valor
     usando tweetnacl (já listado nas dependências do package.json root):
     ```typescript
     import tweetnacl from 'tweetnacl';
     // encode secretValue + publicKey em Uint8Array, usar tweetnacl.box.seal
     // resultado: base64 → encrypted_value + key_id no body do PUT
     ```

   - Secrets nunca retornam o valor — apenas metadata (nome, timestamps)

Sinal de conclusão: escreva "AGENT-TOOLS-ENVS: DONE" ao terminar.
"""

─────────────────────────────────────────────────────────────────────
PROMPT PARA AGENT-TOOLS-RELEASES:
"""
Você é AGENT-TOOLS-RELEASES. Leia a seção "STEP 7" do IMPLEMENTATION_PLAN.md.

Crie 2 arquivos:

1. src/tools/releases.ts
   - Export const releasesTools (7 tools)
   - Export async function handleReleasesTool(...)
   - Tools: list_releases, get_release, get_latest_release, create_release, 

            update_release, delete_release, generate_release_notes

   - list_releases: exibe badge [DRAFT] e [PRE-RELEASE] quando aplicável
   - get_release: inclui contagem de assets e seus download URLs
   - generate_release_notes: POST /repos/{owner}/{repo}/releases/generate-notes

     body: { tag_name, target_commitish, previous_tag_name? }

2. src/tools/branches.ts
   - Export const branchesTools (7 tools)
   - Export async function handleBranchesTool(...)
   - Tools: list_branches, get_branch, get_branch_protection, 

            update_branch_protection, delete_branch_protection,
            get_commit_status, list_commit_statuses

   - get_branch_protection: formata as protection rules de forma legível
   - get_commit_status: retorna combined state (success/failure/pending)

     com contagem de statuses individuais

Sinal de conclusão: escreva "AGENT-TOOLS-RELEASES: DONE" ao terminar.
"""

─────────────────────────────────────────────────────────────────────
PROMPT PARA AGENT-TOOLS-PRS:
"""
Você é AGENT-TOOLS-PRS. Leia a seção "STEP 8" do IMPLEMENTATION_PLAN.md.

Crie 2 arquivos:

1. src/tools/pull-requests.ts
   - Export const pullRequestsTools (7 tools)
   - Export async function handlePullRequestsTool(...)
   - Tools: list_pull_requests, get_pull_request, list_pr_commits, 

            list_pr_files, list_pr_reviews, merge_pull_request,
            get_pr_ci_status

   - get_pr_ci_status é HIGH-LEVEL: faz 3 chamadas em paralelo via Promise.all():

     1) GET /repos/{owner}/{repo}/pulls/{pull_number} → HEAD SHA
     2) GET /repos/{owner}/{repo}/commits/{sha}/check-runs
     3) GET /repos/{owner}/{repo}/commits/{sha}/status
     Combina e formata resumo unificado com contagens e estados

   - merge_pull_request: merge_method deve ser enum (merge/squash/rebase)
   - list_pull_requests: suporta filtros state, head, base, sort, direction

2. src/tools/checks.ts
   - Export const checksTools (4 tools)
   - Export async function handleChecksTool(...)
   - Tools: list_check_runs_for_ref, get_check_run, 

            list_check_suites, rerequest_check_suite

   - list_check_runs_for_ref: usa formatCheckConclusion de formatters.ts
   - get_check_run: inclui output.annotations se presente

Sinal de conclusão: escreva "AGENT-TOOLS-PRS: DONE" ao terminar.
"""

─────────────────────────────────────────────────────────────────────
PROMPT PARA AGENT-TOOLS-SECURITY:
"""
Você é AGENT-TOOLS-SECURITY. Leia a seção "STEP 9" do IMPLEMENTATION_PLAN.md.

Crie 3 arquivos:

1. src/tools/security.ts
   - Export const securityTools (8 tools)
   - Export async function handleSecurityTool(...)
   - Tools: list_dependabot_alerts, get_dependabot_alert, 

            update_dependabot_alert, list_code_scanning_alerts,
            get_code_scanning_alert, list_secret_scanning_alerts,
            get_secret_scanning_alert, get_security_overview

   - get_security_overview é HIGH-LEVEL: usa Promise.allSettled() para

     buscar os 3 tipos de alerts simultaneamente (alguns repos podem não
     ter code scanning habilitado — use allSettled, não all)

   - Formata output com contagens por severidade e exemplos dos piores alertas

2. src/tools/packages.ts
   - Export const packagesTools (4 tools)
   - Export async function handlePackagesTool(...)
   - Tools: list_packages, get_package, list_package_versions, 

            delete_package_version

   - Endpoints: /user/packages?package_type={type}
   - package_type enum: npm, maven, docker, nuget, container, rubygems

3. src/tools/repository.ts
   - Export const repositoryTools (6 tools)
   - Export async function handleRepositoryTool(...)
   - Tools: get_repository, list_webhooks, create_webhook, delete_webhook, 

            list_repository_topics, get_repository_stats

   - get_repository_stats é HIGH-LEVEL: busca em paralelo com Promise.all():

     repo info, languages, top-10 contributors, commit activity (últimas 4 semanas)

Sinal de conclusão: escreva "AGENT-TOOLS-SECURITY: DONE" ao terminar.
"""

─────────────────────────────────────────────────────────────────────
PROMPT PARA AGENT-EXTENSION:
"""
Você é AGENT-EXTENSION. Leia a seção "STEP 11" do IMPLEMENTATION_PLAN.md.

Crie os seguintes arquivos na pasta extension/:

1. extension/src/types.ts
   - Interfaces: GitHubDevOpsConfig, WebviewMessage, WebviewResponse

2. extension/src/extension.ts — extensão VS Code completa com:
   - activate() e deactivate()
   - Auto-detect owner/repo via `git remote get-url origin`

     (regex para HTTPS: github.com/owner/repo e SSH: github.com:owner/repo)

   - Registro do MCP Server via vscode.lm.registerMcpServerDefinitionProvider
   - McpStdioServerDefinition('gh-devops', 'node', [mcpServerPath], env)
   - SecretStorage para o token (key: 'ghDevops.token')
   - StatusBarItem com ícone $(github)
   - 5 comandos: ghDevops.configure, testConnection, restart, selectRepo, viewDocs
   - Welcome message versionada via context.globalState
   - IMPORTANTE: module = CommonJS — imports SEM extensão .js

3. extension/src/settings-webview.ts — WebviewPanel para configuração:
   - Cria painel com createWebviewPanel
   - Carrega extension/webview/settings.html via fs.readFileSync
   - handleMessage(): trata saveToken (SecretStorage), testConnection (fetch /user), 

     saveSettings (workspace config update via vscode.workspace.getConfiguration)

4. extension/webview/settings.html — formulário completo com:
   - Campos: GitHub Token (password), API URL, Default Owner, Default Repo
   - Botões: "Test Connection" e "Save Settings"
   - Estilo dark compatível com VS Code (var(--vscode-*) CSS variables)
   - Script inline com acquireVsCodeApi() e postMessage

Após criar os arquivos, execute `cd extension && npm run compile` e
corrija quaisquer erros TypeScript antes de reportar.

Sinal de conclusão: escreva "AGENT-EXTENSION: DONE" ao terminar.
"""

─────────────────────────────────────────────────────────────────────
PROMPT PARA AGENT-ICON:
"""
Você é AGENT-ICON. Crie o ícone da extensão no diretório extension/.

1. extension/icon.svg — SVG 128x128 com:
   - Fundo círculo escuro (#1a1a2e ou similar)
   - Ícone do GitHub Octocat ou marca GitHub estilizada
   - Engrenagem ou símbolo DevOps sobreposto
   - Cores: azul GitHub (#0969da) e branco

2. extension/create-icon.js — Script Node.js comentado explicando como
   converter o SVG para PNG usando rsvg-convert ou sharp. Se não houver
   ferramenta disponível, gera um PNG mínimo válido via Buffer hardcoded.

3. extension/icon.png — PNG 128x128. Se não for possível gerar
   programaticamente, crie um PNG mínimo válido (1x1 pixel) como placeholder.

Sinal de conclusão: escreva "AGENT-ICON: DONE" ao terminar.
"""

─────────────────────────────────────────────────────────────────────
PROMPT PARA AGENT-DOCS:
"""
Você é AGENT-DOCS. Leia a seção "STEP 13" do IMPLEMENTATION_PLAN.md.

Crie os seguintes arquivos:

1. extension/resources/instructions/github-devops.instructions.md
   - Guia completo de uso para o GitHub Copilot
   - 5 fluxos de troubleshooting (CI/CD, Security, Deployments, Releases, PR CI)
   - Lista de todas as 65 tools organizadas por categoria
   - Convenções de parâmetros (owner/repo opcionais, filtros, per_page)
   - Pelo menos 200 linhas

2. extension/.vscodeignore
   - Exclui src/, node_modules/, tsconfig.json, .gitignore
   - INCLUI mcp-server/node_modules/ com negação: !mcp-server/node_modules/**
   - Exclui *.vsix, .env, . DS_Store, *.log

3. extension/CHANGELOG.md
   - Versão 1.0.0 com lista completa de features adicionadas

4. extension/README.md
   - Título, descrição, seção de requisitos (GitHub Token + scopes)
   - Seção de configuração (como configurar token, owner, repo)
   - Todos os 65 tools listados por categoria
   - Fluxos de uso com exemplos de prompts para o Copilot
   - Pelo menos 150 linhas

5. README.md (root)
   - README do MCP Server standalone
   - Como instalar e usar via npx ou node direto
   - Lista de env vars necessárias (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO)
   - Tabela de todos os tools por domínio

Sinal de conclusão: escreva "AGENT-DOCS: DONE" ao terminar.
"""

╔══════════════════════════════════════════════════════════════════════╗
║ FASE 3 — SERVER ENTRY POINT (após Fase 2 concluída)                  ║
╚══════════════════════════════════════════════════════════════════════╝

[ORCHESTRATOR] Aguarda receber TODOS os 10 sinais "DONE" da Fase 2.
[ORCHESTRATOR] Então dispara AGENT-SERVER.

PROMPT PARA AGENT-SERVER (STEP 10):
"""
Você é AGENT-SERVER. A Fase 2 está concluída. Todos os arquivos de tools
foram criados. Leia a seção "STEP 10: MCP Server Entry Point" do plano.

Crie src/index.ts com:

Linha 1: #!/usr/bin/env node

Imports obrigatórios (todos com .js):
* @modelcontextprotocol/sdk/server/index.js
* @modelcontextprotocol/sdk/server/stdio.js
* @modelcontextprotocol/sdk/types.js
* ./client/github-client.js
* ./client/auth.js
* Todos os 13 pares [<domain>Tools, handle<Domain>Tool] dos arquivos de tools

Classe GitHubDevOpsServer:
* constructor: lê getCredentialsFromEnv(), instancia GitHubClient se token presente, 
  instancia Server({ name: 'gh-devops-mcp', version: '1.0.0' }), 
  chama buildToolHandlerMap(), setupHandlers(), setupErrorHandling()
* buildToolHandlerMap(): usa Map<string, ToolHandler>; itera cada domain tools array
  e registra o handler correspondente via helper register()
* setupHandlers():
  ListToolsRequestSchema → spread de todos os 13 arrays de tools
  CallToolRequestSchema → se !client, retorna mensagem de setup; 

    senão lookup no Map e chama handler

* setupErrorHandling(): server.onerror + SIGINT handler
* run(): StdioServerTransport + server.connect()

Após criar, execute `npm run build` e confirme ZERO erros TypeScript.
Se houver erros, corrija-os antes de reportar.

Sinal de conclusão: escreva "AGENT-SERVER: DONE" ao terminar.
"""

╔══════════════════════════════════════════════════════════════════════╗
║ FASE 4 — BUILD, QA & GIT (ORCHESTRATOR executa pessoalmente)         ║
╚══════════════════════════════════════════════════════════════════════╝

[ORCHESTRATOR] Após receber "AGENT-SERVER: DONE", execute cada etapa
abaixo em sequência, corrigindo erros antes de avançar:

```bash
# Etapa 1: Build MCP Server
cd /Users/gleidsonfersanp/workspace/AI/gh-devops-mcp
npm install
npm run build
# → Deve compilar sem erros TypeScript

# Etapa 2: Copiar servidor para extension
npm run copy-to-extension
# → extension/mcp-server/ deve existir com index.js + node_modules

# Etapa 3: Build Extension
cd extension
npm install
npm run compile
# → Deve compilar sem erros TypeScript

# Etapa 4: Smoke test do servidor MCP
cd ..
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
  GITHUB_TOKEN=dummy node dist/index.js 2>/dev/null | head -5
# → Deve retornar JSON com array de tools (sem crash)

# Etapa 5: Verificar contagem de tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
  GITHUB_TOKEN=dummy node dist/index.js 2>/dev/null | \
  node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); \
           const j=JSON.parse(d); console.log('Tools count:', j.result?.tools?.length)"
# → Deve ser >= 60

# Etapa 6: Commit e push
git add -A
git commit -m "feat: complete implementation of gh-devops-mcp with 65 GitHub DevOps tools

- MCP Server with 65 tools across 13 GitHub API domains
- Workflows, Runs, Jobs, Artifacts, Deployments, Environments
- Secrets, Variables, Releases, Branches, Pull Requests, Checks
- Security (Dependabot, Code Scanning, Secret Scanning)
- GitHub Packages, Repository management
- VS Code Extension with auto-detect repo from git remote
- Settings webview with token management
- Copilot Chat instructions with 5 troubleshooting flows"
git push origin main
```

Ao finalizar, reporte:
* Número de tools compiladas com sucesso
* Quaisquer issues encontradas e como foram resolvidas
* Hash do commit final

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROTOCOLO DE COMUNICAÇÃO ENTRE AGENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cada agent DEVE:
  ✓ Reportar arquivos criados (path + linhas)
  ✓ Reportar erros encontrados e como corrigiu
  ✓ Confirmar que npm run build (ou compile) passou sem erros
  ✓ Emitir o sinal "AGENT-<NAME>: DONE" ao final

O Orchestrator DEVE:
  ✓ Bloquear início da Fase 2 até "AGENT-CLIENT: DONE"
  ✓ Bloquear início da Fase 3 até TODOS os 10 sinais da Fase 2
  ✓ Bloquear Fase 4 até "AGENT-SERVER: DONE"
  ✓ Se agent reportar ERRO IRRECUPERÁVEL, assumir a tarefa daquele agent

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REFERÊNCIAS RÁPIDAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Plano completo:
/Users/gleidsonfersanp/workspace/AI/gh-devops-mcp/IMPLEMENTATION_PLAN.md

Projeto referência (mesma arquitetura):
/Users/gleidsonfersanp/workspace/AI/datadog-mcp/

Repositório alvo:
/Users/gleidsonfersanp/workspace/AI/gh-devops-mcp/

GitHub REST API:
https://docs.github.com/en/rest

MCP SDK:
https://github.com/modelcontextprotocol/sdk

════════════════════════════════════════════════════════════════════════
INICIE A FASE 1 AGORA.
════════════════════════════════════════════════════════════════════════
````
