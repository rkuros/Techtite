import { useCallback, useEffect, useRef, useState } from "react";

import { useVaultStore } from "@/stores/vault-store";
import { useEditorStore } from "@/stores/editor-store";
import { invokeCommand } from "@/shared/utils/ipc";
import { SIDEBAR_PANELS } from "@/shared/constants";
import type { FileEntry } from "@/types/file";
import type { Project } from "@/types/vault";

interface Column {
  path: string;
  name: string;
  entries: FileEntry[];
  selected: string | null;
}

const COLUMN_WIDTH = 220;

const FILE_ICONS: Record<string, string> = {
  md: "📝",
  ts: "🟦",
  tsx: "⚛️",
  js: "🟨",
  jsx: "⚛️",
  rs: "🦀",
  py: "🐍",
  json: "📋",
  toml: "⚙️",
  yaml: "⚙️",
  yml: "⚙️",
  css: "🎨",
  scss: "🎨",
  html: "🌐",
  png: "🖼️",
  jpg: "🖼️",
  jpeg: "🖼️",
  svg: "🖼️",
  gif: "🖼️",
};

function getFileIcon(name: string, isDir: boolean): string {
  if (isDir) return "📂";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return FILE_ICONS[ext] ?? "📄";
}

export function ProjectBrowser({ project }: { project: Project }) {
  const [columns, setColumns] = useState<Column[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const setBrowsingProject = useVaultStore((s) => s.setBrowsingProject);
  const setProject = useVaultStore((s) => s.setProject);
  const openTab = useEditorStore((s) => s.openTab);
  const setSidebarPanel = useEditorStore((s) => s.setSidebarPanel);

  // Load root column
  useEffect(() => {
    let cancelled = false;
    invokeCommand<FileEntry[]>("list_dir_entries", {
      path: project.path,
    }).then((entries) => {
      if (!cancelled) {
        setColumns([
          { path: project.path, name: project.name, entries, selected: null },
        ]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [project.path, project.name]);

  // Auto-scroll to newest column
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: scrollRef.current.scrollWidth,
        behavior: "smooth",
      });
    }
  }, [columns.length]);

  const handleEntryClick = useCallback(
    async (colIndex: number, entry: FileEntry) => {
      // Update selection, trim later columns
      setColumns((prev) => {
        const updated = prev.slice(0, colIndex + 1);
        updated[colIndex] = { ...updated[colIndex], selected: entry.path };
        return updated;
      });

      if (entry.isDir) {
        try {
          const entries = await invokeCommand<FileEntry[]>(
            "list_dir_entries",
            { path: entry.path }
          );
          setColumns((prev) => {
            const updated = prev.slice(0, colIndex + 1);
            updated[colIndex] = { ...updated[colIndex], selected: entry.path };
            return [
              ...updated,
              { path: entry.path, name: entry.name, entries, selected: null },
            ];
          });
        } catch {
          // ignore
        }
      }
    },
    []
  );

  const handleFileDoubleClick = useCallback(
    async (entry: FileEntry) => {
      if (entry.isDir) {
        // Double-click dir: activate project + go to FILES
        await setProject(project);
        setBrowsingProject(null);
        setSidebarPanel(SIDEBAR_PANELS.FILES);
        return;
      }
      // Open file: activate project, open tab, exit browser
      await setProject(project);
      const relativePath = entry.path.startsWith(project.path)
        ? entry.path.slice(project.path.length).replace(/^\//, "")
        : entry.name;
      openTab(relativePath);
      setBrowsingProject(null);
    },
    [project, setProject, setBrowsingProject, openTab, setSidebarPanel]
  );

  // Build breadcrumb from columns
  const breadcrumb = columns.map((col) => col.name);

  return (
    <div className="flex flex-col h-full select-none">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{
          borderBottom: "1px solid var(--color-border-subtle, #2e303a)",
        }}
      >
        <span className="text-[18px]">
          {project.isCustom ? "🔗" : "📂"}
        </span>
        <div className="flex-1 min-w-0">
          <div
            className="text-sm font-semibold truncate"
            style={{ color: "var(--color-text-primary)" }}
          >
            {project.name}
          </div>
          <div
            className="text-[11px] truncate"
            style={{ color: "var(--color-text-muted)" }}
          >
            {breadcrumb.join(" › ")}
          </div>
        </div>
        <button
          className="px-3 py-1 text-[12px] rounded border transition-colors hover:bg-[var(--accent,#7c6fe0)] hover:text-white hover:border-transparent"
          style={{
            color: "var(--color-text-muted)",
            borderColor: "var(--color-border-subtle, #2e303a)",
          }}
          onClick={async () => {
            await setProject(project);
            setBrowsingProject(null);
            setSidebarPanel(SIDEBAR_PANELS.FILES);
          }}
        >
          Open Project
        </button>
        <button
          className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-[var(--bg-hover,#23252f)] text-[14px]"
          style={{ color: "var(--color-text-muted)" }}
          onClick={() => setBrowsingProject(null)}
          title="Close browser"
        >
          ×
        </button>
      </div>

      {/* Column browser */}
      <div
        ref={scrollRef}
        className="flex flex-1 overflow-x-auto overflow-y-hidden"
      >
        {columns.map((col, colIndex) => (
          <div
            key={col.path}
            className="flex-shrink-0 h-full overflow-y-auto"
            style={{
              width: COLUMN_WIDTH,
              borderRight: "1px solid var(--color-border-subtle, #2e303a)",
            }}
          >
            {/* Column header */}
            <div
              className="sticky top-0 z-10 px-3 py-1.5 text-[11px] font-medium truncate"
              style={{
                color: "var(--color-text-muted)",
                backgroundColor: "var(--color-bg-primary, #16181f)",
                borderBottom: "1px solid var(--color-border-subtle, #2e303a)",
              }}
            >
              {col.name}
            </div>

            {col.entries.length === 0 ? (
              <div
                className="px-3 py-4 text-[12px] italic text-center"
                style={{ color: "var(--color-text-muted)" }}
              >
                Empty folder
              </div>
            ) : (
              col.entries.map((entry) => {
                const isSelected = col.selected === entry.path;
                return (
                  <button
                    key={entry.path}
                    className="w-full text-left flex items-center gap-2 px-3 py-[5px] text-[13px] transition-colors truncate"
                    style={{
                      color: isSelected ? "#fff" : "var(--color-text-primary)",
                      backgroundColor: isSelected
                        ? "var(--color-accent, #7c6fe0)"
                        : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        (e.currentTarget as HTMLElement).style.backgroundColor =
                          "var(--bg-hover, #23252f)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected)
                        (e.currentTarget as HTMLElement).style.backgroundColor =
                          "transparent";
                    }}
                    onClick={() => handleEntryClick(colIndex, entry)}
                    onDoubleClick={() => handleFileDoubleClick(entry)}
                  >
                    <span className="text-[13px] flex-shrink-0">
                      {getFileIcon(entry.name, entry.isDir)}
                    </span>
                    <span className="truncate flex-1">{entry.name}</span>
                    {entry.isDir && (
                      <span
                        className="text-[12px] flex-shrink-0"
                        style={{
                          color: isSelected
                            ? "rgba(255,255,255,0.6)"
                            : "var(--color-text-muted)",
                        }}
                      >
                        ›
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        ))}

        {/* Empty trailing space for scrolling feel */}
        <div className="flex-shrink-0 w-16" />
      </div>
    </div>
  );
}
