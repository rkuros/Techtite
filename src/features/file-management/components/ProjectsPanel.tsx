import { useCallback, useEffect, useState } from "react";

import { useVaultStore } from "@/stores/vault-store";
import { useEditorStore } from "@/stores/editor-store";
import { useFileTreeStore } from "@/stores/file-tree-store";
import { SIDEBAR_PANELS } from "@/shared/constants";
import type { Project } from "@/types/vault";

export function ProjectsPanel() {
  const projects = useVaultStore((s) => s.projects);
  const currentProject = useVaultStore((s) => s.currentProject);
  const currentVault = useVaultStore((s) => s.currentVault);
  const browsingProject = useVaultStore((s) => s.browsingProject);
  const setProject = useVaultStore((s) => s.setProject);
  const clearProject = useVaultStore((s) => s.clearProject);
  const loadProjects = useVaultStore((s) => s.loadProjects);
  const addCustomProject = useVaultStore((s) => s.addCustomProject);
  const removeCustomProject = useVaultStore((s) => s.removeCustomProject);
  const setBrowsingProject = useVaultStore((s) => s.setBrowsingProject);
  const createDir = useFileTreeStore((s) => s.createDir);
  const setSidebarPanel = useEditorStore((s) => s.setSidebarPanel);

  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    project: Project | null;
  }>({ visible: false, x: 0, y: 0, project: null });

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    const handler = () => {
      setContextMenu((prev) => ({ ...prev, visible: false }));
      setShowAddMenu(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const handleCreateProject = useCallback(async () => {
    const trimmed = newProjectName.trim();
    if (!trimmed) {
      setIsCreating(false);
      return;
    }
    try {
      await clearProject();
      await createDir("", trimmed);
      await loadProjects();
      const { projects: updated } = useVaultStore.getState();
      const newProject = updated.find((p) => p.name === trimmed);
      if (newProject) {
        await setProject(newProject);
      }
    } catch (err) {
      console.error("Failed to create project:", err);
    }
    setIsCreating(false);
    setNewProjectName("");
  }, [newProjectName, clearProject, createDir, loadProjects, setProject]);

  // Single click: preview project in main area column browser
  const handleProjectClick = useCallback(
    (project: Project) => {
      setBrowsingProject(
        browsingProject?.id === project.id ? null : project
      );
    },
    [browsingProject, setBrowsingProject]
  );

  // Double click: activate project + go to Files panel
  const handleProjectDoubleClick = useCallback(
    async (project: Project) => {
      setBrowsingProject(null);
      await setProject(project);
      setSidebarPanel(SIDEBAR_PANELS.FILES);
    },
    [setProject, setSidebarPanel, setBrowsingProject]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, project: Project) => {
      e.preventDefault();
      setContextMenu({ visible: true, x: e.clientX, y: e.clientY, project });
    },
    []
  );

  return (
    <div className="flex flex-col h-full select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold tracking-wider text-[var(--text-secondary,#8b8b96)] uppercase">
        <span>Projects</span>
        <div className="relative">
          <button
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--bg-hover,#23252f)] text-[14px]"
            onClick={(e) => {
              e.stopPropagation();
              setShowAddMenu(!showAddMenu);
            }}
            title="Add Project"
          >
            +
          </button>
          {showAddMenu && (
            <div
              className="absolute right-0 top-full mt-1 min-w-[180px] py-1 rounded-md shadow-lg border z-50"
              style={{
                backgroundColor: "var(--color-bg-surface, #1e2028)",
                borderColor: "var(--color-border-subtle, #2e303a)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="w-full text-left px-3 py-1.5 text-[13px] transition-colors hover:bg-[var(--accent,#7c6fe0)] hover:text-white flex items-center gap-2"
                style={{ color: "var(--color-text-primary)" }}
                onClick={() => {
                  setShowAddMenu(false);
                  setIsCreating(true);
                  setNewProjectName("");
                }}
              >
                <span className="text-[14px]">📂</span>
                New Project
              </button>
              <button
                className="w-full text-left px-3 py-1.5 text-[13px] transition-colors hover:bg-[var(--accent,#7c6fe0)] hover:text-white flex items-center gap-2"
                style={{ color: "var(--color-text-primary)" }}
                onClick={() => {
                  setShowAddMenu(false);
                  addCustomProject();
                }}
              >
                <span className="text-[14px]">🔗</span>
                Import External Folder
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New project input */}
      {isCreating && (
        <div className="px-3 py-1">
          <input
            autoFocus
            className="w-full bg-[var(--bg-input,#1a1c24)] text-[var(--text-primary,#e4e4e7)] text-[13px] px-2 py-1 border border-[var(--accent,#7c6fe0)] rounded outline-none"
            placeholder="Project name..."
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreateProject();
              } else if (e.key === "Escape") {
                setIsCreating(false);
                setNewProjectName("");
              }
            }}
            onBlur={handleCreateProject}
          />
        </div>
      )}

      {/* Project list */}
      <div className="flex-1 overflow-y-auto">
        {/* All Files option */}
        <button
          className="w-full flex items-center gap-2 px-3 py-2 text-[13px] transition-colors hover:bg-[var(--bg-hover,#23252f)]"
          style={{
            color: !currentProject
              ? "var(--color-text-accent, #a78bfa)"
              : "var(--color-text-primary)",
            backgroundColor: !currentProject
              ? "var(--color-bg-surface, #1e2028)"
              : "transparent",
          }}
          onClick={() => {
            clearProject();
            setBrowsingProject(null);
          }}
          onDoubleClick={() => {
            setBrowsingProject(null);
            setSidebarPanel(SIDEBAR_PANELS.FILES);
          }}
        >
          <span className="text-[14px]">🏠</span>
          <span className="truncate">{currentVault?.name ?? "All Files"}</span>
        </button>

        {projects.length > 0 && (
          <div
            className="mx-3 my-1"
            style={{ borderTop: "1px solid var(--color-border-subtle, #2e303a)" }}
          />
        )}

        {projects.map((project) => {
          const isActive = currentProject?.id === project.id;
          const isBrowsing = browsingProject?.id === project.id;
          return (
            <button
              key={project.id}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] transition-colors hover:bg-[var(--bg-hover,#23252f)] group"
              style={{
                color: isActive
                  ? "var(--color-text-accent, #a78bfa)"
                  : "var(--color-text-primary)",
                backgroundColor: isBrowsing
                  ? "var(--color-bg-surface, #1e2028)"
                  : isActive
                    ? "var(--color-bg-surface, #1e2028)"
                    : "transparent",
                borderLeft: isBrowsing
                  ? "2px solid var(--color-accent, #7c6fe0)"
                  : "2px solid transparent",
              }}
              onClick={() => handleProjectClick(project)}
              onDoubleClick={() => handleProjectDoubleClick(project)}
              onContextMenu={(e) => handleContextMenu(e, project)}
            >
              <span className="text-[14px] flex-shrink-0">
                {project.isCustom ? "🔗" : "📂"}
              </span>
              <span className="truncate flex-1 text-left">{project.name}</span>
              {isActive && (
                <span
                  className="text-[9px] flex-shrink-0"
                  style={{ color: "var(--color-text-accent, #a78bfa)" }}
                >
                  ●
                </span>
              )}
              {project.isCustom && (
                <span
                  className="text-[10px] px-1 rounded flex-shrink-0"
                  style={{
                    color: "var(--color-text-muted)",
                    backgroundColor: "var(--color-bg-primary, #16181f)",
                  }}
                >
                  ext
                </span>
              )}
            </button>
          );
        })}

        {projects.length === 0 && !isCreating && (
          <div
            className="px-4 py-6 text-center text-[13px]"
            style={{ color: "var(--color-text-muted)" }}
          >
            No projects yet.
            <br />
            <button
              className="mt-2 underline hover:no-underline"
              style={{ color: "var(--color-accent, #7c6fe0)" }}
              onClick={() => {
                setIsCreating(true);
                setNewProjectName("");
              }}
            >
              Create your first project
            </button>
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu.visible && contextMenu.project?.isCustom && (
        <div
          className="fixed z-50 min-w-[140px] py-1 rounded-md shadow-lg border"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: "var(--color-bg-surface, #1e2028)",
            borderColor: "var(--color-border-subtle, #2e303a)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-3 py-1.5 text-[13px] text-red-400 hover:bg-red-600 hover:text-white transition-colors"
            onClick={() => {
              if (contextMenu.project) {
                removeCustomProject(contextMenu.project.id);
              }
              setContextMenu((prev) => ({ ...prev, visible: false }));
            }}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
