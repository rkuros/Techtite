import { useEffect, useRef, useCallback, useState } from "react";
import { useTerminalStore } from "@/stores/terminal-store";
import { listenEvent } from "@/shared/utils/ipc";

interface TerminalInstanceProps {
  sessionId: string;
  isActive: boolean;
}

/**
 * TerminalInstance — Renders a single terminal session.
 *
 * This is a placeholder for the xterm.js terminal emulator.
 * When @xterm/xterm is installed, this component will:
 * 1. Create a Terminal instance with FitAddon and SearchAddon
 * 2. Subscribe to `terminal:output` events for this session
 * 3. Forward keyboard input via `terminal:write` IPC command
 * 4. Handle resize via ResizeObserver + FitAddon + `terminal:resize` IPC
 * 5. Support in-terminal search with Ctrl+F
 *
 * Current implementation: A styled placeholder div that displays
 * terminal output as plain text and accepts basic keyboard input.
 */
export function TerminalInstance({
  sessionId,
  isActive: _isActive,
}: TerminalInstanceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [outputLines, setOutputLines] = useState<string[]>([
    `Terminal session: ${sessionId}`,
    "Waiting for PTY connection...",
    "",
    "// xterm.js integration placeholder",
    "// Install @xterm/xterm, @xterm/addon-fit, @xterm/addon-search",
    "// to enable full terminal emulation.",
    "",
  ]);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const writeToTerminal = useTerminalStore((s) => s.writeToTerminal);
  const resizeTerminal = useTerminalStore((s) => s.resizeTerminal);

  // Subscribe to terminal output events
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listenEvent<{ id: string; data: string }>(
      "terminal:output",
      (payload) => {
        if (payload.id === sessionId) {
          setOutputLines((prev) => {
            // Split incoming data by newlines and append
            const newLines = payload.data.split("\n");
            const combined = [...prev, ...newLines];
            // Keep scrollback buffer at 10,000 lines max
            if (combined.length > 10000) {
              return combined.slice(combined.length - 10000);
            }
            return combined;
          });
        }
      }
    ).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [sessionId]);

  // Auto-scroll to bottom on new output
  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [outputLines]);

  // Handle keyboard input
  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent) => {
      // Prevent default for most keys to avoid browser shortcuts
      // but allow Ctrl+C, Ctrl+V, etc.
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
      }

      let data = "";

      if (e.key === "Enter") {
        data = "\r";
      } else if (e.key === "Backspace") {
        data = "\x7f";
      } else if (e.key === "Tab") {
        e.preventDefault();
        data = "\t";
      } else if (e.key === "Escape") {
        data = "\x1b";
      } else if (e.key === "ArrowUp") {
        data = "\x1b[A";
      } else if (e.key === "ArrowDown") {
        data = "\x1b[B";
      } else if (e.key === "ArrowRight") {
        data = "\x1b[C";
      } else if (e.key === "ArrowLeft") {
        data = "\x1b[D";
      } else if (e.ctrlKey && e.key === "c") {
        data = "\x03"; // SIGINT
      } else if (e.ctrlKey && e.key === "d") {
        data = "\x04"; // EOF
      } else if (e.ctrlKey && e.key === "z") {
        data = "\x1a"; // SIGTSTP
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        data = e.key;
      }

      if (data) {
        try {
          await writeToTerminal(sessionId, data);
        } catch (err) {
          console.error("Failed to write to terminal:", err);
        }
      }
    },
    [sessionId, writeToTerminal]
  );

  // ResizeObserver for container size changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      // TODO: When xterm.js is installed, call fitAddon.fit() here
      // and then send the new dimensions via terminal:resize
      //
      // const { cols, rows } = fitAddon.proposeDimensions();
      // resizeTerminal(sessionId, cols, rows);
      //
      // For now, estimate cols/rows from container dimensions
      const charWidth = 7.8; // approximate monospace char width at 13px
      const lineHeight = 18; // approximate line height
      const cols = Math.floor(container.clientWidth / charWidth);
      const rows = Math.floor(container.clientHeight / lineHeight);
      if (cols > 0 && rows > 0) {
        resizeTerminal(sessionId, cols, rows).catch(() => {
          // Ignore resize errors for placeholder
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [sessionId, resizeTerminal]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{
        backgroundColor: "#1e1e1e",
        cursor: "text",
      }}
    >
      {/*
        xterm.js integration point:

        When @xterm/xterm is installed, replace this entire inner content with:

        ```tsx
        const terminalRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
          const terminal = new Terminal({
            scrollback: 10000,
            fontFamily: 'var(--mono)',
            fontSize: 13,
            theme: {
              background: '#1e1e1e',
              foreground: '#dcddde',
              cursor: '#7c6af2',
            },
          });
          const fitAddon = new FitAddon();
          const searchAddon = new SearchAddon();
          terminal.loadAddon(fitAddon);
          terminal.loadAddon(searchAddon);
          terminal.open(terminalRef.current!);
          fitAddon.fit();

          // Subscribe to terminal:output
          const unlisten = listenEvent<{id: string, data: string}>(
            'terminal:output',
            (p) => { if (p.id === sessionId) terminal.write(p.data); }
          );

          // Forward input to PTY
          terminal.onData((data) => writeToTerminal(sessionId, data));

          // Resize handling
          const ro = new ResizeObserver(() => {
            fitAddon.fit();
            resizeTerminal(sessionId, terminal.cols, terminal.rows);
          });
          ro.observe(terminalRef.current!);

          return () => { terminal.dispose(); ro.disconnect(); unlisten.then(fn => fn()); };
        }, [sessionId]);

        return <div ref={terminalRef} className="h-full w-full" />;
        ```
      */}
      <div
        className="h-full w-full overflow-y-auto p-2"
        style={{
          fontFamily:
            "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace",
          fontSize: 13,
          lineHeight: "18px",
          color: "#dcddde",
        }}
      >
        {outputLines.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all">
            {line || "\u00A0"}
          </div>
        ))}
        <div ref={outputEndRef} />
      </div>
    </div>
  );
}
