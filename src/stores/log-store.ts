import { create } from "zustand";
import { invokeCommand, listenEvent } from "@/shared/utils/ipc";
import type {
  SessionLog,
  DailyLog,
  CaptureEvent,
  AmbientStatus,
  TaskCheckResult,
} from "@/types/log";

interface LogStoreState {
  // Session logs
  sessionLogs: SessionLog[];
  dailyLogs: DailyLog[];
  activeLogId: string | null;
  activeLogContent: string | null;

  // Capture events
  captureEvents: CaptureEvent[];

  // Filters
  filterDate: string | null;
  filterAgentName: string | null;

  // Ambient agent
  ambientStatus: AmbientStatus;
  checkResults: TaskCheckResult[];

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSessionLogs: () => Promise<void>;
  fetchDailyLogs: (date: string) => Promise<void>;
  fetchCaptureEvents: (options?: {
    since?: string;
    limit?: number;
    agentId?: string;
  }) => Promise<void>;
  setActiveLog: (logId: string, filePath: string) => Promise<void>;
  setFilters: (date: string | null, agentName: string | null) => void;
  fetchAmbientStatus: () => Promise<void>;
  fetchCheckResults: () => Promise<void>;
  clearError: () => void;
}

export const useLogStore = create<LogStoreState>((set, get) => ({
  // Initial state
  sessionLogs: [],
  dailyLogs: [],
  activeLogId: null,
  activeLogContent: null,
  captureEvents: [],
  filterDate: null,
  filterAgentName: null,
  ambientStatus: {
    isRunning: false,
    lastCheckAt: null,
    taskCompletionRate: 0,
  },
  checkResults: [],
  isLoading: false,
  error: null,

  fetchSessionLogs: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filterDate, filterAgentName } = get();
      const logs = await invokeCommand<SessionLog[]>("session_log_list", {
        date: filterDate ?? null,
        agentName: filterAgentName ?? null,
      });
      set({ sessionLogs: logs, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  fetchDailyLogs: async (date: string) => {
    try {
      const daily = await invokeCommand<DailyLog | null>(
        "session_log_get_daily",
        { date }
      );
      if (daily) {
        set((state) => {
          // Replace existing daily log for this date or add new one
          const existing = state.dailyLogs.filter((d) => d.date !== date);
          return { dailyLogs: [...existing, daily] };
        });
      }
    } catch (err) {
      set({ error: String(err) });
    }
  },

  fetchCaptureEvents: async (options?: {
    since?: string;
    limit?: number;
    agentId?: string;
  }) => {
    try {
      const events = await invokeCommand<CaptureEvent[]>(
        "capture_get_events",
        {
          since: options?.since ?? null,
          limit: options?.limit ?? null,
          agentId: options?.agentId ?? null,
        }
      );
      set({ captureEvents: events });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  setActiveLog: async (logId: string, filePath: string) => {
    set({ activeLogId: logId, isLoading: true, error: null });
    try {
      const content = await invokeCommand<string>("session_log_get_content", {
        path: filePath,
      });
      set({ activeLogContent: content, isLoading: false });
    } catch (err) {
      set({
        activeLogContent: null,
        error: String(err),
        isLoading: false,
      });
    }
  },

  setFilters: (date: string | null, agentName: string | null) => {
    set({ filterDate: date, filterAgentName: agentName });
    // Re-fetch with new filters
    get().fetchSessionLogs();
  },

  fetchAmbientStatus: async () => {
    try {
      const status = await invokeCommand<AmbientStatus>("ambient_get_status");
      set({ ambientStatus: status });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  fetchCheckResults: async () => {
    try {
      const results = await invokeCommand<TaskCheckResult[]>(
        "ambient_get_check_results"
      );
      set({ checkResults: results });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

// ---------------------------------------------------------------------------
// Event subscriptions -- call once at app initialization
// ---------------------------------------------------------------------------

let eventsInitialized = false;

/**
 * Initialize event listeners for session log and ambient agent events.
 * Should be called once during app startup (e.g., in a top-level useEffect).
 */
export async function initLogEventListeners(): Promise<() => void> {
  if (eventsInitialized) return () => {};
  eventsInitialized = true;

  const unlisteners: (() => void)[] = [];

  // Session log updated (emitted when a session completes or daily log is generated)
  const unlistenSessionLog = await listenEvent<SessionLog>(
    "session_log:updated",
    () => {
      useLogStore.getState().fetchSessionLogs();
    }
  );
  unlisteners.push(unlistenSessionLog);

  // Ambient alert (emitted when ambient agent detects an issue)
  const unlistenAmbient = await listenEvent<TaskCheckResult>(
    "ambient:alert",
    (result) => {
      useLogStore.setState((state) => ({
        checkResults: [...state.checkResults, result],
      }));
      // Also refresh status
      useLogStore.getState().fetchAmbientStatus();
    }
  );
  unlisteners.push(unlistenAmbient);

  return () => {
    eventsInitialized = false;
    unlisteners.forEach((fn) => fn());
  };
}
