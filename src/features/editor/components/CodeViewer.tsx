import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore, type EditorViewRef } from "@/stores/editor-store";
import type { TabState } from "@/types/editor";

// ---------------------------------------------------------------------------
// NOTE: This is a textarea-based placeholder for the CodeMirror 6 read-only
// code viewer.
//
// When @uiw/react-codemirror and language packages are installed, replace with:
//
//   import CodeMirror from "@uiw/react-codemirror";
//   import { EditorView } from "@codemirror/view";
//   import { EditorState } from "@codemirror/state";
//
// And dynamically load language extensions based on `language` prop:
//   import { javascript } from "@codemirror/lang-javascript";
//   import { python } from "@codemirror/lang-python";
//   import { rust } from "@codemirror/lang-rust";
//   ... etc.
//
// Use EditorState.readOnly.of(true) for read-only mode, and remove it when
// the user toggles to edit mode.
// ---------------------------------------------------------------------------

interface CodeViewerProps {
  /** The tab state for this viewer. */
  tab: TabState;
  /** The initial file content loaded from disk. */
  initialContent: string;
  /** The programming language identifier (e.g. "typescript", "python"). */
  language: string;
}

/**
 * CodeViewer — Read-only code file viewer with syntax highlighting placeholder.
 *
 * Responsibilities:
 * - Display code files with line numbers (placeholder: pre-formatted textarea).
 * - Default to read-only mode with a lock indicator.
 * - Toggle to edit mode on user request.
 * - When in edit mode, allow saving with Ctrl/Cmd+S.
 *
 * US-2.6: Code file viewing with syntax highlighting, line numbers, read-only default.
 */
export function CodeViewer({ tab, initialContent, language }: CodeViewerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEditable, setIsEditable] = useState(false);
  const {
    registerEditor,
    unregisterEditor,
    markDirty,
    saveFile,
  } = useEditorStore();

  // -------------------------------------------------------------------------
  // Line numbers (computed from content)
  // -------------------------------------------------------------------------
  const [lineCount, setLineCount] = useState(1);

  useEffect(() => {
    setLineCount(initialContent.split("\n").length);
  }, [initialContent]);

  // -------------------------------------------------------------------------
  // Register editor instance with the store
  // -------------------------------------------------------------------------
  useEffect(() => {
    const ref: EditorViewRef = {
      getContent: () => textareaRef.current?.value ?? "",
      setContent: (content: string) => {
        if (textareaRef.current) {
          textareaRef.current.value = content;
          setLineCount(content.split("\n").length);
        }
      },
    };

    registerEditor(tab.id, ref);
    return () => {
      unregisterEditor(tab.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.id]);

  // -------------------------------------------------------------------------
  // Set initial content
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.value = initialContent;
    }
  }, [initialContent]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleChange = useCallback(() => {
    if (!isEditable) return;
    markDirty(tab.filePath);
    if (textareaRef.current) {
      setLineCount(textareaRef.current.value.split("\n").length);
    }
  }, [isEditable, markDirty, tab.filePath]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveFile(tab.filePath);
      }
    },
    [saveFile, tab.filePath]
  );

  const toggleEditMode = useCallback(() => {
    const willEdit = !isEditable;
    setIsEditable(willEdit);
    if (willEdit) {
      useEditorStore.getState().setViewMode(tab.id, "source");
    } else {
      useEditorStore.getState().setViewMode(tab.id, "readOnly");
    }
  }, [isEditable, tab.id]);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Toolbar: language label + lock/unlock toggle */}
      <div className="flex items-center justify-between px-4 py-1 text-xs border-b border-[var(--border,#2a2a2f)]">
        <div className="flex items-center gap-2">
          <span className="text-[var(--accent,#8b7ef0)] font-semibold uppercase tracking-wider">
            {language}
          </span>
          <span className="text-[var(--text-muted,#8e8e93)]">
            {lineCount} lines
          </span>
        </div>
        <button
          onClick={toggleEditMode}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[var(--text-muted,#8e8e93)] hover:text-[var(--text,#e5e5ea)] hover:bg-[var(--bg-sidebar,#252528)] transition-colors"
          title={isEditable ? "Lock (read-only)" : "Unlock (edit)"}
        >
          {/* Lock/Unlock icon (text-based placeholder) */}
          <span className="text-base">{isEditable ? "\u{1F513}" : "\u{1F512}"}</span>
          <span>{isEditable ? "Editing" : "Read Only"}</span>
        </button>
      </div>

      {/* Code content area with line numbers */}
      <div className="flex flex-1 overflow-auto bg-[var(--bg-base,#1c1c1e)]">
        {/* Line numbers gutter */}
        <div
          className="flex-shrink-0 text-right pr-3 pl-3 pt-2 select-none text-[var(--text-muted,#8e8e93)] font-[var(--mono,'SF_Mono',Monaco,Menlo,Consolas,monospace)] text-xs leading-[1.6]"
          style={{ minWidth: "3rem" }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1}>{i + 1}</div>
          ))}
        </div>

        {/*
          Placeholder textarea. When CodeMirror 6 is integrated, replace with:

            <CodeMirror
              value={initialContent}
              height="100%"
              theme={techtiteTheme}
              readOnly={!isEditable}
              extensions={[
                getLanguageExtension(language),
                EditorView.lineWrapping,
              ]}
              onChange={(value) => {
                if (isEditable) markDirty(tab.filePath);
              }}
            />
        */}
        <textarea
          ref={textareaRef}
          className="flex-1 resize-none outline-none bg-transparent text-[var(--text,#e5e5ea)] font-[var(--mono,'SF_Mono',Monaco,Menlo,Consolas,monospace)] text-xs leading-[1.6] pt-2 pr-4"
          readOnly={!isEditable}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          style={{
            caretColor: isEditable
              ? "var(--accent, #8b7ef0)"
              : "transparent",
          }}
        />
      </div>
    </div>
  );
}
