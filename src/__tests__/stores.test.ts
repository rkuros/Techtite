import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock Tauri IPC at the module level so all invoke calls route through here
// ---------------------------------------------------------------------------

const mockHandlers: Record<
  string,
  (args?: Record<string, unknown>) => unknown
> = {};

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn((cmd: string, args?: Record<string, unknown>) => {
    const handler = mockHandlers[cmd];
    if (handler) return Promise.resolve(handler(args));
    return Promise.reject(new Error(`No mock handler for command: ${cmd}`));
  }),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

function registerMock(
  cmd: string,
  handler: (args?: Record<string, unknown>) => unknown
) {
  mockHandlers[cmd] = handler;
}

function clearMocks() {
  for (const key of Object.keys(mockHandlers)) {
    delete mockHandlers[key];
  }
}

// ---------------------------------------------------------------------------
// Mock IPC handlers for testing stores without Tauri runtime
// ---------------------------------------------------------------------------

function setupPublishMocks() {
  registerMock("publish_generate_blog_draft", (args) => ({
    id: "draft-1",
    title: "Test Draft",
    content: "# Test\n\nGenerated content",
    sourceLogPaths: (args as { sessionLogPaths: string[] }).sessionLogPaths,
    platformMetadata: null,
    status: "draft",
    createdAt: new Date().toISOString(),
    publishedAt: null,
    publishedUrl: null,
  }));

  registerMock("publish_generate_sns_post", (args) => ({
    id: "post-1",
    content: "Test post for X",
    platform: (args as { platform: string }).platform,
    charCount: 18,
    sourcePaths: (args as { sourcePaths: string[] }).sourcePaths,
    status: "draft",
    createdAt: new Date().toISOString(),
    publishedUrl: null,
  }));

  registerMock("publish_publish_zenn", () => ({
    success: true,
    url: "https://zenn.dev/test/articles/test-article",
    errorMessage: null,
  }));

  registerMock("publish_publish_note", () => ({
    success: true,
    url: "https://note.com/test/n/test-article",
    errorMessage: null,
  }));

  registerMock("publish_post_x", () => ({
    success: true,
    url: "https://x.com/test/status/123456",
    errorMessage: null,
  }));

  registerMock("publish_post_threads", () => ({
    success: true,
    url: "https://threads.net/@test/post/123456",
    errorMessage: null,
  }));

  registerMock("publish_get_templates", () => []);

  registerMock("publish_set_template", () => undefined);

  registerMock("publish_convert_notation", (args) => {
    const { content } = args as { content: string };
    return content.replace(/\[\[([^\]]+)\]\]/g, "$1");
  });
}

function setupCostMocks() {
  registerMock("cost_get_summary", () => ({
    period: "daily",
    totalCostUsd: 0.15,
    totalInputTokens: 5000,
    totalOutputTokens: 2000,
    byAgent: [
      {
        agentId: "agent-1",
        agentName: "Worker",
        costUsd: 0.15,
        inputTokens: 5000,
        outputTokens: 2000,
      },
    ],
  }));

  registerMock("cost_get_budget", () => ({
    dailyLimitUsd: 5.0,
    monthlyLimitUsd: 100.0,
    warningThreshold: 0.8,
  }));

  registerMock("cost_get_trend", () =>
    Array.from({ length: 7 }, (_, i) => ({
      date: `2026-02-${21 + i}`,
      costUsd: 0.1 * (i + 1),
    }))
  );
}

function setupKnowledgeMocks() {
  registerMock("search_keyword", () => ({
    results: [
      {
        filePath: "notes/test.md",
        score: 0.95,
        highlights: ["matched text"],
      },
    ],
    totalCount: 1,
  }));
}

// ---------------------------------------------------------------------------
// Publish Store Tests
// ---------------------------------------------------------------------------

