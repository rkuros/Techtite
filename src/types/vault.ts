export interface Vault {
  id: string;
  path: string;
  name: string;
  isGitRepo: boolean;
  config: VaultConfig;
}

export interface VaultConfig {
  sessionLogDir: string;
  ragEnabled: boolean;
  autoSyncEnabled: boolean;
  autoSyncIntervalSec: number;
  logGranularity: LogGranularity;
}

export type LogGranularity = "detailed" | "standard" | "compact";
