import { useEffect, useRef, useState } from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  type ImperativePanelHandle,
} from "react-resizable-panels";
import { useEditorStore, initEditorEventListeners } from "@/stores/editor-store";
import { initSemanticEventListeners } from "@/stores/semantic-store";
import { useVaultStore } from "@/stores/vault-store";
import { invokeCommand, listenEvent } from "@/shared/utils/ipc";
import { message } from "@tauri-apps/plugin-dialog";
import { SIDEBAR_PANELS } from "@/shared/constants";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize, LogicalPosition } from "@tauri-apps/api/dpi";
import type { WindowState } from "@/types/editor";
import { Ribbon } from "./Ribbon";
import { TabBar } from "./TabBar";
import { PaneContainer } from "./PaneContainer";
import { StatusBar } from "./StatusBar";
import { WelcomeScreen } from "./WelcomeScreen";

// Sidebar panels (actual components from each Unit)
import { FileExplorer, ProjectsPanel } from "@/features/file-management";
import { SearchPanel, BacklinksPage, TagsPage, GraphView } from "@/features/knowledge";
import { GitPanel, SyncStatus } from "@/features/git";
import { TerminalPanel } from "@/features/terminal/components/TerminalPanel";
import { useTerminalStore } from "@/stores/terminal-store";
import { AgentsDashboard, AgentCountBadge } from "@/features/terminal";
import { LogsPanel } from "@/features/reliability";
import { PublishPanel } from "@/features/publishing";
import { CostStatusBadge } from "@/features/guardrails";
import { AIChat, RAGStatusIndicator } from "@/features/semantic-search";
import { SettingsModal } from "./SettingsModal";

// Title bar layout constants
const TITLEBAR_ROW = 36;
const TITLEBAR_SPACER = 0;
// Thin drag strip at the very top of the window for reliable window dragging.
// data-tauri-drag-region on parent elements doesn't work when child elements
// (tabs, buttons, scaleY-flipped scroll containers) cover the entire area,
// because the mousedown hits the child instead of the attributed parent.
const DRAG_STRIP_HEIGHT = 4;

/**
 * Start window dragging programmatically when mousedown lands on a
 * drag-region element. This supplements data-tauri-drag-region for areas
 * where child elements (tabs, scaleY-flipped containers) absorb the hit.
 *
 * We walk up from the event target to the currentTarget (the element with
 * the handler). If we hit an interactive element (button, a, input, etc.)
 * we bail out so clicks still work. Otherwise we initiate the drag.
 */
function handleDragMouseDown(e: React.MouseEvent<HTMLDivElement>) {
  // Only primary button
  if (e.button !== 0) return;
  // Walk from the actual target up to the handler element
  let el = e.target as HTMLElement | null;
  const boundary = e.currentTarget;
  while (el && el !== boundary) {
    const tag = el.tagName.toLowerCase();
    if (tag === "button" || tag === "a" || tag === "input" || tag === "select" || tag === "textarea") {
      return; // interactive element — don't drag
    }
    el = el.parentElement;
  }
  e.preventDefault();
  getCurrentWindow().startDragging();
}

