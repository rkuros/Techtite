// Sidebar panel identifiers
export const SIDEBAR_PANELS = {
  PROJECTS: "projects",
  FILES: "files",
  SEARCH: "search",
  BACKLINKS: "backlinks",
  TAGS: "tags",
  GRAPH: "graph",
  GIT: "git",
  AGENTS: "agents",
  LOGS: "logs",
  PUBLISH: "publish",
} as const;

export type SidebarPanel =
  (typeof SIDEBAR_PANELS)[keyof typeof SIDEBAR_PANELS];

// Default layout dimensions
export const LAYOUT = {
  RIBBON_WIDTH: 44,
  SIDEBAR_DEFAULT_WIDTH: 240,
  SIDEBAR_MIN_WIDTH: 180,
  SIDEBAR_MAX_WIDTH: 500,
  TERMINAL_DEFAULT_WIDTH: 0,
  TERMINAL_EXPANDED_WIDTH: 420,
  TERMINAL_MIN_WIDTH: 300,
  STATUSBAR_HEIGHT: 24,
  TABBAR_HEIGHT: 36,
} as const;

// Techtite local data directory name
export const TECHTITE_DIR = ".techtite";
