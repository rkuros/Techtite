import { create } from "zustand";
import { invokeCommand } from "@/shared/utils/ipc";
import type { Vault, VaultConfig, Project, SessionState } from "@/types/vault";

interface VaultStoreState {
  // Vault
  currentVault: Vault | null;
  recentVaults: { path: string; name: string; lastOpenedAt: string }[];
  isLoading: boolean;
  error: string | null;

  // Projects
  projects: Project[];
  currentProject: Project | null;

  // Project browsing (column view in main area)
  browsingProject: Project | null;
  setBrowsingProject: (project: Project | null) => void;

  // Session restore
  isRestoring: boolean;

  // Actions
  openVault: (path: string) => Promise<void>;
  closeVault: () => Promise<void>;
  deleteVault: () => Promise<void>;
  selectFolder: () => Promise<string | null>;
  updateConfig: (config: VaultConfig) => Promise<void>;

  // Project actions
  loadProjects: () => Promise<void>;
  setProject: (project: Project) => Promise<void>;
  clearProject: () => Promise<void>;
  addCustomProject: () => Promise<void>;
  removeCustomProject: (projectId: string) => Promise<void>;

  // Session
  restoreSession: () => Promise<void>;
}

export const useVaultStore = create<VaultStoreState>((set, get) => ({
  currentVault: null,
  recentVaults: [],
  isLoading: false,
  error: null,
  projects: [],
  currentProject: null,
  browsingProject: null,
  setBrowsingProject: (project) => set({ browsingProject: project }),
  isRestoring: false,

  restoreSession: async () => {
    set({ isRestoring: true });
    try {
      const session = await invokeCommand<SessionState | null>("get_session");
      if (session?.vaultPath) {
        // Open vault
        const vault = await invokeCommand<Vault>("open", { path: session.vaultPath });
        set({ currentVault: vault });

        // Load projects
        const projects = await invokeCommand<Project[]>("list_projects");
        set({ projects });

        // Restore project if saved
        if (session.projectPath) {
          const project = projects.find(p => p.path === session.projectPath);
          if (project) {
            await invokeCommand("set_active_project", { projectPath: project.path });
            set({ currentProject: project });
          }
        }
      }
    } catch (err) {
      console.warn("Session restore failed:", err);
      // Not critical — just show WelcomeScreen
    } finally {
      set({ isRestoring: false });
    }
  },

  openVault: async (path: string) => {
    set({ isLoading: true, error: null });
    try {
      const vault = await invokeCommand<Vault>("open", { path });
      const projects = await invokeCommand<Project[]>("list_projects");
      set({
        currentVault: vault,
        projects,
        currentProject: null,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: String(err),
        isLoading: false,
      });
    }
  },

  closeVault: async () => {
    try {
      await invokeCommand("close_vault");
    } catch {
      // If backend fails, still clear frontend state
    }
    set({ currentVault: null, projects: [], currentProject: null, error: null });
  },

  deleteVault: async () => {
    try {
      await invokeCommand("delete_vault");
      set({ currentVault: null, projects: [], currentProject: null, error: null });
    } catch (err) {
      set({ error: String(err) });
    }
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

  loadProjects: async () => {
    try {
      const projects = await invokeCommand<Project[]>("list_projects");
      set({ projects });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  setProject: async (project: Project) => {
    try {
      await invokeCommand("set_active_project", { projectPath: project.path });
      set({ currentProject: project });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  clearProject: async () => {
    try {
      await invokeCommand("clear_active_project");
      set({ currentProject: null });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  addCustomProject: async () => {
    try {
      const path = await invokeCommand<string | null>("select_project_folder");
      if (!path) return;
      await invokeCommand<Project>("add_custom_project", { path });
      // Reload project list
      const projects = await invokeCommand<Project[]>("list_projects");
      set({ projects });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  removeCustomProject: async (projectId: string) => {
    try {
      await invokeCommand("remove_custom_project", { projectId });
      const projects = await invokeCommand<Project[]>("list_projects");
      const { currentProject } = get();
      set({
        projects,
        currentProject: currentProject?.id === projectId ? null : currentProject,
      });
    } catch (err) {
      set({ error: String(err) });
    }
  },
}));
