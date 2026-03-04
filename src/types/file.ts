import type { Frontmatter } from "./note";

export interface FileEntry {
  path: string;
  name: string;
  isDir: boolean;
  children?: FileEntry[];
}

export interface FileMetadata {
  path: string;
  sizeBytes: number;
  modifiedAt: string;
  createdAt: string;
  fileType: FileType;
  frontmatter: Frontmatter | null;
  tags: string[];
  outgoingLinks: string[];
  gitStatus: GitFileStatus | null;
}

export type FileType =
  | { type: "markdown" }
  | { type: "code"; language: string }
  | { type: "image" }
  | { type: "binary" }
  | { type: "other" };

export type GitFileStatus =
  | "unmodified"
  | "modified"
  | "added"
  | "deleted"
  | "renamed"
  | "untracked"
  | "conflicted";

// Re-export Frontmatter for convenience
export type { Frontmatter };
