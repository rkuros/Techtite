import { usePublishStore } from "@/stores/publish-store";
import type { PublishStatus, SNSPost } from "@/types/publish";

/**
 * Get a display label and colors for a publish status.
 */
function getStatusBadge(status: PublishStatus): {
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
    case "published":
      return {
        text: "Posted",
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
 * Get platform display info (label and accent color).
 */
function getPlatformInfo(platform: string): {
  label: string;
  color: string;
  bgColor: string;
} {
  switch (platform) {
    case "x":
      return {
        label: "X",
        color: "#1d9bf0",
        bgColor: "rgba(29, 155, 240, 0.15)",
      };
    case "threads":
      return {
        label: "Threads",
        color: "var(--color-text-secondary)",
        bgColor: "var(--color-bg-hover)",
      };
    default:
      return {
        label: platform,
        color: "var(--color-text-muted)",
        bgColor: "var(--color-bg-hover)",
      };
  }
}

/**
 * Format an ISO timestamp as a relative time string.
 */
function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  } catch {
    return isoString;
  }
}

/**
 * SNSSection -- SNS post generation and history section.
 *
 * Features:
 * - Platform buttons (X blue, Threads neutral)
 * - Post history with platform icons, timestamps, success/failure badges
 * - Character count display for recent posts
 */
export function SNSSection() {
  const snsPosts = usePublishStore((s) => s.snsPosts);
  const isGenerating = usePublishStore((s) => s.isGenerating);
  const generateSNSPost = usePublishStore((s) => s.generateSNSPost);
  const openModal = usePublishStore((s) => s.openModal);

  const handleGenerateX = async () => {
    // TODO: Allow user to select source files. For now, use a placeholder.
    await generateSNSPost(["session_log.md"], "x");
    openModal("x");
  };

  const handleGenerateThreads = async () => {
    // TODO: Allow user to select source files. For now, use a placeholder.
    await generateSNSPost(["session_log.md"], "threads");
    openModal("threads");
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Section header */}
      <span
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--color-text-muted)" }}
      >
        SNS
      </span>

      {/* Platform buttons */}
      <div className="flex gap-1">
        <button
          onClick={handleGenerateX}
          disabled={isGenerating}
          className="flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors"
          style={{
            backgroundColor: "rgba(29, 155, 240, 0.1)",
            color: "#1d9bf0",
            border: "1px solid rgba(29, 155, 240, 0.3)",
            cursor: isGenerating ? "not-allowed" : "pointer",
            opacity: isGenerating ? 0.6 : 1,
          }}
        >
          Draft X Post
        </button>
        <button
          onClick={handleGenerateThreads}
          disabled={isGenerating}
          className="flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors"
          style={{
            backgroundColor: "var(--color-bg-hover)",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border-subtle)",
            cursor: isGenerating ? "not-allowed" : "pointer",
            opacity: isGenerating ? 0.6 : 1,
          }}
        >
          Draft Threads Post
        </button>
      </div>

      {/* Post history */}
      {snsPosts.length === 0 ? (
        <div
          className="text-xs py-2"
          style={{ color: "var(--color-text-muted)" }}
        >
          No posts yet
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {[...snsPosts].reverse().map((post: SNSPost, idx: number) => {
            const platformInfo = getPlatformInfo(post.platform);
            const statusBadge = getStatusBadge(post.status);

            return (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 rounded"
                style={{
                  backgroundColor: "var(--color-bg-surface)",
                  border: "1px solid var(--color-border-subtle)",
                }}
              >
                {/* Platform badge */}
                <span
                  className="text-xs px-1.5 py-0.5 rounded shrink-0 font-medium"
                  style={{
                    color: platformInfo.color,
                    backgroundColor: platformInfo.bgColor,
                  }}
                >
                  {platformInfo.label}
                </span>

                {/* Post content preview */}
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span
                    className="text-xs truncate"
                    style={{ color: "var(--color-text)" }}
                  >
                    {post.content.slice(0, 80)}
                    {post.content.length > 80 ? "..." : ""}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {post.charCount} chars
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {formatRelativeTime(post.createdAt ?? "")}
                    </span>
                  </div>
                </div>

                {/* Status badge */}
                <span
                  className="text-xs px-1.5 py-0.5 rounded shrink-0"
                  style={{
                    color: statusBadge.color,
                    backgroundColor: statusBadge.bgColor,
                  }}
                >
                  {statusBadge.text}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
