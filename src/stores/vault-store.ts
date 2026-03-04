import { create } from "zustand";
import { invokeCommand } from "@/shared/utils/ipc";
import type { Vault, VaultConfig } from "@/types/vault";

interface VaultStoreState {
  currentVault: Vault | null;
  recentVaults: { path: string; name: string; lastOpenedAt: string }[];
  isLoading: boolean;
  error: string | null;

  openVault: (path: string) => Promise<void>;
  closeVault: () => void;
  selectFolder: () => Promise<string | null>;
  updateConfig: (config: VaultConfig) => Promise<void>;
}

export const useVaultStore = create<VaultStoreState>((set) => ({
  currentVault: null,
  recentVaults: [],
  isLoading: false,
  error: null,

  openVault: async (path: string) => {
    set({ isLoading: true, error: null });
    try {
      const vault = await invokeCommand<Vault>("open", { path });
      set({
        currentVault: vault,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: String(err),
        isLoading: false,
      });
    }
  },

  closeVault: () => {
    set({ currentVault: null });
  },

  selectFolder: async () => {
    try {
      return await invokeCommand<string | null>("select_folder");
    } catch {
      return null;
    }
  },

  updateConfig: async (config: VaultConfig) => {
    try {
      await invokeCommand("update_config", { config });
      set((state) => ({
        currentVault: state.currentVault
          ? { ...state.currentVault, config }
          : null,
      }));
    } catch (err) {
      set({ error: String(err) });
    }
  },
}));
