import { useCallback, useEffect } from "react";
import { useTerminalStore } from "@/stores/terminal-store";
import { TerminalInstance } from "./TerminalInstance";

/**
 * TerminalPanel — The right-side terminal panel.
 *
 * Contains:
 * - A tab bar showing all open terminal sessions
 * - The active terminal instance
 * - Controls for creating/closing terminals and toggling visibility
 *
 * Placed inside the right Panel of react-resizable-panels in AppLayout.
 * Minimum width: 250px. Default: 20% of window width.
 */
export function TerminalPanel() {
  const terminals = useTerminalStore((s) => s.terminals);
  const activeTerminalId = useTerminalStore((s) => s.activeTerminalId);
  const createTerminal = useTerminalStore((s) => s.createTerminal);
  const toggleTerminalPanel = useTerminalStore((s) => s.toggleTerminalPanel);
  const initEventListeners = useTerminalStore((s) => s.initEventListeners);

  // Initialize event listeners on mount
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    initEventListeners().then((fn) => {
      if (cancelled) {
        fn();
      } else {
        cleanup = fn;
      }
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [initEventListeners]);

  // Keyboard shortcut: Ctrl+` to toggle terminal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        toggleTerminalPanel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleTerminalPanel]);

  const handleCreateTerminal = useCallback(async () => {
    try {
      await createTerminal();
    } catch (err) {
      console.error("Failed to create terminal:", err);
    }
  }, [createTerminal]);

  return (
    <div className="flex flex-col h-full">
      {/* Terminal body */}
      <div
        className="flex-1 overflow-hidden"
        style={{ backgroundColor: "var(--color-terminal-bg)" }}
      >
        {terminals.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full gap-2"
            style={{ color: "var(--color-text-muted)" }}
          >
            <span style={{ fontSize: 12 }}>No terminal sessions</span>
            <button
              onClick={handleCreateTerminal}
              className="px-3 py-1 rounded text-xs transition-colors"
              style={{
                backgroundColor: "var(--color-accent)",
                color: "var(--color-text-on-accent)",
              }}
            >
              Open Terminal
            </button>
          </div>
        ) : (
          terminals.map((session) => (
            <div
              key={session.id}
              style={{
                display:
                  session.id === activeTerminalId ? "block" : "none",
                height: "100%",
              }}
            >
              <TerminalInstance
                sessionId={session.id}
                isActive={session.id === activeTerminalId}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
