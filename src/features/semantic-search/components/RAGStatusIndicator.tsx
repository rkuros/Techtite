import { useEffect } from "react";
import { useSemanticStore } from "@/stores/semantic-store";

/**
 * RAGStatusIndicator -- StatusBar component showing semantic index status.
 *
 * Displays one of three states:
 * - "RAG Off" -- Index has not been built or no files indexed
 * - "RAG On" -- Index is built and up to date
 * - "Building X%" -- Index build is in progress
 *
 * Subscribes to `indexStatus` from the semantic store and fetches
 * the current status on mount.
 */
export function RAGStatusIndicator() {
  const indexStatus = useSemanticStore((s) => s.indexStatus);
  const fetchIndexStatus = useSemanticStore((s) => s.fetchIndexStatus);

  // Fetch status on mount
  useEffect(() => {
    fetchIndexStatus();
  }, [fetchIndexStatus]);

  // Determine display state
  let label: string;
  let colorClass: string;

  if (!indexStatus) {
    label = "RAG Off";
    colorClass = "text-muted-foreground";
  } else if (indexStatus.isBuilding) {
    const percent =
      indexStatus.totalFiles > 0
        ? Math.round(
            (indexStatus.indexedFiles / indexStatus.totalFiles) * 100
          )
        : 0;
    label = `Building ${percent}%`;
    colorClass = "text-yellow-500";
  } else if (indexStatus.indexedFiles > 0) {
    label = "RAG On";
    colorClass = "text-green-500";
  } else {
    label = "RAG Off";
    colorClass = "text-muted-foreground";
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5" title={getTooltip(indexStatus)}>
      {/* Status dot */}
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          indexStatus?.isBuilding
            ? "animate-pulse bg-yellow-500"
            : indexStatus && indexStatus.indexedFiles > 0
              ? "bg-green-500"
              : "bg-muted-foreground"
        }`}
      />
      {/* Label */}
      <span className={`text-[11px] ${colorClass}`}>{label}</span>
    </div>
  );
}

function getTooltip(
  status: { totalFiles: number; indexedFiles: number; isBuilding: boolean; lastUpdatedAt: string | null } | null
): string {
  if (!status) {
    return "Semantic search index not available";
  }

  const parts: string[] = [];
  parts.push(`Indexed: ${status.indexedFiles}/${status.totalFiles} files`);

  if (status.isBuilding) {
    parts.push("Index build in progress");
  }

  if (status.lastUpdatedAt) {
    parts.push(`Last updated: ${new Date(status.lastUpdatedAt).toLocaleString()}`);
  }

  return parts.join("\n");
}

export default RAGStatusIndicator;
