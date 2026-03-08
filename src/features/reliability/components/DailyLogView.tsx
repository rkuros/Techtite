import React from "react";
import { useLogStore } from "@/stores/log-store";

/**
 * Parse file paths from log content, supporting patterns like:
 *   - `path/to/file.ts`
 *   - Modified: `src/main.rs`
 */
function renderContentLine(line: string, index: number) {
  // Match file paths (simplified: word chars, slashes, dots, hyphens)
  const filePathRegex = /`([a-zA-Z0-9_./-]+\.[a-zA-Z0-9]+)`/g;
  // Match commit hashes (7-40 hex chars)
  const commitHashRegex = /\b([0-9a-f]{7,40})\b/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Combine all matches and sort by position
  const matches: Array<{
    start: number;
    end: number;
    type: "file" | "commit";
    text: string;
    full: string;
  }> = [];

  let match;
  while ((match = filePathRegex.exec(line)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      type: "file",
      text: match[1],
      full: match[0],
    });
  }
  while ((match = commitHashRegex.exec(line)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      type: "commit",
      text: match[1],
      full: match[0],
    });
  }

  matches.sort((a, b) => a.start - b.start);

  // Build parts, skipping overlapping matches
  for (const m of matches) {
    if (m.start < lastIndex) continue;

    if (m.start > lastIndex) {
      parts.push(line.slice(lastIndex, m.start));
    }

    if (m.type === "file") {
      parts.push(
        <span
          key={`${index}-${m.start}`}
          className="cursor-pointer underline"
          style={{ color: "var(--color-accent)" }}
          title={`Open ${m.text}`}
        >
          {m.full}
        </span>
      );
    } else {
      parts.push(
        <span
          key={`${index}-${m.start}`}
          className="cursor-pointer font-mono"
          style={{
            color: "var(--color-accent)",
            fontSize: "0.85em",
          }}
          title={`View commit ${m.text}`}
        >
          {m.text.slice(0, 7)}
        </span>
      );
    }

    lastIndex = m.end;
  }

  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }

  return (
    <div key={index} className="leading-relaxed">
      {parts.length > 0 ? parts : line || "\u00A0"}
    </div>
  );
}

/**
 * DailyLogView -- Center area display for session/daily log content.
 *
 * Features:
 * - Plain text rendering of markdown content
 * - File path links (clickable, highlighted)
 * - Commit hash links (clickable, monospace)
 * - Read-only view
 */
export function DailyLogView() {
  const { activeLogContent, activeLogId, isLoading, error } = useLogStore();

  if (!activeLogId) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ color: "var(--color-text-muted)" }}
      >
        <div className="text-center">
          <div className="text-sm mb-1">No log selected</div>
          <div className="text-xs">
            Select a session or daily log from the sidebar to view its content
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ color: "var(--color-text-muted)" }}
      >
        <div className="text-sm">Loading log content...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ color: "var(--color-text-muted)" }}
      >
        <div className="text-center">
          <div className="text-sm mb-1">Could not load log</div>
          <div className="text-xs" style={{ color: "#ef4444" }}>
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!activeLogContent) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ color: "var(--color-text-muted)" }}
      >
        <div className="text-sm">Log file is empty</div>
      </div>
    );
  }

  const lines = activeLogContent.split("\n");

  return (
    <div
      className="h-full overflow-y-auto p-4"
      style={{
        backgroundColor: "var(--color-bg)",
        color: "var(--color-text)",
        fontFamily: "var(--font-mono, monospace)",
        fontSize: 13,
      }}
    >
      {lines.map((line, index) => renderContentLine(line, index))}
    </div>
  );
}
