declare module "codemirror-markdown-hybrid" {
  import type { Extension } from "@codemirror/state";
  import type { EditorView } from "@codemirror/view";

  interface HybridMarkdownOptions {
    theme?: "light" | "dark";
    enablePreview?: boolean;
    enableKeymap?: boolean;
    enableCollapse?: boolean;
  }

  export function hybridMarkdown(options?: HybridMarkdownOptions): Extension;
  export function toggleTheme(view: EditorView): void;
  export function setTheme(view: EditorView, theme: "light" | "dark"): void;
  export function toggleHybridMode(view: EditorView): void;
  export function setMode(view: EditorView, mode: "hybrid" | "raw"): void;

  interface MarkdownActions {
    bold: (view: EditorView) => void;
    italic: (view: EditorView) => void;
    strikethrough: (view: EditorView) => void;
    h1: (view: EditorView) => void;
    h2: (view: EditorView) => void;
    h3: (view: EditorView) => void;
    link: (view: EditorView) => void;
    image: (view: EditorView) => void;
    bulletList: (view: EditorView) => void;
    numberedList: (view: EditorView) => void;
    taskList: (view: EditorView) => void;
    inlineCode: (view: EditorView) => void;
    codeBlock: (view: EditorView) => void;
    hr: (view: EditorView) => void;
    quote: (view: EditorView) => void;
    table: (view: EditorView) => void;
  }

  export const actions: MarkdownActions;
}
