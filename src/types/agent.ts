export interface AgentInfo {
  id: string;
  name: string;
  agentType: "worker" | "ambient";
  status: AgentStatus;
  startedAt: string;
  currentTask: string | null;
  terminalTabId: string | null;
  pid: number | null;
}

export type AgentStatus =
  | { type: "running" }
  | { type: "idle" }
  | { type: "completed" }
  | { type: "error"; message: string }
  | { type: "stopped" };

export interface AgentConfig {
  name: string;
  initialPrompt?: string;
  workingDirectory?: string;
  mode: "cli" | "sdk";
}

export interface OperationLogEntry {
  timestamp: string;
  agentId: string;
  agentName: string;
  operation: "create" | "modify" | "delete" | "rename" | "commit";
  targetPath: string;
  summary: string | null;
}
