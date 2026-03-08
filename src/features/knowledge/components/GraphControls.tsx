import { useCallback, useState } from "react";
import type { GraphFilter } from "@/types/search";

/**
 * GraphControls — Filter and zoom controls for the Graph View.
 *
 * Provides:
 *   - Tag filter input
 *   - Folder filter input
 *   - Depth control for local graph mode
 *   - Zoom in/out/reset buttons
 *   - Toggle between global and local graph
 */

interface GraphControlsProps {
  filter: GraphFilter;
  onFilterChange: (filter: GraphFilter) => void;
  depth: number;
  onDepthChange: (depth: number) => void;
  isLocalMode: boolean;
  onToggleMode: () => void;
  onRefresh: () => void;
}

export function GraphControls({
  filter,
  onFilterChange,
  depth,
  onDepthChange,
  isLocalMode,
  onToggleMode,
  onRefresh,
}: GraphControlsProps) {
  const [tagInput, setTagInput] = useState("");
  const [folderInput, setFolderInput] = useState("");

  const handleAddTagFilter = useCallback(() => {
    if (!tagInput.trim()) return;
    const currentTags = filter.tags ?? [];
    if (!currentTags.includes(tagInput.trim())) {
      onFilterChange({
        ...filter,
        tags: [...currentTags, tagInput.trim()],
      });
    }
    setTagInput("");
  }, [tagInput, filter, onFilterChange]);

  const handleRemoveTagFilter = useCallback(
    (tag: string) => {
      onFilterChange({
        ...filter,
        tags: (filter.tags ?? []).filter((t) => t !== tag),
      });
    },
    [filter, onFilterChange]
  );

  const handleAddFolderFilter = useCallback(() => {
    if (!folderInput.trim()) return;
    const currentFolders = filter.folders ?? [];
    if (!currentFolders.includes(folderInput.trim())) {
      onFilterChange({
        ...filter,
        folders: [...currentFolders, folderInput.trim()],
      });
    }
    setFolderInput("");
  }, [folderInput, filter, onFilterChange]);

  const handleRemoveFolderFilter = useCallback(
    (folder: string) => {
      onFilterChange({
        ...filter,
        folders: (filter.folders ?? []).filter((f) => f !== folder),
      });
    },
    [filter, onFilterChange]
  );

  const handleClearFilters = useCallback(() => {
    onFilterChange({});
  }, [onFilterChange]);

  return (
    <div className="flex flex-col gap-3 border-b border-border bg-background p-3">
      {/* Mode toggle and refresh */}
      <div className="flex items-center gap-2">
        <button
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            !isLocalMode
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
          onClick={isLocalMode ? onToggleMode : undefined}
        >
          Global
        </button>
        <button
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            isLocalMode
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
          onClick={!isLocalMode ? onToggleMode : undefined}
        >
          Local
        </button>

        <div className="flex-1" />

        <button
          className="rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/80"
          onClick={onRefresh}
        >
          Refresh
        </button>
      </div>

      {/* Depth control (local mode only) */}
      {isLocalMode && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Depth:</label>
          <input
            type="range"
            min={1}
            max={5}
            value={depth}
            onChange={(e) => onDepthChange(Number(e.target.value))}
            className="h-1 flex-1"
          />
          <span className="text-xs font-medium text-foreground">{depth}</span>
        </div>
      )}

      {/* Tag filter */}
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          Filter by tag
        </label>
        <div className="flex gap-1">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTagFilter()}
            placeholder="Tag name..."
            className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground hover:bg-muted/80"
            onClick={handleAddTagFilter}
          >
            +
          </button>
        </div>
        {(filter.tags ?? []).length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {(filter.tags ?? []).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-700 dark:text-purple-300"
              >
                #{tag}
                <button
                  className="ml-0.5 text-purple-500 hover:text-purple-700"
                  onClick={() => handleRemoveTagFilter(tag)}
                >
                  x
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Folder filter */}
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          Filter by folder
        </label>
        <div className="flex gap-1">
          <input
            type="text"
            value={folderInput}
            onChange={(e) => setFolderInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddFolderFilter()}
            placeholder="Folder path..."
            className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground hover:bg-muted/80"
            onClick={handleAddFolderFilter}
          >
            +
          </button>
        </div>
        {(filter.folders ?? []).length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {(filter.folders ?? []).map((folder) => (
              <span
                key={folder}
                className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-700 dark:text-blue-300"
              >
                {folder}
                <button
                  className="ml-0.5 text-blue-500 hover:text-blue-700"
                  onClick={() => handleRemoveFolderFilter(folder)}
                >
                  x
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Clear all filters */}
      {((filter.tags ?? []).length > 0 ||
        (filter.folders ?? []).length > 0) && (
        <button
          className="self-start rounded-md text-xs text-muted-foreground underline hover:text-foreground"
          onClick={handleClearFilters}
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

export default GraphControls;
