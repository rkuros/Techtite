import { useCallback, useEffect, useState } from "react";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { useEditorStore } from "@/stores/editor-store";

/**
 * TagsPage — Center area page showing all tags in the vault.
 *
 * Displays a grid of tag chips with file counts. Clicking a tag
 * shows the list of files that contain that tag. Clicking a file
 * in the list opens it in the editor.
 *
 * Supports nested tags (e.g., #parent/child) displayed hierarchically.
 */
export function TagsPage() {
  const { allTags, isLoadingTags, fetchAllTags, fetchFilesByTag } =
    useKnowledgeStore();
  const openTab = useEditorStore((s) => s.openTab);

  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tagFiles, setTagFiles] = useState<string[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  // Fetch all tags on mount
  useEffect(() => {
    fetchAllTags();
  }, [fetchAllTags]);

  // Fetch files when a tag is selected
  const handleTagClick = useCallback(
    async (tagName: string) => {
      if (selectedTag === tagName) {
        // Deselect
        setSelectedTag(null);
        setTagFiles([]);
        return;
      }

      setSelectedTag(tagName);
      setIsLoadingFiles(true);

      const files = await fetchFilesByTag(tagName);
      setTagFiles(files);
      setIsLoadingFiles(false);
    },
    [selectedTag, fetchFilesByTag]
  );

  const handleFileClick = useCallback(
    (filePath: string) => {
      openTab(filePath);
    },
    [openTab]
  );

  // Filter tags by search input
  const filteredTags = searchFilter
    ? allTags.filter((t) =>
        t.name.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : allTags;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-3">
        <h2 className="text-sm font-semibold">Tags</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {allTags.length} tag{allTags.length !== 1 ? "s" : ""} in vault
        </p>
      </div>

      {/* Search filter */}
      <div className="border-b border-border px-4 py-2">
        <input
          type="text"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Filter tags..."
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Tags grid */}
        <div
          className={`overflow-y-auto p-4 ${selectedTag ? "w-1/2 border-r border-border" : "w-full"}`}
        >
          {isLoadingTags ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-xs text-muted-foreground">
                Loading tags...
              </span>
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-xs text-muted-foreground">
                {searchFilter ? "No matching tags" : "No tags found"}
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filteredTags.map((tag) => (
                <button
                  key={tag.name}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedTag === tag.name
                      ? "bg-primary text-primary-foreground"
                      : "bg-purple-500/10 text-purple-700 hover:bg-purple-500/20 dark:text-purple-300"
                  }`}
                  onClick={() => handleTagClick(tag.name)}
                >
                  <span>#</span>
                  <span>{tag.name}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      selectedTag === tag.name
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                    }`}
                  >
                    {tag.fileCount}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* File list for selected tag */}
        {selectedTag && (
          <div className="w-1/2 overflow-y-auto">
            <div className="sticky top-0 border-b border-border bg-background px-4 py-2">
              <h3 className="text-xs font-semibold">
                <span className="text-purple-600 dark:text-purple-400">
                  #{selectedTag}
                </span>
                <span className="ml-2 text-muted-foreground">
                  ({tagFiles.length} file{tagFiles.length !== 1 ? "s" : ""})
                </span>
              </h3>
            </div>

            {isLoadingFiles ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-xs text-muted-foreground">
                  Loading...
                </span>
              </div>
            ) : (
              <div>
                {tagFiles.map((filePath) => (
                  <button
                    key={filePath}
                    className="w-full border-b border-border/50 px-4 py-2 text-left transition-colors hover:bg-accent"
                    onClick={() => handleFileClick(filePath)}
                  >
                    <span className="text-xs text-foreground">{filePath}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TagsPage;
