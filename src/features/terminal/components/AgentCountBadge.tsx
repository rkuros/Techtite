import { useTerminalStore } from "@/stores/terminal-store";
import { useEditorStore } from "@/stores/editor-store";
import { SIDEBAR_PANELS } from "@/shared/constants";

/**
 * AgentCountBadge — StatusBar badge showing active agent count.
 *
 * Displays the number of currently running agents in the format
 * "N agents". Hidden when no agents are active.
 *
 * Clicking the badge switches the left sidebar to the Agents Dashboard.
 */
export function AgentCountBadge() {
  const agents = useTerminalStore((s) => s.agents);
  const setSidebarPanel = useEditorStore((s) => s.setSidebarPanel);

  const runningCount = agents.filter(
    (a) => a.status.type === "running" || a.status.type === "idle"
  ).length;

  if (runningCount === 0) {
    return null;
  }

  return (
    <button
      onClick={() => setSidebarPanel(SIDEBAR_PANELS.AGENTS)}
      className="flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
      style={{
        fontSize: 11,
        color: "var(--color-text-muted)",
        backgroundColor: "transparent",
        border: "none",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor =
          "var(--color-bg-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
      title={`${runningCount} active agent${runningCount !== 1 ? "s" : ""}`}
    >
      <span role="img" aria-label="agent">
        {"🤖"}
      </span>
      <span>
        {runningCount} agent{runningCount !== 1 ? "s" : ""}
      </span>
    </button>
  );
}
