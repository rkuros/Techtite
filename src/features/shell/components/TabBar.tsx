import { useEditorStore } from "@/stores/editor-store";
import { getFileName } from "@/shared/utils/path";

function PanelToggleButton({
  title,
  icon,
  active,
  onClick,
}: {
  title: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex items-center justify-center w-7 h-7 rounded text-[13px] transition-colors shrink-0"
      style={{
        backgroundColor: active ? "var(--color-bg-surface)" : "transparent",
        color: active ? "var(--color-text-accent)" : "var(--color-text-muted)",
      }}
    >
      {icon}
    </button>
  );
}

export function TabBar() {
  const openTabs = useEditorStore((s) => s.openTabs);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const closeTab = useEditorStore((s) => s.closeTab);
  const sidebarCollapsed = useEditorStore((s) => s.sidebarCollapsed);
  const terminalCollapsed = useEditorStore((s) => s.terminalCollapsed);
  const toggleSidebar = useEditorStore((s) => s.toggleSidebar);
  const toggleTerminal = useEditorStore((s) => s.toggleTerminal);

  return (
    <div className="flex items-center flex-1 min-w-0 h-full">
      {/* Tabs area */}
      <div className="flex items-center overflow-x-auto flex-1 min-w-0 h-full">
        {openTabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className="flex items-center gap-1.5 px-3 cursor-pointer select-none shrink-0"
              style={{
                height: "100%",
                borderBottom: isActive
                  ? "2px solid var(--color-accent)"
                  : "2px solid transparent",
                backgroundColor: isActive
                  ? "var(--color-bg-primary)"
                  : "transparent",
                color: isActive
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.isDirty && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: "var(--color-warning)" }}
                />
              )}
              <span className="text-[13px] truncate max-w-[140px]">
                {getFileName(tab.filePath)}
              </span>
              <button
                className="ml-1 opacity-60 hover:opacity-100 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Panel toggle buttons (right side) */}
      <div className="flex items-center gap-0.5 px-2 shrink-0">
        <PanelToggleButton
          title="Sidebar (⌘B)"
          icon="☰"
          active={!sidebarCollapsed}
          onClick={toggleSidebar}
        />
        <PanelToggleButton
          title="Terminal (⌘J)"
          icon="⌨"
          active={!terminalCollapsed}
          onClick={toggleTerminal}
        />
      </div>
    </div>
  );
}
