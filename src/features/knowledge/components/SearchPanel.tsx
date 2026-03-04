import { useCallback, useEffect, useRef, useState } from "react";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { useEditorStore } from "@/stores/editor-store";

/**
 * SearchPanel — Left sidebar search panel with Keyword tab.
 *
 * Provides a search input field, mode tabs (Keyword / Semantic),
 * and a scrollable result list. The Semantic tab is a placeholder
 * for Unit 5 to implement.
 *
 * Results display file path, line number, and context with
 * highlighted match ranges. Clicking a result opens the file
 * in the editor.
 */
export function SearchPanel() {
  const {
    searchQuery,
    searchMode,
    keywordResults,
    isSearching,
    setSearchQuery,
    setSearchMode,
    searchKeyword,
    clearSearch,
  } = useKnowledgeStore();

  const openTab = useEditorStore((s) => s.openTab);

  const inputRef = useRef<HTMLInputElement>(null);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  const handleInputChange = useCallback(
    (value: string) => {
      setSearchQuery(value);

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      if (!value.trim()) {
        clearSearch();
        return;
      }

      const timer = setTimeout(() => {
        if (searchMode === "keyword") {
          searchKeyword(value);
        }
        // Semantic search will be handled by Unit 5
      }, 300);

      setDebounceTimer(timer);
    },
    [searchMode, debounceTimer, setSearchQuery, searchKeyword, clearSearch]
  );

  // Handle result click — open file in editor
  const handleResultClick = useCallback(
    (filePath: string, _lineNumber: number) => {
      openTab(filePath);
    },
    [openTab]
  );

  // Render highlighted context text
  const renderContext = (
    context: string,
    highlightRanges: [number, number][]
  ) => {
    if (highlightRanges.length === 0) {
      return <span className="text-muted-foreground text-xs">{context}</span>;
    }

    const parts: React.ReactNode[] = [];
    let lastEnd = 0;

    for (const [start, end] of highlightRanges) {
      if (start > lastEnd) {
        parts.push(
          <span key={`pre-${start}`} className="text-muted-foreground text-xs">
            {context.slice(lastEnd, start)}
          </span>
        );
      }
      parts.push(
        <mark
          key={`hl-${start}`}
          className="bg-yellow-300/40 text-foreground text-xs rounded-sm px-0.5"
        >
          {context.slice(start, end)}
        </mark>
      );
      lastEnd = end;
    }

    if (lastEnd < context.length) {
      parts.push(
        <span key="rest" className="text-muted-foreground text-xs">
          {context.slice(lastEnd)}
        </span>
      );
    }

    return <>{parts}</>;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-sm font-semibold">Search</h2>
      </div>

      {/* Search input */}
      <div className="border-b border-border px-3 py-2">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Search files..."
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Mode tabs */}
      <div className="flex border-b border-border">
        <button
          className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
            searchMode === "keyword"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setSearchMode("keyword")}
        >
          Keyword
        </button>
        <button
          className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
            searchMode === "semantic"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setSearchMode("semantic")}
          title="Semantic search (Unit 5)"
        >
          Semantic
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {isSearching && (
          <div className="flex items-center justify-center py-8">
            <span className="text-xs text-muted-foreground">Searching...</span>
          </div>
        )}

        {!isSearching && searchQuery && keywordResults.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <span className="text-xs text-muted-foreground">
              No results found
            </span>
          </div>
        )}

        {!isSearching && searchMode === "semantic" && (
          <div className="flex items-center justify-center py-8">
            <span className="text-xs text-muted-foreground">
              Semantic search coming in Unit 5
            </span>
          </div>
        )}

        {searchMode === "keyword" &&
          keywordResults.map((result, idx) => (
            <button
              key={`${result.filePath}-${result.lineNumber}-${idx}`}
              className="w-full border-b border-border px-3 py-2 text-left transition-colors hover:bg-accent"
              onClick={() =>
                handleResultClick(result.filePath, result.lineNumber)
              }
            >
              <div className="flex items-baseline gap-2">
                <span className="truncate text-xs font-medium text-foreground">
                  {result.filePath}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  L{result.lineNumber}
                </span>
              </div>
              <div className="mt-0.5 line-clamp-2">
                {renderContext(result.context, result.highlightRanges)}
              </div>
            </button>
          ))}
      </div>

      {/* Footer — result count */}
      {keywordResults.length > 0 && (
        <div className="border-t border-border px-3 py-1.5">
          <span className="text-[10px] text-muted-foreground">
            {keywordResults.length} result
            {keywordResults.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}

export default SearchPanel;
