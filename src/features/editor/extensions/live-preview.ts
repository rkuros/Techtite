/**
 * Live Preview Extension — CodeMirror 6 ViewPlugin.
 *
 * Non-destructive live preview: cursor line shows raw source,
 * other lines render Markdown formatting visually.
 */

import {
  ViewPlugin,
  Decoration,
  type DecorationSet,
  EditorView,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

// ---------------------------------------------------------------------------
// Decoration marks (CSS classes applied via Decoration.mark)
// ---------------------------------------------------------------------------

const boldMark = Decoration.mark({ class: "cm-lp-bold" });
const italicMark = Decoration.mark({ class: "cm-lp-italic" });
const strikeMark = Decoration.mark({ class: "cm-lp-strike" });
const inlineCodeMark = Decoration.mark({ class: "cm-lp-code" });
const linkTextMark = Decoration.mark({ class: "cm-lp-link" });
const hiddenMark = Decoration.mark({ class: "cm-lp-hidden" });

// ---------------------------------------------------------------------------
// Widgets for block-level elements
// ---------------------------------------------------------------------------

class HrWidget extends WidgetType {
  toDOM() {
    const hr = document.createElement("hr");
    hr.className = "cm-lp-hr";
    return hr;
  }
}

class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean) {
    super();
  }
  toDOM() {
    const span = document.createElement("span");
    span.textContent = this.checked ? "\u2611" : "\u2610";
    span.className = "cm-lp-checkbox";
    return span;
  }
}

// ---------------------------------------------------------------------------
// Pattern matchers
// ---------------------------------------------------------------------------

interface InlineMatch {
  from: number;
  to: number;
  decoration: Decoration;
  syntaxFrom?: number;
  syntaxTo?: number;
  syntaxFrom2?: number;
  syntaxTo2?: number;
}

