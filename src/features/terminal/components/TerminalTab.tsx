import { useCallback } from "react";

interface TerminalTabProps {
  id: string;
  label: string;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
}

/**
 * TerminalTab — A single tab in the terminal panel's tab bar.
 *
 * Displays the session label (e.g., "Shell", "Claude #1") with
 * an active state highlight and a close button.
 */
export function TerminalTab({
  id: _id,
  label,
  isActive,
  onSelect,
  onClose,
}: TerminalTabProps) {
  const handleClose = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClose();
    },
    [onClose]
  );

  return (
    <div
      role="tab"
      aria-selected={isActive}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className="flex items-center gap-1 px-3 cursor-pointer select-none shrink-0 transition-colors"
      style={{
        height: 32,
        fontSize: 11,
        borderBottom: isActive
          ? "2px solid var(--color-accent)"
          : "2px solid transparent",
        backgroundColor: isActive
          ? "var(--color-terminal-bg)"
          : "transparent",
        color: isActive
          ? "var(--color-text)"
          : "var(--color-text-muted)",
      }}
    >
      <span className="truncate" style={{ maxWidth: 120 }}>
        {label}
      </span>

      <button
        onClick={handleClose}
        className="flex items-center justify-center rounded transition-colors"
        style={{
          width: 16,
          height: 16,
          fontSize: 10,
          color: "var(--color-text-muted)",
          lineHeight: 1,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor =
            "var(--color-bg-hover)";
          e.currentTarget.style.color = "var(--color-text)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = "var(--color-text-muted)";
        }}
        title={`Close ${label}`}
        aria-label={`Close terminal: ${label}`}
      >
        x
      </button>
    </div>
  );
}
