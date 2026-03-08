/**
 * Blockquote border extension — adds a CSS class to lines starting with `>`
 * so we can apply a continuous left border via CSS line decorations.
 */

import {
  ViewPlugin,
  Decoration,
  type DecorationSet,
  EditorView,
  type ViewUpdate,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

const blockquoteLineDeco = Decoration.line({ class: "cm-blockquote-line" });

class BlockquoteBorderPlugin {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.build(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.build(update.view);
    }
  }

  build(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();
    const { from, to } = view.viewport;

    for (let pos = from; pos <= to; ) {
      const line = view.state.doc.lineAt(pos);
      const trimmed = line.text.trimStart();
      if (trimmed.startsWith(">")) {
        builder.add(line.from, line.from, blockquoteLineDeco);
      }
      pos = line.to + 1;
    }

    return builder.finish();
  }
}

const blockquoteBorderTheme = EditorView.baseTheme({
  ".cm-blockquote-line": {
    background: "linear-gradient(to right, #89b4fa 3px, rgba(137, 180, 250, 0.04) 3px)",
    paddingLeft: "16px !important",
  },
});

export function blockquoteBorderExtension() {
  return [
    ViewPlugin.fromClass(BlockquoteBorderPlugin, {
      decorations: (v) => v.decorations,
    }),
    blockquoteBorderTheme,
  ];
}
