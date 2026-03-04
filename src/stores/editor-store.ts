import { create } from "zustand";
import type { PaneLayout, TabState } from "@/types/editor";
import { invokeCommand, listenEvent } from "@/shared/utils/ipc";

// ---------------------------------------------------------------------------
// Unit 2: Editor-specific state types
// ---------------------------------------------------------------------------

/**
 * EditorView reference holder.
 * When CodeMirror 6 is integrated, this will hold the actual EditorView instance.
 * For now with the textarea placeholder, it holds a ref to the textarea element.
 */
export type EditorViewRef = {
  /** Get the current document content as plain text. */
  getContent: () => string;
  /** Replace the document content. */
  setContent: (content: string) => void;
};

// ---------------------------------------------------------------------------
// Combined store interface
// ---------------------------------------------------------------------------

interface EditorStoreState {
  // Unit 1 base slice
  openTabs: TabState[];
  activeTabId: string | null;
  paneLayout: PaneLayout;
  sidebarWidth: number;
  terminalHeight: number;
  activeSidebarPanel: string;

  // Actions (Unit 1)
  openTab: (filePath: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  setSidebarPanel: (panel: string) => void;
  setTabDirty: (tabId: string, isDirty: boolean) => void;

  // ---------------------------------------------------------------------------
  // Unit 2: Editor-specific slice
  // ---------------------------------------------------------------------------

  /** Map of tabId -> EditorViewRef for all open editors. */
  editorInstances: Map<string, EditorViewRef>;

  /** Set of filePaths that have unsaved modifications. */
  dirtyFiles: Set<string>;

  /**
   * Flag set briefly after a save to suppress the fs:changed event
   * that our own write triggers.
   */
  _recentlySavedPaths: Set<string>;

  // Actions (Unit 2)

  /** Register an editor instance for a tab. */
  registerEditor: (tabId: string, ref: EditorViewRef) => void;

  /** Unregister an editor instance when a tab unmounts. */
  unregisterEditor: (tabId: string) => void;

  /** Mark a file as having unsaved changes (dirty). */
  markDirty: (filePath: string) => void;

  /** Mark a file as saved (clean). */
  markClean: (filePath: string) => void;

  /**
   * Save a single file by reading content from its EditorViewRef
   * and invoking the fs:write_file IPC command.
   */
  saveFile: (filePath: string) => Promise<void>;

  /** Save all dirty files. */
  saveAllDirty: () => Promise<void>;

  /**
   * Reload a file from disk into the editor. Used when an external
   * change is detected (fs:changed / fs:external_change).
   */
  reloadFile: (filePath: string) => Promise<void>;

  /** Change the view mode of a specific tab. */
  setViewMode: (
    tabId: string,
    mode: "livePreview" | "source" | "readOnly"
  ) => void;
}

let tabCounter = 0;

// Debounced auto-save timers (per file path)
const autoSaveTimers = new Map<string, number>();

export const useEditorStore = create<EditorStoreState>((set, get) => ({
  // =========================================================================
  // Unit 1 base slice — state
  // =========================================================================
  openTabs: [],
  activeTabId: null,
  paneLayout: {
    direction: "horizontal",
    sizes: [100],
    children: [{ type: "leaf", tabGroupId: "main" }],
  },
  sidebarWidth: 240,
  terminalHeight: 0,
  activeSidebarPanel: "files",

  // =========================================================================
  // Unit 1 base slice — actions
  // =========================================================================

  openTab: (filePath: string) => {
    set((state) => {
      // Check if tab already exists
      const existing = state.openTabs.find((t) => t.filePath === filePath);
      if (existing) {
        return { activeTabId: existing.id };
      }

      const id = `tab-${++tabCounter}`;
      const newTab: TabState = {
        id,
        filePath,
        isDirty: false,
        scrollPosition: 0,
        cursorLine: 1,
        cursorColumn: 1,
        viewMode: filePath.endsWith(".md") ? "livePreview" : "readOnly",
      };

      return {
        openTabs: [...state.openTabs, newTab],
        activeTabId: id,
      };
    });
  },

  closeTab: (tabId: string) => {
    set((state) => {
      const tabs = state.openTabs.filter((t) => t.id !== tabId);
      let activeTabId = state.activeTabId;
      if (activeTabId === tabId) {
        const idx = state.openTabs.findIndex((t) => t.id === tabId);
        activeTabId = tabs[Math.min(idx, tabs.length - 1)]?.id ?? null;
      }
      return { openTabs: tabs, activeTabId };
    });

    // Unit 2: Clean up editor instance when tab is closed
    const state = get();
    if (state.editorInstances.has(tabId)) {
      const next = new Map(state.editorInstances);
      next.delete(tabId);
      set({ editorInstances: next });
    }
  },

  setActiveTab: (tabId: string) => {
    set({ activeTabId: tabId });
  },

  setSidebarPanel: (panel: string) => {
    set({ activeSidebarPanel: panel });
  },

  setTabDirty: (tabId: string, isDirty: boolean) => {
    const tab = get().openTabs.find((t) => t.id === tabId);
    if (!tab || tab.isDirty === isDirty) return; // no-op if already same value
    set((state) => ({
      openTabs: state.openTabs.map((t) =>
        t.id === tabId ? { ...t, isDirty } : t
      ),
    }));
  },

  // =========================================================================
  // Unit 2: Editor-specific slice — state
  // =========================================================================
  editorInstances: new Map<string, EditorViewRef>(),
  dirtyFiles: new Set<string>(),
  _recentlySavedPaths: new Set<string>(),

  // =========================================================================
  // Unit 2: Editor-specific slice — actions
  // =========================================================================

  registerEditor: (tabId: string, ref: EditorViewRef) => {
    set((state) => {
      const next = new Map(state.editorInstances);
      next.set(tabId, ref);
      return { editorInstances: next };
    });
  },

  unregisterEditor: (tabId: string) => {
    set((state) => {
      const next = new Map(state.editorInstances);
      next.delete(tabId);
      return { editorInstances: next };
    });
  },

  markDirty: (filePath: string) => {
    const state = get();

    // Already dirty — only reset auto-save timer, skip state updates entirely
    if (state.dirtyFiles.has(filePath)) {
      if (autoSaveTimers.has(filePath)) {
        clearTimeout(autoSaveTimers.get(filePath)!);
      }
      autoSaveTimers.set(
        filePath,
        window.setTimeout(() => {
          autoSaveTimers.delete(filePath);
          get().saveFile(filePath);
        }, 1500)
      );
      return;
    }

    // First time dirty: update dirtyFiles + openTabs in a single set() call
    const tab = state.openTabs.find((t) => t.filePath === filePath);
    set((s) => {
      const nextDirty = new Set(s.dirtyFiles);
      nextDirty.add(filePath);
      const nextTabs = tab
        ? s.openTabs.map((t) => (t.id === tab.id ? { ...t, isDirty: true } : t))
        : s.openTabs;
      return { dirtyFiles: nextDirty, openTabs: nextTabs };
    });

    // Start auto-save timer
    autoSaveTimers.set(
      filePath,
      window.setTimeout(() => {
        autoSaveTimers.delete(filePath);
        get().saveFile(filePath);
      }, 1500)
    );
  },

  markClean: (filePath: string) => {
    // Single set() call to avoid double notification
    set((state) => {
      const nextDirty = new Set(state.dirtyFiles);
      nextDirty.delete(filePath);

      const tab = state.openTabs.find((t) => t.filePath === filePath);
      const nextTabs = tab && tab.isDirty
        ? state.openTabs.map((t) => (t.id === tab.id ? { ...t, isDirty: false } : t))
        : state.openTabs;

      return { dirtyFiles: nextDirty, openTabs: nextTabs };
    });
  },

  saveFile: async (filePath: string) => {
    const state = get();

    // Find the tab and its editor instance
    const tab = state.openTabs.find((t) => t.filePath === filePath);
    if (!tab) return;

    const editorRef = state.editorInstances.get(tab.id);
    if (!editorRef) return;

    const content = editorRef.getContent();

    // Mark as recently saved to suppress the echoed fs:changed event
    set((s) => {
      const next = new Set(s._recentlySavedPaths);
      next.add(filePath);
      return { _recentlySavedPaths: next };
    });

    try {
      await invokeCommand("write_file", { path: filePath, content });
      get().markClean(filePath);
    } catch (err) {
      console.error(`[Unit 2] Failed to save file: ${filePath}`, err);
    }

    // Clear the recently-saved flag after a delay (must outlast watcher poll interval)
    setTimeout(() => {
      set((s) => {
        const next = new Set(s._recentlySavedPaths);
        next.delete(filePath);
        return { _recentlySavedPaths: next };
      });
    }, 2000);
  },

  saveAllDirty: async () => {
    const { dirtyFiles, saveFile } = get();
    const promises = Array.from(dirtyFiles).map((fp) => saveFile(fp));
    await Promise.all(promises);
  },

  reloadFile: async (filePath: string) => {
    const state = get();
    const tab = state.openTabs.find((t) => t.filePath === filePath);
    if (!tab) return;

    const editorRef = state.editorInstances.get(tab.id);
    if (!editorRef) return;

    try {
      const content = await invokeCommand<string>("read_file", {
        path: filePath,
      });
      editorRef.setContent(content);
      get().markClean(filePath);
    } catch (err) {
      console.error(`[Unit 2] Failed to reload file: ${filePath}`, err);
    }
  },

  setViewMode: (
    tabId: string,
    mode: "livePreview" | "source" | "readOnly"
  ) => {
    set((state) => ({
      openTabs: state.openTabs.map((t) =>
        t.id === tabId ? { ...t, viewMode: mode } : t
      ),
    }));
  },
}));

// ---------------------------------------------------------------------------
// Unit 2: Subscribe to file-system events for external change detection
// ---------------------------------------------------------------------------

/**
 * Initialise event listeners for fs:changed and fs:external_change.
 * Call once at app startup (e.g. in a top-level useEffect or App.tsx).
 */
export function initEditorEventListeners(): () => void {
  const unlistenPromises: Promise<() => void>[] = [];

  // Listen for fs:changed — auto-reload clean files, ignore own saves
  unlistenPromises.push(
    listenEvent<{ path: string; changeType: string }>(
      "fs:changed",
      ({ path, changeType }) => {
        if (changeType === "deleted") return;

        const state = useEditorStore.getState();

        // Ignore events caused by our own save
        if (state._recentlySavedPaths.has(path)) return;

        // Only care about files that are currently open
        const tab = state.openTabs.find((t) => t.filePath === path);
        if (!tab) return;

        if (state.dirtyFiles.has(path)) {
          // File has unsaved changes — user must decide
          // TODO: Show a reload confirmation dialog (could be implemented as a toast/modal)
          console.warn(
            `[Unit 2] External change to dirty file: ${path}. User action needed.`
          );
        } else {
          // File is clean — auto-reload
          state.reloadFile(path);
        }
      }
    )
  );

  // Listen for fs:external_change (e.g. agent-written files)
  unlistenPromises.push(
    listenEvent<{ path: string; agentId?: string }>(
      "fs:external_change",
      ({ path }) => {
        const state = useEditorStore.getState();
        const tab = state.openTabs.find((t) => t.filePath === path);
        if (!tab) return;

        if (state.dirtyFiles.has(path)) {
          console.warn(
            `[Unit 2] Agent modified dirty file: ${path}. User action needed.`
          );
        } else {
          state.reloadFile(path);
        }
      }
    )
  );

  // Return a cleanup function that unlistens all
  return () => {
    unlistenPromises.forEach((p) => p.then((unlisten) => unlisten()));
  };
}
