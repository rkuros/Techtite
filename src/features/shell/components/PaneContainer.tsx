import { useVaultStore } from "@/stores/vault-store";
import { useEditorStore } from "@/stores/editor-store";
import { SIDEBAR_PANELS } from "@/shared/constants";
import { EditorContainer } from "@/features/editor/components/EditorContainer";
import { ProjectBrowser } from "@/features/file-management";

export function PaneContainer() {
  const browsingProject = useVaultStore((s) => s.browsingProject);
  const activeSidebarPanel = useEditorStore((s) => s.activeSidebarPanel);

  const showBrowser =
    browsingProject && activeSidebarPanel === SIDEBAR_PANELS.PROJECTS;

  return (
    <div
      className="flex flex-col flex-1 min-h-0 overflow-hidden"
      style={{
        backgroundColor: "var(--color-editor-bg)",
      }}
    >
      {showBrowser ? (
        <ProjectBrowser project={browsingProject} />
      ) : (
        <EditorContainer />
      )}
    </div>
  );
}
