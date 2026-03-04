import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { languages } from "@codemirror/language-data";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { useEditorStore, type EditorViewRef } from "@/stores/editor-store";
import type { TabState } from "@/types/editor";

// ---------------------------------------------------------------------------
// Techtite dark theme (shared with MarkdownEditor)
// ---------------------------------------------------------------------------
const techtiteDarkTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--color-bg-primary, #1c1c1e)",
      color: "var(--color-text-primary, #e5e5ea)",
      fontSize: "13px",
      fontFamily:
        "var(--font-mono, 'SF Mono', Monaco, Menlo, Consolas, monospace)",
    },
    ".cm-content": {
      padding: "8px 16px",
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
      paddingRight: "8px",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(255, 255, 255, 0.03)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(255, 255, 255, 0.03)",
    },
  },
  { dark: true }
);

// ---------------------------------------------------------------------------
// Language extension resolver
// ---------------------------------------------------------------------------
function getLanguageDescription(lang: string) {
  const lower = lang.toLowerCase();
  return languages.find(
    (l) =>
      l.name.toLowerCase() === lower ||
      l.alias.some((a) => a.toLowerCase() === lower) ||
      l.extensions.some((e) => e === `.${lower}`)
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CodeViewerProps {
  tab: TabState;
  initialContent: string;
  language: string;
}

export function CodeViewer({ tab, initialContent, language }: CodeViewerProps) {
  const cmRef = useRef<ReactCodeMirrorRef>(null);
  const [isEditable, setIsEditable] = useState(false);
  const { registerEditor, unregisterEditor, markDirty } =
    useEditorStore();

  // Build extensions (including language support)
  const extensions = useMemo(() => {
    const exts: import("@codemirror/state").Extension[] = [
      EditorView.lineWrapping,
      keymap.of([
        {
          key: "Mod-s",
          run: () => {
            if (isEditable) useEditorStore.getState().saveFile(tab.filePath);
            return true;
          },
        },
      ]),
    ];
    if (!isEditable) {
      exts.push(EditorState.readOnly.of(true));
    }
    // Add language support if available
    const desc = getLanguageDescription(language);
    if (desc?.support) {
      exts.push(desc.support);
    }
    return exts;
  }, [isEditable, tab.filePath, language]);

  // Register EditorViewRef
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
    return () => {
      unregisterEditor(tab.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.id]);

  const handleChange = useCallback(() => {
    if (isEditable) markDirty(tab.filePath);
  }, [isEditable, markDirty, tab.filePath]);

  const toggleEditMode = useCallback(() => {
    const willEdit = !isEditable;
    setIsEditable(willEdit);
    useEditorStore
      .getState()
      .setViewMode(tab.id, willEdit ? "source" : "readOnly");
  }, [isEditable, tab.id]);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-1 text-xs border-b border-[var(--color-border-subtle,#2a2a2f)]">
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-accent,#8b7ef0)] font-semibold uppercase tracking-wider">
            {language}
          </span>
        </div>
        <button
          onClick={toggleEditMode}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[var(--color-text-muted,#8e8e93)] hover:text-[var(--color-text-primary,#e5e5ea)] hover:bg-[var(--color-bg-surface,#252528)] transition-colors"
          title={isEditable ? "Lock (read-only)" : "Unlock (edit)"}
        >
          <span className="text-base">{isEditable ? "\u{1F513}" : "\u{1F512}"}</span>
          <span>{isEditable ? "Editing" : "Read Only"}</span>
        </button>
      </div>

      {/* CodeMirror 6 code viewer */}
      <div className="flex-1 overflow-auto">
        <CodeMirror
          ref={cmRef}
          value={initialContent}
          height="100%"
          theme={techtiteDarkTheme}
          extensions={extensions}
          onChange={handleChange}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            bracketMatching: true,
            closeBrackets: isEditable,
            autocompletion: false,
          }}
        />
      </div>
    </div>
  );
}
