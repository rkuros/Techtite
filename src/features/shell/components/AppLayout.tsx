import { useEffect } from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { useEditorStore, initEditorEventListeners } from "@/stores/editor-store";
import { useVaultStore } from "@/stores/vault-store";
import { SIDEBAR_PANELS } from "@/shared/constants";
import { Ribbon } from "./Ribbon";
import { TabBar } from "./TabBar";
import { PaneContainer } from "./PaneContainer";
import { StatusBar } from "./StatusBar";
import { WelcomeScreen } from "./WelcomeScreen";

// Lazy-loaded sidebar panels (actual components from each Unit)
import { FileExplorer } from "@/features/file-management";
import { SearchPanel } from "@/features/knowledge";
import { GitPanel } from "@/features/git";

export function AppLayout() {
  const currentVault = useVaultStore((s) => s.currentVault);
  const activeSidebarPanel = useEditorStore((s) => s.activeSidebarPanel);

  // Initialize editor event listeners once on mount
  useEffect(() => {
    const cleanup = initEditorEventListeners();
    return cleanup;
  }, []);

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
            <div className="flex flex-col h-full">
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
            >
              <div
                className="flex items-center justify-center h-full text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                Terminal (Unit 7)
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}

/** Render the active sidebar panel component. */
function SidebarContent({ panel }: { panel: string }) {
  switch (panel) {
    case SIDEBAR_PANELS.FILES:
      return <FileExplorer />;
    case SIDEBAR_PANELS.SEARCH:
      return <SearchPanel />;
    case SIDEBAR_PANELS.GIT:
      return <GitPanel />;
    default:
      return <SidebarPlaceholder panel={panel} />;
  }
}

function SidebarPlaceholder({ panel }: { panel: string }) {
  const labels: Record<string, string> = {
    backlinks: "Backlinks",
    tags: "Tags",
    graph: "Graph View",
    agents: "Agents Dashboard",
    logs: "Logs",
    publish: "Publish",
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
