import { useState, useCallback, type KeyboardEvent } from "react";
import { useGitStore } from "@/stores/git-store";

interface CommitFormProps {
  /** Disable the commit button (e.g., when no staged changes). */
  disabled?: boolean;
}

/**
 * Commit message input form with a Commit button.
 *
 * When auto-sync AI message generation is available, the placeholder
 * will show a suggested commit message. For now, it shows a static
 * placeholder.
 *
 * TODO (Unit 7): When Claude Code SDK is available, fetch an AI-generated
 * commit message suggestion and display it as placeholder text.
 */
export function CommitForm({ disabled }: CommitFormProps) {
  const [message, setMessage] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const commitFn = useGitStore((s) => s.commit);

  const handleCommit = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;

    setIsCommitting(true);
    try {
      await commitFn(trimmed);
      setMessage("");
    } catch {
      // Error is set in the store
    } finally {
      setIsCommitting(false);
    }
  }, [message, disabled, commitFn]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl/Cmd + Enter to commit
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleCommit();
      }
    },
    [handleCommit]
  );

  return (
    <div className="flex flex-col gap-1">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Commit message..."
        rows={3}
        className="w-full px-2 py-1 rounded text-xs resize-none outline-none"
        style={{
          backgroundColor: "var(--color-bg-surface)",
          color: "var(--color-text-primary)",
          border: "1px solid var(--color-border-subtle)",
          fontFamily: "inherit",
        }}
        disabled={isCommitting}
      />
      <button
        onClick={handleCommit}
        disabled={disabled || !message.trim() || isCommitting}
        className="w-full py-1 rounded text-xs font-medium transition-opacity"
        style={{
          backgroundColor:
            disabled || !message.trim()
              ? "var(--color-bg-surface)"
              : "var(--color-accent, #6495ed)",
          color:
            disabled || !message.trim()
              ? "var(--color-text-muted)"
              : "#ffffff",
          cursor:
            disabled || !message.trim() || isCommitting
              ? "not-allowed"
              : "pointer",
          opacity: disabled || !message.trim() ? 0.5 : 1,
        }}
      >
        {isCommitting ? "Committing..." : "Commit"}
      </button>
      <div
        className="text-xs"
        style={{
          color: "var(--color-text-muted)",
          fontSize: 10,
          opacity: 0.6,
        }}
      >
        Ctrl+Enter to commit
      </div>
    </div>
  );
}
