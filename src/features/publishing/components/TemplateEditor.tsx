import { useEffect, useState, useMemo } from "react";
import { usePublishStore } from "@/stores/publish-store";
import type { PostTemplate, TemplateVariable } from "@/types/publish";

/**
 * Default variables available for each platform.
 */
const PLATFORM_VARIABLES: Record<string, TemplateVariable[]> = {
  zenn: [
    {
      name: "title",
      description: "Article title",
      defaultValue: "Untitled",
    },
    { name: "emoji", description: "Title emoji", defaultValue: null },
    {
      name: "topics",
      description: "Comma-separated topic tags",
      defaultValue: null,
    },
    {
      name: "content",
      description: "Main article content",
      defaultValue: null,
    },
    {
      name: "date",
      description: "Publication date",
      defaultValue: null,
    },
  ],
  note: [
    {
      name: "title",
      description: "Article title",
      defaultValue: "Untitled",
    },
    {
      name: "content",
      description: "Main article content",
      defaultValue: null,
    },
    {
      name: "date",
      description: "Publication date",
      defaultValue: null,
    },
  ],
  x: [
    {
      name: "content",
      description: "Post text (280 chars max)",
      defaultValue: null,
    },
    {
      name: "hashtags",
      description: "Hashtags to append",
      defaultValue: null,
    },
    {
      name: "url",
      description: "Link to include",
      defaultValue: null,
    },
  ],
  threads: [
    {
      name: "content",
      description: "Post text (500 chars max)",
      defaultValue: null,
    },
    {
      name: "url",
      description: "Link to include",
      defaultValue: null,
    },
  ],
};

type PlatformTab = "zenn" | "note" | "x" | "threads";

const PLATFORM_TABS: { key: PlatformTab; label: string }[] = [
  { key: "zenn", label: "Zenn" },
  { key: "note", label: "Note" },
  { key: "x", label: "X" },
  { key: "threads", label: "Threads" },
];

/**
 * TemplateEditor -- Template settings for post generation.
 *
 * Features:
 * - Platform tabs (Zenn / Note / X / Threads)
 * - Template textarea with variable highlighting
 * - Available variables list with descriptions
 * - Save button
 */
export function TemplateEditor() {
  const templates = usePublishStore((s) => s.templates);
  const fetchTemplates = usePublishStore((s) => s.fetchTemplates);
  const saveTemplate = usePublishStore((s) => s.saveTemplate);

  const [activeTab, setActiveTab] = useState<PlatformTab>("zenn");
  const [templateText, setTemplateText] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Load existing template when tab changes
  useEffect(() => {
    const existing = templates.find((t) => t.platform === activeTab);
    if (existing) {
      setTemplateText(existing.template);
      setTemplateName(existing.name);
    } else {
      setTemplateText(getDefaultTemplate(activeTab));
      setTemplateName(`Default ${activeTab} template`);
    }
  }, [activeTab, templates]);

  const availableVariables = useMemo(
    () => PLATFORM_VARIABLES[activeTab] ?? [],
    [activeTab]
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const existing = templates.find((t) => t.platform === activeTab);
      const template: PostTemplate = {
        id: existing?.id ?? `tpl-${activeTab}-${Date.now()}`,
        name: templateName || `${activeTab} template`,
        platform: activeTab,
        template: templateText,
        variables: availableVariables,
      };

      await saveTemplate(template);
    } catch (err) {
      console.error("[Unit 10] Failed to save template:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="flex flex-col gap-3 p-3"
      style={{ color: "var(--color-text)" }}
    >
      <span className="text-xs font-semibold uppercase tracking-wider">
        Post Templates
      </span>

      {/* Platform tabs */}
      <div
        className="flex gap-0 rounded overflow-hidden"
        style={{ border: "1px solid var(--color-border-subtle)" }}
      >
        {PLATFORM_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 px-2 py-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor:
                activeTab === tab.key
                  ? "var(--color-accent, #3b82f6)"
                  : "var(--color-bg-surface)",
              color:
                activeTab === tab.key ? "#fff" : "var(--color-text-secondary)",
              border: "none",
              cursor: "pointer",
              borderRight:
                tab.key !== "threads"
                  ? "1px solid var(--color-border-subtle)"
                  : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Template name */}
      <div className="flex flex-col gap-1">
        <label
          className="text-xs"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Template Name
        </label>
        <input
          type="text"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="Template name..."
          className="w-full px-2 py-1 rounded text-xs"
          style={{
            backgroundColor: "var(--color-bg-input, var(--color-bg-surface))",
            color: "var(--color-text)",
            border: "1px solid var(--color-border-subtle)",
            outline: "none",
          }}
        />
      </div>

      {/* Template textarea */}
      <div className="flex flex-col gap-1">
        <label
          className="text-xs"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Template Content
        </label>
        <textarea
          value={templateText}
          onChange={(e) => setTemplateText(e.target.value)}
          placeholder="Use {{variable}} syntax for placeholders..."
          rows={8}
          className="w-full px-2 py-1.5 rounded text-xs resize-none"
          style={{
            backgroundColor: "var(--color-bg-input, var(--color-bg-surface))",
            color: "var(--color-text)",
            border: "1px solid var(--color-border-subtle)",
            outline: "none",
            fontFamily: "monospace",
          }}
        />
      </div>

      {/* Available variables */}
      <div className="flex flex-col gap-1">
        <label
          className="text-xs font-medium"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Available Variables
        </label>
        <div className="flex flex-col gap-0.5">
          {availableVariables.map((v) => (
            <div
              key={v.name}
              className="flex items-center gap-2 px-2 py-1 rounded"
              style={{
                backgroundColor: "var(--color-bg-surface)",
              }}
            >
              <code
                className="text-xs shrink-0"
                style={{ color: "var(--color-accent, #3b82f6)" }}
              >
                {`{{${v.name}}}`}
              </code>
              <span
                className="text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                {v.description}
              </span>
              {v.defaultValue && (
                <span
                  className="text-xs ml-auto shrink-0"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  default: {v.defaultValue}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={isSaving || !templateText.trim()}
        className="self-end px-3 py-1.5 rounded text-xs font-medium transition-colors"
        style={{
          backgroundColor:
            isSaving || !templateText.trim()
              ? "var(--color-bg-hover)"
              : "var(--color-accent, #3b82f6)",
          color:
            isSaving || !templateText.trim()
              ? "var(--color-text-muted)"
              : "#fff",
          border: "none",
          cursor:
            isSaving || !templateText.trim() ? "not-allowed" : "pointer",
        }}
      >
        {isSaving ? "Saving..." : "Save Template"}
      </button>
    </div>
  );
}

/**
 * Get a default template for a given platform.
 */
function getDefaultTemplate(platform: PlatformTab): string {
  switch (platform) {
    case "zenn":
      return `---
title: "{{title}}"
emoji: "{{emoji}}"
type: "tech"
topics: [{{topics}}]
published: true
---

{{content}}`;
    case "note":
      return `# {{title}}

{{content}}`;
    case "x":
      return `{{content}}

{{hashtags}}`;
    case "threads":
      return `{{content}}

{{url}}`;
  }
}
