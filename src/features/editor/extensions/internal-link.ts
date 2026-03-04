/**
 * Internal Link Extension — CodeMirror 6 ViewPlugin placeholder.
 *
 * Detects `[[target]]` and `[[target|display]]` patterns in Markdown
 * and applies Decoration.mark with link styling.
 *
 * TODO [Unit 4 dependency]: Link existence verification.
 * When Unit 4 (Knowledge Base) is implemented, this extension will call:
 *   invokeCommand("get_outgoing_links", { path: currentFilePath })
 * to determine if a link target exists. Non-existent links get the `.dead`
 * CSS class (semi-transparent accent color).
 *
 * Behaviour:
 * - `[[note-name]]` is styled with accent color (#8b7ef0).
 * - `[[note-name|Display Text]]` renders as "Display Text" with link styling.
 * - Click navigates to the target file via editor-store.openTab().
 * - Non-existent links are styled with `.dead` class (semi-transparent).
 *
 * Implementation sketch (requires @codemirror/view):
 *
 *   import { ViewPlugin, Decoration, EditorView, ViewUpdate } from "@codemirror/view";
 *
 *   const LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
 *
 *   class InternalLinkPlugin {
 *     decorations: DecorationSet;
 *
 *     constructor(view: EditorView) {
 *       this.decorations = this.buildDecorations(view);
 *     }
 *
 *     update(update: ViewUpdate) {
 *       if (update.docChanged || update.viewportChanged) {
 *         this.decorations = this.buildDecorations(update.view);
 *       }
 *     }
 *
 *     buildDecorations(view: EditorView) {
 *       const builder = new RangeSetBuilder<Decoration>();
 *       const { from, to } = view.viewport;
 *
 *       for (let pos = from; pos <= to; ) {
 *         const line = view.state.doc.lineAt(pos);
 *         let match: RegExpExecArray | null;
 *         LINK_REGEX.lastIndex = 0;
 *
 *         while ((match = LINK_REGEX.exec(line.text)) !== null) {
 *           const start = line.from + match.index;
 *           const end = start + match[0].length;
 *           // TODO [Unit 4]: Check link existence to apply .dead class
 *           const linkDeco = Decoration.mark({
 *             class: "md-internal-link",
 *             attributes: { "data-target": match[1] },
 *           });
 *           builder.add(start, end, linkDeco);
 *         }
 *         pos = line.to + 1;
 *       }
 *
 *       return builder.finish();
 *     }
 *   }
 *
 *   // Click handler to navigate
 *   const linkClickHandler = EditorView.domEventHandlers({
 *     click(event, view) {
 *       const target = (event.target as HTMLElement).closest(".md-internal-link");
 *       if (target) {
 *         const linkTarget = target.getAttribute("data-target");
 *         if (linkTarget) {
 *           // Use editor-store to open the linked file
 *           useEditorStore.getState().openTab(linkTarget + ".md");
 *         }
 *       }
 *     },
 *   });
 *
 *   export function internalLinkExtension() {
 *     return [
 *       ViewPlugin.fromClass(InternalLinkPlugin, {
 *         decorations: (v) => v.decorations,
 *       }),
 *       linkClickHandler,
 *     ];
 *   }
 */

// Placeholder export — returns a no-op until CodeMirror is integrated.
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function internalLinkExtension(): unknown {
  // TODO: Implement with @codemirror/view ViewPlugin when packages are installed.
  // TODO [Unit 4]: Integrate with knowledge:get_outgoing_links for link existence check.
  return null;
}
