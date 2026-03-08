import { create } from "zustand";
import { invokeCommand, listenEvent } from "@/shared/utils/ipc";
import type {
  AgentInfo,
  AgentConfig,
  OperationLogEntry,
} from "@/types/agent";

/**
 * Represents a terminal session in the frontend.
 */
export interface TerminalSession {
  id: string;
  label: string;
  /** If this terminal is associated with an agent, the agent's ID. */
  agentId: string | null;
}

interface TerminalStoreState {
  // Terminal management
  terminals: TerminalSession[];
  activeTerminalId: string | null;

  // Agent management
  agents: AgentInfo[];
  operationLog: OperationLogEntry[];

  // UI state
  isTerminalPanelVisible: boolean;

  // Terminal actions
  addTerminal: (session: TerminalSession) => void;
  removeTerminal: (id: string) => void;
  setActiveTerminal: (id: string) => void;
  setTerminalPanelVisible: (visible: boolean) => void;
  toggleTerminalPanel: () => void;

  // Agent actions
  updateAgent: (agent: AgentInfo) => void;
  removeAgent: (id: string) => void;
  addOperationLog: (entry: OperationLogEntry) => void;

  // Async actions (IPC calls)
  createTerminal: (label?: string) => Promise<string>;
  closeTerminal: (id: string) => Promise<void>;
  writeToTerminal: (id: string, data: string) => Promise<void>;
  resizeTerminal: (id: string, cols: number, rows: number) => Promise<void>;
  fetchAgents: () => Promise<void>;
  startAgent: (config: AgentConfig) => Promise<AgentInfo>;
  stopAgent: (id: string) => Promise<void>;
  fetchOperationLog: (
    agentId?: string,
    limit?: number
  ) => Promise<OperationLogEntry[]>;

  // Event subscription setup
  initEventListeners: () => Promise<() => void>;
}

export const useTerminalStore = create<TerminalStoreState>((set, get) => ({
  // Initial state
  terminals: [],
  activeTerminalId: null,
  agents: [],
  operationLog: [],
  isTerminalPanelVisible: false,

  // ---------- Terminal actions ----------

  addTerminal: (session: TerminalSession) => {
    set((state) => ({
      terminals: [...state.terminals, session],
      activeTerminalId: session.id,
      isTerminalPanelVisible: true,
    }));
  },

  removeTerminal: (id: string) => {
    set((state) => {
      const terminals = state.terminals.filter((t) => t.id !== id);
      let activeTerminalId = state.activeTerminalId;
      if (activeTerminalId === id) {
        const idx = state.terminals.findIndex((t) => t.id === id);
        activeTerminalId =
          terminals[Math.min(idx, terminals.length - 1)]?.id ?? null;
      }
      return {
        terminals,
        activeTerminalId,
        // Hide panel if no terminals left
        isTerminalPanelVisible:
          terminals.length > 0 ? state.isTerminalPanelVisible : false,
      };
    });
  },

  setActiveTerminal: (id: string) => {
    set({ activeTerminalId: id });
  },

  setTerminalPanelVisible: (visible: boolean) => {
    set({ isTerminalPanelVisible: visible });
  },

  toggleTerminalPanel: () => {
    set((state) => ({
      isTerminalPanelVisible: !state.isTerminalPanelVisible,
    }));
  },

  // ---------- Agent actions ----------

  updateAgent: (agent: AgentInfo) => {
    set((state) => {
      const existing = state.agents.findIndex((a) => a.id === agent.id);
      if (existing >= 0) {
        const agents = [...state.agents];
        agents[existing] = agent;
        return { agents };
      }
      return { agents: [...state.agents, agent] };
    });
  },

  removeAgent: (id: string) => {
    set((state) => ({
      agents: state.agents.filter((a) => a.id !== id),
    }));
  },

  addOperationLog: (entry: OperationLogEntry) => {
    set((state) => {
      const log = [...state.operationLog, entry];
      // Keep only the last 1000 entries in memory
      if (log.length > 1000) {
        return { operationLog: log.slice(log.length - 1000) };
      }
      return { operationLog: log };
    });
  },

  // ---------- Async actions (IPC) ----------

  createTerminal: async (label?: string) => {
    const id = await invokeCommand<string>("terminal_create", { label });
    const nextNum = get().terminals.length + 1;
    get().addTerminal({
      id,
      label: label ?? `Shell ${nextNum}`,
      agentId: null,
    });
    return id;
  },

  closeTerminal: async (id: string) => {
    await invokeCommand("terminal_close", { id });
    get().removeTerminal(id);
  },

  writeToTerminal: async (id: string, data: string) => {
    await invokeCommand("terminal_write", { id, data });
  },

  resizeTerminal: async (id: string, cols: number, rows: number) => {
    await invokeCommand("terminal_resize", { id, cols, rows });
  },

  fetchAgents: async () => {
    try {
      const agents = await invokeCommand<AgentInfo[]>("agent_list");
      set({ agents });
    } catch (err) {
      console.error("Failed to fetch agents:", err);
    }
  },

  startAgent: async (config: AgentConfig) => {
    const agent = await invokeCommand<AgentInfo>("agent_start", {
      config,
    });

    // Add the agent to our store
    get().updateAgent(agent);

    // If CLI mode, create a terminal tab for the agent
    if (config.mode === "cli" && agent.terminalTabId) {
      get().addTerminal({
        id: agent.terminalTabId,
        label: `Claude: ${agent.name}`,
        agentId: agent.id,
      });
    }

    return agent;
  },

  stopAgent: async (id: string) => {
    await invokeCommand("agent_stop", { id });
    // The agent:status_changed event will update the store
  },

  fetchOperationLog: async (agentId?: string, limit?: number) => {
    const log = await invokeCommand<OperationLogEntry[]>(
      "agent_get_operation_log",
      {
        agentId: agentId ?? null,
        limit: limit ?? null,
      }
    );
    set({ operationLog: log });
    return log;
  },

  // ---------- Event listeners ----------

  initEventListeners: async () => {
    const unlisteners: (() => void)[] = [];

    // Listen for agent status changes (from Rust backend)
    const unlistenAgentStatus = await listenEvent<AgentInfo>(
      "agent:status_changed",
      (agent) => {
        get().updateAgent(agent);
      }
    );
    unlisteners.push(unlistenAgentStatus);

    // Listen for agent operations (file changes by agents)
    const unlistenAgentOp = await listenEvent<OperationLogEntry>(
      "agent:operation",
      (entry) => {
        get().addOperationLog(entry);
      }
    );
    unlisteners.push(unlistenAgentOp);

    // Listen for terminal exit events
    const unlistenTerminalExit = await listenEvent<{
      id: string;
      exitCode: number;
    }>("terminal:exit", (payload) => {
      // Remove the terminal session when the process exits
      get().removeTerminal(payload.id);
    });
    unlisteners.push(unlistenTerminalExit);

    // Return combined cleanup function
    return () => {
      unlisteners.forEach((fn) => fn());
    };
  },
}));
