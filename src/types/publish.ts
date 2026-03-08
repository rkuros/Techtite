export type PublishTarget = "zenn" | "note" | "x" | "threads";

export type PublishStatus =
  | "draft"
  | "readyForReview"
  | "reviewed"
  | "published"
  | "failed";

export type PlatformMetadata =
  | {
      platform: "zenn";
      emoji: string;
      articleType: string;
      topics: string[];
    }
  | { platform: "note" }
  | { platform: "plain" };

export interface BlogDraft {
  id: string;
  title: string;
  content: string;
  sourceLogPaths: string[];
  platformMetadata: PlatformMetadata | null;
  status: PublishStatus;
  createdAt: string;
  publishedAt: string | null;
  publishedUrl: string | null;
}

export interface SNSPost {
  id: string;
  content: string;
  platform: PublishTarget;
  charCount: number;
  sourcePaths: string[];
  status: PublishStatus;
  createdAt: string;
  publishedUrl: string | null;
}

export interface PostTemplate {
  id: string;
  platform: PublishTarget;
  name: string;
  template: string;
  variables: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  description: string;
  defaultValue: string | null;
}

export interface PublishResult {
  success: boolean;
  url: string | null;
  errorMessage: string | null;
}
