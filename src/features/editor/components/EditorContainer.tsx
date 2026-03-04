import { useCallback, useEffect, useState } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { invokeCommand } from "@/shared/utils/ipc";
import type { FileType } from "@/types/file";
import type { TabState } from "@/types/editor";
import { MarkdownEditor } from "./MarkdownEditor";
import { CodeViewer } from "./CodeViewer";
import { FrontmatterGUI } from "./FrontmatterGUI";

// ---------------------------------------------------------------------------
// EditorContainer — Orchestrates which editor component to render based on
// the file type of the active tab.
//
// For Markdown files:  FrontmatterGUI (if has frontmatter) + MarkdownEditor
// For Code files:      CodeViewer (with language detection)
// For Image files:     Image preview (placeholder)
// For Binary/Other:    Unsupported file message
// ---------------------------------------------------------------------------

/**
 * EditorContainer — Editor type switcher.
 *
 * Responsibilities:
 * - Determine file type via the `editor:get_file_type` IPC command.
 * - Load file content via `fs:read_file`.
 * - Render the appropriate editor component.
 * - Pass content changes from FrontmatterGUI back to the MarkdownEditor.
 *
 * This component is rendered inside a PaneContainer (Unit 1) for each active tab.
 */
export function EditorContainer() {
  // Use fine-grained selectors to avoid re-render on unrelated store changes
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const activeTabFilePath = useEditorStore(
    (s) => s.openTabs.find((t) => t.id === s.activeTabId)?.filePath ?? null
  );
  const activeTabViewMode = useEditorStore(
    (s) => s.openTabs.find((t) => t.id === s.activeTabId)?.viewMode ?? null
  );

  if (!activeTabId || !activeTabFilePath) {
    return <EmptyState />;
  }

  // Construct a stable tab-like object for EditorPane
  // Only re-renders when id, filePath, or viewMode actually change
  return (
    <EditorPane
      key={activeTabId}
      tab={{
        id: activeTabId,
        filePath: activeTabFilePath,
        viewMode: activeTabViewMode ?? "livePreview",
        isDirty: false, // not needed by EditorPane internals
        scrollPosition: 0,
        cursorLine: 1,
        cursorColumn: 1,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Internal: per-tab editor pane
// ---------------------------------------------------------------------------

function EditorPane({ tab }: { tab: TabState }) {
  const [fileType, setFileType] = useState<FileType | null>(null);
  const [language, setLanguage] = useState("plaintext");
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Load file type and content on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // Determine file type
        const ft = await invokeCommand<FileType>("get_file_type", {
          path: tab.filePath,
        });
        if (cancelled) return;
        setFileType(ft);

        // For code files, also get the language
        if (ft.type === "code") {
          const lang = await invokeCommand<string>("get_language", {
            path: tab.filePath,
          });
          if (cancelled) return;
          setLanguage(lang);
        }

        // Load file content (skip for images/binaries)
        if (ft.type !== "image" && ft.type !== "binary") {
          const fileContent = await invokeCommand<string>("read_file", {
            path: tab.filePath,
          });
          if (cancelled) return;
          setContent(fileContent);
        }
      } catch (err) {
        if (cancelled) return;
        setError(String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tab.filePath]);

  // -------------------------------------------------------------------------
  // Frontmatter content change handler (for Markdown files)
  // -------------------------------------------------------------------------
  const handleFrontmatterChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      // Mark the file dirty since frontmatter was changed through the GUI
      useEditorStore.getState().markDirty(tab.filePath);

      // Update the editor instance content if it exists
      const editorRef = useEditorStore
        .getState()
        .editorInstances.get(tab.id);
      if (editorRef) {
        editorRef.setContent(newContent);
      }
    },
    [tab.filePath, tab.id]
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-muted,#8e8e93)] text-sm">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-sm px-4">
        <div className="text-center">
          <p className="font-semibold mb-1">Failed to open file</p>
          <p className="text-xs text-[var(--text-muted,#8e8e93)]">{error}</p>
        </div>
      </div>
    );
  }

  if (!fileType) return null;

  switch (fileType.type) {
    case "markdown":
      return (
        <div className="flex flex-col h-full">
          {/* Frontmatter GUI for Markdown files */}
          {content !== null && (
            <FrontmatterGUI
              content={content}
              onContentChange={handleFrontmatterChange}
              readOnly={tab.viewMode === "readOnly"}
            />
          )}
          {/* Main Markdown editor */}
          <div className="flex-1 min-h-0">
            <MarkdownEditor tab={tab} initialContent={content ?? ""} />
          </div>
        </div>
      );

    case "code":
      return (
        <CodeViewer
          tab={tab}
          initialContent={content ?? ""}
          language={language}
        />
      );

    case "image":
      return <ImagePreviewPane filePath={tab.filePath} />;

    case "binary":
      return (
        <div className="flex items-center justify-center h-full text-[var(--text-muted,#8e8e93)] text-sm">
          <div className="text-center">
            <p className="text-2xl mb-2">&#128450;</p>
            <p>Binary file — cannot be displayed</p>
            <p className="text-xs mt-1">{tab.filePath}</p>
          </div>
        </div>
      );

    case "other":
    default:
      return (
        <div className="flex items-center justify-center h-full text-[var(--text-muted,#8e8e93)] text-sm">
          <div className="text-center">
            <p className="text-2xl mb-2">&#128196;</p>
            <p>Unsupported file type</p>
            <p className="text-xs mt-1">{tab.filePath}</p>
          </div>
        </div>
      );
  }
}

// ---------------------------------------------------------------------------
// Internal: Empty state when no tab is active
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full text-[var(--text-muted,#8e8e93)]">
      <div className="text-center">
        <p className="text-lg font-semibold mb-2">Techtite</p>
        <p className="text-xs">
          Open a file from the sidebar to start editing
        </p>
        <p className="text-xs mt-1 text-[var(--text-muted,#8e8e93)] opacity-60">
          Ctrl+P / Cmd+P to open Quick Switcher
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal: Image preview placeholder
// ---------------------------------------------------------------------------

function ImagePreviewPane({ filePath }: { filePath: string }) {
  // NOTE: When Tauri convertFileSrc is available, use it to convert the
  // vault-relative path to a WebView-displayable URL:
  //   import { convertFileSrc } from "@tauri-apps/api/core";
  //   const src = convertFileSrc(resolvedAbsolutePath);

  return (
    <div className="flex items-center justify-center h-full text-[var(--text-muted,#8e8e93)] text-sm">
      <div className="text-center">
        <p className="text-2xl mb-2">&#128247;</p>
        <p>Image preview</p>
        <p className="text-xs mt-1">{filePath}</p>
        <p className="text-xs mt-2 text-[var(--text-muted,#8e8e93)] opacity-60">
          (Image display will use Tauri convertFileSrc)
        </p>
      </div>
    </div>
  );
}
