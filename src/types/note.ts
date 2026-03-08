export interface Frontmatter {
  title: string | null;
  tags: string[];
  date: string | null;
  aliases: string[];
  extra: Record<string, unknown>;
}

export interface InternalLink {
  targetPath: string;
  displayText: string | null;
  lineNumber: number;
  exists: boolean;
}

export interface BacklinkEntry {
  sourcePath: string;
  lineNumber: number;
  context: string;
}

export interface TagInfo {
  name: string;
  fileCount: number;
  files: string[];
}
