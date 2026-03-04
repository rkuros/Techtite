import { useCallback, useEffect, useRef } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { hybridMarkdown, toggleHybridMode, setMode } from "codemirror-markdown-hybrid";
import { EditorView, keymap } from "@codemirror/view";
import { useEditorStore, type EditorViewRef } from "@/stores/editor-store";
import type { TabState } from "@/types/editor";

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
      <div className="flex items-center gap-2 px-4 py-1 text-xs border-b border-[var(--color-border-subtle,#2a2a2f)]">
        <span
          className={
            !isSourceMode
              ? "text-[var(--color-accent,#8b7ef0)] font-semibold"
              : "text-[var(--color-text-muted,#8e8e93)] cursor-pointer hover:text-[var(--color-text-primary,#e5e5ea)]"
          }
          onClick={() => {
            if (isSourceMode) handleToggleMode();
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
          extensions={[
            hybridMarkdown({
              theme: "dark",
              enablePreview: !isSourceMode,
              enableKeymap: true,
              enableCollapse: true,
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
