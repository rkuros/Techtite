import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

import { useFileTreeStore, type CommandEntry } from "@/stores/file-tree-store";

/**
 * CommandPalette: A modal for searching and executing registered application commands.
 *
 * Activated by Cmd+Shift+P (macOS) / Ctrl+Shift+P (Windows/Linux).
 * Uses fuse.js (via file-tree-store) for fuzzy matching against registered commands.
 * Each command displays its label, category, and optional keyboard shortcut.
 * Supports keyboard navigation (up/down arrows, Enter to execute, Esc to close).
 */
export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const searchCommands = useFileTreeStore((s) => s.searchCommands);
  const executeCommand = useFileTreeStore((s) => s.executeCommand);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Compute results from the current query
  const results: CommandEntry[] = searchCommands(query);

  // ---- Global keyboard shortcut: Cmd+Shift+P / Ctrl+Shift+P ----

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd+Shift+P / Ctrl+Shift+P — open Command Palette
      if (isMod && e.shiftKey && e.key === "p") {
        e.preventDefault();
        setIsOpen((prev) => {
          if (!prev) {
            setQuery("");
            setSelectedIndex(0);
            return true;
          }
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

  // ---- Execute a command and close ----

  const runCommand = useCallback(
    (commandId: string) => {
      executeCommand(commandId);
      setIsOpen(false);
      setQuery("");
    },
    [executeCommand]
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
            runCommand(results[selectedIndex].id);
          }
          break;

        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setQuery("");
          break;
      }
    },
    [results, selectedIndex, runCommand]
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
        <div className="p-3 border-b border-[var(--border,#2e303a)] flex items-center gap-2">
          <span className="text-[14px] text-[var(--text-secondary,#8b8b96)]">&gt;</span>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-[16px] text-[var(--text-primary,#e4e4e7)] placeholder-[var(--text-secondary,#8b8b96)] outline-none"
            placeholder="Type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Results list */}
        <div ref={listRef} className="flex-1 overflow-y-auto py-1">
          {results.length === 0 && query.trim() && (
            <div className="px-4 py-6 text-center text-[13px] text-[var(--text-secondary,#8b8b96)]">
              No commands match "{query}"
            </div>
          )}

          {results.length === 0 && !query.trim() && (
            <div className="px-4 py-6 text-center text-[13px] text-[var(--text-secondary,#8b8b96)]">
              No commands registered yet.
            </div>
          )}

          {results.map((cmd, index) => (
            <button
              key={cmd.id}
              className={`w-full flex items-center gap-3 px-4 py-2 text-left text-[13px] ${
                index === selectedIndex
                  ? "bg-[var(--accent,#7c6fe0)] text-white"
                  : "text-[var(--text-primary,#e4e4e7)] hover:bg-[var(--bg-hover,#23252f)]"
              }`}
              onClick={() => runCommand(cmd.id)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {/* Category badge */}
              {cmd.category && (
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded ${
                    index === selectedIndex
                      ? "bg-white/20 text-white"
                      : "bg-[var(--bg-hover,#23252f)] text-[var(--text-secondary,#8b8b96)]"
                  }`}
                >
                  {cmd.category}
                </span>
              )}

              {/* Command label */}
              <span className="flex-1 truncate">{cmd.label}</span>

              {/* Keyboard shortcut */}
              {cmd.shortcut && (
                <span
                  className={`text-[11px] ${
                    index === selectedIndex
                      ? "text-white/70"
                      : "text-[var(--text-secondary,#8b8b96)]"
                  }`}
                >
                  {cmd.shortcut}
                </span>
              )}
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
            Execute
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
