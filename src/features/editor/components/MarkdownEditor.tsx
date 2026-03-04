import { useCallback, useEffect, useRef } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { hybridMarkdown, toggleHybridMode, setMode } from "codemirror-markdown-hybrid";
import { EditorView, keymap } from "@codemirror/view";
import { useEditorStore, type EditorViewRef } from "@/stores/editor-store";
import type { TabState } from "@/types/editor";

// ---------------------------------------------------------------------------
// Techtite theme override — match Catppuccin Mocha palette
// ---------------------------------------------------------------------------
const techtiteThemeOverride = EditorView.theme(
  {
    "&": {
      backgroundColor: "#1e1e2e",         // --color-editor-bg
      color: "#cdd6f4",                    // --color-text-primary
    },
    ".cm-content": {
      padding: "24px 48px",
      caretColor: "#89b4fa",               // --color-accent
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontSize: "14px",
      lineHeight: "1.7",
    },
    ".cm-cursor": {
      borderLeftColor: "#89b4fa",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "rgba(137, 180, 250, 0.2)",
    },
    ".cm-gutters": {
      backgroundColor: "#1e1e2e",
      color: "#6c7086",                    // --color-text-muted
      border: "none",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(205, 214, 244, 0.03)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(205, 214, 244, 0.03)",
    },
    // Heading overrides
    ".cm-header-1, .cm-line .cm-header-1": {
      fontSize: "1.6em",
      fontWeight: "700",
      color: "#89b4fa",
    },
    ".cm-header-2, .cm-line .cm-header-2": {
      fontSize: "1.35em",
      fontWeight: "600",
      color: "#89dceb",                    // --color-info (teal)
    },
    ".cm-header-3, .cm-line .cm-header-3": {
      fontSize: "1.15em",
      fontWeight: "600",
      color: "#a6e3a1",                    // --color-success (green)
    },
    // Code
    ".cm-line .cm-monospace, .cm-inline-code": {
      backgroundColor: "#313244",          // --color-bg-surface
      borderRadius: "3px",
      padding: "1px 4px",
      fontFamily: "'SF Mono', Monaco, Menlo, Consolas, monospace",
    },
    // Links
    ".cm-link, .cm-url": {
      color: "#89b4fa",
      textDecoration: "underline",
    },
  },
  { dark: true }
);

// ---------------------------------------------------------------------------
// Ctrl/Cmd+S save keymap
// ---------------------------------------------------------------------------
function makeSaveKeymap(filePath: string) {
  return keymap.of([
    {
      key: "Mod-s",
      run: () => {
        useEditorStore.getState().saveFile(filePath);
        return true;
      },
    },
  ]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MarkdownEditorProps {
  tab: TabState;
  initialContent: string;
}

export function MarkdownEditor({ tab, initialContent }: MarkdownEditorProps) {
  const cmRef = useRef<ReactCodeMirrorRef>(null);
  const { registerEditor, unregisterEditor, markDirty } = useEditorStore();

  // Register EditorViewRef for store integration
  useEffect(() => {
    const ref: EditorViewRef = {
      getContent: () =>
        cmRef.current?.view?.state.doc.toString() ?? "",
      setContent: (content: string) => {
        const view = cmRef.current?.view;
        if (view) {
          view.dispatch({
            changes: {
              from: 0,
              to: view.state.doc.length,
              insert: content,
            },
          });
        }
      },
    };

    registerEditor(tab.id, ref);
    return () => {
      unregisterEditor(tab.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.id]);

  const handleChange = useCallback(() => {
    markDirty(tab.filePath);
  }, [markDirty, tab.filePath]);

  const isSourceMode = tab.viewMode === "source";

  // Sync hybrid mode with view mode toggle
  useEffect(() => {
    const view = cmRef.current?.view;
    if (view) {
      setMode(view, isSourceMode ? "raw" : "hybrid");
    }
  }, [isSourceMode]);

  const handleToggleMode = useCallback(() => {
    const view = cmRef.current?.view;
    if (view) {
      toggleHybridMode(view);
      const newMode = isSourceMode ? "livePreview" : "source";
      useEditorStore.getState().setViewMode(tab.id, newMode);
    }
  }, [isSourceMode, tab.id]);

  return (
    <div className="flex flex-col h-full w-full">
      {/* View mode toggle */}
      <div className="flex items-center gap-2 px-4 py-1 text-xs border-b border-[var(--color-border-subtle,#313244)]">
        <span
          className={
            !isSourceMode
              ? "text-[var(--color-accent,#89b4fa)] font-semibold"
              : "text-[var(--color-text-muted,#6c7086)] cursor-pointer hover:text-[var(--color-text-primary,#cdd6f4)]"
          }
          onClick={() => {
            if (isSourceMode) handleToggleMode();
          }}
        >
          Live Preview
        </span>
        <span className="text-[var(--color-text-muted,#6c7086)]">/</span>
        <span
          className={
            isSourceMode
              ? "text-[var(--color-accent,#89b4fa)] font-semibold"
              : "text-[var(--color-text-muted,#6c7086)] cursor-pointer hover:text-[var(--color-text-primary,#cdd6f4)]"
          }
          onClick={() => {
            if (!isSourceMode) handleToggleMode();
          }}
        >
          Source
        </span>
      </div>

      {/* CodeMirror 6 editor with hybrid markdown */}
      <div className="flex-1 overflow-auto">
        <CodeMirror
          ref={cmRef}
          value={initialContent}
          height="100%"
          theme="dark"
          extensions={[
            hybridMarkdown({
              theme: "dark",
              enablePreview: !isSourceMode,
              enableKeymap: true,
              enableCollapse: true,
            }),
            techtiteThemeOverride,
            EditorView.lineWrapping,
            makeSaveKeymap(tab.filePath),
          ]}
          onChange={handleChange}
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            highlightActiveLine: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: false,
          }}
        />
      </div>
    </div>
  );
}
