import { useCallback, useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent } from "react";

import { useEditorStore } from "@/stores/editor-store";
import { useFileTreeStore } from "@/stores/file-tree-store";
import type { FileEntry } from "@/types/file";

interface FileTreeNodeProps {
  entry: FileEntry;
  depth: number;
  onContextMenu: (e: MouseEvent, entry: FileEntry) => void;
}

export function FileTreeNode({ entry, depth, onContextMenu }: FileTreeNodeProps) {
  const expandedDirs = useFileTreeStore((s) => s.expandedDirs);
  const selectedPath = useFileTreeStore((s) => s.selectedPath);
  const toggleDir = useFileTreeStore((s) => s.toggleDir);
  const selectNode = useFileTreeStore((s) => s.selectNode);
  const renameNode = useFileTreeStore((s) => s.renameNode);
  const moveNode = useFileTreeStore((s) => s.moveNode);
  const openTab = useEditorStore((s) => s.openTab);

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(entry.name);
  const [isDragOver, setIsDragOver] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const isExpanded = expandedDirs.has(entry.path);
  const isSelected = selectedPath === entry.path;

  // ---- Click handlers ----

  const handleClick = useCallback(() => {
    selectNode(entry.path);

    if (entry.isDir) {
      toggleDir(entry.path);
    } else {
      openTab(entry.path);
    }
  }, [entry.path, entry.isDir, selectNode, toggleDir, openTab]);

  const handleDoubleClick = useCallback(() => {
    if (!entry.isDir) {
      // Start inline rename on double-click
      setIsRenaming(true);
      setRenameValue(entry.name);
      // Use requestAnimationFrame to ensure the input is rendered before focusing
      requestAnimationFrame(() => {
        renameInputRef.current?.focus();
        // Select the file name without extension for easier renaming
        const dotIndex = entry.name.lastIndexOf(".");
        if (dotIndex > 0) {
          renameInputRef.current?.setSelectionRange(0, dotIndex);
        } else {
          renameInputRef.current?.select();
        }
      });
    }
  }, [entry.name, entry.isDir]);

  // ---- Keyboard handler ----

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "F2" && isSelected) {
        e.preventDefault();
        setIsRenaming(true);
        setRenameValue(entry.name);
        requestAnimationFrame(() => {
          renameInputRef.current?.focus();
          const dotIndex = entry.name.lastIndexOf(".");
          if (dotIndex > 0) {
            renameInputRef.current?.setSelectionRange(0, dotIndex);
          } else {
            renameInputRef.current?.select();
          }
        });
      }
    },
    [isSelected, entry.name]
  );

  // ---- Rename handlers ----

  const commitRename = useCallback(async () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== entry.name) {
      try {
        await renameNode(entry.path, trimmed);
      } catch (err) {
        console.error("Rename failed:", err);
        // TODO: Show toast notification on rename failure
      }
    }
    setIsRenaming(false);
  }, [renameValue, entry.name, entry.path, renameNode]);

  const handleRenameKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitRename();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsRenaming(false);
        setRenameValue(entry.name);
      }
    },
    [commitRename, entry.name]
  );

  // ---- Drag & Drop handlers ----

  const handleDragStart = useCallback(
    (e: DragEvent) => {
      e.dataTransfer.setData("text/plain", entry.path);
      e.dataTransfer.effectAllowed = "move";
    },
    [entry.path]
  );

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      if (entry.isDir) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsDragOver(true);
      }
    },
    [entry.isDir]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (!entry.isDir) return;

      const sourcePath = e.dataTransfer.getData("text/plain");
      if (!sourcePath || sourcePath === entry.path) return;

      // Prevent dropping a parent folder into its own child
      if (entry.path.startsWith(sourcePath + "/")) return;

      try {
        await moveNode(sourcePath, entry.path);
      } catch (err) {
        console.error("Move failed:", err);
        // TODO: Show toast notification on move failure
      }
    },
    [entry.isDir, entry.path, moveNode]
  );

  // ---- Context menu handler ----

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      selectNode(entry.path);
      onContextMenu(e, entry);
    },
    [entry, selectNode, onContextMenu]
  );

  // ---- Render ----

  const paddingLeft = depth * 16;

  return (
    <div>
      {/* Node row */}
      <div
        className={`flex items-center cursor-pointer select-none text-[13px] leading-[28px] pr-2 ${
          isSelected
            ? "bg-[var(--bg-active,#2a2d3a)] text-[var(--accent,#7c6fe0)]"
            : "hover:bg-[var(--bg-hover,#23252f)]"
        } ${isDragOver ? "bg-[var(--bg-hover,#23252f)] outline outline-1 outline-[var(--accent,#7c6fe0)]" : ""}`}
        style={{ paddingLeft: `${paddingLeft}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        draggable={!isRenaming}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="treeitem"
        tabIndex={0}
        aria-expanded={entry.isDir ? isExpanded : undefined}
        aria-selected={isSelected}
      >
        {/* Expand/collapse icon for directories */}
        {entry.isDir ? (
          <span className="w-4 h-4 flex items-center justify-center mr-0.5 text-[10px] opacity-60">
            {isExpanded ? "\u25BC" : "\u25B6"}
          </span>
        ) : (
          <span className="w-4 h-4 mr-0.5" />
        )}

        {/* Icon */}
        <span className="mr-1.5 text-[14px]">
          {entry.isDir ? "\uD83D\uDCC1" : "\uD83D\uDCC4"}
        </span>

        {/* Name or rename input */}
        {isRenaming ? (
          <input
            ref={renameInputRef}
            className="flex-1 bg-[var(--bg-input,#1a1c24)] text-[var(--text-primary,#e4e4e7)] text-[13px] px-1 py-0 border border-[var(--accent,#7c6fe0)] rounded outline-none"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={commitRename}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate flex-1">{entry.name}</span>
        )}
      </div>

      {/* Children (rendered when directory is expanded) */}
      {entry.isDir && isExpanded && entry.children && (
        <div role="group">
          {entry.children.map((child) => (
            <FileTreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}
