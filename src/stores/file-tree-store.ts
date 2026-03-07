import { create } from "zustand";
import Fuse, { type IFuseOptions } from "fuse.js";

import { invokeCommand } from "@/shared/utils/ipc";
import { useVaultStore } from "@/stores/vault-store";
import type { FileEntry } from "@/types/file";

// ---- Types ----

export interface CommandEntry {
  id: string;
  label: string;
  shortcut?: string;
  category?: string;
  execute: () => void;
}

interface FlatFileItem {
  path: string;
  name: string;
}

interface FileTreeStoreState {
  // Tree state
  rootEntry: FileEntry | null;
  flatFileList: FlatFileItem[];
  expandedDirs: Set<string>;
  selectedPath: string | null;
  isLoading: boolean;

  // Command registry
  commandRegistry: CommandEntry[];

  // Actions
  loadTree: () => Promise<void>;
  refreshTree: () => Promise<void>;
  toggleDir: (dirPath: string) => void;
  expandDir: (dirPath: string) => void;
  collapseDir: (dirPath: string) => void;
  selectNode: (path: string) => void;

  // File CRUD (via Unit 1 IPC)
  createFile: (dirPath: string, fileName: string, content?: string) => Promise<void>;
  createDir: (dirPath: string, dirName: string) => Promise<void>;
  deleteNode: (path: string) => Promise<void>;
  renameNode: (oldPath: string, newName: string) => Promise<void>;
  moveNode: (sourcePath: string, targetDirPath: string) => Promise<void>;

  // Quick Switcher
  searchFiles: (query: string) => FlatFileItem[];

  // Command Palette
  registerCommand: (command: CommandEntry) => void;
  unregisterCommand: (commandId: string) => void;
  searchCommands: (query: string) => CommandEntry[];
  executeCommand: (commandId: string) => void;
}

// ---- Fuse.js configuration ----

const fuseFileOptions: IFuseOptions<FlatFileItem> = {
  keys: ["name", "path"],
  threshold: 0.4,
  distance: 100,
  includeScore: true,
  shouldSort: true,
  minMatchCharLength: 1,
};

const fuseCommandOptions: IFuseOptions<CommandEntry> = {
  keys: ["label", "category"],
  threshold: 0.3,
  includeScore: true,
  shouldSort: true,
};

// ---- Helpers ----

