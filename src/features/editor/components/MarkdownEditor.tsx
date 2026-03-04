import React, { useCallback, useEffect, useMemo, useRef } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { hybridMarkdown, setMode } from "codemirror-markdown-hybrid";
import { EditorView, keymap } from "@codemirror/view";
import { useEditorStore, type EditorViewRef } from "@/stores/editor-store";
import type { TabState } from "@/types/editor";
import { blockquoteBorderExtension } from "../extensions/blockquote-border";

// ---------------------------------------------------------------------------
// Module-level constants (created once, stable references)
// ---------------------------------------------------------------------------
const techtiteThemeOverride = EditorView.theme(
  {
    "&": { backgroundColor: "#1e1e2e", color: "#cdd6f4" },
    ".cm-content": {
      padding: "24px 48px", caretColor: "#89b4fa",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontSize: "14px", lineHeight: "1.7",
    },
    ".cm-cursor": { borderLeftColor: "#89b4fa" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "rgba(137, 180, 250, 0.2)",
    },
    ".cm-gutters": { backgroundColor: "#1e1e2e", color: "#6c7086", border: "none" },
    ".cm-activeLine": { backgroundColor: "rgba(205, 214, 244, 0.03)" },
    ".cm-activeLineGutter": { backgroundColor: "rgba(205, 214, 244, 0.03)" },
    ".cm-header-1, .cm-line .cm-header-1": { fontSize: "1.6em", fontWeight: "700", color: "#89b4fa" },
    ".cm-header-2, .cm-line .cm-header-2": { fontSize: "1.35em", fontWeight: "600", color: "#89dceb" },
    ".cm-header-3, .cm-line .cm-header-3": { fontSize: "1.15em", fontWeight: "600", color: "#a6e3a1" },
    ".cm-line .cm-monospace, .cm-inline-code": {
      backgroundColor: "#313244", borderRadius: "3px", padding: "1px 4px",
      fontFamily: "'SF Mono', Monaco, Menlo, Consolas, monospace",
    },
    ".cm-link, .cm-url": { color: "#89b4fa", textDecoration: "underline" },
  },
  { dark: true }
);

const staticBlockquoteExt = blockquoteBorderExtension();
const staticLineWrapping = EditorView.lineWrapping;

// Fix A: basicSetup at module level (stable reference, no re-render trigger)
const staticBasicSetup = {
  lineNumbers: false,
  foldGutter: false,
  highlightActiveLine: true,
  bracketMatching: true,
  closeBrackets: true,
  autocompletion: false,
};

// ---------------------------------------------------------------------------
// Component (wrapped in React.memo — Fix C)
// ---------------------------------------------------------------------------

interface MarkdownEditorProps {
  tab: TabState;
  initialContent: string;
}

export const MarkdownEditor = React.memo(
  function MarkdownEditor({ tab, initialContent }: MarkdownEditorProps) {
    const cmRef = useRef<ReactCodeMirrorRef>(null);
    const registerEditor = useEditorStore((s) => s.registerEditor);
    const unregisterEditor = useEditorStore((s) => s.unregisterEditor);
    const markDirty = useEditorStore((s) => s.markDirty);


    // Memoize extensions — only recreate when filePath changes
    const extensions = useMemo(() => [
      hybridMarkdown({
        theme: "dark",
        enablePreview: true,
        enableKeymap: true,
        enableCollapse: true,
      }),
      techtiteThemeOverride,
      staticBlockquoteExt,
      staticLineWrapping,
      keymap.of([{
        key: "Mod-s",
        run: () => {
          useEditorStore.getState().saveFile(tab.filePath);
          return true;
        },
      }]),
    ], [tab.filePath]);

    // Register EditorViewRef for store integration
    useEffect(() => {
      const ref: EditorViewRef = {
        getContent: () => cmRef.current?.view?.state.doc.toString() ?? "",
        setContent: (content: string) => {
          const view = cmRef.current?.view;
          if (view) {
            view.dispatch({
              changes: { from: 0, to: view.state.doc.length, insert: content },
            });
          }
        },
      };
      registerEditor(tab.id, ref);
      return () => { unregisterEditor(tab.id); };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab.id]);

    const handleChange = useCallback(() => {
      markDirty(tab.filePath);
    }, [markDirty, tab.filePath]);

    // Sync mode via imperative API (no re-render needed)
    const isSourceMode = tab.viewMode === "source";
    useEffect(() => {
      const view = cmRef.current?.view;
      if (view) {
        setMode(view, isSourceMode ? "raw" : "hybrid");
      }
    }, [isSourceMode]);

    return (
      <div className="flex flex-col h-full w-full">
        {/* View mode toggle */}
        <div className="flex items-center gap-2 px-4 py-1 text-xs border-b border-[var(--color-border-subtle,#313244)]">
          <span
            className={!isSourceMode
              ? "text-[var(--color-accent,#89b4fa)] font-semibold"
              : "text-[var(--color-text-muted,#6c7086)] cursor-pointer hover:text-[var(--color-text-primary,#cdd6f4)]"}
            onClick={() => {
              if (isSourceMode) {
                const view = cmRef.current?.view;
                if (view) setMode(view, "hybrid");
                useEditorStore.getState().setViewMode(tab.id, "livePreview");
              }
            }}
          >
            Live Preview
          </span>
          <span className="text-[var(--color-text-muted,#6c7086)]">/</span>
          <span
            className={isSourceMode
              ? "text-[var(--color-accent,#89b4fa)] font-semibold"
              : "text-[var(--color-text-muted,#6c7086)] cursor-pointer hover:text-[var(--color-text-primary,#cdd6f4)]"}
            onClick={() => {
              if (!isSourceMode) {
                const view = cmRef.current?.view;
                if (view) setMode(view, "raw");
                useEditorStore.getState().setViewMode(tab.id, "source");
              }
            }}
          >
            Source
          </span>
        </div>

        {/* CodeMirror 6 editor */}
        <div className="flex-1 overflow-auto">
          <CodeMirror
            ref={cmRef}
            value={initialContent}
            height="100%"
            theme="dark"
            extensions={extensions}
            onChange={handleChange}
            basicSetup={staticBasicSetup}
          />
        </div>
      </div>
    );
  },
  // Custom comparator: only re-render when these actually change
  (prev, next) =>
    prev.tab.id === next.tab.id &&
    prev.tab.filePath === next.tab.filePath &&
    prev.tab.viewMode === next.tab.viewMode &&
    prev.initialContent === next.initialContent
);
