export interface GitHubDevOpsConfig {
  token: string;
  apiUrl: string;
  defaultOwner: string;
  defaultRepo: string;
}

export interface WebviewMessage {
  command: 'saveToken' | 'testConnection' | 'saveSettings' | 'ready';
  token?: string;
  apiUrl?: string;
  defaultOwner?: string;
  defaultRepo?: string;
}

export interface WebviewResponse {
  command: 'tokenSaved' | 'connectionResult' | 'settingsSaved' | 'error' | 'init';
  success?: boolean;
  message?: string;
  config?: Partial<GitHubDevOpsConfig>;
}
