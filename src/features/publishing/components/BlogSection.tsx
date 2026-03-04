import { useState } from "react";
import { usePublishStore } from "@/stores/publish-store";
import { useEditorStore } from "@/stores/editor-store";
import type { BlogDraft, PublishStatus } from "@/types/publish";

/**
 * Format a publish status for display.
 */
function getStatusLabel(status: PublishStatus): {
  text: string;
  color: string;
  bgColor: string;
} {
  switch (status) {
    case "draft":
      return {
        text: "Draft",
        color: "var(--color-text-muted)",
        bgColor: "var(--color-bg-hover)",
      };
    case "readyForReview":
      return {
        text: "Ready",
        color: "#f59e0b",
        bgColor: "rgba(245, 158, 11, 0.15)",
      };
    case "reviewed":
      return {
        text: "Reviewed",
        color: "#3b82f6",
        bgColor: "rgba(59, 130, 246, 0.15)",
      };
    case "published":
      return {
        text: "Published",
        color: "#22c55e",
        bgColor: "rgba(34, 197, 94, 0.15)",
      };
    case "failed":
      return {
        text: "Failed",
        color: "#ef4444",
        bgColor: "rgba(239, 68, 68, 0.15)",
      };
    default:
      return {
        text: String(status),
        color: "var(--color-text-muted)",
        bgColor: "var(--color-bg-hover)",
      };
  }
}

/**
 * BlogSection -- Blog draft generation and management section.
 *
 * Features:
 * - "Draft Blog from Logs" button with log path input
 * - Draft cards with title, status badge, and creation date
 * - Click a draft to open in the editor
 */
export function BlogSection() {
  const blogDrafts = usePublishStore((s) => s.blogDrafts);
  const isGenerating = usePublishStore((s) => s.isGenerating);
  const generateBlogDraft = usePublishStore((s) => s.generateBlogDraft);
  const openModal = usePublishStore((s) => s.openModal);
  const openTab = useEditorStore((s) => s.openTab);

  const [showInput, setShowInput] = useState(false);
  const [logPathsInput, setLogPathsInput] = useState("");

  const handleGenerate = async () => {
    const paths = logPathsInput
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (paths.length === 0) return;

    await generateBlogDraft(paths);
    setLogPathsInput("");
    setShowInput(false);
  };

  const handleDraftClick = (draft: BlogDraft) => {
    // Open draft content in editor via a virtual path
    const virtualPath = `.techtite/publish/drafts/${draft.title.replace(/\s+/g, "_").toLowerCase()}.md`;
    openTab(virtualPath);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          Blog
        </span>
        <button
          onClick={() => setShowInput(!showInput)}
          disabled={isGenerating}
          className="px-2 py-0.5 rounded text-xs transition-colors"
          style={{
            backgroundColor: "var(--color-accent, #3b82f6)",
            color: "#fff",
            border: "none",
            cursor: isGenerating ? "not-allowed" : "pointer",
            opacity: isGenerating ? 0.6 : 1,
          }}
        >
          {isGenerating ? "Generating..." : "Draft from Logs"}
        </button>
      </div>

      {/* Log path input */}
      {showInput && (
        <div
          className="flex flex-col gap-1.5 p-2 rounded"
          style={{
            backgroundColor: "var(--color-bg-surface)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <textarea
            placeholder="Enter session log paths (one per line)..."
            value={logPathsInput}
            onChange={(e) => setLogPathsInput(e.target.value)}
            rows={3}
            className="w-full px-2 py-1 rounded text-xs resize-none"
            style={{
              backgroundColor: "var(--color-bg-input, var(--color-bg))",
              color: "var(--color-text)",
              border: "1px solid var(--color-border-subtle)",
              outline: "none",
              fontFamily: "monospace",
            }}
          />
          <div className="flex gap-1 justify-end">
            <button
              onClick={() => setShowInput(false)}
              className="px-2 py-0.5 rounded text-xs transition-colors"
              style={{
                backgroundColor: "var(--color-bg-hover)",
                color: "var(--color-text-secondary)",
                border: "none",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={!logPathsInput.trim()}
              className="px-2 py-0.5 rounded text-xs transition-colors"
              style={{
                backgroundColor: logPathsInput.trim()
                  ? "var(--color-accent, #3b82f6)"
                  : "var(--color-bg-hover)",
                color: logPathsInput.trim()
                  ? "#fff"
                  : "var(--color-text-muted)",
                border: "none",
                cursor: logPathsInput.trim() ? "pointer" : "not-allowed",
              }}
            >
              Generate
            </button>
          </div>
        </div>
      )}

      {/* Draft cards */}
      {blogDrafts.length === 0 ? (
        <div
          className="text-xs py-2"
          style={{ color: "var(--color-text-muted)" }}
        >
          No blog drafts yet
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {blogDrafts.map((draft, idx) => {
            const statusInfo = getStatusLabel(draft.status);
            return (
              <button
                key={idx}
                onClick={() => handleDraftClick(draft)}
                className="flex flex-col gap-0.5 p-2 rounded text-left transition-colors w-full"
                style={{
                  backgroundColor: "var(--color-bg-surface)",
                  border: "1px solid var(--color-border-subtle)",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--color-bg-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--color-bg-surface)";
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-medium truncate">
                    {draft.title}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded shrink-0"
                    style={{
                      color: statusInfo.color,
                      backgroundColor: statusInfo.bgColor,
                    }}
                  >
                    {statusInfo.text}
                  </span>
                </div>
                <span
                  className="text-xs"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {draft.sourceLogPaths.length} source(s)
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Quick publish buttons for latest draft */}
      {blogDrafts.length > 0 && blogDrafts[blogDrafts.length - 1].status === "draft" && (
        <div className="flex gap-1">
          <button
            onClick={() => openModal("zenn")}
            className="flex-1 px-2 py-1 rounded text-xs transition-colors"
            style={{
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              color: "#3b82f6",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              cursor: "pointer",
            }}
          >
            Publish Zenn
          </button>
          <button
            onClick={() => openModal("note")}
            className="flex-1 px-2 py-1 rounded text-xs transition-colors"
            style={{
              backgroundColor: "rgba(34, 197, 94, 0.1)",
              color: "#22c55e",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              cursor: "pointer",
            }}
          >
            Publish Note
          </button>
        </div>
      )}
    </div>
  );
}