/** Flatten a FileEntry tree into a list of file paths and names (excludes directories). */
function flattenTree(entry: FileEntry): FlatFileItem[] {
  const result: FlatFileItem[] = [];

  function walk(node: FileEntry) {
    if (!node.isDir) {
      result.push({ path: node.path, name: node.name });
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  if (entry.children) {
    for (const child of entry.children) {
      walk(child);
    }
  }

  return result;
}

/** Join a directory path and a file/folder name into a relative path. */
function joinPath(dirPath: string, name: string): string {
  if (!dirPath) return name;
  return `${dirPath}/${name}`;
}

/** Extract the parent directory from a path. */
function getParentDir(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash === -1 ? "" : path.substring(0, lastSlash);
}

/** Extract the file/folder name from a path. */
function getFileName(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash === -1 ? path : path.substring(lastSlash + 1);
}

// ---- Internal mutable fuse instances ----
// Kept outside the store to avoid serialization issues with Zustand.
let _fuseFiles: Fuse<FlatFileItem> | null = null;
let _fuseCommands: Fuse<CommandEntry> | null = null;

// Debounce timer for refresh
let _refreshDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// ---- Store ----

export const useFileTreeStore = create<FileTreeStoreState>((set, get) => ({
  rootEntry: null,
  flatFileList: [],
  expandedDirs: new Set<string>(),
  selectedPath: null,
  isLoading: false,
  commandRegistry: [],

  loadTree: async () => {
    set({ isLoading: true });

    try {
      const tree = await invokeCommand<FileEntry>("get_tree", {
        includeIgnored: false,
      });

      const flatList = flattenTree(tree);
      _fuseFiles = new Fuse(flatList, fuseFileOptions);

      set({
        rootEntry: tree,
        flatFileList: flatList,
        isLoading: false,
      });
    } catch (err) {
      console.error("Failed to load file tree:", err);
      set({ isLoading: false });
    }
  },

  refreshTree: async () => {
    // Debounce rapid fs:changed events (200ms)
    if (_refreshDebounceTimer) {
      clearTimeout(_refreshDebounceTimer);
    }

    _refreshDebounceTimer = setTimeout(async () => {
      try {
        const tree = await invokeCommand<FileEntry>("get_tree", {
          includeIgnored: false,
        });

        const flatList = flattenTree(tree);
        _fuseFiles = new Fuse(flatList, fuseFileOptions);

        set({
          rootEntry: tree,
          flatFileList: flatList,
        });
      } catch (err) {
        console.error("Failed to refresh file tree:", err);
      }
    }, 200);
  },

  toggleDir: (dirPath: string) => {
    set((state) => {
      const next = new Set(state.expandedDirs);
      if (next.has(dirPath)) {
        next.delete(dirPath);
      } else {
        next.add(dirPath);
      }
      return { expandedDirs: next };
    });
  },

  expandDir: (dirPath: string) => {
    set((state) => {
      const next = new Set(state.expandedDirs);
      next.add(dirPath);
      return { expandedDirs: next };
    });
  },

  collapseDir: (dirPath: string) => {
    set((state) => {
      const next = new Set(state.expandedDirs);
      next.delete(dirPath);
      return { expandedDirs: next };
    });
  },

  selectNode: (path: string) => {
    set({ selectedPath: path });
  },

  // ---- File CRUD operations (delegating to Unit 1 IPC) ----

  createFile: async (dirPath: string, fileName: string, content?: string) => {
    const filePath = joinPath(dirPath, fileName);
    await invokeCommand("create_file", { path: filePath, content });
    await get().refreshTree();
  },

  createDir: async (dirPath: string, dirName: string) => {
    const newDirPath = joinPath(dirPath, dirName);
    await invokeCommand("create_dir", { path: newDirPath });
    await get().refreshTree();
  },

  deleteNode: async (path: string) => {
    await invokeCommand("delete", { path });
    await get().refreshTree();
  },

  renameNode: async (oldPath: string, newName: string) => {
    const parentDir = getParentDir(oldPath);
    const newPath = joinPath(parentDir, newName);

    // Check if target already exists
    const exists = await invokeCommand<boolean>("exists", { path: newPath });
    if (exists) {
      throw new Error(`A file or folder named "${newName}" already exists`);
    }

    await invokeCommand("rename", { oldPath, newPath });

    // TODO: [Unit 4 Weak Dependency] Auto-update internal [[links]] that reference the old path.
    // When Unit 4 (knowledge base) is implemented, call knowledge:get_backlinks here
    // to find all files linking to oldPath and update their [[]] references to newPath.

    await get().refreshTree();
  },

  moveNode: async (sourcePath: string, targetDirPath: string) => {
    const fileName = getFileName(sourcePath);
    const newPath = joinPath(targetDirPath, fileName);

    // Check if target already exists
    const exists = await invokeCommand<boolean>("exists", { path: newPath });
    if (exists) {
      throw new Error(`A file or folder named "${fileName}" already exists in the target directory`);
    }

    await invokeCommand("rename", { oldPath: sourcePath, newPath });

    // TODO: [Unit 4 Weak Dependency] Auto-update internal [[links]] after file move.
    // Same as renameNode — use knowledge:get_backlinks to update references.

    await get().refreshTree();
  },

  // ---- Quick Switcher search ----

  searchFiles: (query: string): FlatFileItem[] => {
    if (!query.trim()) {
      // Return recent / all files when query is empty (limited to 20)
      return get().flatFileList.slice(0, 20);
    }

    if (!_fuseFiles) {
      return [];
    }

    return _fuseFiles.search(query, { limit: 20 }).map((result) => result.item);
  },

  // ---- Command Palette ----

  registerCommand: (command: CommandEntry) => {
    set((state) => {
      // Avoid duplicate registrations
      const filtered = state.commandRegistry.filter((c) => c.id !== command.id);
      const next = [...filtered, command];
      _fuseCommands = new Fuse(next, fuseCommandOptions);
      return { commandRegistry: next };
    });
  },

  unregisterCommand: (commandId: string) => {
    set((state) => {
      const next = state.commandRegistry.filter((c) => c.id !== commandId);
      _fuseCommands = new Fuse(next, fuseCommandOptions);
      return { commandRegistry: next };
    });
  },

  searchCommands: (query: string): CommandEntry[] => {
    if (!query.trim()) {
      // Return all commands when query is empty
      return get().commandRegistry;
    }

    if (!_fuseCommands) {
      return [];
    }

    return _fuseCommands.search(query, { limit: 30 }).map((result) => result.item);
  },

  executeCommand: (commandId: string) => {
    const command = get().commandRegistry.find((c) => c.id === commandId);
    if (command) {
      command.execute();
    }
  },
}));

// Re-load file tree when active project changes
let _prevProjectId: string | null = null;
useVaultStore.subscribe((state) => {
  const newProjectId = state.currentProject?.id ?? null;
  if (newProjectId !== _prevProjectId) {
    _prevProjectId = newProjectId;
    // Skip initial null → null
    if (state.currentVault) {
      useFileTreeStore.getState().loadTree();
    }
  }
});
