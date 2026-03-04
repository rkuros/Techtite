import { useEditorStore } from "@/stores/editor-store";
import { getFileName } from "@/shared/utils/path";

export function TabBar() {
  const openTabs = useEditorStore((s) => s.openTabs);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const closeTab = useEditorStore((s) => s.closeTab);

  if (openTabs.length === 0) return null;

  return (
    <div
      className="flex items-center overflow-x-auto"
      style={{
        height: 36,
        minHeight: 36,
        backgroundColor: "var(--color-tabbar-bg)",
        borderBottom: "1px solid var(--color-border-subtle)",
      }}
    >
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
            <span className="text-xs truncate max-w-[120px]">
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
  );
}
