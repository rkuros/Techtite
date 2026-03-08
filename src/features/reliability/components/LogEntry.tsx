interface LogEntryProps {
  id: string;
  title: string;
  subtitle: string;
  isActive: boolean;
  variant: "daily" | "session";
  onClick: () => void;
}

/**
 * LogEntry -- A single log entry row in the LogsPanel sidebar.
 *
 * Displays:
 * - Icon: clipboard for daily logs, robot/circle for session logs
 * - Title: agent name or "Daily Summary"
 * - Subtitle: date or session info
 * - Active state highlight
 */
export function LogEntry({
  title,
  subtitle,
  isActive,
  variant,
  onClick,
}: LogEntryProps) {
  const icon = variant === "daily" ? "\u{1F4CB}" : "\u{1F916}";

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-left transition-colors"
      style={{
        backgroundColor: isActive
          ? "var(--color-bg-active)"
          : "transparent",
        cursor: "pointer",
        border: "none",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = "var(--color-bg-hover)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = "transparent";
        }
      }}
    >
      {/* Icon */}
      <span className="text-sm shrink-0" aria-hidden="true">
        {icon}
      </span>

      {/* Text content */}
      <div className="flex flex-col min-w-0 flex-1">
        <span
          className="text-xs font-medium truncate"
          style={{
            color: isActive
              ? "var(--color-text)"
              : "var(--color-text-secondary)",
          }}
        >
          {title}
        </span>
        <span
          className="text-xs truncate"
          style={{ color: "var(--color-text-muted)", fontSize: 10 }}
        >
          {subtitle}
        </span>
      </div>
    </button>
  );
}
