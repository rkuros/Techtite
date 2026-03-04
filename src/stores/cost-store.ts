import { create } from "zustand";
import { invokeCommand } from "@/shared/utils/ipc";
import type {
  CostSummary,
  BudgetConfig,
  DailyCostPoint,
  CredentialEntry,
  SandboxConfig,
  LogStorageStatus,
  LogRotationConfig,
} from "@/types/cost";

interface CostStoreState {
  // Cost tracking
  summary: CostSummary | null;
  trend: DailyCostPoint[];
  budget: BudgetConfig | null;
  isLoadingSummary: boolean;
  isLoadingTrend: boolean;

  // Credentials
  credentials: CredentialEntry[];
  isLoadingCredentials: boolean;

  // Sandbox
  sandboxConfig: SandboxConfig | null;

  // Log rotation
  logStatus: LogStorageStatus | null;

  // Cost actions
  fetchSummary: (period: "daily" | "weekly" | "monthly") => Promise<void>;
  fetchTrend: (days?: number) => Promise<void>;
  fetchBudget: () => Promise<void>;
  setBudget: (config: BudgetConfig) => Promise<void>;

  // Credential actions
  fetchCredentials: () => Promise<void>;
  addCredential: (
    key: string,
    value: string,
    service: string
  ) => Promise<void>;
  deleteCredential: (key: string) => Promise<void>;

  // Sandbox actions
  fetchSandboxConfig: () => Promise<void>;
  setSandboxConfig: (config: SandboxConfig) => Promise<void>;

  // Log rotation actions
  fetchLogStatus: () => Promise<void>;
  setLogRotationConfig: (config: LogRotationConfig) => Promise<void>;
}

export const useCostStore = create<CostStoreState>((set) => ({
  // Initial state
  summary: null,
  trend: [],
  budget: null,
  isLoadingSummary: false,
  isLoadingTrend: false,
  credentials: [],
  isLoadingCredentials: false,
  sandboxConfig: null,
  logStatus: null,

  // ---------- Cost actions ----------

  fetchSummary: async (period) => {
    set({ isLoadingSummary: true });
    try {
      const summary = await invokeCommand<CostSummary>("cost_get_summary", {
        period,
      });
      set({ summary });
    } catch (err) {
      console.error("Failed to fetch cost summary:", err);
    } finally {
      set({ isLoadingSummary: false });
    }
  },

  fetchTrend: async (days = 30) => {
    set({ isLoadingTrend: true });
    try {
      const trend = await invokeCommand<DailyCostPoint[]>("cost_get_trend", {
        days,
      });
      set({ trend });
    } catch (err) {
      console.error("Failed to fetch cost trend:", err);
    } finally {
      set({ isLoadingTrend: false });
    }
  },

  fetchBudget: async () => {
    try {
      const budget = await invokeCommand<BudgetConfig>("cost_get_budget");
      set({ budget });
    } catch (err) {
      console.error("Failed to fetch budget:", err);
    }
  },

  setBudget: async (config) => {
    try {
      await invokeCommand("cost_set_budget", { config });
      set({ budget: config });
    } catch (err) {
      console.error("Failed to set budget:", err);
    }
  },

  // ---------- Credential actions ----------

  fetchCredentials: async () => {
    set({ isLoadingCredentials: true });
    try {
      const credentials =
        await invokeCommand<CredentialEntry[]>("credential_list");
      set({ credentials });
    } catch (err) {
      console.error("Failed to fetch credentials:", err);
    } finally {
      set({ isLoadingCredentials: false });
    }
  },

  addCredential: async (key, value, service) => {
    try {
      await invokeCommand("credential_set", { key, value, service });
      // Re-fetch to get updated list with timestamp
      const credentials =
        await invokeCommand<CredentialEntry[]>("credential_list");
      set({ credentials });
    } catch (err) {
      console.error("Failed to add credential:", err);
    }
  },

  deleteCredential: async (key) => {
    try {
      await invokeCommand("credential_delete", { key });
      set((state) => ({
        credentials: state.credentials.filter((c) => c.key !== key),
      }));
    } catch (err) {
      console.error("Failed to delete credential:", err);
    }
  },

  // ---------- Sandbox actions ----------

  fetchSandboxConfig: async () => {
    try {
      const sandboxConfig =
        await invokeCommand<SandboxConfig>("sandbox_get_config");
      set({ sandboxConfig });
    } catch (err) {
      console.error("Failed to fetch sandbox config:", err);
    }
  },

  setSandboxConfig: async (config) => {
    try {
      await invokeCommand("sandbox_set_config", { config });
      set({ sandboxConfig: config });
    } catch (err) {
      console.error("Failed to set sandbox config:", err);
    }
  },

  // ---------- Log rotation actions ----------

  fetchLogStatus: async () => {
    try {
      const logStatus =
        await invokeCommand<LogStorageStatus>("log_rotation_get_status");
      set({ logStatus });
    } catch (err) {
      console.error("Failed to fetch log status:", err);
    }
  },

  setLogRotationConfig: async (config) => {
    try {
      await invokeCommand("log_rotation_set_config", { config });
      // Re-fetch status since retention days may have changed
      const logStatus =
        await invokeCommand<LogStorageStatus>("log_rotation_get_status");
      set({ logStatus });
    } catch (err) {
      console.error("Failed to set log rotation config:", err);
    }
  },
}));
