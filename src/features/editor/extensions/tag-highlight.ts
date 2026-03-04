/**
 * Tag Highlight Extension — CodeMirror 6 ViewPlugin placeholder.
 *
 * Detects `#tagname` patterns in Markdown content and applies a pill-shaped
 * badge decoration using accent background color.
 *
 * TODO [Unit 4 dependency]: Tag navigation.
 * When Unit 4 (Knowledge Base) is implemented, clicking a tag will navigate
 * to the tag filter view via editor-store.setSidebarPanel("tags") and
 * set the active tag filter.
 *
 * Behaviour:
 * - `#tagname` is rendered as a pill-shaped badge with accent background.
 * - Tags at the start of a line or after whitespace are detected.
 * - Tags inside code blocks and inline code are NOT highlighted.
 * - Clicking a tag navigates to the tag page (Unit 4).
 *
 * Styling (from mockup):
 *   .md-tag {
 *     background: rgba(139, 126, 240, 0.15);
 *     color: var(--accent, #8b7ef0);
 *     padding: 1px 6px;
 *     border-radius: 9999px;
 *     font-size: 0.75rem;
 *   }
 *
 * Implementation sketch (requires @codemirror/view):
 *
 *   import { ViewPlugin, Decoration, EditorView, ViewUpdate, WidgetType } from "@codemirror/view";
 *
 *   // Match #tag but not inside code, URLs, headings
 *   const TAG_REGEX = /(?<=^|\s)#([a-zA-Z][\w-/]*)/g;
 *
 *   class TagWidget extends WidgetType {
 *     constructor(readonly tag: string) { super(); }
 *
 *     toDOM() {
 *       const span = document.createElement("span");
 *       span.className = "md-tag";
 *       span.textContent = `#${this.tag}`;
 *       span.setAttribute("data-tag", this.tag);
 *       return span;
 *     }
 *   }
 *
 *   class TagHighlightPlugin {
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
 *         TAG_REGEX.lastIndex = 0;
 *         let match;
 *
 *         while ((match = TAG_REGEX.exec(line.text)) !== null) {
 *           const start = line.from + match.index;
 *           const end = start + match[0].length;
 *           const deco = Decoration.replace({
 *             widget: new TagWidget(match[1]),
 *           });
 *           builder.add(start, end, deco);
 *         }
 *         pos = line.to + 1;
 *       }
 *
 *       return builder.finish();
 *     }
 *   }
 *
 *   // Click handler for tag navigation
 *   const tagClickHandler = EditorView.domEventHandlers({
 *     click(event, _view) {
 *       const target = (event.target as HTMLElement).closest(".md-tag");
 *       if (target) {
 *         const tag = target.getAttribute("data-tag");
 *         if (tag) {
 *           // TODO [Unit 4]: Navigate to tag filter view
 *           useEditorStore.getState().setSidebarPanel("tags");
 *         }
 *       }
 *     },
 *   });
 *
 *   export function tagHighlightExtension() {
 *     return [
 *       ViewPlugin.fromClass(TagHighlightPlugin, {
 *         decorations: (v) => v.decorations,
 *       }),
 *       tagClickHandler,
 *     ];
 *   }
 */

// Placeholder export — returns a no-op until CodeMirror is integrated.
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function tagHighlightExtension(): unknown {
  // TODO: Implement with @codemirror/view ViewPlugin when packages are installed.
  // TODO [Unit 4]: Integrate with tag navigation and knowledge-store.
  return null;
}
