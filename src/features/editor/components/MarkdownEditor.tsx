import { useCallback, useEffect, useRef } from "react";
import { useEditorStore, type EditorViewRef } from "@/stores/editor-store";
import type { TabState } from "@/types/editor";

// ---------------------------------------------------------------------------
// NOTE: This is a textarea-based placeholder for the CodeMirror 6 editor.
//
// When @uiw/react-codemirror and @codemirror/* packages are installed, replace
// the <textarea> with:
//
//   import CodeMirror from "@uiw/react-codemirror";
//   import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
//   import { languages } from "@codemirror/language-data";
//   import { EditorView } from "@codemirror/view";
//   import { livePreviewExtension } from "../extensions/live-preview";
//   import { internalLinkExtension } from "../extensions/internal-link";
//   import { tagHighlightExtension } from "../extensions/tag-highlight";
//   import { imagePreviewExtension } from "../extensions/image-preview";
//
// And wire the extensions into the CodeMirror <CodeMirror extensions={[...]} />
// ---------------------------------------------------------------------------

interface MarkdownEditorProps {
  /** The tab state (from editor-store) that this editor belongs to. */
  tab: TabState;
  /** Initial file content loaded from disk. */
  initialContent: string;
}

/**
 * MarkdownEditor — CodeMirror 6 based Live Preview editor (textarea placeholder).
 *
 * Responsibilities:
 * - Display and edit Markdown content.
 * - Register an EditorViewRef so the store can read/write content.
 * - Mark the file dirty on edits.
 * - Support view mode switching (livePreview / source — both behave the same in placeholder).
 * - Keyboard shortcut: Ctrl/Cmd+S to save.
 */
export function MarkdownEditor({ tab, initialContent }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    registerEditor,
    unregisterEditor,
    markDirty,
    saveFile,
  } = useEditorStore();

  // -------------------------------------------------------------------------
  // Register this editor instance with the store so save/reload can interact.
  // -------------------------------------------------------------------------
  useEffect(() => {
    const ref: EditorViewRef = {
      getContent: () => textareaRef.current?.value ?? "",
      setContent: (content: string) => {
        if (textareaRef.current) {
          textareaRef.current.value = content;
        }
      },
    };

    registerEditor(tab.id, ref);
    return () => {
      unregisterEditor(tab.id);
    };
    // Only run on mount/unmount for this tab
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.id]);

  // -------------------------------------------------------------------------
  // Set initial content when the editor mounts
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.value = initialContent;
    }
  }, [initialContent]);

  // -------------------------------------------------------------------------
  // Mark dirty on change
  // -------------------------------------------------------------------------
  const handleChange = useCallback(() => {
    markDirty(tab.filePath);
  }, [markDirty, tab.filePath]);

  // -------------------------------------------------------------------------
  // Keyboard shortcut: Ctrl/Cmd+S to save
  // -------------------------------------------------------------------------
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveFile(tab.filePath);
      }
    },
    [saveFile, tab.filePath]
  );

  // Determine if we are in source mode (show raw) or livePreview
  const isSourceMode = tab.viewMode === "source";

  return (
    <div className="flex flex-col h-full w-full">
      {/* View mode indicator */}
      <div className="flex items-center gap-2 px-4 py-1 text-xs border-b border-[var(--border,#2a2a2f)]">
        <span
          className={`${
            !isSourceMode
              ? "text-[var(--accent,#8b7ef0)] font-semibold"
              : "text-[var(--text-muted,#8e8e93)] cursor-pointer hover:text-[var(--text,#e5e5ea)]"
          }`}
          onClick={() => {
            if (isSourceMode) {
              useEditorStore.getState().setViewMode(tab.id, "livePreview");
            }
          }}
        >
          Live Preview
        </span>
        <span className="text-[var(--text-muted,#8e8e93)]">/</span>
        <span
          className={`${
            isSourceMode
              ? "text-[var(--accent,#8b7ef0)] font-semibold"
              : "text-[var(--text-muted,#8e8e93)] cursor-pointer hover:text-[var(--text,#e5e5ea)]"
          }`}
          onClick={() => {
            if (!isSourceMode) {
              useEditorStore.getState().setViewMode(tab.id, "source");
            }
          }}
        >
          Source
        </span>
      </div>

      {/*
        Placeholder textarea. When CodeMirror 6 is integrated, replace this
        entire <textarea> block with:

          <CodeMirror
            value={initialContent}
            height="100%"
            theme={techtiteTheme}
            extensions={[
              markdown({ base: markdownLanguage, codeLanguages: languages }),
              livePreviewExtension(),
              internalLinkExtension(),
              tagHighlightExtension(),
              imagePreviewExtension(),
            ]}
            onChange={(value) => { markDirty(tab.filePath); }}
            onCreateEditor={(view) => {
              registerEditor(tab.id, {
                getContent: () => view.state.doc.toString(),
                setContent: (c) => {
                  view.dispatch({
                    changes: { from: 0, to: view.state.doc.length, insert: c },
                  });
                },
              });
            }}
          />
      */}
      <textarea
        ref={textareaRef}
        className="flex-1 w-full resize-none outline-none bg-[var(--bg-base,#1c1c1e)] text-[var(--text,#e5e5ea)] font-[var(--mono,'SF_Mono',Monaco,Menlo,Consolas,monospace)] text-sm leading-relaxed"
        style={{ padding: "32px 60px" }}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        placeholder="Start writing..."
      />
    </div>
  );
}
