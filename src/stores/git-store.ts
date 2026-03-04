import { create } from "zustand";
import { invokeCommand, listenEvent } from "@/shared/utils/ipc";
import type {
  GitStatus,
  CommitInfo,
  DiffHunk,
  BranchInfo,
  ConflictInfo,
  SyncState,
} from "@/types/git";

interface GitStoreState {
  // Git status
  gitStatus: GitStatus | null;
  isLoading: boolean;
  error: string | null;

  // Sync state
  syncState: SyncState;

  // Diff
  currentDiff: DiffHunk[];
  selectedDiffPath: string | null;

  // Commit history
  commitHistory: CommitInfo[];

  // Branches
  branches: BranchInfo[];
  currentBranch: string;

  // Conflicts
  conflicts: ConflictInfo[];
  isConflictModalOpen: boolean;

  // Actions
  fetchStatus: () => Promise<void>;
  stageFiles: (paths: string[]) => Promise<void>;
  unstageFiles: (paths: string[]) => Promise<void>;
  commit: (message: string) => Promise<string>;
  fetchDiff: (path?: string, staged?: boolean) => Promise<void>;
  fetchCommitDiff: (hash: string) => Promise<void>;
  fetchLog: (limit?: number, offset?: number) => Promise<void>;
  fetchBranches: () => Promise<void>;
  createBranch: (name: string) => Promise<void>;
  checkoutBranch: (name: string) => Promise<void>;
  triggerSync: () => Promise<void>;
  resolveConflict: (
    path: string,
    resolution: string,
    mergedContent?: string
  ) => Promise<void>;
  setConflictModalOpen: (open: boolean) => void;
  clearError: () => void;
}

export const useGitStore = create<GitStoreState>((set, get) => ({
  // Initial state
  gitStatus: null,
  isLoading: false,
  error: null,
  syncState: { status: "idle", lastSyncAt: null, errorMessage: null },
  currentDiff: [],
  selectedDiffPath: null,
  commitHistory: [],
  branches: [],
  currentBranch: "main",
  conflicts: [],
  isConflictModalOpen: false,

  fetchStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const status = await invokeCommand<GitStatus>("get_status");
      set({
        gitStatus: status,
        currentBranch: status.branch,
        isLoading: false,
      });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  stageFiles: async (paths: string[]) => {
    try {
      await invokeCommand("stage", { paths });
      // Refresh status after staging
      await get().fetchStatus();
    } catch (err) {
      set({ error: String(err) });
    }
  },

  unstageFiles: async (paths: string[]) => {
    try {
      await invokeCommand("unstage", { paths });
      // Refresh status after unstaging
      await get().fetchStatus();
    } catch (err) {
      set({ error: String(err) });
    }
  },

  commit: async (message: string) => {
    try {
      const hash = await invokeCommand<string>("commit", { message });
      // Refresh status and history after commit
      await get().fetchStatus();
      await get().fetchLog();
      return hash;
    } catch (err) {
      set({ error: String(err) });
      throw err;
    }
  },

  fetchDiff: async (path?: string, staged?: boolean) => {
    try {
      const diff = await invokeCommand<DiffHunk[]>("get_diff", {
        path: path ?? null,
        staged: staged ?? false,
      });
      set({ currentDiff: diff, selectedDiffPath: path ?? null });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  fetchCommitDiff: async (hash: string) => {
    try {
      const diff = await invokeCommand<DiffHunk[]>("get_commit_diff", {
        hash,
      });
      set({ currentDiff: diff });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  fetchLog: async (limit?: number, offset?: number) => {
    try {
      const log = await invokeCommand<CommitInfo[]>("get_log", {
        limit: limit ?? 50,
        offset: offset ?? null,
      });
      set({ commitHistory: log });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  fetchBranches: async () => {
    try {
      const branches = await invokeCommand<BranchInfo[]>("get_branches");
      const current = branches.find((b) => b.isCurrent);
      set({
        branches,
        currentBranch: current?.name ?? "main",
      });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  createBranch: async (name: string) => {
    try {
      await invokeCommand("create_branch", { name });
      await get().fetchBranches();
    } catch (err) {
      set({ error: String(err) });
    }
  },

  checkoutBranch: async (name: string) => {
    try {
      await invokeCommand("checkout_branch", { name });
      await get().fetchStatus();
      await get().fetchBranches();
    } catch (err) {
      set({ error: String(err) });
    }
  },

  triggerSync: async () => {
    try {
      await invokeCommand("trigger_now");
    } catch (err) {
      set({ error: String(err) });
    }
  },

  resolveConflict: async (
    path: string,
    resolution: string,
    mergedContent?: string
  ) => {
    try {
      await invokeCommand("resolve_conflict", {
        path,
        resolution,
        mergedContent: mergedContent ?? null,
      });
      // Remove resolved conflict from the list
      set((state) => ({
        conflicts: state.conflicts.filter((c) => c.filePath !== path),
        isConflictModalOpen:
          state.conflicts.filter((c) => c.filePath !== path).length > 0,
      }));
    } catch (err) {
      set({ error: String(err) });
    }
  },

  setConflictModalOpen: (open: boolean) => {
    set({ isConflictModalOpen: open });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// ---------------------------------------------------------------------------
// Event subscriptions — call once at app initialization
// ---------------------------------------------------------------------------

let eventsInitialized = false;

/**
 * Initialize event listeners for git and sync state changes.
 * Should be called once during app startup (e.g., in a top-level useEffect).
 */
export async function initGitEventListeners(): Promise<() => void> {
  if (eventsInitialized) return () => {};
  eventsInitialized = true;

  const unlisteners: (() => void)[] = [];

  // Git status changed (emitted after commit, pull, file changes)
  const unlistenStatus = await listenEvent<GitStatus>(
    "git:status_changed",
    (status) => {
      useGitStore.setState({
        gitStatus: status,
        currentBranch: status.branch,
      });
    }
  );
  unlisteners.push(unlistenStatus);

  // Sync state changed (idle -> syncing -> completed/error)
  const unlistenSync = await listenEvent<SyncState>(
    "sync:state_changed",
    (state) => {
      useGitStore.setState({ syncState: state });
    }
  );
  unlisteners.push(unlistenSync);

  // Conflict detected (opens the conflict resolution modal)
  const unlistenConflict = await listenEvent<ConflictInfo[]>(
    "sync:conflict_detected",
    (conflicts) => {
      useGitStore.setState({
        conflicts,
        isConflictModalOpen: true,
      });
    }
  );
  unlisteners.push(unlistenConflict);

  // Conflict resolved
  const unlistenResolved = await listenEvent<{
    path: string;
    resolution: string;
  }>("sync:conflict_resolved", ({ path }) => {
    useGitStore.setState((state) => ({
      conflicts: state.conflicts.filter((c) => c.filePath !== path),
    }));
  });
  unlisteners.push(unlistenResolved);

  return () => {
    eventsInitialized = false;
    unlisteners.forEach((fn) => fn());
  };
}
