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
import { AgentsDashboard, AgentCountBadge } from "@/features/terminal";
import { LogsPanel } from "@/features/reliability";
import { PublishPanel } from "@/features/publishing";
import { CostStatusBadge } from "@/features/guardrails";
import { AIChat, RAGStatusIndicator } from "@/features/semantic-search";
import { SettingsModal } from "./SettingsModal";

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
        className="h-screen w-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--color-bg-primary)" }}
      >
        <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Loading...
        </div>
      </div>
    );
  }

  // Show welcome screen when no vault is open
  if (!currentVault) {
    return (
      <div
        className="h-screen w-screen"
        style={{ backgroundColor: "var(--color-bg-primary)" }}
      >
        <WelcomeScreen />
      </div>
    );
  }

  // Height of the traffic light row (tabs sit here)
  const TITLEBAR_ROW = 36;
  // Extra spacing below tabs to align with sidebar/ribbon content start
  const TITLEBAR_SPACER = 0;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Ribbon — top spacer for macOS traffic lights, border starts below spacer */}
        <div className="flex flex-col shrink-0">
          <div
            data-tauri-drag-region
            style={{
              height: TITLEBAR_ROW + TITLEBAR_SPACER,
              minHeight: TITLEBAR_ROW + TITLEBAR_SPACER,
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
                  height: TITLEBAR_ROW + TITLEBAR_SPACER,
                  minHeight: TITLEBAR_ROW + TITLEBAR_SPACER,
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
              <div style={{ height: TITLEBAR_ROW + TITLEBAR_SPACER }} />
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
              {/* Tab bar at window top — total height matches sidebar spacer */}
              <div
                className="flex items-end shrink-0"
                data-tauri-drag-region
                style={{
                  height: TITLEBAR_ROW + TITLEBAR_SPACER,
                  minHeight: TITLEBAR_ROW + TITLEBAR_SPACER,
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
              <div style={{ height: TITLEBAR_ROW + TITLEBAR_SPACER }} />
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
              {/* Titlebar spacer — uniform color, no borders */}
              <div
                data-tauri-drag-region
                className="shrink-0"
                style={{
                  height: TITLEBAR_ROW + TITLEBAR_SPACER,
                  minHeight: TITLEBAR_ROW + TITLEBAR_SPACER,
                  backgroundColor: "var(--color-tabbar-bg)",
                }}
              />
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
