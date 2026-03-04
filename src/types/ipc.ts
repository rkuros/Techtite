// IPC command and event type definitions
// Used by the IPC wrapper and event listener hooks

export type FsChangeType = "created" | "modified" | "deleted" | "renamed";

export interface FsChangedPayload {
  path: string;
  changeType: FsChangeType;
}

export interface FsExternalChangePayload {
  path: string;
  agentId?: string;
}

export interface TerminalOutputPayload {
  id: string;
  data: string;
}

export interface TerminalExitPayload {
  id: string;
  exitCode: number;
}

export interface CostUpdatedPayload {
  totalCostUsd: number;
  periodUsage: number;
}

export interface CostWarningPayload {
  message: string;
  usage: number;
  limit: number;
}

export interface PublishProgressPayload {
  platform: string;
  step: string;
}

export interface AmbientAlertPayload {
  message: string;
  severity: "info" | "warning" | "error";
}
