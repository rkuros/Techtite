import { useCallback, useEffect } from "react";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { useEditorStore } from "@/stores/editor-store";

/**
 * BacklinksPage — Center area page showing backlinks and unlinked mentions.
 *
 * Displays two sections:
 *   1. Backlinks — files that link to the currently active file
 *   2. Unlinked Mentions — text matches of the file name without explicit links
 *
 * Each entry shows the source file path, line number, and surrounding context.
 * Clicking an entry opens the source file in the editor.
 */
export function BacklinksPage() {
  const {
    currentFileBacklinks,
    unlinkedMentions,
    isLoadingBacklinks,
    fetchBacklinks,
    fetchUnlinkedMentions,
  } = useKnowledgeStore();

  const openTab = useEditorStore((s) => s.openTab);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const openTabs = useEditorStore((s) => s.openTabs);

  // Get the currently active file path
  const activeFilePath =
    openTabs.find((t) => t.id === activeTabId)?.filePath ?? null;

  // Fetch backlinks when the active file changes
  useEffect(() => {
    if (activeFilePath) {
      fetchBacklinks(activeFilePath);
      fetchUnlinkedMentions(activeFilePath);
    }
  }, [activeFilePath, fetchBacklinks, fetchUnlinkedMentions]);

  const handleEntryClick = useCallback(
    (filePath: string) => {
      openTab(filePath);
    },
    [openTab]
  );

  if (!activeFilePath) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Open a file to see its backlinks
        </p>
      </div>
    );
  }

  const fileName = activeFilePath.split("/").pop() ?? activeFilePath;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-3">
        <h2 className="text-sm font-semibold">Backlinks</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{fileName}</p>
      </div>

      {isLoadingBacklinks ? (
        <div className="flex items-center justify-center py-8">
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
      ) : (
        <>
          {/* Backlinks section */}
          <section className="border-b border-border">
            <div className="px-4 py-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Linked mentions ({currentFileBacklinks.length})
              </h3>
            </div>

            {currentFileBacklinks.length === 0 ? (
              <div className="px-4 pb-3">
                <p className="text-xs text-muted-foreground">
                  No backlinks found
                </p>
              </div>
            ) : (
              <div>
                {currentFileBacklinks.map((entry, idx) => (
                  <button
                    key={`bl-${entry.sourcePath}-${entry.lineNumber}-${idx}`}
                    className="w-full border-b border-border/50 px-4 py-2 text-left transition-colors last:border-b-0 hover:bg-accent"
                    onClick={() => handleEntryClick(entry.sourcePath)}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-xs font-medium text-foreground">
                        {entry.sourcePath}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        L{entry.lineNumber}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {entry.context}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Unlinked Mentions section */}
          <section>
            <div className="px-4 py-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Unlinked mentions ({unlinkedMentions.length})
              </h3>
            </div>

            {unlinkedMentions.length === 0 ? (
              <div className="px-4 pb-3">
                <p className="text-xs text-muted-foreground">
                  No unlinked mentions found
                </p>
              </div>
            ) : (
              <div>
                {unlinkedMentions.map((entry, idx) => (
                  <button
                    key={`um-${entry.sourcePath}-${entry.lineNumber}-${idx}`}
                    className="w-full border-b border-border/50 px-4 py-2 text-left transition-colors last:border-b-0 hover:bg-accent"
                    onClick={() => handleEntryClick(entry.sourcePath)}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-xs font-medium text-foreground">
                        {entry.sourcePath}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        L{entry.lineNumber}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {entry.context}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default BacklinksPage;
