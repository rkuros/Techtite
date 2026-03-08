/**
 * Normalize a file path for display (remove leading ./ or vault prefix).
 */
export function normalizeDisplayPath(path: string): string {
  return path.replace(/^\.\//, "");
}

/**
 * Extract the file name from a path.
 */
export function getFileName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}

/**
 * Extract the file extension from a path.
 */
export function getFileExtension(path: string): string {
  const name = getFileName(path);
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex === -1 || dotIndex === 0) return "";
  return name.slice(dotIndex + 1);
}

/**
 * Get the parent directory of a path.
 */
export function getParentDir(path: string): string {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/") || ".";
}

/**
 * Join path segments.
 */
export function joinPath(...segments: string[]): string {
  return segments
    .map((s, i) => (i === 0 ? s.replace(/\/+$/, "") : s.replace(/^\/+|\/+$/g, "")))
    .filter(Boolean)
    .join("/");
}
