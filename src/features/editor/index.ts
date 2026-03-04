/**
 * Unit 2: Markdown Editor — barrel export.
 *
 * Re-exports all public components and extensions for the editor feature.
 */

// Components
export { EditorContainer } from "./components/EditorContainer";
export { MarkdownEditor } from "./components/MarkdownEditor";
export { CodeViewer } from "./components/CodeViewer";
export { FrontmatterGUI } from "./components/FrontmatterGUI";

// CodeMirror 6 extension placeholders
export { livePreviewExtension } from "./extensions/live-preview";
export { internalLinkExtension } from "./extensions/internal-link";
export { tagHighlightExtension } from "./extensions/tag-highlight";
export { imagePreviewExtension } from "./extensions/image-preview";
