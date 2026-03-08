import { create } from "zustand";
import { invokeCommand, listenEvent } from "@/shared/utils/ipc";
import type {
  BlogDraft,
  SNSPost,
  PostTemplate,
  PublishResult,
} from "@/types/publish";

interface PublishStoreState {
  // State
  blogDrafts: BlogDraft[];
  snsPosts: SNSPost[];
  templates: PostTemplate[];
  isGenerating: boolean;
  isPublishing: boolean;
  modalPlatform: "zenn" | "note" | "x" | "threads" | null;

  // Blog actions
  generateBlogDraft: (sessionLogPaths: string[]) => Promise<void>;
  publishToZenn: (draft: BlogDraft) => Promise<PublishResult | null>;
  publishToNote: (draft: BlogDraft) => Promise<PublishResult | null>;

  // SNS actions
  generateSNSPost: (
    sourcePaths: string[],
    platform: "x" | "threads"
  ) => Promise<void>;
  postToX: (post: SNSPost) => Promise<PublishResult | null>;
  postToThreads: (post: SNSPost) => Promise<PublishResult | null>;

  // Template actions
  fetchTemplates: () => Promise<void>;
  saveTemplate: (template: PostTemplate) => Promise<void>;

  // Modal actions
  openModal: (platform: "zenn" | "note" | "x" | "threads") => void;
  closeModal: () => void;
}

export const usePublishStore = create<PublishStoreState>((set) => ({
  // Initial state
  blogDrafts: [],
  snsPosts: [],
  templates: [],
  isGenerating: false,
  isPublishing: false,
  modalPlatform: null,

  // ---------- Blog actions ----------

  generateBlogDraft: async (sessionLogPaths) => {
    set({ isGenerating: true });
    try {
      const draft = await invokeCommand<BlogDraft>(
        "publish_generate_blog_draft",
        { sessionLogPaths }
      );
      set((state) => ({
        blogDrafts: [...state.blogDrafts, draft],
      }));
    } catch (err) {
      console.error("[Unit 10] Failed to generate blog draft:", err);
    } finally {
      set({ isGenerating: false });
    }
  },

  publishToZenn: async (draft) => {
    set({ isPublishing: true });
    try {
      const result = await invokeCommand<PublishResult>(
        "publish_publish_zenn",
        { draft }
      );
      // Update draft status in local state
      if (result.success) {
        set((state) => ({
          blogDrafts: state.blogDrafts.map((d) =>
            d.id === draft.id
              ? { ...d, status: "published" as const }
              : d
          ),
        }));
      }
      return result;
    } catch (err) {
      console.error("[Unit 10] Failed to publish to Zenn:", err);
      return null;
    } finally {
      set({ isPublishing: false });
    }
  },

  publishToNote: async (draft) => {
    set({ isPublishing: true });
    try {
      const result = await invokeCommand<PublishResult>(
        "publish_publish_note",
        { draft }
      );
      if (result.success) {
        set((state) => ({
          blogDrafts: state.blogDrafts.map((d) =>
            d.id === draft.id
              ? { ...d, status: "published" as const }
              : d
          ),
        }));
      }
      return result;
    } catch (err) {
      console.error("[Unit 10] Failed to publish to Note:", err);
      return null;
    } finally {
      set({ isPublishing: false });
    }
  },

  // ---------- SNS actions ----------

  generateSNSPost: async (sourcePaths, platform) => {
    set({ isGenerating: true });
    try {
      const post = await invokeCommand<SNSPost>(
        "publish_generate_sns_post",
        { sourcePaths, platform }
      );
      set((state) => ({
        snsPosts: [...state.snsPosts, post],
      }));
    } catch (err) {
      console.error("[Unit 10] Failed to generate SNS post:", err);
    } finally {
      set({ isGenerating: false });
    }
  },

  postToX: async (post) => {
    set({ isPublishing: true });
    try {
      const result = await invokeCommand<PublishResult>("publish_post_x", {
        post,
      });
      if (result.success) {
        set((state) => ({
          snsPosts: state.snsPosts.map((p) =>
            p.id === post.id
              ? { ...p, status: "published" as const }
              : p
          ),
        }));
      }
      return result;
    } catch (err) {
      console.error("[Unit 10] Failed to post to X:", err);
      return null;
    } finally {
      set({ isPublishing: false });
    }
  },

  postToThreads: async (post) => {
    set({ isPublishing: true });
    try {
      const result = await invokeCommand<PublishResult>(
        "publish_post_threads",
        { post }
      );
      if (result.success) {
        set((state) => ({
          snsPosts: state.snsPosts.map((p) =>
            p.id === post.id
              ? { ...p, status: "published" as const }
              : p
          ),
        }));
      }
      return result;
    } catch (err) {
      console.error("[Unit 10] Failed to post to Threads:", err);
      return null;
    } finally {
      set({ isPublishing: false });
    }
  },

  // ---------- Template actions ----------

  fetchTemplates: async () => {
    try {
      const templates = await invokeCommand<PostTemplate[]>(
        "publish_get_templates"
      );
      set({ templates });
    } catch (err) {
      console.error("[Unit 10] Failed to fetch templates:", err);
    }
  },

  saveTemplate: async (template) => {
    try {
      await invokeCommand("publish_set_template", { template });
      // Re-fetch to get updated list
      const templates = await invokeCommand<PostTemplate[]>(
        "publish_get_templates"
      );
      set({ templates });
    } catch (err) {
      console.error("[Unit 10] Failed to save template:", err);
    }
  },

  // ---------- Modal actions ----------

  openModal: (platform) => {
    set({ modalPlatform: platform });
  },

  closeModal: () => {
    set({ modalPlatform: null });
  },
}));

// ---------------------------------------------------------------------------
// Event listeners for publish pipeline events
// ---------------------------------------------------------------------------

/**
 * Initialise event listeners for publish:progress and publish:completed events.
 * Call once at app startup (e.g. in a top-level useEffect or App.tsx).
 */
export function initPublishEventListeners(): () => void {
  const unlistenFns: (() => void)[] = [];

  // Listen for publish progress updates
  listenEvent<{ draftId: string; progress: number; message: string }>(
    "publish:progress",
    ({ draftId, progress, message }) => {
      console.log(
        `[Unit 10] Publish progress for ${draftId}: ${progress}% - ${message}`
      );
      // TODO: Update UI with progress indicator
    }
  ).then((fn) => unlistenFns.push(fn));

  // Listen for publish completion events
  listenEvent<{
    draftId: string;
    success: boolean;
    url?: string;
    error?: string;
  }>("publish:completed", ({ draftId, success, url, error }) => {
    if (success) {
      console.log(
        `[Unit 10] Published successfully: ${draftId} -> ${url ?? "no URL"}`
      );
    } else {
      console.error(
        `[Unit 10] Publish failed for ${draftId}: ${error ?? "unknown error"}`
      );
    }
  }).then((fn) => unlistenFns.push(fn));

  // Return a cleanup function that unlistens all
  return () => {
    unlistenFns.forEach((fn) => fn());
  };
}
