import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";

import { useEventListener } from "@/hooks/use-event-listener";
import { useEditorStore } from "@/stores/editor-store";
import { useFileTreeStore } from "@/stores/file-tree-store";
import { useVaultStore } from "@/stores/vault-store";
import type { FileEntry } from "@/types/file";

import { FileTreeNode } from "./FileTreeNode";

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  entry: FileEntry | null;
}

interface FsChangedEvent {
  path: string;
  changeType: "created" | "modified" | "deleted" | "renamed";
}

/**
 * FileExplorer: The main file tree component displayed in the left sidebar.
 *
 * Responsibilities:
 * - Renders the vault file tree using recursive FileTreeNode components
 * - Provides header with "New File" and "New Folder" action buttons
 * - Listens for `fs:changed` events to auto-refresh the tree
 * - Manages right-click context menu for file/folder CRUD operations
 */
export function FileExplorer() {
  const rootEntry = useFileTreeStore((s) => s.rootEntry);
  const isLoading = useFileTreeStore((s) => s.isLoading);
  const loadTree = useFileTreeStore((s) => s.loadTree);
  const refreshTree = useFileTreeStore((s) => s.refreshTree);
  const createFile = useFileTreeStore((s) => s.createFile);
  const createDir = useFileTreeStore((s) => s.createDir);
  const deleteNode = useFileTreeStore((s) => s.deleteNode);
  const selectedPath = useFileTreeStore((s) => s.selectedPath);

  const projects = useVaultStore((s) => s.projects);
  const currentProject = useVaultStore((s) => s.currentProject);
  const setProject = useVaultStore((s) => s.setProject);
  const clearProject = useVaultStore((s) => s.clearProject);
  const addCustomProject = useVaultStore((s) => s.addCustomProject);
  const currentVault = useVaultStore((s) => s.currentVault);

  const [showProjectMenu, setShowProjectMenu] = useState(false);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    entry: null,
  });

  const [isCreating, setIsCreating] = useState<"file" | "folder" | null>(null);
  const [createName, setCreateName] = useState("");
  const createInputRef = useRef<HTMLInputElement>(null);
  const explorerRef = useRef<HTMLDivElement>(null);

  // ---- Load tree on mount ----

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // ---- Listen for fs:changed events to refresh tree ----

  const handleFsChanged = useCallback(
    (_event: FsChangedEvent) => {
      refreshTree();
    },
    [refreshTree]
  );

  useEventListener<FsChangedEvent>("fs:changed", handleFsChanged);

  // ---- Close context menu on click outside ----

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu((prev) => ({ ...prev, visible: false }));
      setShowProjectMenu(false);
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // ---- Focus create input when entering create mode ----

  useEffect(() => {
    if (isCreating) {
      requestAnimationFrame(() => {
        createInputRef.current?.focus();
      });
    }
  }, [isCreating]);

  // ---- Context menu handler ----

  const handleContextMenu = useCallback(
    (e: MouseEvent, entry: FileEntry) => {
      e.preventDefault();
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        entry,
      });
    },
    []
  );

  // ---- Background context menu (right-click on empty space) ----

  const handleBackgroundContextMenu = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        entry: rootEntry,
      });
    },
    [rootEntry]
  );

  // ---- Context menu actions ----

  const getSelectedDirPath = useCallback((): string => {
    if (!contextMenu.entry) return "";
    return contextMenu.entry.isDir
      ? contextMenu.entry.path
      : contextMenu.entry.path.includes("/")
        ? contextMenu.entry.path.substring(0, contextMenu.entry.path.lastIndexOf("/"))
        : "";
  }, [contextMenu.entry]);

  const handleNewFile = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
    setIsCreating("file");
    setCreateName("");
  }, []);

  const handleNewFolder = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
    setIsCreating("folder");
    setCreateName("");
  }, []);

  const handleDelete = useCallback(async () => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
    if (!contextMenu.entry) return;

    const entry = contextMenu.entry;
    const message = entry.isDir
      ? `Delete folder "${entry.name}" and all its contents?`
      : `Delete file "${entry.name}"?`;

    // Use browser confirm as a simple confirmation dialog
    // TODO: Replace with a styled confirmation modal component
    if (window.confirm(message)) {
      try {
        await deleteNode(entry.path);
      } catch (err) {
        console.error("Delete failed:", err);
      }
    }
  }, [contextMenu.entry, deleteNode]);

  const handleCopyPath = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
    if (contextMenu.entry) {
      navigator.clipboard.writeText(contextMenu.entry.path).catch(console.error);
    }
  }, [contextMenu.entry]);

  // ---- New file/folder header button actions ----

  const handleHeaderNewFile = useCallback(() => {
    // Determine which directory to create in
    const dirPath = selectedPath
      ? (() => {
          // If selectedPath is a directory, create inside it; otherwise use its parent
          const entry = findEntry(rootEntry, selectedPath);
          if (entry?.isDir) return entry.path;
          return selectedPath.includes("/")
            ? selectedPath.substring(0, selectedPath.lastIndexOf("/"))
            : "";
        })()
      : "";

    // Store the target dir for create commit
    setContextMenu((prev) => ({
      ...prev,
      entry: { path: dirPath, name: "", isDir: true },
    }));
    setIsCreating("file");
    setCreateName("");
  }, [selectedPath, rootEntry]);

  const handleHeaderNewFolder = useCallback(() => {
    const dirPath = selectedPath
      ? (() => {
          const entry = findEntry(rootEntry, selectedPath);
          if (entry?.isDir) return entry.path;
          return selectedPath.includes("/")
            ? selectedPath.substring(0, selectedPath.lastIndexOf("/"))
            : "";
        })()
      : "";

    setContextMenu((prev) => ({
      ...prev,
      entry: { path: dirPath, name: "", isDir: true },
    }));
    setIsCreating("folder");
    setCreateName("");
  }, [selectedPath, rootEntry]);

  // ---- Create commit handler ----

  const commitCreate = useCallback(async () => {
    const trimmed = createName.trim();
    if (!trimmed) {
      setIsCreating(null);
      return;
    }

    const dirPath = getSelectedDirPath();

    try {
      if (isCreating === "file") {
        await createFile(dirPath, trimmed);
      } else if (isCreating === "folder") {
        await createDir(dirPath, trimmed);
      }
    } catch (err) {
      console.error("Create failed:", err);
    }

    setIsCreating(null);
    setCreateName("");
  }, [createName, isCreating, getSelectedDirPath, createFile, createDir]);

  // ---- Keyboard shortcut: Cmd+N for new file, Delete/Backspace for delete ----

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Only handle when explorer is focused or no specific input is focused
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;

      if (isInputFocused) return;

      // Cmd+N / Ctrl+N for new file
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        handleHeaderNewFile();
      }

      // Delete/Backspace for delete (macOS: Cmd+Backspace)
      if (selectedPath) {
        const isMac = navigator.platform.toUpperCase().includes("MAC");
        if (
          (isMac && e.metaKey && e.key === "Backspace") ||
          (!isMac && e.key === "Delete")
        ) {
          e.preventDefault();
          const entry = findEntry(rootEntry, selectedPath);
          if (entry) {
            setContextMenu((prev) => ({ ...prev, entry }));
            // Trigger delete with a slight delay to set context
            setTimeout(() => handleDelete(), 0);
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleHeaderNewFile, handleDelete, selectedPath, rootEntry]);

  // ---- Render ----

  if (isLoading && !rootEntry) {
    return (
      <div className="p-4 text-[13px] text-[var(--text-secondary,#8b8b96)]">
        Loading files...
      </div>
    );
  }

  return (
    <div
      ref={explorerRef}
      className="flex flex-col h-full select-none"
      onContextMenu={(e) => {
        // Only trigger if clicking on empty space (not on a tree node)
        if (e.target === e.currentTarget || e.target === explorerRef.current) {
          handleBackgroundContextMenu(e);
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold tracking-wider text-[var(--text-secondary,#8b8b96)] uppercase">
        <span>Files</span>
        <div className="flex gap-1">
          <button
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--bg-hover,#23252f)] text-[14px]"
            onClick={handleHeaderNewFile}
            title="New File (Cmd+N)"
          >
            +
          </button>
          <button
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--bg-hover,#23252f)] text-[12px]"
            onClick={handleHeaderNewFolder}
            title="New Folder"
          >
            {/* Folder icon */}
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="w-3.5 h-3.5"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M1 4v8.5a1 1 0 001 1h12a1 1 0 001-1V5.5a1 1 0 00-1-1H8L6.5 3H2a1 1 0 00-1 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Project Selector */}
      <div className="px-3 pb-2 relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowProjectMenu(!showProjectMenu);
          }}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-[13px] transition-colors border"
          style={{
            color: "var(--color-text-primary)",
            backgroundColor: "var(--color-bg-surface, #1e2028)",
            borderColor: showProjectMenu ? "var(--color-accent, #7c6fe0)" : "var(--color-border-subtle, #2e303a)",
          }}
        >
          <span className="truncate font-medium">
            {currentProject ? currentProject.name : currentVault?.name ?? "All Files"}
          </span>
          <span
            className="text-[9px] ml-2 transition-transform"
            style={{
              color: "var(--color-text-muted)",
              transform: showProjectMenu ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            {"\u25BC"}
          </span>
        </button>

        {showProjectMenu && (
          <div
            className="absolute left-3 right-3 mt-1 py-1 rounded-md border shadow-lg z-50 max-h-[300px] overflow-y-auto"
            style={{
              backgroundColor: "var(--color-bg-surface, #1e2028)",
              borderColor: "var(--color-accent, #7c6fe0)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* All Files (vault root) */}
            <button
              className={`w-full text-left px-3 py-1.5 text-[13px] transition-colors hover:bg-[var(--accent,#7c6fe0)] hover:text-white ${
                !currentProject ? "font-semibold" : ""
              }`}
              style={{ color: "var(--color-text-primary)" }}
              onClick={() => { clearProject(); setShowProjectMenu(false); }}
            >
              {currentVault?.name ?? "All Files"}
              {!currentProject && <span className="ml-1 text-[10px] opacity-50">{"\u25CF"}</span>}
            </button>

            {projects.length > 0 && (
              <div className="my-1 border-t" style={{ borderColor: "var(--color-border-subtle)" }} />
            )}

            {projects.map((project) => (
              <button
                key={project.id}
                className={`w-full text-left px-3 py-1.5 text-[13px] flex items-center justify-between transition-colors hover:bg-[var(--accent,#7c6fe0)] hover:text-white ${
                  currentProject?.id === project.id ? "font-semibold" : ""
                }`}
                style={{ color: "var(--color-text-primary)" }}
                onClick={() => { setProject(project); setShowProjectMenu(false); }}
              >
                <span className="truncate">{project.name}</span>
                <span className="flex items-center gap-1">
                  {project.isCustom && <span className="text-[10px] opacity-40">ext</span>}
                  {currentProject?.id === project.id && <span className="text-[10px] opacity-50">{"\u25CF"}</span>}
                </span>
              </button>
            ))}

            <div className="my-1 border-t" style={{ borderColor: "var(--color-border-subtle)" }} />
            <button
              className="w-full text-left px-3 py-1.5 text-[13px] transition-colors hover:bg-[var(--accent,#7c6fe0)] hover:text-white"
              style={{ color: "var(--color-text-muted)" }}
              onClick={() => { addCustomProject(); setShowProjectMenu(false); }}
            >
              + Add external project...
            </button>
          </div>
        )}
      </div>

      {/* Inline create input (shown at top of tree when creating) */}
      {isCreating && (
        <div className="flex items-center px-3 py-1">
          <span className="mr-1.5 text-[14px]">
            {isCreating === "folder" ? "\uD83D\uDCC1" : "\uD83D\uDCC4"}
          </span>
          <input
            ref={createInputRef}
            className="flex-1 bg-[var(--bg-input,#1a1c24)] text-[var(--text-primary,#e4e4e7)] text-[13px] px-1.5 py-0.5 border border-[var(--accent,#7c6fe0)] rounded outline-none"
            placeholder={isCreating === "file" ? "File name..." : "Folder name..."}
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitCreate();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setIsCreating(null);
                setCreateName("");
              }
            }}
            onBlur={commitCreate}
          />
        </div>
      )}

      {/* File tree */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden" role="tree">
        {rootEntry?.children?.map((child) => (
          <FileTreeNode
            key={child.path}
            entry={child}
            depth={0}
            onContextMenu={handleContextMenu}
          />
        ))}

        {/* Empty state */}
        {rootEntry?.children?.length === 0 && (
          <div className="px-4 py-6 text-center text-[13px] text-[var(--text-secondary,#8b8b96)]">
            No files yet. Create a new file to get started.
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.entry && (
        <div
          className="fixed z-50 min-w-[160px] py-1 bg-[var(--bg-surface,#1e2028)] border border-[var(--border,#2e303a)] rounded-md shadow-lg"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.entry.isDir ? (
            <>
              <ContextMenuItem label="New File" onClick={handleNewFile} />
              <ContextMenuItem label="New Folder" onClick={handleNewFolder} />
              <ContextMenuDivider />
              <ContextMenuItem label="Rename" onClick={() => {
                setContextMenu((prev) => ({ ...prev, visible: false }));
                // Renaming for directories triggers inline edit via F2 on the node
              }} shortcut="F2" />
              <ContextMenuItem label="Delete" onClick={handleDelete} shortcut={navigator.platform.toUpperCase().includes("MAC") ? "\u2318\u232B" : "Del"} danger />
            </>
          ) : (
            <>
              <ContextMenuItem
                label="Open"
                onClick={() => {
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                  if (contextMenu.entry) {
                    const { openTab: openEditorTab } = useEditorStore.getState();
                    openEditorTab(contextMenu.entry.path);
                  }
                }}
              />
              <ContextMenuDivider />
              <ContextMenuItem label="Rename" onClick={() => {
                setContextMenu((prev) => ({ ...prev, visible: false }));
                // Renaming is handled inline via F2 or double-click on the node
              }} shortcut="F2" />
              <ContextMenuItem label="Delete" onClick={handleDelete} shortcut={navigator.platform.toUpperCase().includes("MAC") ? "\u2318\u232B" : "Del"} danger />
              <ContextMenuDivider />
              <ContextMenuItem label="Copy Path" onClick={handleCopyPath} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Helper: Find entry in tree by path ----

function findEntry(root: FileEntry | null, path: string): FileEntry | null {
  if (!root) return null;
  if (root.path === path) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findEntry(child, path);
      if (found) return found;
    }
  }
  return null;
}

// ---- Context Menu Sub-components ----

interface ContextMenuItemProps {
  label: string;
  onClick: () => void;
  shortcut?: string;
  danger?: boolean;
}

function ContextMenuItem({ label, onClick, shortcut, danger }: ContextMenuItemProps) {
  return (
    <button
      className={`w-full flex items-center justify-between px-3 py-1.5 text-[13px] text-left hover:bg-[var(--accent,#7c6fe0)] hover:text-white ${
        danger ? "text-red-400 hover:bg-red-600" : "text-[var(--text-primary,#e4e4e7)]"
      }`}
      onClick={onClick}
    >
      <span>{label}</span>
      {shortcut && (
        <span className="ml-4 text-[11px] opacity-50">{shortcut}</span>
      )}
    </button>
  );
}

function ContextMenuDivider() {
  return <div className="my-1 border-t border-[var(--border,#2e303a)]" />;
}
