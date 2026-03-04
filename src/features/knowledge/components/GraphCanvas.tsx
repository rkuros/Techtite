import { useCallback, useEffect, useRef, useState } from "react";
import type { GraphData } from "@/types/search";

/**
 * GraphCanvas — SVG-based graph rendering component.
 *
 * Renders nodes (files) as circles and edges (links) as lines
 * in an SVG viewport. Supports:
 *   - Zoom and pan via mouse wheel / drag
 *   - Node click to open files
 *   - Node drag to adjust positions
 *
 * NOTE: This is a basic SVG placeholder implementation.
 * When d3-force is installed, this component will use d3 for:
 *   - Force-directed layout (d3.forceSimulation)
 *   - Smooth zoom/pan (d3-zoom)
 *   - Optimized rendering with d3-selection
 *
 * The layout calculation will run in a Web Worker
 * (graph-layout.worker.ts) to avoid blocking the UI.
 */

interface GraphCanvasProps {
  data: GraphData;
  onNodeClick?: (nodeId: string) => void;
  width?: number;
  height?: number;
}

interface PositionedNode {
  id: string;
  label: string;
  x: number;
  y: number;
  tags: string[];
  folder: string;
}

export function GraphCanvas({
  data,
  onNodeClick,
  width = 800,
  height = 600,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<PositionedNode[]>([]);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: width, h: height });
  const [isDragging, setIsDragging] = useState(false);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(
    null
  );

  // Simple circular layout as a placeholder for d3-force.
  // When d3-force is installed, this will be replaced with
  // force simulation via the Web Worker.
  useEffect(() => {
    if (!data || data.nodes.length === 0) {
      setNodes([]);
      return;
    }

    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.35;

    const positioned = data.nodes.map((node, i) => {
      const angle = (2 * Math.PI * i) / data.nodes.length;
      return {
        ...node,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });

    setNodes(positioned);
    setViewBox({ x: 0, y: 0, w: width, h: height });
  }, [data, width, height]);

  // Build a quick lookup from node id to position
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Handle zoom via mouse wheel
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      setViewBox((prev) => {
        const newW = prev.w * zoomFactor;
        const newH = prev.h * zoomFactor;
        const dx = (newW - prev.w) / 2;
        const dy = (newH - prev.h) / 2;
        return {
          x: prev.x - dx,
          y: prev.y - dy,
          w: newW,
          h: newH,
        };
      });
    },
    []
  );

  // Handle pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (dragNodeId) return;
      setIsDragging(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    },
    [dragNodeId]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragNodeId) {
        // Node dragging
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const scaleX = viewBox.w / rect.width;
        const scaleY = viewBox.h / rect.height;

        const svgX = viewBox.x + (e.clientX - rect.left) * scaleX;
        const svgY = viewBox.y + (e.clientY - rect.top) * scaleY;

        setNodes((prev) =>
          prev.map((n) =>
            n.id === dragNodeId ? { ...n, x: svgX, y: svgY } : n
          )
        );
      } else if (isDragging && panStart) {
        // Panning
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const scaleX = viewBox.w / rect.width;
        const scaleY = viewBox.h / rect.height;

        const dx = (e.clientX - panStart.x) * scaleX;
        const dy = (e.clientY - panStart.y) * scaleY;

        setViewBox((prev) => ({
          ...prev,
          x: prev.x - dx,
          y: prev.y - dy,
        }));
        setPanStart({ x: e.clientX, y: e.clientY });
      }
    },
    [isDragging, panStart, dragNodeId, viewBox]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setPanStart(null);
    setDragNodeId(null);
  }, []);

  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      setDragNodeId(nodeId);
    },
    []
  );

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (onNodeClick) {
        onNodeClick(nodeId);
      }
    },
    [onNodeClick]
  );

  const nodeRadius = 6;

  return (
    <svg
      ref={svgRef}
      className="h-full w-full cursor-grab bg-background active:cursor-grabbing"
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Edges */}
      <g>
        {data.edges.map((edge, idx) => {
          const source = nodeMap.get(edge.source);
          const target = nodeMap.get(edge.target);
          if (!source || !target) return null;

          return (
            <line
              key={`edge-${idx}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              className="stroke-muted-foreground/30"
              strokeWidth={1}
            />
          );
        })}
      </g>

      {/* Nodes */}
      <g>
        {nodes.map((node) => (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={nodeRadius}
              className="cursor-pointer fill-primary stroke-primary/50 transition-colors hover:fill-primary/80"
              strokeWidth={1.5}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onClick={() => handleNodeClick(node.id)}
            />
            <text
              x={node.x}
              y={node.y + nodeRadius + 12}
              textAnchor="middle"
              className="pointer-events-none select-none fill-foreground text-[10px]"
            >
              {node.label.length > 20
                ? `${node.label.slice(0, 20)}...`
                : node.label}
            </text>
          </g>
        ))}
      </g>

      {/* Empty state */}
      {nodes.length === 0 && (
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          className="fill-muted-foreground text-sm"
        >
          No graph data available
        </text>
      )}
    </svg>
  );
}

export default GraphCanvas;
