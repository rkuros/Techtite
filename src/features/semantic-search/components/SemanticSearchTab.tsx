import { useCallback, useEffect, useRef, useState } from "react";
import { useSemanticStore } from "@/stores/semantic-store";
import { useEditorStore } from "@/stores/editor-store";

/**
 * SemanticSearchTab -- Sidebar panel for semantic and hybrid search.
 *
 * Provides:
 * - Natural language query input with search button
 * - Toggle between "Semantic" and "Hybrid" search modes
 * - Weight sliders for keyword vs semantic balance (hybrid mode only)
 * - Results list with similarity score bars and section headings
 * - Click result to open file in editor
 * - Loading spinner during search
 */
export function SemanticSearchTab() {
  const {
    semanticResults,
    hybridResults,
    isSearching,
    keywordWeight,
    semanticWeight,
    searchSemantic,
    searchHybrid,
    setSearchWeights,
    clearSearchResults,
  } = useSemanticStore();

  const openTab = useEditorStore((s) => s.openTab);

  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"semantic" | "hybrid">("semantic");

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Execute search
  const handleSearch = useCallback(() => {
    if (!query.trim()) {
      clearSearchResults();
      return;
    }

    if (mode === "semantic") {
      searchSemantic(query);
    } else {
      searchHybrid(query);
    }
  }, [query, mode, searchSemantic, searchHybrid, clearSearchResults]);

  // Handle Enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch]
  );

  // Handle result click -- open file in editor
  const handleResultClick = useCallback(
    (filePath: string) => {
      openTab(filePath);
    },
    [openTab]
  );

  // Handle weight slider change
  const handleWeightChange = useCallback(
    (newKeywordWeight: number) => {
      const kw = Math.round(newKeywordWeight * 100) / 100;
      const sw = Math.round((1 - kw) * 100) / 100;
      setSearchWeights(kw, sw);
    },
    [setSearchWeights]
  );

  // Determine which results to show
  const results = mode === "semantic" ? semanticResults : [];
  const hybridResultsList = mode === "hybrid" ? hybridResults : [];
  const hasResults = results.length > 0 || hybridResultsList.length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-sm font-semibold">Semantic Search</h2>
      </div>

      {/* Search input */}
      <div className="border-b border-border px-3 py-2">
        <div className="flex gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isSearching ? "..." : "Search"}
          </button>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex border-b border-border">
        <button
          className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "semantic"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setMode("semantic")}
        >
          Semantic
        </button>
        <button
          className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "hybrid"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setMode("hybrid")}
        >
          Hybrid
        </button>
      </div>

      {/* Weight sliders (hybrid mode only) */}
      {mode === "hybrid" && (
        <div className="border-b border-border px-3 py-2">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Keyword: {Math.round(keywordWeight * 100)}%</span>
            <span>Semantic: {Math.round(semanticWeight * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={keywordWeight}
            onChange={(e) => handleWeightChange(parseFloat(e.target.value))}
            className="mt-1 w-full accent-primary"
          />
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {isSearching && (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-xs text-muted-foreground">Searching...</span>
          </div>
        )}

        {!isSearching && query && !hasResults && (
          <div className="flex items-center justify-center py-8">
            <span className="text-xs text-muted-foreground">
              No results found
            </span>
          </div>
        )}

        {!isSearching && !query && (
          <div className="flex items-center justify-center py-8">
            <span className="text-xs text-muted-foreground">
              Enter a natural language query to search
            </span>
          </div>
        )}

        {/* Semantic results */}
        {mode === "semantic" &&
          results.map((result, idx) => (
            <button
              key={`${result.filePath}-${result.startLine}-${idx}`}
              className="w-full border-b border-border px-3 py-2 text-left transition-colors hover:bg-accent"
              onClick={() => handleResultClick(result.filePath)}
            >
              <div className="flex items-baseline gap-2">
                <span className="truncate text-xs font-medium text-foreground">
                  {result.filePath}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  L{result.startLine}-{result.endLine}
                </span>
              </div>
              {result.sectionHeading && (
                <div className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                  {result.sectionHeading}
                </div>
              )}
              <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {result.chunkText}
              </div>
              {/* Score bar */}
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.round(result.score * 100)}%` }}
                  />
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {Math.round(result.score * 100)}%
                </span>
              </div>
            </button>
          ))}

        {/* Hybrid results */}
        {mode === "hybrid" &&
          hybridResultsList.map((result, idx) => (
            <button
              key={`${result.filePath}-${result.startLine}-${idx}`}
              className="w-full border-b border-border px-3 py-2 text-left transition-colors hover:bg-accent"
              onClick={() => handleResultClick(result.filePath)}
            >
              <div className="flex items-baseline gap-2">
                <span className="truncate text-xs font-medium text-foreground">
                  {result.filePath}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  L{result.startLine}-{result.endLine}
                </span>
              </div>
              {result.sectionHeading && (
                <div className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                  {result.sectionHeading}
                </div>
              )}
              <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {result.chunkText}
              </div>
              {/* Combined score bar */}
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${Math.round(result.combinedScore * 100)}%`,
                    }}
                  />
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {Math.round(result.combinedScore * 100)}%
                </span>
              </div>
              {/* Breakdown */}
              <div className="mt-0.5 flex gap-3 text-[10px] text-muted-foreground">
                <span>KW: {Math.round(result.keywordScore * 100)}%</span>
                <span>Sem: {Math.round(result.semanticScore * 100)}%</span>
              </div>
            </button>
          ))}
      </div>

      {/* Footer -- result count */}
      {hasResults && (
        <div className="border-t border-border px-3 py-1.5">
          <span className="text-[10px] text-muted-foreground">
            {results.length + hybridResultsList.length} result
            {results.length + hybridResultsList.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}

export default SemanticSearchTab;
