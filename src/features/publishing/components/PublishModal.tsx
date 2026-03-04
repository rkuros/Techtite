import { useState, useMemo, useCallback } from "react";
import { usePublishStore } from "@/stores/publish-store";
import type { PublishResult } from "@/types/publish";

/**
 * Count characters using the X (Twitter) weighting rules.
 * Full-width characters (CJK, etc.) count as 2, half-width as 1.
 */
function countCharsX(text: string): number {
  let count = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (isFullwidth(cp)) {
      count += 2;
    } else {
      count += 1;
    }
  }
  return count;
}

/**
 * Determine if a Unicode code point is full-width.
 */
function isFullwidth(cp: number): boolean {
  return (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0x303e) ||
    (cp >= 0x3041 && cp <= 0x33bf) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xa000 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7af) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe4f) ||
    (cp >= 0xff01 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x20000 && cp <= 0x2ffff) ||
    (cp >= 0x30000 && cp <= 0x3ffff)
  );
}

/**
 * Get the character limit for a given platform.
 */
function getCharLimit(platform: string): number | null {
  switch (platform) {
    case "x":
      return 280;
    case "threads":
      return 500;
    default:
      return null;
  }
}

/**
 * Get the character count color based on usage percentage.
 */
function getCountColor(count: number, limit: number): string {
  const ratio = count / limit;
  if (ratio >= 1) return "#ef4444"; // Red: over limit
  if (ratio >= 0.9) return "#f59e0b"; // Amber: warning
  return "var(--color-text-muted)"; // Normal
}

/**
 * PublishModal -- Platform-aware content editing and publishing modal.
 *
 * Features:
 * - Textarea for content editing
 * - Character counter (X: weighted counting, Threads: simple length)
 * - Platform-specific fields (Zenn: title, emoji, topics)
 * - Publish/Post button with loading state
 * - Success/failure feedback
 */
