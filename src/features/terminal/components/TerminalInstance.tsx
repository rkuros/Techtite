import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import "@xterm/xterm/css/xterm.css";
import { useTerminalStore } from "@/stores/terminal-store";
import { useEditorStore } from "@/stores/editor-store";
import { listenEvent } from "@/shared/utils/ipc";

interface TerminalInstanceProps {
  sessionId: string;
  isActive: boolean;
}

/**
 * TerminalInstance -- Renders a single xterm.js terminal session.
 *
 * Creates a Terminal instance with FitAddon and SearchAddon,
 * subscribes to `terminal:output` events for this session,
 * forwards keyboard input via `terminal:write` IPC command,
 * and handles resize via ResizeObserver + FitAddon + `terminal:resize` IPC.
 */
export function TerminalInstance({
  sessionId,
  isActive,
}: TerminalInstanceProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const writeToTerminal = useTerminalStore((s) => s.writeToTerminal);
  const resizeTerminal = useTerminalStore((s) => s.resizeTerminal);
  const terminalFontSize = useEditorStore((s) => s.terminalFontSize);

  // Initialize xterm.js on mount
  useEffect(() => {
    const container = terminalRef.current;
    if (!container) return;

    const initialFontSize = useEditorStore.getState().terminalFontSize;
    const terminal = new Terminal({
      scrollback: 10000,
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace",
      fontSize: initialFontSize,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: "bar",
      theme: {
        background: "#1e1e1e",
        foreground: "#dcddde",
        cursor: "#7c6af2",
        selectionBackground: "#7c6af240",
        black: "#1e1e1e",
        red: "#f44747",
        green: "#6a9955",
        yellow: "#d7ba7d",
        blue: "#569cd6",
        magenta: "#c586c0",
        cyan: "#4ec9b0",
        white: "#d4d4d4",
        brightBlack: "#808080",
        brightRed: "#f44747",
        brightGreen: "#6a9955",
        brightYellow: "#d7ba7d",
        brightBlue: "#569cd6",
        brightMagenta: "#c586c0",
        brightCyan: "#4ec9b0",
        brightWhite: "#ffffff",
      },
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(searchAddon);

    terminal.open(container);

    // Fit after a short delay to ensure container dimensions are settled
    requestAnimationFrame(() => {
      fitAddon.fit();
    });

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Forward keyboard input to PTY via IPC
    const dataDisposable = terminal.onData((data) => {
      writeToTerminal(sessionId, data).catch((err) => {
        console.error("Failed to write to terminal:", err);
      });
    });

    // Subscribe to terminal:output events from Rust backend
    let unlistenOutput: (() => void) | undefined;
    const outputPromise = listenEvent<{ id: string; data: string }>(
      "terminal:output",
      (payload) => {
        if (payload.id === sessionId) {
          terminal.write(payload.data);
        }
      }
    ).then((fn) => {
      unlistenOutput = fn;
    });

    // ResizeObserver to handle container size changes
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      const dims = fitAddon.proposeDimensions();
      if (dims && dims.cols > 0 && dims.rows > 0) {
        resizeTerminal(sessionId, dims.cols, dims.rows).catch(() => {
          // Ignore resize errors
        });
      }
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      dataDisposable.dispose();
      resizeObserver.disconnect();
      outputPromise.then(() => unlistenOutput?.());
      terminal.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sessionId, writeToTerminal, resizeTerminal]);

  // Update font size when store value changes
  useEffect(() => {
    const term = xtermRef.current;
    const fit = fitAddonRef.current;
    if (term && fit) {
      term.options.fontSize = terminalFontSize;
      requestAnimationFrame(() => fit.fit());
    }
  }, [terminalFontSize]);

  // Re-fit when tab becomes active
  useEffect(() => {
    if (isActive && fitAddonRef.current) {
      requestAnimationFrame(() => {
        fitAddonRef.current?.fit();
      });
    }
  }, [isActive]);

  return <div ref={terminalRef} className="h-full w-full" style={{ padding: "8px 12px 8px 12px" }} />;
}
