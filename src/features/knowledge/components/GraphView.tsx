import { useCallback, useEffect, useRef, useState } from "react";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { useEditorStore } from "@/stores/editor-store";
import type { GraphFilter } from "@/types/search";
import { GraphCanvas } from "./GraphCanvas";
import { GraphControls } from "./GraphControls";

/**
 * GraphView — Main Graph View component combining canvas and controls.
 *
 * Integrates GraphCanvas (SVG rendering) with GraphControls (filters).
 * Supports both global graph (all vault nodes) and local graph
 * (centered on the currently open file).
 *
 * When d3-force is installed, the layout calculation will be
 * offloaded to a Web Worker (graph-layout.worker.ts) to keep
 * the UI responsive.
 */
export function GraphView() {
  const {
    graphData,
    graphFilter,
    isLoadingGraph,
    fetchGraphData,
    fetchLocalGraph,
    setGraphFilter,
  } = useKnowledgeStore();

  const openTab = useEditorStore((s) => s.openTab);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const openTabs = useEditorStore((s) => s.openTabs);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [depth, setDepth] = useState(2);

  // Get the currently active file path for local graph mode
  const activeFilePath =
    openTabs.find((t) => t.id === activeTabId)?.filePath ?? null;

  // Track container dimensions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Fetch graph data on mount and when filters/mode change
  useEffect(() => {
    if (isLocalMode && activeFilePath) {
      fetchLocalGraph(activeFilePath, depth);
    } else {
      fetchGraphData(graphFilter);
    }
  }, [
    isLocalMode,
    activeFilePath,
    depth,
    graphFilter,
    fetchGraphData,
    fetchLocalGraph,
  ]);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      openTab(nodeId);
    },
    [openTab]
  );

  const handleFilterChange = useCallback(
    (filter: GraphFilter) => {
      setGraphFilter(filter);
    },
    [setGraphFilter]
  );

  const handleToggleMode = useCallback(() => {
    setIsLocalMode((prev) => !prev);
  }, []);

  const handleRefresh = useCallback(() => {
    if (isLocalMode && activeFilePath) {
      fetchLocalGraph(activeFilePath, depth);
    } else {
      fetchGraphData(graphFilter);
    }
  }, [
    isLocalMode,
    activeFilePath,
    depth,
    graphFilter,
    fetchGraphData,
    fetchLocalGraph,
  ]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background px-4 py-3">
        <h2 className="text-sm font-semibold">Graph View</h2>
        {graphData && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {graphData.nodes.length} node
            {graphData.nodes.length !== 1 ? "s" : ""},{" "}
            {graphData.edges.length} edge
            {graphData.edges.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Controls */}
      <GraphControls
        filter={graphFilter}
        onFilterChange={handleFilterChange}
        depth={depth}
        onDepthChange={setDepth}
        isLocalMode={isLocalMode}
        onToggleMode={handleToggleMode}
        onRefresh={handleRefresh}
      />

      {/* Canvas */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        {isLoadingGraph ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-xs text-muted-foreground">
              Loading graph...
            </span>
          </div>
        ) : !graphData ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-xs text-muted-foreground">
              No graph data
            </span>
          </div>
        ) : (
          <GraphCanvas
            data={graphData}
            onNodeClick={handleNodeClick}
            width={dimensions.width}
            height={dimensions.height}
          />
        )}
      </div>

      {/* Local mode indicator */}
      {isLocalMode && activeFilePath && (
        <div className="border-t border-border bg-muted/50 px-4 py-1.5">
          <span className="text-[10px] text-muted-foreground">
            Local graph centered on:{" "}
            <span className="font-medium text-foreground">
              {activeFilePath}
            </span>{" "}
            (depth: {depth})
          </span>
        </div>
      )}

      {isLocalMode && !activeFilePath && (
        <div className="border-t border-border bg-muted/50 px-4 py-1.5">
          <span className="text-[10px] text-muted-foreground">
            Open a file to use local graph mode
          </span>
        </div>
      )}
    </div>
  );
}

export default GraphView;
