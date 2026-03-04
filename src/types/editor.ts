export interface WindowState {
  width: number;
  height: number;
  x: number;
  y: number;
  maximized: boolean;
  paneLayout: PaneLayout;
  openTabs: TabState[];
  sidebarWidth: number;
  terminalHeight: number;
  activeSidebarPanel: string;
}

export interface PaneLayout {
  direction: "horizontal" | "vertical";
  sizes: number[];
  children: PaneNode[];
}

export type PaneNode =
  | { type: "leaf"; tabGroupId: string }
  | { type: "split"; layout: PaneLayout };

export interface TabState {
  id: string;
  filePath: string;
  isDirty: boolean;
  scrollPosition: number;
  cursorLine: number;
  cursorColumn: number;
  viewMode: "livePreview" | "source" | "readOnly";
}
