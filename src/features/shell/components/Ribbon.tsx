import { useEditorStore } from "@/stores/editor-store";
import { SIDEBAR_PANELS, type SidebarPanel } from "@/shared/constants";

interface RibbonIcon {
  id: SidebarPanel;
  label: string;
  icon: string;
}

const ribbonIcons: RibbonIcon[] = [
  { id: SIDEBAR_PANELS.PROJECTS, label: "Projects", icon: "📦" },
  { id: SIDEBAR_PANELS.FILES, label: "Files", icon: "📁" },
  { id: SIDEBAR_PANELS.SEARCH, label: "Search", icon: "🔍" },
  { id: SIDEBAR_PANELS.BACKLINKS, label: "Backlinks", icon: "🔗" },
  { id: SIDEBAR_PANELS.TAGS, label: "Tags", icon: "🏷️" },
  { id: SIDEBAR_PANELS.GRAPH, label: "Graph", icon: "🕸️" },
  { id: SIDEBAR_PANELS.GIT, label: "Git", icon: "📊" },
  { id: SIDEBAR_PANELS.AGENTS, label: "Agents", icon: "🤖" },
  { id: SIDEBAR_PANELS.LOGS, label: "Logs", icon: "📋" },
  { id: SIDEBAR_PANELS.PUBLISH, label: "Publish", icon: "🚀" },
];

export function Ribbon() {
  const activeSidebarPanel = useEditorStore((s) => s.activeSidebarPanel);
  const setSidebarPanel = useEditorStore((s) => s.setSidebarPanel);
  const sidebarCollapsed = useEditorStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useEditorStore((s) => s.toggleSidebar);
  const setSidebarCollapsed = useEditorStore((s) => s.setSidebarCollapsed);

  const handleIconClick = (id: SidebarPanel) => {
    if (sidebarCollapsed) {
      // Sidebar is collapsed: expand and switch to this panel
      setSidebarCollapsed(false);
      setSidebarPanel(id);
    } else if (activeSidebarPanel === id) {
      // Same panel clicked: toggle sidebar
      toggleSidebar();
    } else {
      // Different panel: switch to it
      setSidebarPanel(id);
    }
  };

  const renderIcon = (item: RibbonIcon) => {
    const isActive = activeSidebarPanel === item.id && !sidebarCollapsed;
    return (
      <button
        key={item.id}
        title={item.label}
        onClick={() => handleIconClick(item.id)}
        className="flex items-center justify-center w-9 h-9 rounded-md text-base transition-colors"
        style={{
          backgroundColor: isActive ? "var(--color-bg-surface)" : "transparent",
          color: isActive ? "var(--color-text-accent)" : "var(--color-text-secondary)",
        }}
      >
        {item.icon}
      </button>
    );
  };

  return (
    <div
      className="flex flex-col items-center py-2 gap-1"
      style={{
        width: 44,
        minWidth: 44,
        backgroundColor: "var(--color-ribbon-bg)",
        borderRight: "1px solid var(--color-border-subtle)",
      }}
    >
      {/* Projects button */}
      {renderIcon(ribbonIcons[0])}
      <div
        className="w-6 mx-auto my-1"
        style={{ borderTop: "1px solid var(--color-border-subtle)" }}
      />
      {/* Other ribbon icons */}
      {ribbonIcons.slice(1).map(renderIcon)}

    </div>
  );
}
