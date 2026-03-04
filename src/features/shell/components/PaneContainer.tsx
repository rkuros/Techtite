import { useEditorStore } from "@/stores/editor-store";

export function PaneContainer() {
  const openTabs = useEditorStore((s) => s.openTabs);
  const activeTabId = useEditorStore((s) => s.activeTabId);

  const activeTab = openTabs.find((t) => t.id === activeTabId);

  if (!activeTab) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{
          backgroundColor: "var(--color-editor-bg)",
          color: "var(--color-text-muted)",
        }}
      >
        <div className="text-center">
          <p className="text-lg mb-2">Techtite</p>
          <p className="text-xs">Open a file to start editing</p>
        </div>
      </div>
    );
  }

  // Placeholder for editor content — Unit 2 will provide MarkdownEditor/CodeViewer
  return (
    <div
      className="flex-1 overflow-auto p-4"
      style={{
        backgroundColor: "var(--color-editor-bg)",
      }}
    >
      <div
        className="text-xs mb-2"
        style={{ color: "var(--color-text-muted)" }}
      >
        {activeTab.filePath}
      </div>
      {/* Unit 2: EditorContainer will be rendered here */}
      <div
        className="p-4 rounded"
        style={{
          backgroundColor: "var(--color-bg-surface)",
          color: "var(--color-text-secondary)",
        }}
      >
        Editor placeholder — [{activeTab.viewMode}] {activeTab.filePath}
      </div>
    </div>
  );
}
