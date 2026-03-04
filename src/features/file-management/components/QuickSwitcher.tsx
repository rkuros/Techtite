import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

import { useEditorStore } from "@/stores/editor-store";
import { useFileTreeStore } from "@/stores/file-tree-store";

/**
 * QuickSwitcher: A modal for quickly finding and opening files via fuzzy search.
 *
 * Activated by Cmd+P (macOS) / Ctrl+P (Windows/Linux).
 * Uses fuse.js (via file-tree-store) for fuzzy matching against the flat file list.
 * Supports keyboard navigation (up/down arrows, Enter to select, Esc to close).
 */
export function QuickSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const searchFiles = useFileTreeStore((s) => s.searchFiles);
  const openTab = useEditorStore((s) => s.openTab);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Compute results from the current query
  const results = searchFiles(query);

  // ---- Global keyboard shortcut: Cmd+P / Ctrl+P ----

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd+P / Ctrl+P — open Quick Switcher (only if Shift is NOT held, to avoid Cmd+Shift+P)
      if (isMod && e.key === "p" && !e.shiftKey) {
        e.preventDefault();
        setIsOpen((prev) => {
          if (!prev) {
            // Opening: reset state
            setQuery("");
            setSelectedIndex(0);
            return true;
          }
          // If already open, close it
          return false;
        });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ---- Focus input when modal opens ----

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // ---- Reset selected index when results change ----

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // ---- Scroll selected item into view ----

  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement | undefined;
      selectedEl?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // ---- Select a file and close ----

  const selectFile = useCallback(
    (filePath: string) => {
      openTab(filePath);
      setIsOpen(false);
      setQuery("");
    },
    [openTab]
  );

  // ---- Keyboard navigation within the modal ----

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;

        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;

        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            selectFile(results[selectedIndex].path);
          }
          break;

        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setQuery("");
          break;
      }
    },
    [results, selectedIndex, selectFile]
  );

  // ---- Do not render when closed ----

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center"
      style={{ paddingTop: "14vh" }}
      onClick={() => {
        setIsOpen(false);
        setQuery("");
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Modal */}
      <div
        className="relative w-[560px] max-h-[60vh] flex flex-col bg-[var(--bg-surface,#1e2028)] border border-[var(--border,#2e303a)] rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="p-3 border-b border-[var(--border,#2e303a)]">
          <input
            ref={inputRef}
            className="w-full bg-transparent text-[16px] text-[var(--text-primary,#e4e4e7)] placeholder-[var(--text-secondary,#8b8b96)] outline-none"
            placeholder="Type to search files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Results list */}
        <div ref={listRef} className="flex-1 overflow-y-auto py-1">
          {results.length === 0 && query.trim() && (
            <div className="px-4 py-6 text-center text-[13px] text-[var(--text-secondary,#8b8b96)]">
              No files match "{query}"
            </div>
          )}

          {results.map((item, index) => (
            <button
              key={item.path}
              className={`w-full flex items-center gap-2 px-4 py-1.5 text-left text-[13px] ${
                index === selectedIndex
                  ? "bg-[var(--accent,#7c6fe0)] text-white"
                  : "text-[var(--text-primary,#e4e4e7)] hover:bg-[var(--bg-hover,#23252f)]"
              }`}
              onClick={() => selectFile(item.path)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="text-[14px]">{"\uD83D\uDCC4"}</span>
              <span className="font-medium truncate">{item.name}</span>
              <span
                className={`ml-auto text-[11px] truncate ${
                  index === selectedIndex ? "text-white/70" : "text-[var(--text-secondary,#8b8b96)]"
                }`}
              >
                {item.path}
              </span>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-[var(--border,#2e303a)] text-[11px] text-[var(--text-secondary,#8b8b96)] flex gap-4">
          <span>
            <kbd className="px-1 py-0.5 rounded bg-[var(--bg-hover,#23252f)] text-[10px]">{"\u2191\u2193"}</kbd>{" "}
            Navigate
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-[var(--bg-hover,#23252f)] text-[10px]">{"\u21B5"}</kbd>{" "}
            Open
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-[var(--bg-hover,#23252f)] text-[10px]">Esc</kbd>{" "}
            Close
          </span>
        </div>
      </div>
    </div>
  );
}
