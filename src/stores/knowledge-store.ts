import { create } from "zustand";
import { invokeCommand } from "@/shared/utils/ipc";
import type { BacklinkEntry, InternalLink, TagInfo } from "@/types/note";
import type { KeywordSearchResult } from "@/types/search";
import type { GraphData, GraphFilter } from "@/types/search";

interface KnowledgeStoreState {
  // Search
  searchQuery: string;
  searchMode: "keyword" | "semantic";
  keywordResults: KeywordSearchResult[];
  isSearching: boolean;

  // Backlinks (for the currently selected file)
  currentFileBacklinks: BacklinkEntry[];
  unlinkedMentions: BacklinkEntry[];
  isLoadingBacklinks: boolean;

  // Tags
  allTags: TagInfo[];
  isLoadingTags: boolean;

  // Graph
  graphData: GraphData | null;
  graphFilter: GraphFilter;
  isLoadingGraph: boolean;

  // Actions
  setSearchQuery: (query: string) => void;
  setSearchMode: (mode: "keyword" | "semantic") => void;
  searchKeyword: (query: string) => Promise<void>;
  fetchBacklinks: (path: string) => Promise<void>;
  fetchUnlinkedMentions: (path: string) => Promise<void>;
  fetchAllTags: () => Promise<void>;
  fetchFilesByTag: (tag: string) => Promise<string[]>;
  fetchGraphData: (filter?: GraphFilter) => Promise<void>;
  fetchLocalGraph: (path: string, depth?: number) => Promise<void>;
  fetchOutgoingLinks: (path: string) => Promise<InternalLink[]>;
  setGraphFilter: (filter: GraphFilter) => void;
  clearSearch: () => void;
}

export const useKnowledgeStore = create<KnowledgeStoreState>((set, get) => ({
  // Initial state
  searchQuery: "",
  searchMode: "keyword",
  keywordResults: [],
  isSearching: false,

  currentFileBacklinks: [],
  unlinkedMentions: [],
  isLoadingBacklinks: false,

  allTags: [],
  isLoadingTags: false,

  graphData: null,
  graphFilter: {},
  isLoadingGraph: false,

  // Actions
  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSearchMode: (mode: "keyword" | "semantic") => {
    set({ searchMode: mode });
  },

  searchKeyword: async (query: string) => {
    if (!query.trim()) {
      set({ keywordResults: [], isSearching: false });
      return;
    }

    set({ isSearching: true, searchQuery: query });
    try {
      const results = await invokeCommand<KeywordSearchResult[]>(
        "search_keyword",
        { query, maxResults: 50 }
      );
      set({ keywordResults: results, isSearching: false });
    } catch (err) {
      console.error("Keyword search failed:", err);
      set({ keywordResults: [], isSearching: false });
    }
  },

  fetchBacklinks: async (path: string) => {
    set({ isLoadingBacklinks: true });
    try {
      const backlinks = await invokeCommand<BacklinkEntry[]>(
        "get_backlinks",
        { path }
      );
      set({ currentFileBacklinks: backlinks, isLoadingBacklinks: false });
    } catch (err) {
      console.error("Failed to fetch backlinks:", err);
      set({ currentFileBacklinks: [], isLoadingBacklinks: false });
    }
  },

  fetchUnlinkedMentions: async (path: string) => {
    try {
      const mentions = await invokeCommand<BacklinkEntry[]>(
        "get_unlinked_mentions",
        { path }
      );
      set({ unlinkedMentions: mentions });
    } catch (err) {
      console.error("Failed to fetch unlinked mentions:", err);
      set({ unlinkedMentions: [] });
    }
  },

  fetchAllTags: async () => {
    set({ isLoadingTags: true });
    try {
      const tags = await invokeCommand<TagInfo[]>("get_all_tags");
      set({ allTags: tags, isLoadingTags: false });
    } catch (err) {
      console.error("Failed to fetch tags:", err);
      set({ allTags: [], isLoadingTags: false });
    }
  },

  fetchFilesByTag: async (tag: string) => {
    try {
      return await invokeCommand<string[]>("get_files_by_tag", { tag });
    } catch (err) {
      console.error("Failed to fetch files by tag:", err);
      return [];
    }
  },

  fetchGraphData: async (filter?: GraphFilter) => {
    set({ isLoadingGraph: true });
    try {
      const effectiveFilter = filter ?? get().graphFilter;
      const data = await invokeCommand<GraphData>("get_graph_data", {
        filter: effectiveFilter,
      });
      set({ graphData: data, isLoadingGraph: false });
    } catch (err) {
      console.error("Failed to fetch graph data:", err);
      set({ graphData: null, isLoadingGraph: false });
    }
  },

  fetchLocalGraph: async (path: string, depth?: number) => {
    set({ isLoadingGraph: true });
    try {
      const data = await invokeCommand<GraphData>("get_local_graph", {
        path,
        depth: depth ?? 2,
      });
      set({ graphData: data, isLoadingGraph: false });
    } catch (err) {
      console.error("Failed to fetch local graph:", err);
      set({ graphData: null, isLoadingGraph: false });
    }
  },

  fetchOutgoingLinks: async (path: string) => {
    try {
      return await invokeCommand<InternalLink[]>("get_outgoing_links", {
        path,
      });
    } catch (err) {
      console.error("Failed to fetch outgoing links:", err);
      return [];
    }
  },

  setGraphFilter: (filter: GraphFilter) => {
    set({ graphFilter: filter });
  },

  clearSearch: () => {
    set({ searchQuery: "", keywordResults: [], isSearching: false });
  },
}));
