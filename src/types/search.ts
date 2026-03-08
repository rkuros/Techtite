export interface KeywordSearchQuery {
  query: string;
  maxResults?: number;
}

export interface KeywordSearchResult {
  filePath: string;
  lineNumber: number;
  context: string;
  highlightRanges: [number, number][];
}

export interface SemanticSearchQuery {
  query: string;
  topK?: number;
  minScore?: number;
}

export interface SemanticSearchResult {
  filePath: string;
  sectionHeading: string | null;
  chunkText: string;
  score: number;
  startLine: number;
  endLine: number;
}

export interface HybridSearchQuery {
  query: string;
  topK?: number;
  keywordWeight?: number;
  semanticWeight?: number;
}

export interface HybridSearchResult {
  filePath: string;
  sectionHeading: string | null;
  chunkText: string;
  keywordScore: number;
  semanticScore: number;
  combinedScore: number;
  startLine: number;
  endLine: number;
}

export interface IndexStatus {
  totalFiles: number;
  indexedFiles: number;
  isBuilding: boolean;
  lastUpdatedAt: string | null;
}

export interface ChatResponse {
  sessionId: string;
  message: string;
  references: {
    filePath: string;
    sectionHeading: string | null;
    score: number;
  }[];
}

export interface GraphFilter {
  tags?: string[];
  folders?: string[];
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  label: string;
  tags: string[];
  folder: string;
}

export interface GraphEdge {
  source: string;
  target: string;
}
