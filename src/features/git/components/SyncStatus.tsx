import { useState, useCallback, useRef, useEffect } from "react";
import { useGitStore } from "@/stores/git-store";

/**
 * StatusBar sync indicator component.
 *
 * Displays:
 * - Current branch name
 * - Sync status icon and text (Synced / Syncing... / Error)
 *
 * Clicking the sync status opens a popover with:
 * - Last sync timestamp
 * - Error details (if any)
 * - "Sync Now" button
 */
export function SyncStatus() {
  const currentBranch = useGitStore((s) => s.currentBranch);
  const syncState = useGitStore((s) => s.syncState);
  const triggerSync = useGitStore((s) => s.triggerSync);
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    if (!showPopover) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setShowPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPopover]);

  const handleSyncNow = useCallback(() => {
    triggerSync();
  }, [triggerSync]);

  const { icon, label, color } = getSyncDisplay(syncState.status);

  return (
    <div className="flex items-center gap-3 relative" ref={popoverRef}>
      {/* Branch name */}
      <span
        className="flex items-center gap-1"
        style={{ color: "var(--color-text-muted)" }}
      >
        <BranchIcon />
        <span>{currentBranch}</span>
      </span>

      {/* Sync status (clickable) */}
      <button
        className="flex items-center gap-1 hover:opacity-80"
        style={{ color }}
        onClick={() => setShowPopover(!showPopover)}
        title="Sync status"
      >
        <span style={{ fontSize: 10 }}>{icon}</span>
        <span>{label}</span>
      </button>

      {/* Popover */}
      {showPopover && (
        <div
          className="absolute bottom-full left-0 mb-1 p-2 rounded shadow-lg z-50"
          style={{
            backgroundColor: "var(--color-bg-surface)",
            border: "1px solid var(--color-border-subtle)",
            minWidth: 200,
          }}
        >
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
              Sync Details
            </div>

            {/* Last sync time */}
            <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Last sync:{" "}
              {syncState.lastSyncAt
                ? formatTimestamp(syncState.lastSyncAt)
                : "Never"}
            </div>

            {/* Error message */}
            {syncState.errorMessage && (
              <div
                className="text-xs p-1 rounded"
                style={{
                  color: "var(--color-danger, #f14c4c)",
                  backgroundColor: "rgba(241, 76, 76, 0.08)",
                }}
              >
                {syncState.errorMessage}
              </div>
            )}

            {/* Sync Now button */}
            <button
              onClick={handleSyncNow}
              disabled={syncState.status === "syncing"}
              className="text-xs py-1 px-2 rounded font-medium"
              style={{
                backgroundColor: "var(--color-accent, #6495ed)",
                color: "#ffffff",
                cursor:
                  syncState.status === "syncing" ? "not-allowed" : "pointer",
                opacity: syncState.status === "syncing" ? 0.5 : 1,
              }}
            >
              {syncState.status === "syncing" ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getSyncDisplay(status: string): {
  icon: string;
  label: string;
  color: string;
} {
  switch (status) {
    case "syncing":
      return {
        icon: "\u21BB", // clockwise arrow
        label: "Syncing...",
        color: "var(--color-accent, #6495ed)",
      };
    case "completed":
      return {
        icon: "\u2713", // check mark
        label: "Synced",
        color: "var(--color-success, #73c991)",
      };
    case "error":
      return {
        icon: "\u2717", // X mark
        label: "Error",
        color: "var(--color-danger, #f14c4c)",
      };
    default:
      return {
        icon: "\u2014", // em dash
        label: "Idle",
        color: "var(--color-text-muted)",
      };
  }
}

function BranchIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="currentColor"
      style={{ flexShrink: 0 }}
    >
      <path
        fillRule="evenodd"
        d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"
      />
    </svg>
  );
}

function formatTimestamp(isoTimestamp: string): string {
  try {
    const date = new Date(isoTimestamp);
    return date.toLocaleString();
  } catch {
    return isoTimestamp;
  }
}