export function AppLayout() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const currentVault = useVaultStore((s) => s.currentVault);
  const isRestoring = useVaultStore((s) => s.isRestoring);
  const restoreSession = useVaultStore((s) => s.restoreSession);
  const activeSidebarPanel = useEditorStore((s) => s.activeSidebarPanel);
  const sidebarCollapsed = useEditorStore((s) => s.sidebarCollapsed);
  const editorCollapsed = useEditorStore((s) => s.editorCollapsed);
  const terminalCollapsed = useEditorStore((s) => s.terminalCollapsed);
  const setSidebarCollapsed = useEditorStore((s) => s.setSidebarCollapsed);
  const setEditorCollapsed = useEditorStore((s) => s.setEditorCollapsed);
  const setTerminalCollapsed = useEditorStore((s) => s.setTerminalCollapsed);

  // Panel refs for imperative collapse/expand
  const sidebarRef = useRef<ImperativePanelHandle>(null);
  const editorRef = useRef<ImperativePanelHandle>(null);
  const terminalRef = useRef<ImperativePanelHandle>(null);

  // Sync panel refs with store state (defer initial collapse to avoid layout race)
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      // Initial collapse after layout settles
      requestAnimationFrame(() => {
        if (sidebarCollapsed) sidebarRef.current?.collapse();
        if (editorCollapsed) editorRef.current?.collapse();
        if (terminalCollapsed) terminalRef.current?.collapse();
      });
      return;
    }
    // Subsequent toggles happen immediately
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mountedRef.current) return;
    if (sidebarCollapsed) sidebarRef.current?.collapse();
    else sidebarRef.current?.expand();
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!mountedRef.current) return;
    if (editorCollapsed) editorRef.current?.collapse();
    else editorRef.current?.expand();
  }, [editorCollapsed]);

  useEffect(() => {
    if (!mountedRef.current) return;
    if (terminalCollapsed) terminalRef.current?.collapse();
    else terminalRef.current?.expand();
  }, [terminalCollapsed]);

  // Restore last session on mount
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Initialize event listeners once on mount
  useEffect(() => {
    const cleanupEditor = initEditorEventListeners();
    const cleanupSemantic = initSemanticEventListeners();
    return () => {
      cleanupEditor();
      cleanupSemantic();
    };
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const store = useEditorStore.getState();
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        store.zoomIn();
      } else if (e.key === "-") {
        e.preventDefault();
        store.zoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        store.resetZoom();
      } else if (e.key === "b") {
        e.preventDefault();
        store.toggleSidebar();
      } else if (e.key === "j") {
        e.preventDefault();
        store.toggleTerminal();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Restore window state on mount, save on beforeunload
  useEffect(() => {
    // Load saved window state
    invokeCommand<WindowState | null>("load_state")
      .then(async (savedState) => {
        if (!savedState) return;
        try {
          const win = getCurrentWindow();
          await win.setSize(new LogicalSize(savedState.width, savedState.height));
          await win.setPosition(new LogicalPosition(savedState.x, savedState.y));
          if (savedState.maximized) {
            await win.maximize();
          }
        } catch {
          // Window API may not be available in all environments
        }
        // Apply editor layout state
        const editorStore = useEditorStore.getState();
        if (savedState.activeSidebarPanel) {
          editorStore.setSidebarPanel(savedState.activeSidebarPanel);
        }
      })
      .catch((err) => {
        console.warn("Failed to load window state:", err);
      });

    // Save window state before unload
    const handleBeforeUnload = () => {
      try {
        const editorState = useEditorStore.getState();
        const state: WindowState = {
          width: window.outerWidth,
          height: window.outerHeight,
          x: window.screenX,
          y: window.screenY,
          maximized: false,
          paneLayout: editorState.paneLayout,
          openTabs: editorState.openTabs,
          sidebarWidth: editorState.sidebarWidth,
          terminalHeight: editorState.terminalHeight,
          activeSidebarPanel: editorState.activeSidebarPanel,
        };
        invokeCommand("save_state", { state }).catch(() => {});
      } catch {
        // Best-effort save; ignore errors during shutdown
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Listen for native menu events
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    listenEvent<string>("menu-event", async (action) => {
      const store = useVaultStore.getState();
      switch (action) {
        case "vault-create":
          await store.closeVault();
          break;
        case "vault-open": {
          const path = await store.selectFolder();
          if (path) await store.openVault(path);
          break;
        }
        case "vault-close":
          await store.closeVault();
          break;
        case "vault-delete":
          if (store.currentVault && window.confirm(
            `Delete vault "${store.currentVault.name}" and all its contents?\n\nThis cannot be undone.`
          )) {
            await store.deleteVault();
          }
          break;
        case "app-settings":
          setSettingsOpen(true);
          break;
        case "app-about":
          await message("Techtite v0.1.0\nKnowledge-powered development environment", { title: "About Techtite", kind: "info" });
          break;
      }
    }).then((fn) => {
      if (cancelled) {
        fn();
      } else {
        cleanup = fn;
      }
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  // Show loading during session restore
  if (isRestoring) {
    return (
      <div
        className="h-screen w-screen flex flex-col"
        style={{ backgroundColor: "var(--color-bg-primary)" }}
      >
        <div
          data-tauri-drag-region
          style={{ height: TITLEBAR_ROW, minHeight: TITLEBAR_ROW, flexShrink: 0 }}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  // Show welcome screen when no vault is open
  if (!currentVault) {
    return (
      <div
        className="h-screen w-screen flex flex-col"
        style={{ backgroundColor: "var(--color-bg-primary)" }}
      >
        <div
          data-tauri-drag-region
          style={{ height: TITLEBAR_ROW, minHeight: TITLEBAR_ROW, flexShrink: 0 }}
        />
        <div className="flex-1 overflow-auto">
          <WelcomeScreen />
        </div>
      </div>
    );
  }

  // (TITLEBAR_ROW and TITLEBAR_SPACER are module-level constants above)

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {/* Dedicated drag strip — always visible at the very top of the window.
          This has no child elements so data-tauri-drag-region always receives
          the mousedown directly, guaranteeing window dragging works. */}
      <div
        data-tauri-drag-region
        style={{
          height: DRAG_STRIP_HEIGHT,
          minHeight: DRAG_STRIP_HEIGHT,
          backgroundColor: "var(--color-tabbar-bg)",
          flexShrink: 0,
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Ribbon — top spacer for macOS traffic lights, border starts below spacer */}
        <div className="flex flex-col shrink-0">
          <div
            data-tauri-drag-region
            style={{
              height: TITLEBAR_ROW + TITLEBAR_SPACER - DRAG_STRIP_HEIGHT,
              minHeight: TITLEBAR_ROW + TITLEBAR_SPACER - DRAG_STRIP_HEIGHT,
              backgroundColor: "var(--color-tabbar-bg)",
            }}
          />
          <div
            className="flex-1"
            style={{
              backgroundColor: "var(--color-ribbon-bg)",
              borderRight: "1px solid var(--color-border-subtle)",
            }}
          >
            <Ribbon />
          </div>
        </div>

        {/* Main content area with resizable panels */}
        <PanelGroup direction="horizontal" className="flex-1">
          {/* Left Sidebar */}
          <Panel
            ref={sidebarRef}
            defaultSize={20}
            minSize={15}
            maxSize={40}
            collapsible
            collapsedSize={0}
            onCollapse={() => setSidebarCollapsed(true)}
            onExpand={() => setSidebarCollapsed(false)}
          >
            <div className="flex flex-col h-full">
              {/* Titlebar spacer — uniform color, no borders */}
              <div
                data-tauri-drag-region
                className="shrink-0"
                style={{
                  height: TITLEBAR_ROW + TITLEBAR_SPACER - DRAG_STRIP_HEIGHT,
                  minHeight: TITLEBAR_ROW + TITLEBAR_SPACER - DRAG_STRIP_HEIGHT,
                  backgroundColor: "var(--color-tabbar-bg)",
                }}
              />
              {/* Content area — border only starts here */}
              <div
                className="flex-1 overflow-y-auto"
                style={{
                  backgroundColor: "var(--color-sidebar-bg)",
                  borderRight: "1px solid var(--color-border-subtle)",
                }}
              >
                <SidebarContent panel={activeSidebarPanel} />
              </div>
            </div>
          </Panel>

          <PanelResizeHandle>
            <div className="flex flex-col h-full w-[1px]">
              <div style={{ height: TITLEBAR_ROW + TITLEBAR_SPACER - DRAG_STRIP_HEIGHT }} />
              <div className="flex-1 bg-[var(--color-border-subtle)] hover:bg-[var(--color-accent)] transition-colors" />
            </div>
          </PanelResizeHandle>

          {/* Center Area */}
          <Panel
            ref={editorRef}
            defaultSize={60}
            minSize={20}
            collapsible
            collapsedSize={0}
            onCollapse={() => setEditorCollapsed(true)}
            onExpand={() => setEditorCollapsed(false)}
          >
            <div
              className="flex flex-col h-full"
              onFocus={() => useEditorStore.getState().setActiveZone("editor")}
            >
              {/* Tab bar in title bar area — empty space is draggable.
                  Uses onMouseDown+startDragging() because child elements
                  (tabs with scaleY transform) prevent data-tauri-drag-region
                  from receiving the mousedown directly. */}
              <div
                data-tauri-drag-region
                onMouseDown={handleDragMouseDown}
                className="flex items-center shrink-0"
                style={{
                  height: TITLEBAR_ROW - DRAG_STRIP_HEIGHT,
                  minHeight: TITLEBAR_ROW - DRAG_STRIP_HEIGHT,
                  paddingLeft: sidebarCollapsed ? 36 : 0,
                  backgroundColor: "var(--color-tabbar-bg)",
                }}
              >
                <TabBar />
              </div>
              <PaneContainer />
            </div>
          </Panel>

          <PanelResizeHandle>
            <div className="flex flex-col h-full w-[1px]">
              <div style={{ height: TITLEBAR_ROW + TITLEBAR_SPACER - DRAG_STRIP_HEIGHT }} />
              <div className="flex-1 bg-[var(--color-border-subtle)] hover:bg-[var(--color-accent)] transition-colors" />
            </div>
          </PanelResizeHandle>

          {/* Right Terminal */}
          <Panel
            ref={terminalRef}
            defaultSize={20}
            minSize={15}
            collapsible
            collapsedSize={0}
            onCollapse={() => setTerminalCollapsed(true)}
            onExpand={() => setTerminalCollapsed(false)}
          >
            <div
              className="flex flex-col h-full"
              onFocus={() => useEditorStore.getState().setActiveZone("terminal")}
            >
              {/* Terminal tab bar in title bar area */}
              <TerminalTabBar />
              {/* Content — border only starts here */}
              <div
                className="flex-1 min-h-0"
                style={{
                  backgroundColor: "var(--color-terminal-bg)",
                  borderLeft: "1px solid var(--color-border-subtle)",
                }}
              >
                <TerminalPanel />
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* Status Bar */}
      <StatusBar
        leftSlot={<SyncStatus />}
        rightSlot={
          <>
            <RAGStatusIndicator />
            <AgentCountBadge />
            <CostStatusBadge />
          </>
        }
      />

      {/* Floating AI Chat */}
      <AIChat />

      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

/** Render the active sidebar panel component. */
function SidebarContent({ panel }: { panel: string }) {
  switch (panel) {
    case SIDEBAR_PANELS.PROJECTS:
      return <ProjectsPanel />;
    case SIDEBAR_PANELS.FILES:
      return <FileExplorer />;
    case SIDEBAR_PANELS.SEARCH:
      return <SearchPanel />;
    case SIDEBAR_PANELS.BACKLINKS:
      return <BacklinksPage />;
    case SIDEBAR_PANELS.TAGS:
      return <TagsPage />;
    case SIDEBAR_PANELS.GRAPH:
      return <GraphView />;
    case SIDEBAR_PANELS.GIT:
      return <GitPanel />;
    case SIDEBAR_PANELS.AGENTS:
      return <AgentsDashboard />;
    case SIDEBAR_PANELS.LOGS:
      return <LogsPanel />;
    case SIDEBAR_PANELS.PUBLISH:
      return <PublishPanel />;
    default:
      return <SidebarPlaceholder panel={panel} />;
  }
}

/** Terminal tab bar — matches editor TabBar style, sits in title bar area */
function TerminalTabBar() {
  const terminals = useTerminalStore((s) => s.terminals);
  const activeTerminalId = useTerminalStore((s) => s.activeTerminalId);
  const setActiveTerminal = useTerminalStore((s) => s.setActiveTerminal);
  const createTerminal = useTerminalStore((s) => s.createTerminal);
  const closeTerminal = useTerminalStore((s) => s.closeTerminal);

  return (
    <div
      data-tauri-drag-region
      onMouseDown={handleDragMouseDown}
      className="flex items-center shrink-0"
      style={{
        height: TITLEBAR_ROW - DRAG_STRIP_HEIGHT,
        minHeight: TITLEBAR_ROW - DRAG_STRIP_HEIGHT,
        backgroundColor: "#1e1e1e",
      }}
    >
      <div className="flex items-center flex-1 min-w-0 h-full">
        <div className="flex items-center overflow-x-auto flex-1 min-w-0 h-full hide-scrollbar">
          {terminals.map((session) => {
            const isActive = session.id === activeTerminalId;
            return (
              <div
                key={session.id}
                className="flex items-center gap-1.5 px-3 cursor-pointer select-none shrink-0"
                style={{
                  height: "100%",
                  borderBottom: isActive
                    ? "2px solid var(--color-accent)"
                    : "2px solid transparent",
                  backgroundColor: isActive
                    ? "#2a2a2a"
                    : "transparent",
                  color: isActive
                    ? "var(--color-text-primary)"
                    : "var(--color-text-secondary)",
                }}
                onClick={() => setActiveTerminal(session.id)}
              >
                <span className="text-[13px] truncate max-w-[120px]">
                  {session.label}
                </span>
                <button
                  className="ml-1 opacity-60 hover:opacity-100 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTerminal(session.id);
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
        {/* Add terminal button */}
        <button
          onClick={() => createTerminal()}
          className="flex items-center justify-center w-7 h-7 rounded text-[15px] shrink-0 transition-colors"
          style={{
            color: "var(--color-text-muted)",
            marginRight: 4,
          }}
          title="New Terminal"
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-bg-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          +
        </button>
      </div>
    </div>
  );
}

function SidebarPlaceholder({ panel }: { panel: string }) {
  const labels: Record<string, string> = {};

  return (
    <div
      className="text-xs p-4 rounded"
      style={{
        backgroundColor: "var(--color-bg-surface)",
        color: "var(--color-text-muted)",
      }}
    >
      {labels[panel] ?? panel}
    </div>
  );
}