export function PublishModal() {
  const modalPlatform = usePublishStore((s) => s.modalPlatform);
  const isPublishing = usePublishStore((s) => s.isPublishing);
  const blogDrafts = usePublishStore((s) => s.blogDrafts);
  const snsPosts = usePublishStore((s) => s.snsPosts);
  const closeModal = usePublishStore((s) => s.closeModal);
  const publishToZenn = usePublishStore((s) => s.publishToZenn);
  const publishToNote = usePublishStore((s) => s.publishToNote);
  const postToX = usePublishStore((s) => s.postToX);
  const postToThreads = usePublishStore((s) => s.postToThreads);

  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("");
  const [topics, setTopics] = useState("");
  const [result, setResult] = useState<PublishResult | null>(null);

  // Get character count based on platform
  const charCount = useMemo(() => {
    if (modalPlatform === "x") return countCharsX(content);
    return content.length;
  }, [content, modalPlatform]);

  const charLimit = modalPlatform ? getCharLimit(modalPlatform) : null;
  const isOverLimit = charLimit !== null && charCount > charLimit;

  const handlePublish = useCallback(async () => {
    if (!modalPlatform) return;

    let publishResult: PublishResult | null = null;

    switch (modalPlatform) {
      case "zenn": {
        const latestDraft = blogDrafts[blogDrafts.length - 1];
        if (latestDraft) {
          const draftWithContent = {
            ...latestDraft,
            content: content || latestDraft.content,
            title: title || latestDraft.title,
            platformMetadata: {
              platform: "zenn" as const,
              emoji: emoji || "🔧",
              articleType: "tech",
              topics: topics
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t.length > 0),
            },
          };
          publishResult = await publishToZenn(draftWithContent);
        }
        break;
      }
      case "note": {
        const latestDraft = blogDrafts[blogDrafts.length - 1];
        if (latestDraft) {
          const draftWithContent = {
            ...latestDraft,
            content: content || latestDraft.content,
            title: title || latestDraft.title,
          };
          publishResult = await publishToNote(draftWithContent);
        }
        break;
      }
      case "x": {
        const latestPost = snsPosts.filter((p) => p.platform === "x").pop();
        if (latestPost) {
          const postWithContent = {
            ...latestPost,
            content: content || latestPost.content,
          };
          publishResult = await postToX(postWithContent);
        }
        break;
      }
      case "threads": {
        const latestPost = snsPosts
          .filter((p) => p.platform === "threads")
          .pop();
        if (latestPost) {
          const postWithContent = {
            ...latestPost,
            content: content || latestPost.content,
          };
          publishResult = await postToThreads(postWithContent);
        }
        break;
      }
    }

    if (publishResult) {
      setResult(publishResult);
    }
  }, [
    modalPlatform,
    content,
    title,
    emoji,
    topics,
    blogDrafts,
    snsPosts,
    publishToZenn,
    publishToNote,
    postToX,
    postToThreads,
  ]);

  if (!modalPlatform) return null;

  const isBlogPlatform =
    modalPlatform === "zenn" || modalPlatform === "note";
  const platformLabel = {
    zenn: "Zenn",
    note: "Note",
    x: "X",
    threads: "Threads",
  }[modalPlatform];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div
        className="flex flex-col gap-3 p-4 rounded-lg w-full max-w-lg max-h-[80vh] overflow-y-auto"
        style={{
          backgroundColor: "var(--color-bg)",
          border: "1px solid var(--color-border-subtle)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">
            {isBlogPlatform ? "Publish to" : "Post to"} {platformLabel}
          </span>
          <button
            onClick={closeModal}
            className="px-2 py-0.5 rounded text-xs transition-colors"
            style={{
              backgroundColor: "var(--color-bg-hover)",
              color: "var(--color-text-secondary)",
              border: "none",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>

        {/* Success/Failure feedback */}
        {result && (
          <div
            className="p-2 rounded text-xs"
            style={{
              backgroundColor: result.success
                ? "rgba(34, 197, 94, 0.1)"
                : "rgba(239, 68, 68, 0.1)",
              color: result.success ? "#22c55e" : "#ef4444",
              border: `1px solid ${result.success ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            }}
          >
            {result.success ? (
              <span>
                Published successfully!{" "}
                {result.url && (
                  <span className="font-mono">{result.url}</span>
                )}
              </span>
            ) : (
              <span>
                Failed: {result.errorMessage ?? "Unknown error"}
              </span>
            )}
          </div>
        )}

        {/* Platform-specific fields for Zenn */}
        {modalPlatform === "zenn" && (
          <>
            <div className="flex flex-col gap-1">
              <label
                className="text-xs font-medium"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Article title..."
                className="w-full px-2 py-1.5 rounded text-xs"
                style={{
                  backgroundColor:
                    "var(--color-bg-input, var(--color-bg-surface))",
                  color: "var(--color-text)",
                  border: "1px solid var(--color-border-subtle)",
                  outline: "none",
                }}
              />
            </div>
            <div className="flex gap-2">
              <div className="flex flex-col gap-1 flex-1">
                <label
                  className="text-xs font-medium"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Emoji
                </label>
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  placeholder="e.g. 🔧"
                  maxLength={2}
                  className="w-full px-2 py-1.5 rounded text-xs"
                  style={{
                    backgroundColor:
                      "var(--color-bg-input, var(--color-bg-surface))",
                    color: "var(--color-text)",
                    border: "1px solid var(--color-border-subtle)",
                    outline: "none",
                  }}
                />
              </div>
              <div className="flex flex-col gap-1 flex-[2]">
                <label
                  className="text-xs font-medium"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Topics (comma-separated)
                </label>
                <input
                  type="text"
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  placeholder="e.g. rust, tauri, react"
                  className="w-full px-2 py-1.5 rounded text-xs"
                  style={{
                    backgroundColor:
                      "var(--color-bg-input, var(--color-bg-surface))",
                    color: "var(--color-text)",
                    border: "1px solid var(--color-border-subtle)",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          </>
        )}

        {/* Platform-specific fields for Note */}
        {modalPlatform === "note" && (
          <div className="flex flex-col gap-1">
            <label
              className="text-xs font-medium"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title..."
              className="w-full px-2 py-1.5 rounded text-xs"
              style={{
                backgroundColor:
                  "var(--color-bg-input, var(--color-bg-surface))",
                color: "var(--color-text)",
                border: "1px solid var(--color-border-subtle)",
                outline: "none",
              }}
            />
          </div>
        )}

        {/* Content textarea */}
        <div className="flex flex-col gap-1">
          <label
            className="text-xs font-medium"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              isBlogPlatform
                ? "Edit your blog content..."
                : `Write your ${platformLabel} post...`
            }
            rows={isBlogPlatform ? 12 : 6}
            className="w-full px-2 py-1.5 rounded text-xs resize-none"
            style={{
              backgroundColor:
                "var(--color-bg-input, var(--color-bg-surface))",
              color: "var(--color-text)",
              border: `1px solid ${isOverLimit ? "#ef4444" : "var(--color-border-subtle)"}`,
              outline: "none",
              fontFamily: isBlogPlatform ? "monospace" : "inherit",
            }}
          />
        </div>

        {/* Character counter for SNS platforms */}
        {charLimit !== null && (
          <div className="flex items-center justify-end gap-1">
            <span
              className="text-xs font-mono"
              style={{ color: getCountColor(charCount, charLimit) }}
            >
              {charCount} / {charLimit}
            </span>
            {modalPlatform === "x" && (
              <span
                className="text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                (weighted)
              </span>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={closeModal}
            className="px-3 py-1.5 rounded text-xs transition-colors"
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
            onClick={handlePublish}
            disabled={isPublishing || isOverLimit || !!result?.success}
            className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
            style={{
              backgroundColor:
                isPublishing || isOverLimit || result?.success
                  ? "var(--color-bg-hover)"
                  : "var(--color-accent, #3b82f6)",
              color:
                isPublishing || isOverLimit || result?.success
                  ? "var(--color-text-muted)"
                  : "#fff",
              border: "none",
              cursor:
                isPublishing || isOverLimit || result?.success
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {isPublishing
              ? "Publishing..."
              : result?.success
                ? "Done"
                : isBlogPlatform
                  ? "Publish"
                  : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
