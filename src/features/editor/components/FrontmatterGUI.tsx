import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import type { Frontmatter } from "@/types/note";

// ---------------------------------------------------------------------------
// NOTE: When the `yaml` npm package is installed, replace the manual parsing
// with:
//   import YAML from "yaml";
//   YAML.parse(yamlString)
//   YAML.stringify(frontmatter)
//
// For now we use a simple manual parser that handles the common cases.
// ---------------------------------------------------------------------------

interface FrontmatterGUIProps {
  /** The raw file content (we extract frontmatter from the top). */
  content: string;
  /** Called when the user changes frontmatter fields. Receives the updated
   *  full file content (frontmatter YAML + body). */
  onContentChange: (newContent: string) => void;
  /** Whether the GUI is read-only. */
  readOnly?: boolean;
}

/** Regex to match YAML frontmatter block at the start of a file. */
const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---/;

/**
 * Simple YAML-like frontmatter parser.
 * Handles: title, tags, date, aliases, and arbitrary extra key-value pairs.
 *
 * NOTE: Replace with `yaml` library parse when available.
 */
function parseFrontmatter(raw: string): Frontmatter {
  const fm: Frontmatter = {
    title: null,
    tags: [],
    date: null,
    aliases: [],
    extra: {},
  };

  const lines = raw.split("\n");
  let currentKey = "";
  let inList = false;

  for (const line of lines) {
    // List item (continuation of previous key)
    const listMatch = line.match(/^\s+-\s+(.*)/);
    if (listMatch && inList) {
      const value = listMatch[1].trim().replace(/^["']|["']$/g, "");
      if (currentKey === "tags") {
        fm.tags.push(value);
      } else if (currentKey === "aliases") {
        fm.aliases.push(value);
      } else {
        // Extra list field
        const existing = fm.extra[currentKey];
        if (Array.isArray(existing)) {
          existing.push(value);
        } else {
          fm.extra[currentKey] = [value];
        }
      }
      continue;
    }

    // Key-value pair
    const kvMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*)/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      const value = kvMatch[2].trim().replace(/^["']|["']$/g, "");
      inList = false;

      switch (key) {
        case "title":
          fm.title = value || null;
          break;
        case "date":
          fm.date = value || null;
          break;
        case "tags":
          if (value.startsWith("[") && value.endsWith("]")) {
            // Inline array: [tag1, tag2]
            fm.tags = value
              .slice(1, -1)
              .split(",")
              .map((t) => t.trim().replace(/^["']|["']$/g, ""))
              .filter(Boolean);
          } else if (value) {
            fm.tags = [value];
          } else {
            // List follows on next lines
            inList = true;
            currentKey = "tags";
          }
          break;
        case "aliases":
          if (value.startsWith("[") && value.endsWith("]")) {
            fm.aliases = value
              .slice(1, -1)
              .split(",")
              .map((t) => t.trim().replace(/^["']|["']$/g, ""))
              .filter(Boolean);
          } else if (value) {
            fm.aliases = [value];
          } else {
            inList = true;
            currentKey = "aliases";
          }
          break;
        default:
          if (!value) {
            // Could be start of a list
            inList = true;
            currentKey = key;
            fm.extra[key] = [];
          } else {
            fm.extra[key] = value;
          }
          break;
      }
      if (key !== currentKey) {
        currentKey = key;
      }
    }
  }

  return fm;
}

/**
 * Serialise a Frontmatter object back to a YAML string.
 *
 * NOTE: Replace with `YAML.stringify()` when the yaml package is installed.
 */
function stringifyFrontmatter(fm: Frontmatter): string {
  const lines: string[] = [];

  if (fm.title !== null) {
    lines.push(`title: "${fm.title}"`);
  }
  if (fm.date !== null) {
    lines.push(`date: ${fm.date}`);
  }
  if (fm.tags.length > 0) {
    lines.push(`tags: [${fm.tags.map((t) => `"${t}"`).join(", ")}]`);
  }
  if (fm.aliases.length > 0) {
    lines.push(`aliases: [${fm.aliases.map((a) => `"${a}"`).join(", ")}]`);
  }

  // Extra fields
  for (const [key, value] of Object.entries(fm.extra)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${item}`);
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }

  return lines.join("\n");
}

/**
 * FrontmatterGUI — Visual YAML Frontmatter editor.
 *
 * Displays the Markdown file's YAML frontmatter as a GUI form with fields
 * for title, tags (chip input), date (date picker), aliases, and custom
 * extra key-value fields.
 *
 * US-2.3: YAML Frontmatter GUI.
 */
export function FrontmatterGUI({
  content,
  onContentChange,
  readOnly = false,
}: FrontmatterGUIProps) {
  const [frontmatter, setFrontmatter] = useState<Frontmatter>({
    title: null,
    tags: [],
    date: null,
    aliases: [],
    extra: {},
  });
  const [hasFrontmatter, setHasFrontmatter] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [parseError, setParseError] = useState(false);

  // Tag input state
  const [tagInput, setTagInput] = useState("");
  // Alias input state
  const [aliasInput, setAliasInput] = useState("");

  // -------------------------------------------------------------------------
  // Parse frontmatter from content on mount / content change
  // -------------------------------------------------------------------------
  useEffect(() => {
    const match = content.match(FRONTMATTER_REGEX);
    if (match) {
      try {
        const parsed = parseFrontmatter(match[1]);
        setFrontmatter(parsed);
        setHasFrontmatter(true);
        setParseError(false);
      } catch {
        setParseError(true);
        setHasFrontmatter(true);
      }
    } else {
      setHasFrontmatter(false);
    }
  }, [content]);

  // -------------------------------------------------------------------------
  // Apply frontmatter changes to file content
  // -------------------------------------------------------------------------
  const applyFrontmatter = useCallback(
    (updated: Frontmatter) => {
      setFrontmatter(updated);
      const yamlStr = stringifyFrontmatter(updated);
      const newFmBlock = `---\n${yamlStr}\n---`;

      const match = content.match(FRONTMATTER_REGEX);
      if (match) {
        const newContent = content.replace(FRONTMATTER_REGEX, newFmBlock);
        onContentChange(newContent);
      }
    },
    [content, onContentChange]
  );

  // -------------------------------------------------------------------------
  // Field change handlers
  // -------------------------------------------------------------------------
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      applyFrontmatter({ ...frontmatter, title: e.target.value || null });
    },
    [frontmatter, applyFrontmatter]
  );

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      applyFrontmatter({ ...frontmatter, date: e.target.value || null });
    },
    [frontmatter, applyFrontmatter]
  );

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (trimmed && !frontmatter.tags.includes(trimmed)) {
        applyFrontmatter({
          ...frontmatter,
          tags: [...frontmatter.tags, trimmed],
        });
      }
      setTagInput("");
    },
    [frontmatter, applyFrontmatter]
  );

  const removeTag = useCallback(
    (tag: string) => {
      applyFrontmatter({
        ...frontmatter,
        tags: frontmatter.tags.filter((t) => t !== tag),
      });
    },
    [frontmatter, applyFrontmatter]
  );

  const handleTagKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTag(tagInput);
      } else if (e.key === "Backspace" && tagInput === "" && frontmatter.tags.length > 0) {
        removeTag(frontmatter.tags[frontmatter.tags.length - 1]);
      }
    },
    [tagInput, frontmatter.tags, addTag, removeTag]
  );

  const addAlias = useCallback(
    (alias: string) => {
      const trimmed = alias.trim();
      if (trimmed && !frontmatter.aliases.includes(trimmed)) {
        applyFrontmatter({
          ...frontmatter,
          aliases: [...frontmatter.aliases, trimmed],
        });
      }
      setAliasInput("");
    },
    [frontmatter, applyFrontmatter]
  );

  const removeAlias = useCallback(
    (alias: string) => {
      applyFrontmatter({
        ...frontmatter,
        aliases: frontmatter.aliases.filter((a) => a !== alias),
      });
    },
    [frontmatter, applyFrontmatter]
  );

  const handleAliasKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addAlias(aliasInput);
      } else if (
        e.key === "Backspace" &&
        aliasInput === "" &&
        frontmatter.aliases.length > 0
      ) {
        removeAlias(frontmatter.aliases[frontmatter.aliases.length - 1]);
      }
    },
    [aliasInput, frontmatter.aliases, addAlias, removeAlias]
  );

  // -------------------------------------------------------------------------
  // Don't render if no frontmatter in the file
  // -------------------------------------------------------------------------
  if (!hasFrontmatter) return null;

  // Parse error fallback: show raw YAML
  if (parseError) {
    const match = content.match(FRONTMATTER_REGEX);
    return (
      <div className="border-b border-[var(--border,#2a2a2f)] bg-[var(--bg-sidebar,#252528)] px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-[var(--text-muted,#8e8e93)]">
            Frontmatter (raw — parse error)
          </span>
        </div>
        <pre className="text-xs text-[var(--text,#e5e5ea)] font-[var(--mono)] whitespace-pre-wrap">
          {match?.[1] ?? ""}
        </pre>
      </div>
    );
  }

  return (
    <div className="border-b border-[var(--border,#2a2a2f)] bg-[var(--bg-sidebar,#252528)]">
      {/* Header with collapse toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-[var(--text-muted,#8e8e93)] hover:text-[var(--text,#e5e5ea)] transition-colors"
      >
        <span
          className="transition-transform"
          style={{
            display: "inline-block",
            transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
          }}
        >
          &#9660;
        </span>
        <span className="font-semibold uppercase tracking-wider">
          Frontmatter
        </span>
      </button>

      {!isCollapsed && (
        <div className="px-4 pb-3 grid gap-2">
          {/* Title */}
          <div className="grid grid-cols-[80px_1fr] items-center gap-2">
            <label className="text-xs text-[var(--accent,#8b7ef0)] font-medium">
              title
            </label>
            <input
              type="text"
              value={frontmatter.title ?? ""}
              onChange={handleTitleChange}
              readOnly={readOnly}
              className="bg-[var(--bg-base,#1c1c1e)] text-[var(--text,#e5e5ea)] text-xs px-2 py-1 rounded border border-[var(--border,#2a2a2f)] outline-none focus:border-[var(--accent,#8b7ef0)] transition-colors"
              placeholder="Note title"
            />
          </div>

          {/* Date */}
          <div className="grid grid-cols-[80px_1fr] items-center gap-2">
            <label className="text-xs text-[var(--accent,#8b7ef0)] font-medium">
              date
            </label>
            <input
              type="date"
              value={frontmatter.date ?? ""}
              onChange={handleDateChange}
              readOnly={readOnly}
              className="bg-[var(--bg-base,#1c1c1e)] text-[var(--text,#e5e5ea)] text-xs px-2 py-1 rounded border border-[var(--border,#2a2a2f)] outline-none focus:border-[var(--accent,#8b7ef0)] transition-colors"
            />
          </div>

          {/* Tags (chip input) */}
          <div className="grid grid-cols-[80px_1fr] items-start gap-2">
            <label className="text-xs text-[var(--accent,#8b7ef0)] font-medium pt-1">
              tags
            </label>
            <div className="flex flex-wrap gap-1 items-center bg-[var(--bg-base,#1c1c1e)] px-2 py-1 rounded border border-[var(--border,#2a2a2f)] min-h-[28px]">
              {frontmatter.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-[rgba(139,126,240,0.15)] text-[var(--accent,#8b7ef0)]"
                >
                  #{tag}
                  {!readOnly && (
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 hover:text-[var(--text,#e5e5ea)]"
                    >
                      x
                    </button>
                  )}
                </span>
              ))}
              {!readOnly && (
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => {
                    if (tagInput.trim()) addTag(tagInput);
                  }}
                  className="flex-1 min-w-[60px] bg-transparent text-[var(--text,#e5e5ea)] text-xs outline-none"
                  placeholder="Add tag..."
                />
              )}
            </div>
          </div>

          {/* Aliases (chip input) */}
          <div className="grid grid-cols-[80px_1fr] items-start gap-2">
            <label className="text-xs text-[var(--accent,#8b7ef0)] font-medium pt-1">
              aliases
            </label>
            <div className="flex flex-wrap gap-1 items-center bg-[var(--bg-base,#1c1c1e)] px-2 py-1 rounded border border-[var(--border,#2a2a2f)] min-h-[28px]">
              {frontmatter.aliases.map((alias) => (
                <span
                  key={alias}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-[rgba(139,126,240,0.1)] text-[var(--text,#e5e5ea)]"
                >
                  {alias}
                  {!readOnly && (
                    <button
                      onClick={() => removeAlias(alias)}
                      className="ml-0.5 hover:text-[var(--accent,#8b7ef0)]"
                    >
                      x
                    </button>
                  )}
                </span>
              ))}
              {!readOnly && (
                <input
                  type="text"
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  onKeyDown={handleAliasKeyDown}
                  onBlur={() => {
                    if (aliasInput.trim()) addAlias(aliasInput);
                  }}
                  className="flex-1 min-w-[60px] bg-transparent text-[var(--text,#e5e5ea)] text-xs outline-none"
                  placeholder="Add alias..."
                />
              )}
            </div>
          </div>

          {/* Extra fields (key-value) */}
          {Object.entries(frontmatter.extra).map(([key, value]) => (
            <div
              key={key}
              className="grid grid-cols-[80px_1fr] items-center gap-2"
            >
              <label className="text-xs text-[var(--accent,#8b7ef0)] font-medium truncate">
                {key}
              </label>
              {Array.isArray(value) ? (
                <span className="text-xs text-[var(--text-muted,#8e8e93)]">
                  [{value.join(", ")}]
                </span>
              ) : (
                <input
                  type="text"
                  value={String(value)}
                  readOnly={readOnly}
                  onChange={(e) => {
                    if (readOnly) return;
                    applyFrontmatter({
                      ...frontmatter,
                      extra: { ...frontmatter.extra, [key]: e.target.value },
                    });
                  }}
                  className="bg-[var(--bg-base,#1c1c1e)] text-[var(--text,#e5e5ea)] text-xs px-2 py-1 rounded border border-[var(--border,#2a2a2f)] outline-none focus:border-[var(--accent,#8b7ef0)] transition-colors"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
