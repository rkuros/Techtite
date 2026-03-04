import type { GitFileStatus } from "./file";

export interface GitStatus {
  branch: string;
  isClean: boolean;
  staged: FileChange[];
  unstaged: FileChange[];
  untracked: string[];
}

export interface FileChange {
  path: string;
  status: GitFileStatus;
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  timestamp: string;
  isAutoCommit: boolean;
  changedFiles: string[];
}

export interface DiffHunk {
  filePath: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  lineType: "context" | "addition" | "deletion";
  content: string;
}

export interface BranchInfo {
  name: string;
  isCurrent: boolean;
  upstream: string | null;
  ahead: number;
  behind: number;
}

export interface ConflictInfo {
  filePath: string;
  conflictType:
    | "content"
    | "both_modified"
    | "deleted_by_us"
    | "deleted_by_them"
    | "both_added";
  localContent: string;
  remoteContent: string;
  baseContent: string | null;
}

export interface SyncState {
  status: "idle" | "syncing" | "completed" | "error";
  lastSyncAt: string | null;
  errorMessage: string | null;
}
