import { useState, useCallback } from "react";
import { useGitStore } from "@/stores/git-store";
import type { ConflictInfo } from "@/types/git";

/**
 * Conflict resolution modal.
 *
 * Shown when merge conflicts are detected during sync.
 * Displays conflicting files and offers resolution options:
 * - "Keep Local" — use the local version
 * - "Keep Remote" — use the remote version
 * - "Ask AI" — attempt AI-assisted resolution (Unit 7 dependency)
 *
 * For binary file conflicts, only local/remote selection is available.
 */
export function ConflictModal() {
  const conflicts = useGitStore((s) => s.conflicts);
  const isOpen = useGitStore((s) => s.isConflictModalOpen);
  const setOpen = useGitStore((s) => s.setConflictModalOpen);
  const resolveConflict = useGitStore((s) => s.resolveConflict);

  if (!isOpen || conflicts.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.5)",
      }}
    >
      <div
        className="rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
        style={{
          backgroundColor: "var(--color-bg-primary)",
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            borderBottom: "1px solid var(--color-border-subtle)",
          }}
        >
          <div>
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Merge Conflicts Detected
            </h2>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--color-text-muted)" }}
            >
              {conflicts.length} file{conflicts.length !== 1 ? "s" : ""} have
              conflicts that need to be resolved.
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-sm px-2 py-1 rounded hover:opacity-80"
            style={{ color: "var(--color-text-muted)" }}
            title="Close"
          >
            x
          </button>
        </div>

        {/* Conflict list */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          <div className="flex flex-col gap-2">
            {conflicts.map((conflict) => (
              <ConflictEntry
                key={conflict.filePath}
                conflict={conflict}
                onResolve={resolveConflict}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2 flex justify-end"
          style={{
            borderTop: "1px solid var(--color-border-subtle)",
          }}
        >
          <button
            onClick={() => setOpen(false)}
            className="text-xs px-3 py-1 rounded"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              color: "var(--color-text-secondary)",
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

function ConflictEntry({
  conflict,
  onResolve,
}: {
  conflict: ConflictInfo;
  onResolve: (
    path: string,
    resolution: string,
    mergedContent?: string
  ) => Promise<void>;
}) {
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedWith, setResolvedWith] = useState<string | null>(null);

  const handleResolve = useCallback(
    async (resolution: string) => {
      setIsResolving(true);
      try {
        await onResolve(conflict.filePath, resolution);
        setResolvedWith(resolution);
      } catch {
        // Error handled in store
      } finally {
        setIsResolving(false);
      }
    },
    [conflict.filePath, onResolve]
  );

  if (resolvedWith) {
    return (
      <div
        className="p-2 rounded text-xs"
        style={{
          backgroundColor: "rgba(115, 201, 145, 0.08)",
          color: "var(--color-success, #73c991)",
        }}
      >
        {conflict.filePath} -- Resolved ({resolvedWith})
      </div>
    );
  }

  return (
    <div
      className="p-2 rounded"
      style={{
        backgroundColor: "var(--color-bg-surface)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      {/* File path and conflict type */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs font-medium truncate"
          style={{ color: "var(--color-text-primary)" }}
        >
          {conflict.filePath}
        </span>
        <span
          className="text-xs flex-shrink-0 ml-2 px-1 rounded"
          style={{
            backgroundColor: "rgba(241, 76, 76, 0.1)",
            color: "var(--color-danger, #f14c4c)",
            fontSize: 10,
          }}
        >
          {formatConflictType(conflict.conflictType)}
        </span>
      </div>

      {/* Resolution buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleResolve("local")}
          disabled={isResolving}
          className="text-xs px-2 py-1 rounded font-medium hover:opacity-80"
          style={{
            backgroundColor: "var(--color-accent, #6495ed)",
            color: "#ffffff",
            opacity: isResolving ? 0.5 : 1,
          }}
        >
          Keep Local
        </button>
        <button
          onClick={() => handleResolve("remote")}
          disabled={isResolving}
          className="text-xs px-2 py-1 rounded font-medium hover:opacity-80"
          style={{
            backgroundColor: "var(--color-bg-surface)",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border-subtle)",
            opacity: isResolving ? 0.5 : 1,
          }}
        >
          Keep Remote
        </button>
        {/* TODO (Unit 7): Enable "Ask AI" when Claude Code SDK is available */}
        <button
          onClick={() => handleResolve("ai")}
          disabled={isResolving}
          className="text-xs px-2 py-1 rounded font-medium hover:opacity-80"
          style={{
            backgroundColor: "transparent",
            color: "var(--color-accent, #6495ed)",
            border: "1px solid var(--color-accent, #6495ed)",
            opacity: isResolving ? 0.5 : 1,
          }}
          title="Ask AI to resolve this conflict (requires Claude Code SDK)"
        >
          Ask AI
        </button>
        {isResolving && (
          <span
            className="text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            Resolving...
          </span>
        )}
      </div>
    </div>
  );
}

function formatConflictType(type: string): string {
  const map: Record<string, string> = {
    content: "Content",
    both_modified: "Both Modified",
    deleted_by_us: "Deleted Locally",
    deleted_by_them: "Deleted Remotely",
    both_added: "Both Added",
  };
  return map[type] ?? type;
}
