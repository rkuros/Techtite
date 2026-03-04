import type { AgentInfo, AgentStatus } from "@/types/agent";

interface AgentCardProps {
  agent: AgentInfo;
  onStop?: () => void;
  onShowTerminal?: () => void;
  onShowLog?: () => void;
}

/**
 * Status dot color mapping.
 *
 * Running = green, Idle = yellow, Error = red,
 * Completed/Stopped = grey.
 */
function getStatusColor(status: AgentStatus): string {
  switch (status.type) {
    case "running":
      return "#22c55e"; // green
    case "idle":
      return "#eab308"; // yellow
    case "error":
      return "#ef4444"; // red
    case "completed":
    case "stopped":
      return "#6b7280"; // grey
  }
}

function getStatusLabel(status: AgentStatus): string {
  switch (status.type) {
    case "running":
      return "Running";
    case "idle":
      return "Idle";
    case "error":
      return `Error: ${status.message}`;
    case "completed":
      return "Completed";
    case "stopped":
      return "Stopped";
  }
}

/**
 * AgentCard — Displays information about a single agent.
 *
 * Shows:
 * - Status indicator dot (color-coded by state)
 * - Agent name
 * - Current task description (truncated to 1 line)
 * - Action buttons: Terminal, Log, Stop
 *
 * Token count / cost display is a placeholder for Unit 9 integration
 * (cost:updated event subscription).
 */
export function AgentCard({
  agent,
  onStop,
  onShowTerminal,
  onShowLog,
}: AgentCardProps) {
  const statusColor = getStatusColor(agent.status);
  const statusLabel = getStatusLabel(agent.status);
  const isActive =
    agent.status.type === "running" || agent.status.type === "idle";

  return (
    <div
      className="flex flex-col gap-1.5 p-2.5 rounded"
      style={{
        backgroundColor: "var(--color-bg-surface)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      {/* Header: status dot + name */}
      <div className="flex items-center gap-2">
        <span
          className="inline-block rounded-full shrink-0"
          style={{
            width: 8,
            height: 8,
            backgroundColor: statusColor,
          }}
          title={statusLabel}
        />
        <span
          className="text-xs font-medium truncate flex-1"
          style={{ color: "var(--color-text)" }}
        >
          {agent.name}
        </span>
        <span
          className="text-xs shrink-0"
          style={{ color: "var(--color-text-muted)", fontSize: 10 }}
        >
          {agent.agentType === "ambient" ? "Ambient" : "Worker"}
        </span>
      </div>

      {/* Current task */}
      {agent.currentTask && (
        <div
          className="text-xs truncate"
          style={{
            color: "var(--color-text-secondary)",
            maxWidth: "100%",
          }}
          title={agent.currentTask}
        >
          {agent.currentTask}
        </div>
      )}

      {/* Status label for non-running agents */}
      {!isActive && (
        <div
          className="text-xs"
          style={{ color: "var(--color-text-muted)" }}
        >
          {statusLabel}
        </div>
      )}

      {/* Token / Cost placeholder — Unit 9 integration */}
      {/* When Unit 9 is implemented, display tokens and cost:
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {formatTokens(agent.tokenCount)} tokens | ${formatCost(agent.cost)}
          </div>
      */}

      {/* Action buttons */}
      <div className="flex items-center gap-1 mt-0.5">
        {onShowTerminal && (
          <ActionButton label="Terminal" onClick={onShowTerminal} />
        )}
        {onShowLog && <ActionButton label="Log" onClick={onShowLog} />}
        {onStop && isActive && (
          <ActionButton label="Stop" onClick={onStop} variant="danger" />
        )}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  variant = "default",
}: {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-0.5 rounded text-xs transition-colors"
      style={{
        backgroundColor:
          variant === "danger"
            ? "rgba(239, 68, 68, 0.15)"
            : "var(--color-bg-hover)",
        color:
          variant === "danger"
            ? "#ef4444"
            : "var(--color-text-secondary)",
        fontSize: 10,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "0.8";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "1";
      }}
    >
      {label}
    </button>
  );
}
