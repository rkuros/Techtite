export interface CostRecord {
  agentId: string;
  agentName: string;
  agentCategory: "worker" | "ambient" | "rag";
  timestamp: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

export interface CostSummary {
  period: CostPeriod;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byAgent: AgentCostBreakdown[];
}

export type CostPeriod = "daily" | "weekly" | "monthly";

export interface AgentCostBreakdown {
  agentId: string;
  agentName: string;
  costUsd: number;
  tokens: number;
}

export interface BudgetConfig {
  dailyLimitUsd: number | null;
  monthlyLimitUsd: number | null;
  warningThreshold: number;
}

export interface DailyCostPoint {
  date: string;
  costUsd: number;
  tokens: number;
}

export interface LogStorageStatus {
  totalSizeBytes: number;
  rawLogSizeBytes: number;
  compressedSizeBytes: number;
  retentionDays: number;
}

export interface LogRotationConfig {
  retentionDays: number;
  maxSizeBytes: number | null;
  filterRules: FilterRule[];
}

export interface FilterRule {
  pattern: string;
  action: "exclude" | "truncate";
  maxLineCount?: number;
}

export interface CredentialEntry {
  key: string;
  service: string;
  lastUpdatedAt: string;
}

export interface SandboxConfig {
  enabled: boolean;
  allowedCommands: string[];
  blockedCommands: string[];
  restrictedPaths: string[];
}