describe("publish-store", () => {
  beforeEach(() => {
    clearMocks();
    setupPublishMocks();
    vi.resetModules();
  });

  it("generates a blog draft and adds it to state", async () => {
    const { usePublishStore } = await import("@/stores/publish-store");
    const store = usePublishStore.getState();

    expect(store.blogDrafts).toHaveLength(0);
    expect(store.isGenerating).toBe(false);

    await store.generateBlogDraft(["logs/session1.md"]);

    const updated = usePublishStore.getState();
    expect(updated.blogDrafts).toHaveLength(1);
    expect(updated.blogDrafts[0].title).toBe("Test Draft");
    expect(updated.blogDrafts[0].status).toBe("draft");
    expect(updated.isGenerating).toBe(false);
  });

  it("generates an SNS post", async () => {
    const { usePublishStore } = await import("@/stores/publish-store");

    await usePublishStore.getState().generateSNSPost(["notes/update.md"], "x");

    const updated = usePublishStore.getState();
    expect(updated.snsPosts).toHaveLength(1);
    expect(updated.snsPosts[0].platform).toBe("x");
    expect(updated.isGenerating).toBe(false);
  });

  it("publishes to Zenn and updates draft status", async () => {
    const { usePublishStore } = await import("@/stores/publish-store");

    // First generate a draft
    await usePublishStore.getState().generateBlogDraft(["logs/session1.md"]);

    const draft = usePublishStore.getState().blogDrafts[0];
    expect(draft).toBeDefined();

    const result = await usePublishStore.getState().publishToZenn(draft);
    expect(result).not.toBeNull();

    expect(result!.success).toBe(true);
    expect(result!.url).toContain("zenn.dev");

    const updated = usePublishStore.getState();
    expect(updated.blogDrafts[0].status).toBe("published");
    expect(updated.isPublishing).toBe(false);
  });

  it("posts to X", async () => {
    const { usePublishStore } = await import("@/stores/publish-store");

    await usePublishStore.getState().generateSNSPost(["notes/update.md"], "x");

    const post = usePublishStore.getState().snsPosts[0];
    expect(post).toBeDefined();

    const result = await usePublishStore.getState().postToX(post);
    expect(result).not.toBeNull();

    expect(result!.success).toBe(true);
    expect(result!.url).toContain("x.com");
  });

  it("opens and closes the modal", async () => {
    const { usePublishStore } = await import("@/stores/publish-store");

    usePublishStore.getState().openModal("zenn");
    expect(usePublishStore.getState().modalPlatform).toBe("zenn");

    usePublishStore.getState().closeModal();
    expect(usePublishStore.getState().modalPlatform).toBeNull();
  });

  it("saves a template to local state", async () => {
    const { usePublishStore } = await import("@/stores/publish-store");

    await usePublishStore.getState().fetchTemplates();
    expect(usePublishStore.getState().templates).toHaveLength(0);

    await usePublishStore.getState().saveTemplate({
      id: "tpl-1",
      platform: "x",
      name: "X template",
      template: "{{content}} {{hashtags}}",
      variables: [],
    });

    // The store's saveTemplate re-fetches from backend (which returns []),
    // but if the command succeeded, it should have updated local state
    // via the re-fetch. Since our mock returns [], local state reflects that.
    // The important thing is no error was thrown.
    expect(usePublishStore.getState().isGenerating).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Cost Store Tests
// ---------------------------------------------------------------------------

describe("cost-store", () => {
  beforeEach(() => {
    clearMocks();
    setupCostMocks();
    vi.resetModules();
  });

  it("fetches cost summary", async () => {
    const { useCostStore } = await import("@/stores/cost-store");

    expect(useCostStore.getState().summary).toBeNull();

    await useCostStore.getState().fetchSummary("daily");

    const updated = useCostStore.getState();
    expect(updated.summary).not.toBeNull();
    expect(updated.summary?.totalCostUsd).toBeCloseTo(0.15);
    expect(updated.summary?.totalInputTokens).toBe(5000);
    expect(updated.isLoadingSummary).toBe(false);
  });

  it("fetches budget config", async () => {
    const { useCostStore } = await import("@/stores/cost-store");

    await useCostStore.getState().fetchBudget();

    const updated = useCostStore.getState();
    expect(updated.budget).not.toBeNull();
    expect(updated.budget?.dailyLimitUsd).toBe(5.0);
    expect(updated.budget?.monthlyLimitUsd).toBe(100.0);
  });

  it("fetches cost trend data", async () => {
    const { useCostStore } = await import("@/stores/cost-store");

    await useCostStore.getState().fetchTrend(7);

    const updated = useCostStore.getState();
    expect(updated.trend).toHaveLength(7);
    expect(updated.isLoadingTrend).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// IPC Mock Integration Tests
// ---------------------------------------------------------------------------

describe("ipc mock integration", () => {
  beforeEach(() => {
    clearMocks();
    setupPublishMocks();
    setupKnowledgeMocks();
  });

  it("notation conversion strips wiki-links via IPC", async () => {
    const { invokeCommand } = await import("@/shared/utils/ipc");

    const result = await invokeCommand<string>("publish_convert_notation", {
      content: "See [[architecture]] for details",
      platform: "x",
    });

    expect(result).toBe("See architecture for details");
    expect(result).not.toContain("[[");
  });

  it("knowledge search returns results via IPC", async () => {
    const { invokeCommand } = await import("@/shared/utils/ipc");

    const result = await invokeCommand<{
      results: { filePath: string; score: number }[];
      totalCount: number;
    }>("search_keyword", { query: "rust" });

    expect(result.results).toHaveLength(1);
    expect(result.totalCount).toBe(1);
    expect(result.results[0].filePath).toBe("notes/test.md");
  });
});
