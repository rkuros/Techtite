import { useEffect, useCallback } from "react";
import { useGitStore } from "@/stores/git-store";
import { CommitForm } from "./CommitForm";
import { CommitHistory } from "./CommitHistory";
import type { FileChange } from "@/types/git";

/**
 * Git sidebar panel.
 *
 * Displays the CHANGES section (staged / unstaged / untracked files),
 * a commit form, and a commit history list. Mounted in the left sidebar
 * when the "git" panel is active in the Ribbon.
 */
export function GitPanel() {
  const gitStatus = useGitStore((s) => s.gitStatus);
  const isLoading = useGitStore((s) => s.isLoading);
  const error = useGitStore((s) => s.error);
  const fetchStatus = useGitStore((s) => s.fetchStatus);
  const fetchLog = useGitStore((s) => s.fetchLog);
  const stageFiles = useGitStore((s) => s.stageFiles);
  const unstageFiles = useGitStore((s) => s.unstageFiles);
  const fetchDiff = useGitStore((s) => s.fetchDiff);

  useEffect(() => {
    fetchStatus();
    fetchLog();
  }, [fetchStatus, fetchLog]);

  const handleStageAll = useCallback(() => {
    if (!gitStatus) return;
    const paths = [
      ...gitStatus.unstaged.map((f) => f.path),
      ...gitStatus.untracked,
    ];
    if (paths.length > 0) {
      stageFiles(paths);
    }
  }, [gitStatus, stageFiles]);

  const handleUnstageAll = useCallback(() => {
    if (!gitStatus) return;
    const paths = gitStatus.staged.map((f) => f.path);
    if (paths.length > 0) {
      unstageFiles(paths);
    }
  }, [gitStatus, unstageFiles]);

  const handleFileClick = useCallback(
    (path: string, staged: boolean) => {
      fetchDiff(path, staged);
    },
    [fetchDiff]
  );

  if (error) {
    return (
      <div className="p-2">
        <div
          className="text-xs p-2 rounded"
          style={{ backgroundColor: "var(--color-bg-surface)", color: "var(--color-danger)" }}
        >
          {error}
        </div>
      </div>
    );
  }

  if (isLoading && !gitStatus) {
    return (
      <div
        className="p-2 text-xs"
        style={{ color: "var(--color-text-muted)" }}
      >
        Loading git status...
      </div>
    );
  }

  if (!gitStatus) {
    return (
      <div
        className="p-2 text-xs"
        style={{ color: "var(--color-text-muted)" }}
      >
        Not a git repository
      </div>
    );
  }

  const hasStagedChanges = gitStatus.staged.length > 0;
  const hasUnstagedChanges =
    gitStatus.unstaged.length > 0 || gitStatus.untracked.length > 0;

  return (
    <div className="flex flex-col gap-2">
      {/* CHANGES Section */}
      <div>
        {/* Staged changes */}
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-xs uppercase tracking-wider font-semibold"
            style={{ color: "var(--color-text-muted)" }}
          >
            Staged Changes
            {hasStagedChanges && (
              <span className="ml-1 opacity-60">
                ({gitStatus.staged.length})
              </span>
            )}
          </span>
          {hasStagedChanges && (
            <button
              onClick={handleUnstageAll}
              className="text-xs px-1 rounded hover:opacity-80"
              style={{ color: "var(--color-text-muted)" }}
              title="Unstage all"
            >
              -
            </button>
          )}
        </div>
        {hasStagedChanges ? (
          <FileChangeList
            changes={gitStatus.staged}
            staged={true}
            onFileClick={handleFileClick}
            onAction={(path) => unstageFiles([path])}
            actionLabel="-"
            actionTitle="Unstage"
          />
        ) : (
          <div
            className="text-xs py-1"
            style={{ color: "var(--color-text-muted)", opacity: 0.5 }}
          >
            No staged changes
          </div>
        )}

        {/* Unstaged & untracked changes */}
        <div className="flex items-center justify-between mt-3 mb-1">
          <span
            className="text-xs uppercase tracking-wider font-semibold"
            style={{ color: "var(--color-text-muted)" }}
          >
            Changes
            {hasUnstagedChanges && (
              <span className="ml-1 opacity-60">
                ({gitStatus.unstaged.length + gitStatus.untracked.length})
              </span>
            )}
          </span>
          {hasUnstagedChanges && (
            <button
              onClick={handleStageAll}
              className="text-xs px-1 rounded hover:opacity-80"
              style={{ color: "var(--color-text-muted)" }}
              title="Stage all"
            >
              +
            </button>
          )}
        </div>
        {gitStatus.unstaged.length > 0 && (
          <FileChangeList
            changes={gitStatus.unstaged}
            staged={false}
            onFileClick={handleFileClick}
            onAction={(path) => stageFiles([path])}
            actionLabel="+"
            actionTitle="Stage"
          />
        )}
        {gitStatus.untracked.length > 0 && (
          <div className="mt-1">
            {gitStatus.untracked.map((path) => (
              <div
                key={path}
                className="flex items-center justify-between py-0.5 px-1 rounded text-xs cursor-pointer hover:opacity-80"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <span className="flex items-center gap-1 truncate flex-1">
                  <StatusBadge status="U" variant="untracked" />
                  <span className="truncate">{fileName(path)}</span>
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    stageFiles([path]);
                  }}
                  className="px-1 hover:opacity-80 flex-shrink-0"
                  title="Stage"
                >
                  +
                </button>
              </div>
            ))}
          </div>
        )}
        {!hasUnstagedChanges && (
          <div
            className="text-xs py-1"
            style={{ color: "var(--color-text-muted)", opacity: 0.5 }}
          >
            No changes
          </div>
        )}
      </div>

      {/* Commit Form */}
      <CommitForm disabled={!hasStagedChanges} />

      {/* Separator */}
      <div
        className="my-1"
        style={{
          borderTop: "1px solid var(--color-border-subtle)",
        }}
      />

      {/* History Section */}
      <CommitHistory />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface FileChangeListProps {
  changes: FileChange[];
  staged: boolean;
  onFileClick: (path: string, staged: boolean) => void;
  onAction: (path: string) => void;
  actionLabel: string;
  actionTitle: string;
}

