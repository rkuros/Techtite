import { useEffect } from "react";
import { useLogStore } from "@/stores/log-store";

/**
 * AmbientManagerCard -- Agents Dashboard card for the Ambient Manager.
 *
 * Displays:
 * - Purple status dot (always-on indicator)
 * - "Ambient Manager" title, "Resident Process" label
 * - Task completion rate progress bar
 * - Last check timestamp
 * - Alert badge when new check results arrive
 */
export function AmbientManagerCard() {
  const { ambientStatus, checkResults, fetchAmbientStatus, fetchCheckResults } =
    useLogStore();

  useEffect(() => {
    fetchAmbientStatus();
    fetchCheckResults();
  }, [fetchAmbientStatus, fetchCheckResults]);

  const completionPercent = Math.round(
    ambientStatus.taskCompletionRate * 100
  );

  // Count recent uncompleted checks as alerts
  const alertCount = checkResults.filter((r) => !r.isCompleted).length;

  return (
    <div
      className="flex flex-col gap-1.5 p-2.5 rounded"
      style={{
        backgroundColor: "var(--color-bg-surface)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      {/* Header: status dot + name + badge */}
      <div className="flex items-center gap-2">
        <span
          className="inline-block rounded-full shrink-0"
          style={{
            width: 8,
            height: 8,
            backgroundColor: ambientStatus.isRunning ? "#a855f7" : "#6b7280",
          }}
          title={ambientStatus.isRunning ? "Running" : "Stopped"}
        />
        <span
          className="text-xs font-medium truncate flex-1"
          style={{ color: "var(--color-text)" }}
        >
          Ambient Manager
        </span>
        <span
          className="text-xs shrink-0"
          style={{ color: "var(--color-text-muted)", fontSize: 10 }}
        >
          Resident Process
        </span>
        {alertCount > 0 && (
          <span
            className="inline-flex items-center justify-center rounded-full text-white font-bold shrink-0"
            style={{
              width: 16,
              height: 16,
              fontSize: 9,
              backgroundColor: "#ef4444",
            }}
            title={`${alertCount} alert(s)`}
          >
            {alertCount}
          </span>
        )}
      </div>

      {/* Task completion rate */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span
            className="text-xs"
            style={{ color: "var(--color-text-secondary)", fontSize: 10 }}
          >
            Task Completion
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: "var(--color-text-secondary)", fontSize: 10 }}
          >
            {completionPercent}%
          </span>
        </div>
        <div
          className="w-full rounded-full overflow-hidden"
          style={{
            height: 4,
            backgroundColor: "var(--color-bg-hover)",
          }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${completionPercent}%`,
              backgroundColor: "#a855f7",
            }}
          />
        </div>
      </div>

      {/* Last check timestamp */}
      {ambientStatus.lastCheckAt && (
        <div
          className="text-xs"
          style={{ color: "var(--color-text-muted)", fontSize: 10 }}
        >
          Last check: {new Date(ambientStatus.lastCheckAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
