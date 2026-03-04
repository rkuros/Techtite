import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { useEditorStore } from "@/stores/editor-store";
import { Ribbon } from "./Ribbon";
import { TabBar } from "./TabBar";
import { PaneContainer } from "./PaneContainer";
import { StatusBar } from "./StatusBar";

export function AppLayout() {
  const activeSidebarPanel = useEditorStore((s) => s.activeSidebarPanel);

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
                {/* Sidebar panel content — each Unit provides its panel component */}
                <SidebarPlaceholder panel={activeSidebarPanel} />
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
              {/* Unit 7: TerminalPanel will be rendered here */}
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

function SidebarPlaceholder({ panel }: { panel: string }) {
  const placeholders: Record<string, string> = {
    files: "File Explorer (Unit 3)",
    search: "Search Panel (Unit 4/5)",
    backlinks: "Backlinks (Unit 4)",
    tags: "Tags (Unit 4)",
    graph: "Graph View (Unit 4)",
    git: "Git Panel (Unit 6)",
    agents: "Agents Dashboard (Unit 7)",
    logs: "Logs Panel (Unit 8)",
    publish: "Publish Panel (Unit 10)",
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
      {placeholders[panel] ?? panel}
    </div>
  );
}