function FileChangeList({
  changes,
  staged,
  onFileClick,
  onAction,
  actionLabel,
  actionTitle,
}: FileChangeListProps) {
  return (
    <div>
      {changes.map((change) => (
        <div
          key={change.path}
          className="flex items-center justify-between py-0.5 px-1 rounded text-xs cursor-pointer hover:opacity-80"
          style={{ color: "var(--color-text-secondary)" }}
          onClick={() => onFileClick(change.path, staged)}
        >
          <span className="flex items-center gap-1 truncate flex-1">
            <StatusBadge
              status={statusToLetter(change.status)}
              variant={change.status}
            />
            <span className="truncate">{fileName(change.path)}</span>
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction(change.path);
            }}
            className="px-1 hover:opacity-80 flex-shrink-0"
            title={actionTitle}
          >
            {actionLabel}
          </button>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({
  status,
  variant,
}: {
  status: string;
  variant: string;
}) {
  const colorMap: Record<string, string> = {
    modified: "var(--color-warning, #e2b93d)",
    added: "var(--color-success, #73c991)",
    deleted: "var(--color-danger, #f14c4c)",
    renamed: "var(--color-info, #75beff)",
    untracked: "var(--color-success, #73c991)",
    conflicted: "var(--color-danger, #f14c4c)",
  };

  return (
    <span
      className="font-mono font-bold flex-shrink-0"
      style={{
        color: colorMap[variant] ?? "var(--color-text-muted)",
        fontSize: 10,
        width: 12,
        textAlign: "center",
      }}
    >
      {status}
    </span>
  );
}

function statusToLetter(status: string): string {
  const map: Record<string, string> = {
    modified: "M",
    added: "A",
    deleted: "D",
    renamed: "R",
    untracked: "U",
    conflicted: "!",
    unmodified: " ",
  };
  return map[status] ?? "?";
}

function fileName(path: string): string {
  return path.split("/").pop() ?? path;
}