function findInlineMatches(line: { from: number; text: string }): InlineMatch[] {
  const matches: InlineMatch[] = [];
  const text = line.text;
  const base = line.from;

  // Bold: **text** or __text__
  for (const pattern of [/\*\*(.+?)\*\*/g, /__(.+?)__/g]) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      const contentStart = base + m.index + 2;
      const contentEnd = contentStart + m[1].length;
      matches.push({
        from: contentStart,
        to: contentEnd,
        decoration: boldMark,
        syntaxFrom: base + m.index,
        syntaxTo: contentStart,
        syntaxFrom2: contentEnd,
        syntaxTo2: contentEnd + 2,
      });
    }
  }

  // Strikethrough: ~~text~~
  {
    const re = /~~(.+?)~~/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const contentStart = base + m.index + 2;
      const contentEnd = contentStart + m[1].length;
      matches.push({
        from: contentStart,
        to: contentEnd,
        decoration: strikeMark,
        syntaxFrom: base + m.index,
        syntaxTo: contentStart,
        syntaxFrom2: contentEnd,
        syntaxTo2: contentEnd + 2,
      });
    }
  }

  // Inline code: `text`
  {
    const re = /`([^`]+)`/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const contentStart = base + m.index + 1;
      const contentEnd = contentStart + m[1].length;
      matches.push({
        from: contentStart,
        to: contentEnd,
        decoration: inlineCodeMark,
        syntaxFrom: base + m.index,
        syntaxTo: contentStart,
        syntaxFrom2: contentEnd,
        syntaxTo2: contentEnd + 1,
      });
    }
  }

  // Italic: *text* (single, not double)
  {
    const re = /(?<!\*)\*([^*]+)\*(?!\*)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const contentStart = base + m.index + 1;
      const contentEnd = contentStart + m[1].length;
      matches.push({
        from: contentStart,
        to: contentEnd,
        decoration: italicMark,
        syntaxFrom: base + m.index,
        syntaxTo: contentStart,
        syntaxFrom2: contentEnd,
        syntaxTo2: contentEnd + 1,
      });
    }
  }

  // Links: [text](url)
  {
    const re = /\[([^\]]+)\]\([^)]+\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const textStart = base + m.index + 1;
      const textEnd = textStart + m[1].length;
      const fullEnd = base + m.index + m[0].length;
      matches.push({
        from: textStart,
        to: textEnd,
        decoration: linkTextMark,
        syntaxFrom: base + m.index,
        syntaxTo: textStart,
        syntaxFrom2: textEnd,
        syntaxTo2: fullEnd,
      });
    }
  }

  return matches;
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

class LivePreviewPlugin {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.selectionSet || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view);
    }
  }

  buildDecorations(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();
    const doc = view.state.doc;
    const cursorLine = doc.lineAt(view.state.selection.main.head).number;
    const { from, to } = view.viewport;

    const decos: { from: number; to: number; deco: Decoration }[] = [];

    for (let pos = from; pos <= to; ) {
      const line = doc.lineAt(pos);

      // Skip cursor line — show raw source
      if (line.number === cursorLine) {
        pos = line.to + 1;
        continue;
      }

      const text = line.text;

      // Heading: hide # markers
      const headingMatch = text.match(/^(#{1,6})\s/);
      if (headingMatch) {
        decos.push({
          from: line.from,
          to: line.from + headingMatch[0].length,
          deco: hiddenMark,
        });
      }

      // Horizontal rule: ---, ***, ___
      if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(text)) {
        decos.push({
          from: line.from,
          to: line.to,
          deco: Decoration.replace({ widget: new HrWidget() }),
        });
        pos = line.to + 1;
        continue;
      }

      // Checkbox: - [ ] or - [x]
      const checkMatch = text.match(/^(\s*[-*+]\s)\[([ xX])\]/);
      if (checkMatch) {
        const checked = checkMatch[2].toLowerCase() === "x";
        const markerStart = line.from + checkMatch[1].length;
        const markerEnd = markerStart + 3;
        decos.push({
          from: markerStart,
          to: markerEnd,
          deco: Decoration.replace({ widget: new CheckboxWidget(checked) }),
        });
      }

      // Inline formatting
      const inlineMatches = findInlineMatches({ from: line.from, text });
      for (const m of inlineMatches) {
        decos.push({ from: m.from, to: m.to, deco: m.decoration });
        if (m.syntaxFrom !== undefined && m.syntaxTo !== undefined && m.syntaxFrom < m.syntaxTo) {
          decos.push({ from: m.syntaxFrom, to: m.syntaxTo, deco: hiddenMark });
        }
        if (m.syntaxFrom2 !== undefined && m.syntaxTo2 !== undefined && m.syntaxFrom2 < m.syntaxTo2) {
          decos.push({ from: m.syntaxFrom2, to: m.syntaxTo2, deco: hiddenMark });
        }
      }

      pos = line.to + 1;
    }

    // Sort by position (required by RangeSetBuilder)
    decos.sort((a, b) => a.from - b.from || a.to - b.to);

    // Remove overlapping decorations
    let lastTo = -1;
    for (const d of decos) {
      if (d.from >= lastTo) {
        builder.add(d.from, d.to, d.deco);
        lastTo = d.to;
      }
    }

    return builder.finish();
  }
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

const livePreviewTheme = EditorView.baseTheme({
  ".cm-lp-bold": { fontWeight: "700" },
  ".cm-lp-italic": { fontStyle: "italic" },
  ".cm-lp-strike": { textDecoration: "line-through", opacity: "0.6" },
  ".cm-lp-code": {
    fontFamily: "var(--font-mono, 'SF Mono', Monaco, monospace)",
    backgroundColor: "rgba(139, 126, 240, 0.12)",
    borderRadius: "3px",
    padding: "1px 4px",
    fontSize: "0.9em",
  },
  ".cm-lp-link": {
    color: "var(--color-accent, #8b7ef0)",
    textDecoration: "underline",
    cursor: "pointer",
  },
  ".cm-lp-hidden": { fontSize: "0", overflow: "hidden", display: "inline-block", width: "0" },
  ".cm-lp-hr": {
    border: "none",
    borderTop: "1px solid var(--color-border-subtle, #3a3a3f)",
    margin: "8px 0",
  },
  ".cm-lp-checkbox": {
    fontSize: "1.1em",
    marginRight: "4px",
  },
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export function livePreviewExtension() {
  return [
    ViewPlugin.fromClass(LivePreviewPlugin, {
      decorations: (v) => v.decorations,
    }),
    livePreviewTheme,
  ];
}
