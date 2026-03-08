export interface SessionLog {
  id: string;
  agentName: string;
  date: string;
  sessionNumber: number;
  startedAt: string;
  endedAt: string | null;
  summary: string | null;
  filePath: string;
}

export interface DailyLog {
  id: string;
  date: string;
  sessions: SessionLogSummary[];
  totalFilesChanged: number;
  totalCommits: number;
  filePath: string;
}

export interface SessionLogSummary {
  agentName: string;
  summary: string;
  filesChanged: number;
  commits: number;
}

export type CaptureEventType =
  | "file_created"
  | "file_modified"
  | "file_deleted"
  | "file_renamed"
  | "git_commit"
  | "git_push"
  | "git_pull"
  | "terminal_command";

export interface CaptureEvent {
  id: string;
  eventType: CaptureEventType;
  timestamp: string;
  filePath: string | null;
  agentId: string | null;
  summary: string;
  rawData: string | null;
}

export interface AmbientStatus {
  isRunning: boolean;
  lastCheckAt: string | null;
  taskCompletionRate: number;
}

export interface TaskCheckResult {
  agentId: string;
  agentName: string;
  task: string;
  isCompleted: boolean;
  checkedAt: string;
  message: string | null;
}
