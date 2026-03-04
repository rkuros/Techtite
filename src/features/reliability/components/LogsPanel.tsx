import { useEffect, useMemo } from "react";
import { useLogStore } from "@/stores/log-store";
import { LogEntry } from "./LogEntry";
import type { SessionLog, DailyLog } from "@/types/log";

/**
 * Classify a date string into a display label.
 * Returns "TODAY", "YESTERDAY", or the date string itself.
 */
function getDateLabel(dateStr: string): string {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (dateStr === todayStr) return "TODAY";
  if (dateStr === yesterdayStr) return "YESTERDAY";
  return dateStr;
}

interface DateSection {
  label: string;
  date: string;
  dailyLog: DailyLog | undefined;
  sessions: SessionLog[];
}

/**
 * LogsPanel -- Left sidebar panel showing session logs grouped by date.
 *
 * Features:
 * - Date sections (TODAY / YESTERDAY / older dates)
 * - Daily log entry per date (clipboard icon)
 * - Session log entries per date (robot icon)
 * - Agent name filter dropdown
 * - Click to view log content
 */
export function LogsPanel() {
  const {
    sessionLogs,
    dailyLogs,
    activeLogId,
    filterAgentName,
    setFilters,
    setActiveLog,
    fetchSessionLogs,
  } = useLogStore();

  // Fetch logs on mount
  useEffect(() => {
    fetchSessionLogs();
  }, [fetchSessionLogs]);

  // Derive unique agent names for filter dropdown
  const agentNames = useMemo(() => {
    const names = new Set(sessionLogs.map((l) => l.agentName));
    return Array.from(names).sort();
  }, [sessionLogs]);

  // Group logs by date
  const dateSections = useMemo((): DateSection[] => {
    const dateMap = new Map<string, SessionLog[]>();

    for (const log of sessionLogs) {
      const existing = dateMap.get(log.date) ?? [];
      existing.push(log);
      dateMap.set(log.date, existing);
    }

    // Also include dates from daily logs that may not have sessions
    for (const daily of dailyLogs) {
      if (!dateMap.has(daily.date)) {
        dateMap.set(daily.date, []);
      }
    }

    // Sort dates descending (newest first)
    const sortedDates = Array.from(dateMap.keys()).sort((a, b) =>
      b.localeCompare(a)
    );

    return sortedDates.map((date) => ({
      label: getDateLabel(date),
      date,
      dailyLog: dailyLogs.find((d) => d.date === date),
      sessions: dateMap.get(date) ?? [],
    }));
  }, [sessionLogs, dailyLogs]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          Session Logs
        </span>
      </div>

      {/* Agent name filter */}
      {agentNames.length > 1 && (
        <div className="px-3 py-1.5">
          <select
            className="w-full text-xs rounded px-2 py-1"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border-subtle)",
            }}
            value={filterAgentName ?? ""}
            onChange={(e) => {
              const value = e.target.value || null;
              setFilters(null, value);
            }}
          >
            <option value="">All Agents</option>
            {agentNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Log entries grouped by date */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {dateSections.length === 0 && (
          <div
            className="text-xs text-center py-4"
            style={{ color: "var(--color-text-muted)" }}
          >
            No session logs yet
          </div>
        )}

        {dateSections.map((section) => (
          <div key={section.date} className="mb-2">
            {/* Date header */}
            <div
              className="text-xs font-semibold px-2 py-1 uppercase tracking-wider"
              style={{ color: "var(--color-text-muted)", fontSize: 10 }}
            >
              {section.label}
            </div>

            {/* Daily log entry */}
            {section.dailyLog && (
              <LogEntry
                id={section.dailyLog.id}
                title="Daily Summary"
                subtitle={`${section.dailyLog.sessions.length} sessions | ${section.dailyLog.totalFilesChanged} files | ${section.dailyLog.totalCommits} commits`}
                isActive={activeLogId === section.dailyLog.id}
                variant="daily"
                onClick={() =>
                  setActiveLog(
                    section.dailyLog!.id,
                    section.dailyLog!.filePath
                  )
                }
              />
            )}

            {/* Session log entries */}
            {section.sessions.map((session) => (
              <LogEntry
                key={session.id}
                id={session.id}
                title={session.agentName}
                subtitle={`Session #${session.sessionNumber}${session.summary ? ` - ${session.summary}` : ""}`}
                isActive={activeLogId === session.id}
                variant="session"
                onClick={() => setActiveLog(session.id, session.filePath)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
