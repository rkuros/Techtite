import { useCallback } from "react";
import { useGitStore } from "@/stores/git-store";
import type { CommitInfo } from "@/types/git";

/**
 * Commit history list.
 *
 * Displays commit hash, message, author, and relative timestamp.
 * Auto-commits (from sync) are visually distinguished with an [auto] label.
 * Clicking a commit loads its diff into DiffView.
 */
export function CommitHistory() {
  const commitHistory = useGitStore((s) => s.commitHistory);
  const fetchCommitDiff = useGitStore((s) => s.fetchCommitDiff);

  const handleCommitClick = useCallback(
    (hash: string) => {
      fetchCommitDiff(hash);
    },
    [fetchCommitDiff]
  );

  if (commitHistory.length === 0) {
    return (
      <div>
        <span
          className="text-xs uppercase tracking-wider font-semibold"
          style={{ color: "var(--color-text-muted)" }}
        >
          History
        </span>
        <div
          className="text-xs py-2"
          style={{ color: "var(--color-text-muted)", opacity: 0.5 }}
        >
          No commits yet
        </div>
      </div>
    );
  }

  return (
    <div>
      <span
        className="text-xs uppercase tracking-wider font-semibold"
        style={{ color: "var(--color-text-muted)" }}
      >
        History
      </span>
      <div className="mt-1 flex flex-col gap-0.5">
        {commitHistory.map((commit) => (
          <CommitEntry
            key={commit.hash}
            commit={commit}
            onClick={handleCommitClick}
          />
        ))}
      </div>
    </div>
  );
}

function CommitEntry({
  commit,
  onClick,
}: {
  commit: CommitInfo;
  onClick: (hash: string) => void;
}) {
  return (
    <div
      className="px-1 py-1 rounded cursor-pointer hover:opacity-80"
      style={{
        backgroundColor: "transparent",
      }}
      onClick={() => onClick(commit.hash)}
      title={`${commit.hash}\n${commit.author}\n${commit.timestamp}`}
    >
      {/* First row: hash + relative time */}
      <div className="flex items-center justify-between">
        <span
          className="font-mono text-xs"
          style={{ color: "var(--color-accent, #6495ed)" }}
        >
          {commit.hash.substring(0, 7)}
        </span>
        <span
          className="text-xs"
          style={{ color: "var(--color-text-muted)", fontSize: 10 }}
        >
          {formatRelativeTime(commit.timestamp)}
        </span>
      </div>

      {/* Second row: commit message */}
      <div className="flex items-center gap-1 mt-0.5">
        {commit.isAutoCommit && (
          <span
            className="text-xs px-1 rounded flex-shrink-0"
            style={{
              backgroundColor: "rgba(var(--color-accent-rgb, 100, 149, 237), 0.15)",
              color: "var(--color-accent, #6495ed)",
              fontSize: 9,
            }}
          >
            auto
          </span>
        )}
        <span
          className="text-xs truncate"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {commit.message}
        </span>
      </div>
    </div>
  );
}

/**
 * Format a timestamp into a human-readable relative time string.
 */
function formatRelativeTime(isoTimestamp: string): string {
  try {
    const date = new Date(isoTimestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
    return date.toLocaleDateString();
  } catch {
    return isoTimestamp;
  }
}
