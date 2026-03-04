import { EditorContainer } from "@/features/editor/components/EditorContainer";

export function PaneContainer() {
  return (
    <div
      className="flex-1 min-h-0 overflow-hidden"
      style={{
        backgroundColor: "var(--color-editor-bg)",
      }}
    >
      <EditorContainer />
    </div>
  );
}
