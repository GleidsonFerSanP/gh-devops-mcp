# Changelog

## [1.0.2] - 2026-02-22

### Fixed

* Copy `libsodium.mjs` next to `libsodium-wrappers.mjs` to fix `ERR_MODULE_NOT_FOUND` crash on startup

## [1.0.1] - 2026-02-22

### Fixed

* Output Channel criado (`View > Output > GitHub DevOps MCP`) para logs da extensão
* Corrigido path do servidor MCP (`mcp-server/index.js` em vez de `mcp-server/dist/index.js`)
* Guard de API para `vscode.lm.registerMcpServerDefinitionProvider` (compatibilidade com VS Code < 1.99)
* Removido EventEmitter desnecessário no provider MCP

## [1.0.0] - 2026-02-22

### Added

* Initial release with 85 GitHub DevOps tools
* Workflow management (list, dispatch, enable/disable)
* Workflow runs with log streaming
* Artifacts download and management
* Deployments and deployment statuses
* Environment configuration and protection rules
* Secrets and variables management with encryption
* Release management with auto-generated notes
* Branch protection rules
* Pull request management with unified CI status
* Check runs and check suites
* Security alerts (Dependabot, code scanning, secret scanning)
* Package registry management
* Repository statistics and webhooks
* Secure token storage via VS Code SecretStorage
* Auto-detection of repository from git config
* Status bar indicator
* Settings webview UI
