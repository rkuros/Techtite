import { useEffect } from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { useEditorStore, initEditorEventListeners } from "@/stores/editor-store";
import { initSemanticEventListeners } from "@/stores/semantic-store";
import { useVaultStore } from "@/stores/vault-store";
import { listenEvent } from "@/shared/utils/ipc";
import { SIDEBAR_PANELS } from "@/shared/constants";
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

export function AppLayout() {
  const currentVault = useVaultStore((s) => s.currentVault);
  const isRestoring = useVaultStore((s) => s.isRestoring);
  const restoreSession = useVaultStore((s) => s.restoreSession);
  const activeSidebarPanel = useEditorStore((s) => s.activeSidebarPanel);

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

  // Global zoom shortcuts: Cmd+= / Cmd+- / Cmd+0
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
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Listen for native menu events
  useEffect(() => {
    const unlistenPromise = listenEvent<string>("menu-event", async (action) => {
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
      }
    });
    return () => { unlistenPromise.then((fn) => fn()); };
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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Ribbon */}
        <Ribbon />

        {/* Main content area with resizable panels */}
        <PanelGroup direction="horizontal" className="flex-1">
          {/* Left Sidebar */}
          <Panel defaultSize={20} minSize={15} maxSize={40}>
            <div
              className="h-full overflow-y-auto"
              style={{
                backgroundColor: "var(--color-sidebar-bg)",
                borderRight: "1px solid var(--color-border-subtle)",
              }}
            >
              <div className="p-3">
                <div
                  className="text-xs uppercase tracking-wider mb-2"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {activeSidebarPanel}
                </div>
                <SidebarContent panel={activeSidebarPanel} />
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="w-[1px] bg-[var(--color-border-subtle)] hover:bg-[var(--color-accent)] transition-colors" />

          {/* Center Area */}
          <Panel defaultSize={60} minSize={30}>
            <div
              className="flex flex-col h-full"
              onFocus={() => useEditorStore.getState().setActiveZone("editor")}
            >
              <TabBar />
              <PaneContainer />
            </div>
          </Panel>

          <PanelResizeHandle className="w-[1px] bg-[var(--color-border-subtle)] hover:bg-[var(--color-accent)] transition-colors" />

          {/* Right Terminal */}
          <Panel defaultSize={20} minSize={0} collapsible>
            <div
              className="h-full"
              style={{
                backgroundColor: "var(--color-terminal-bg)",
                borderLeft: "1px solid var(--color-border-subtle)",
              }}
              onFocus={() => useEditorStore.getState().setActiveZone("terminal")}
            >
              <TerminalPanel />
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
  const labels: Record<string, string> = {
    settings: "Settings",
  };

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
