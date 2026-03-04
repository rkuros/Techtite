import { useCallback, useEffect, useRef } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorView, keymap } from "@codemirror/view";
import { useEditorStore, type EditorViewRef } from "@/stores/editor-store";
import type { TabState } from "@/types/editor";

// ---------------------------------------------------------------------------
// Techtite dark theme for CodeMirror
// ---------------------------------------------------------------------------
const techtiteDarkTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--color-bg-primary, #1c1c1e)",
      color: "var(--color-text-primary, #e5e5ea)",
      fontSize: "14px",
      fontFamily:
        "var(--font-mono, 'SF Mono', Monaco, Menlo, Consolas, monospace)",
    },
    ".cm-content": {
      padding: "32px 60px",
      caretColor: "var(--color-accent, #8b7ef0)",
    },
    ".cm-cursor": {
      borderLeftColor: "var(--color-accent, #8b7ef0)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "rgba(139, 126, 240, 0.2)",
    },
    ".cm-gutters": {
      backgroundColor: "var(--color-bg-primary, #1c1c1e)",
      color: "var(--color-text-muted, #8e8e93)",
      border: "none",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(255, 255, 255, 0.03)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(255, 255, 255, 0.03)",
    },
    // Markdown heading styles
    ".cm-header-1": {
      fontSize: "1.6em",
      fontWeight: "700",
      color: "var(--color-accent, #8b7ef0)",
    },
    ".cm-header-2": {
      fontSize: "1.4em",
      fontWeight: "600",
      color: "var(--color-accent, #8b7ef0)",
    },
    ".cm-header-3": {
      fontSize: "1.2em",
      fontWeight: "600",
      color: "var(--color-accent, #8b7ef0)",
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

  return (
    <div className="flex flex-col h-full w-full">
      {/* View mode toggle */}
      <div className="flex items-center gap-2 px-4 py-1 text-xs border-b border-[var(--color-border-subtle,#2a2a2f)]">
        <span
          className={
            !isSourceMode
              ? "text-[var(--color-accent,#8b7ef0)] font-semibold"
              : "text-[var(--color-text-muted,#8e8e93)] cursor-pointer hover:text-[var(--color-text-primary,#e5e5ea)]"
          }
          onClick={() => {
            if (isSourceMode)
              useEditorStore.getState().setViewMode(tab.id, "livePreview");
          }}
        >
          Live Preview
        </span>
        <span className="text-[var(--color-text-muted,#8e8e93)]">/</span>
        <span
          className={
            isSourceMode
              ? "text-[var(--color-accent,#8b7ef0)] font-semibold"
              : "text-[var(--color-text-muted,#8e8e93)] cursor-pointer hover:text-[var(--color-text-primary,#e5e5ea)]"
          }
          onClick={() => {
            if (!isSourceMode)
              useEditorStore.getState().setViewMode(tab.id, "source");
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
          theme={techtiteDarkTheme}
          extensions={[
            markdown({
              base: markdownLanguage,
              codeLanguages: languages,
            }),
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
