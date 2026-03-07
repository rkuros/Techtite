import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { languages } from "@codemirror/language-data";
import { EditorView, keymap } from "@codemirror/view";
import { useEditorStore, type EditorViewRef } from "@/stores/editor-store";
import type { TabState } from "@/types/editor";

// ---------------------------------------------------------------------------
// Theme (module-level, created once)
// ---------------------------------------------------------------------------
const lineWrapping = EditorView.lineWrapping;

// basicSetup configs (stable references)
const basicSetupReadOnly = {
  lineNumbers: true,
  foldGutter: true,
  highlightActiveLine: true,
  bracketMatching: true,
  closeBrackets: false,
  autocompletion: false,
};
const basicSetupEditable = {
  lineNumbers: true,
  foldGutter: true,
  highlightActiveLine: true,
  bracketMatching: true,
  closeBrackets: true,
  autocompletion: false,
};

// ---------------------------------------------------------------------------
// Language resolver
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
  const registerEditor = useEditorStore((s) => s.registerEditor);
  const unregisterEditor = useEditorStore((s) => s.unregisterEditor);
  const markDirty = useEditorStore((s) => s.markDirty);
  const editorFontSize = useEditorStore((s) => s.editorFontSize);

  // Extensions — only depend on filePath and language (NOT isEditable)
  // Read-only is toggled imperatively via EditorView.dispatch
  const extensions = useMemo(() => {
    const exts: import("@codemirror/state").Extension[] = [
      lineWrapping,
      keymap.of([{
        key: "Mod-s",
        run: () => {
          useEditorStore.getState().saveFile(tab.filePath);
          return true;
        },
      }]),
    ];
    const desc = getLanguageDescription(language);
    if (desc?.support) {
      exts.push(desc.support);
    }
    return exts;
  }, [tab.filePath, language]);

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
    return () => { unregisterEditor(tab.id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.id]);

  const handleChange = useCallback(() => {
    if (isEditable) markDirty(tab.filePath);
  }, [isEditable, markDirty, tab.filePath]);

  const toggleEditMode = useCallback(() => {
    const willEdit = !isEditable;
    setIsEditable(willEdit);
    useEditorStore.getState().setViewMode(tab.id, willEdit ? "source" : "readOnly");
    // Toggle readOnly imperatively
    const view = cmRef.current?.view;
    if (view) {
      view.dispatch({
        effects: view.state.readOnly !== willEdit ? [] : [],
      });
    }
  }, [isEditable, tab.id]);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-1 text-xs border-b border-[var(--color-border-subtle,#313244)]">
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-accent,#89b4fa)] font-semibold uppercase tracking-wider">
            {language}
          </span>
        </div>
        <button
          onClick={toggleEditMode}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[var(--color-text-muted,#6c7086)] hover:text-[var(--color-text-primary,#cdd6f4)] hover:bg-[var(--color-bg-surface,#313244)] transition-colors"
          title={isEditable ? "Lock (read-only)" : "Unlock (edit)"}
        >
          <span className="text-base">{isEditable ? "\u{1F513}" : "\u{1F512}"}</span>
          <span>{isEditable ? "Editing" : "Read Only"}</span>
        </button>
      </div>

      {/* CodeMirror 6 code viewer */}
      <div className="flex-1 overflow-auto" style={{ fontSize: `${editorFontSize}px` }}>
        <CodeMirror
          ref={cmRef}
          value={initialContent}
          height="100%"
          theme="dark"
          editable={isEditable}
          readOnly={!isEditable}
          extensions={extensions}
          onChange={handleChange}
          basicSetup={isEditable ? basicSetupEditable : basicSetupReadOnly}
        />
      </div>
    </div>
  );
}
