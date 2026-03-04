import { useGitStore } from "@/stores/git-store";
import type { DiffHunk, DiffLine } from "@/types/git";

/**
 * Diff display component.
 *
 * Renders diff hunks with color-coded lines:
 * - Addition lines in green (.diff-add)
 * - Deletion lines in red (.diff-del)
 * - Context lines in default color
 *
 * Displayed in the center editor area when a file is selected in GitPanel.
 */
export function DiffView() {
  const currentDiff = useGitStore((s) => s.currentDiff);
  const selectedDiffPath = useGitStore((s) => s.selectedDiffPath);

  if (currentDiff.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full text-xs"
        style={{ color: "var(--color-text-muted)" }}
      >
        {selectedDiffPath
          ? "No changes detected"
          : "Select a file to view its diff"}
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-auto font-mono text-xs"
      style={{
        backgroundColor: "var(--color-editor-bg, var(--color-bg-primary))",
      }}
    >
      {currentDiff.map((hunk, hunkIndex) => (
        <DiffHunkView key={hunkIndex} hunk={hunk} />
      ))}
    </div>
  );
}

function DiffHunkView({ hunk }: { hunk: DiffHunk }) {
  return (
    <div className="mb-2">
      {/* File header */}
      <div
        className="px-3 py-1 sticky top-0 z-10 text-xs font-semibold"
        style={{
          backgroundColor: "var(--color-bg-surface)",
          borderBottom: "1px solid var(--color-border-subtle)",
          color: "var(--color-text-secondary)",
        }}
      >
        {hunk.filePath}
      </div>

      {/* Hunk header */}
      <div
        className="px-3 py-0.5"
        style={{
          backgroundColor: "rgba(var(--color-accent-rgb, 100, 149, 237), 0.08)",
          color: "var(--color-text-muted)",
        }}
      >
        @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
      </div>

      {/* Diff lines */}
      <div>
        {hunk.lines.map((line, lineIndex) => (
          <DiffLineView key={lineIndex} line={line} hunk={hunk} index={lineIndex} />
        ))}
      </div>
    </div>
  );
}

function DiffLineView({
  line,
  hunk,
  index,
}: {
  line: DiffLine;
  hunk: DiffHunk;
  index: number;
}) {
  const { bgColor, textColor, prefix } = getDiffLineStyle(line.lineType);

  // Calculate line numbers
  let oldLineNo: number | null = null;
  let newLineNo: number | null = null;

  // Simple line number calculation based on position in hunk
  let oldCounter = hunk.oldStart;
  let newCounter = hunk.newStart;
  for (let i = 0; i <= index; i++) {
    const lt = hunk.lines[i].lineType;
    if (lt === "context") {
      if (i === index) {
        oldLineNo = oldCounter;
        newLineNo = newCounter;
      }
      oldCounter++;
      newCounter++;
    } else if (lt === "deletion") {
      if (i === index) {
        oldLineNo = oldCounter;
      }
      oldCounter++;
    } else if (lt === "addition") {
      if (i === index) {
        newLineNo = newCounter;
      }
      newCounter++;
    }
  }

  return (
    <div
      className="flex"
      style={{
        backgroundColor: bgColor,
        minHeight: 20,
      }}
    >
      {/* Line numbers */}
      <span
        className="flex-shrink-0 text-right select-none px-1"
        style={{
          color: "var(--color-text-muted)",
          opacity: 0.5,
          width: 40,
          fontSize: 10,
          lineHeight: "20px",
        }}
      >
        {oldLineNo ?? ""}
      </span>
      <span
        className="flex-shrink-0 text-right select-none px-1"
        style={{
          color: "var(--color-text-muted)",
          opacity: 0.5,
          width: 40,
          fontSize: 10,
          lineHeight: "20px",
          borderRight: "1px solid var(--color-border-subtle)",
        }}
      >
        {newLineNo ?? ""}
      </span>

      {/* Prefix (+/-/space) */}
      <span
        className="flex-shrink-0 select-none px-1"
        style={{
          color: textColor,
          width: 16,
          lineHeight: "20px",
        }}
      >
        {prefix}
      </span>

      {/* Content */}
      <span
        className="flex-1 whitespace-pre"
        style={{
          color: textColor,
          lineHeight: "20px",
        }}
      >
        {line.content}
      </span>
    </div>
  );
}

function getDiffLineStyle(lineType: string): {
  bgColor: string;
  textColor: string;
  prefix: string;
} {
  switch (lineType) {
    case "addition":
      return {
        bgColor: "rgba(115, 201, 145, 0.12)",
        textColor: "var(--color-success, #73c991)",
        prefix: "+",
      };
    case "deletion":
      return {
        bgColor: "rgba(241, 76, 76, 0.12)",
        textColor: "var(--color-danger, #f14c4c)",
        prefix: "-",
      };
    default:
      return {
        bgColor: "transparent",
        textColor: "var(--color-text-primary)",
        prefix: " ",
      };
  }
}
