import { useCallback, useEffect, useState } from "react";
import { useTerminalStore } from "@/stores/terminal-store";
import type { AgentConfig } from "@/types/agent";
import { AgentCard } from "./AgentCard";

/**
 * AgentsDashboard — Left sidebar panel for agent management.
 *
 * Displays:
 * - A list of all registered agents as cards
 * - A "Launch Agent" button to start new agents
 * - API cost summary (placeholder for Unit 9 integration)
 *
 * Shown when the Ribbon's "Agents" icon is selected
 * (activeSidebarPanel === "agents").
 */
export function AgentsDashboard() {
  const agents = useTerminalStore((s) => s.agents);
  const startAgent = useTerminalStore((s) => s.startAgent);
  const stopAgent = useTerminalStore((s) => s.stopAgent);
  const fetchAgents = useTerminalStore((s) => s.fetchAgents);
  const setActiveTerminal = useTerminalStore((s) => s.setActiveTerminal);
  const setTerminalPanelVisible = useTerminalStore(
    (s) => s.setTerminalPanelVisible
  );
  const fetchOperationLog = useTerminalStore((s) => s.fetchOperationLog);

  const [isLaunchDialogOpen, setIsLaunchDialogOpen] = useState(false);
  const [launchName, setLaunchName] = useState("");
  const [launchPrompt, setLaunchPrompt] = useState("");
  const [launchMode, setLaunchMode] = useState<"cli" | "sdk">("cli");
  const [isLaunching, setIsLaunching] = useState(false);

  // Fetch agents on mount
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleLaunchAgent = useCallback(async () => {
    if (!launchName.trim()) return;

    setIsLaunching(true);
    try {
      const config: AgentConfig = {
        name: launchName.trim(),
        initialPrompt: launchPrompt.trim() || undefined,
        mode: launchMode,
      };
      await startAgent(config);
      setIsLaunchDialogOpen(false);
      setLaunchName("");
      setLaunchPrompt("");
    } catch (err) {
      console.error("Failed to start agent:", err);
    } finally {
      setIsLaunching(false);
    }
  }, [launchName, launchPrompt, launchMode, startAgent]);

  const handleShowTerminal = useCallback(
    (terminalTabId: string) => {
      setActiveTerminal(terminalTabId);
      setTerminalPanelVisible(true);
    },
    [setActiveTerminal, setTerminalPanelVisible]
  );

  const handleShowLog = useCallback(
    async (agentId: string) => {
      await fetchOperationLog(agentId, 100);
    },
    [fetchOperationLog]
  );

  const runningAgents = agents.filter(
    (a) => a.status.type === "running" || a.status.type === "idle"
  );
  const completedAgents = agents.filter(
    (a) =>
      a.status.type === "completed" ||
      a.status.type === "stopped" ||
      a.status.type === "error"
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          Agents
        </span>
        <span
          className="text-xs"
          style={{ color: "var(--color-text-muted)" }}
        >
          {runningAgents.length} active
        </span>
      </div>

      {/* Launch Agent button */}
      <button
        onClick={() => setIsLaunchDialogOpen(true)}
        className="w-full py-1.5 px-3 rounded text-xs font-medium transition-colors"
        style={{
          backgroundColor: "var(--color-accent)",
          color: "var(--color-text-on-accent, #fff)",
        }}
      >
        + Launch Agent
      </button>

      {/* Launch dialog */}
      {isLaunchDialogOpen && (
        <div
          className="flex flex-col gap-2 p-3 rounded"
          style={{
            backgroundColor: "var(--color-bg-surface)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <input
            type="text"
            placeholder="Agent name..."
            value={launchName}
            onChange={(e) => setLaunchName(e.target.value)}
            className="w-full px-2 py-1 rounded text-xs outline-none"
            style={{
              backgroundColor: "var(--color-bg-base)",
              border: "1px solid var(--color-border-subtle)",
              color: "var(--color-text)",
            }}
            autoFocus
          />
          <textarea
            placeholder="Initial prompt or instructions (optional)..."
            value={launchPrompt}
            onChange={(e) => setLaunchPrompt(e.target.value)}
            rows={3}
            className="w-full px-2 py-1 rounded text-xs outline-none resize-none"
            style={{
              backgroundColor: "var(--color-bg-base)",
              border: "1px solid var(--color-border-subtle)",
              color: "var(--color-text)",
            }}
          />
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="cli"
                checked={launchMode === "cli"}
                onChange={() => setLaunchMode("cli")}
              />
              <span style={{ color: "var(--color-text-secondary)" }}>
                CLI
              </span>
            </label>
            <label className="flex items-center gap-1 text-xs cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="sdk"
                checked={launchMode === "sdk"}
                onChange={() => setLaunchMode("sdk")}
              />
              <span style={{ color: "var(--color-text-secondary)" }}>
                SDK
              </span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLaunchAgent}
              disabled={isLaunching || !launchName.trim()}
              className="flex-1 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
              style={{
                backgroundColor: "var(--color-accent)",
                color: "var(--color-text-on-accent, #fff)",
              }}
            >
              {isLaunching ? "Starting..." : "Start"}
            </button>
            <button
              onClick={() => setIsLaunchDialogOpen(false)}
              className="py-1 px-3 rounded text-xs transition-colors"
              style={{
                backgroundColor: "var(--color-bg-hover)",
                color: "var(--color-text-muted)",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Active agents */}
      {runningAgents.length > 0 && (
        <div className="flex flex-col gap-2">
          <span
            className="text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            Running
          </span>
          {runningAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onStop={() => stopAgent(agent.id)}
              onShowTerminal={
                agent.terminalTabId
                  ? () => handleShowTerminal(agent.terminalTabId!)
                  : undefined
              }
              onShowLog={() => handleShowLog(agent.id)}
            />
          ))}
        </div>
      )}

      {/* Completed / stopped agents */}
      {completedAgents.length > 0 && (
        <div className="flex flex-col gap-2">
          <span
            className="text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            Finished
          </span>
          {completedAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onShowLog={() => handleShowLog(agent.id)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {agents.length === 0 && (
        <div
          className="text-xs text-center py-4"
          style={{ color: "var(--color-text-muted)" }}
        >
          No agents running. Click "Launch Agent" to start one.
        </div>
      )}

      {/* API Cost summary placeholder — Unit 9 integration point */}
      {/* When Unit 9 is implemented, subscribe to cost:updated events
          and display per-agent and total cost here */}
      {runningAgents.length > 0 && (
        <div
          className="p-2 rounded text-xs"
          style={{
            backgroundColor: "var(--color-bg-surface)",
            color: "var(--color-text-muted)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <div className="font-medium mb-1">API Cost</div>
          <div>Waiting for Unit 9 integration...</div>
        </div>
      )}

      {/* Ambient Manager card placeholder — Unit 8 integration point */}
      {/* When Unit 8 is implemented, import AmbientManagerCard here:
          import { AmbientManagerCard } from "@/features/reliability";
          <AmbientManagerCard /> */}
    </div>
  );
}
