import { create } from "zustand";
import { invokeCommand, listenEvent } from "@/shared/utils/ipc";
import type {
  SemanticSearchResult,
  HybridSearchResult,
  IndexStatus,
  ChatResponse,
} from "@/types/search";

// ---------------------------------------------------------------------------
// Chat message types (local to the store, not shared via IPC)
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  references?: ChatResponse["references"];
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

interface SemanticStoreState {
  // Semantic search
  semanticResults: SemanticSearchResult[];
  hybridResults: HybridSearchResult[];
  isSearching: boolean;
  keywordWeight: number;
  semanticWeight: number;

  // Index status
  indexStatus: IndexStatus | null;

  // Chat
  chatMessages: ChatMessage[];
  isChatLoading: boolean;
  chatSessionId: string | null;

  // Actions
  searchSemantic: (query: string, topK?: number) => Promise<void>;
  searchHybrid: (query: string, topK?: number) => Promise<void>;
  setSearchWeights: (keywordWeight: number, semanticWeight: number) => void;
  fetchIndexStatus: () => Promise<void>;
  rebuildIndex: () => Promise<void>;
  sendChatMessage: (message: string) => Promise<void>;
  clearChat: () => void;
  clearSearchResults: () => void;
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

let chatMessageCounter = 0;

export const useSemanticStore = create<SemanticStoreState>((set, get) => ({
  // Initial state
  semanticResults: [],
  hybridResults: [],
  isSearching: false,
  keywordWeight: 0.3,
  semanticWeight: 0.7,

  indexStatus: null,

  chatMessages: [],
  isChatLoading: false,
  chatSessionId: null,

  // Actions

  searchSemantic: async (query: string, topK?: number) => {
    if (!query.trim()) {
      set({ semanticResults: [], isSearching: false });
      return;
    }

    set({ isSearching: true });
    try {
      const results = await invokeCommand<SemanticSearchResult[]>(
        "semantic_search",
        { query, topK: topK ?? 10 }
      );
      set({ semanticResults: results, isSearching: false });
    } catch (err) {
      console.error("[Unit 5] Semantic search failed:", err);
      set({ semanticResults: [], isSearching: false });
    }
  },

  searchHybrid: async (query: string, topK?: number) => {
    if (!query.trim()) {
      set({ hybridResults: [], isSearching: false });
      return;
    }

    const { keywordWeight, semanticWeight } = get();
    set({ isSearching: true });
    try {
      const results = await invokeCommand<HybridSearchResult[]>(
        "semantic_hybrid_search",
        {
          query,
          topK: topK ?? 10,
          keywordWeight,
          semanticWeight,
        }
      );
      set({ hybridResults: results, isSearching: false });
    } catch (err) {
      console.error("[Unit 5] Hybrid search failed:", err);
      set({ hybridResults: [], isSearching: false });
    }
  },

  setSearchWeights: (keywordWeight: number, semanticWeight: number) => {
    set({ keywordWeight, semanticWeight });
  },

  fetchIndexStatus: async () => {
    try {
      const status = await invokeCommand<IndexStatus>(
        "semantic_get_index_status"
      );
      set({ indexStatus: status });
    } catch (err) {
      console.error("[Unit 5] Failed to fetch index status:", err);
    }
  },

  rebuildIndex: async () => {
    try {
      await invokeCommand("semantic_rebuild_index");
      // Refresh status after triggering rebuild
      get().fetchIndexStatus();
    } catch (err) {
      console.error("[Unit 5] Failed to rebuild index:", err);
    }
  },

  sendChatMessage: async (message: string) => {
    if (!message.trim()) return;

    const userMessage: ChatMessage = {
      id: `msg-${++chatMessageCounter}`,
      role: "user",
      content: message,
      timestamp: Date.now(),
    };

    set((state) => ({
      chatMessages: [...state.chatMessages, userMessage],
      isChatLoading: true,
    }));

    try {
      const response = await invokeCommand<ChatResponse>("semantic_chat", {
        message,
        sessionId: get().chatSessionId,
      });

      const assistantMessage: ChatMessage = {
        id: `msg-${++chatMessageCounter}`,
        role: "assistant",
        content: response.message,
        references: response.references,
        timestamp: Date.now(),
      };

      set((state) => ({
        chatMessages: [...state.chatMessages, assistantMessage],
        isChatLoading: false,
        chatSessionId: response.sessionId,
      }));
    } catch (err) {
      console.error("[Unit 5] Chat message failed:", err);

      const errorMessage: ChatMessage = {
        id: `msg-${++chatMessageCounter}`,
        role: "assistant",
        content: "An error occurred while processing your message. Please try again.",
        timestamp: Date.now(),
      };

      set((state) => ({
        chatMessages: [...state.chatMessages, errorMessage],
        isChatLoading: false,
      }));
    }
  },

  clearChat: () => {
    set({ chatMessages: [], chatSessionId: null, isChatLoading: false });
  },

  clearSearchResults: () => {
    set({ semanticResults: [], hybridResults: [], isSearching: false });
  },
}));

// ---------------------------------------------------------------------------
// Event listeners for index build progress
// ---------------------------------------------------------------------------

/**
 * Initialize event listeners for semantic index build events.
 * Call once at app startup (e.g. in a top-level useEffect or App.tsx).
 *
 * Events:
 * - `semantic:index_progress` — Updates indexStatus during a build
 * - `semantic:index_completed` — Refreshes indexStatus when build finishes
 *
 * @returns A cleanup function that unsubscribes all listeners.
 */
export function initSemanticEventListeners(): () => void {
  const unlistenPromises: Promise<() => void>[] = [];

  // Listen for index build progress updates
  unlistenPromises.push(
    listenEvent<{ current: number; total: number }>(
      "semantic:index_progress",
      ({ current, total }) => {
        useSemanticStore.setState((state) => ({
          indexStatus: {
            totalFiles: total,
            indexedFiles: current,
            isBuilding: true,
            lastUpdatedAt: state.indexStatus?.lastUpdatedAt ?? null,
          },
        }));
      }
    )
  );

  // Listen for index build completion
  unlistenPromises.push(
    listenEvent<{ totalFiles: number }>(
      "semantic:index_completed",
      ({ totalFiles }) => {
        useSemanticStore.setState({
          indexStatus: {
            totalFiles,
            indexedFiles: totalFiles,
            isBuilding: false,
            lastUpdatedAt: new Date().toISOString(),
          },
        });
      }
    )
  );

  // Return cleanup function
  return () => {
    unlistenPromises.forEach((p) => p.then((unlisten) => unlisten()));
  };
}
