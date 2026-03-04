use std::collections::{HashMap, HashSet};
use std::sync::Mutex;

use crate::models::note::TagInfo;

/// In-memory tag index.
/// Stores the mapping of tags to files and vice versa.
///
/// Future: Replace with SQLite-backed persistent index using `metadata.db`.
pub struct TagIndex {
    /// Tag name -> set of file paths containing this tag
    tag_to_files: HashMap<String, HashSet<String>>,
    /// File path -> set of tags in this file
    file_to_tags: HashMap<String, HashSet<String>>,
}

impl TagIndex {
    pub fn new() -> Self {
        Self {
            tag_to_files: HashMap::new(),
            file_to_tags: HashMap::new(),
        }
    }
}

/// Thread-safe tag index state managed by Tauri.
pub struct TagIndexState {
    pub index: Mutex<TagIndex>,
}

impl TagIndexState {
    pub fn new() -> Self {
        Self {
            index: Mutex::new(TagIndex::new()),
        }
    }
}

// ---------------------------------------------------------------------------
// Tag extraction
// ---------------------------------------------------------------------------

/// Extract all `#tag` patterns from Markdown content.
/// Supports:
///   - Simple tags: `#rust`, `#todo`
///   - Nested tags: `#parent/child`, `#lang/rust`
///   - Tags in frontmatter `tags:` field (YAML array)
///
/// Does NOT match:
///   - Markdown headings: `# Heading`, `## Heading`
///   - Hex colors: `#ff0000`
///   - Code blocks
pub fn extract_tags(content: &str) -> Vec<(String, u32)> {
    let mut tags: Vec<(String, u32)> = Vec::new();
    let mut in_code_block = false;
    let mut in_frontmatter = false;
    let mut frontmatter_started = false;

    for (line_idx, line) in content.lines().enumerate() {
        let line_number = (line_idx + 1) as u32;
        let trimmed = line.trim();

        // Track YAML frontmatter boundaries
        if trimmed == "---" {
            if line_idx == 0 {
                in_frontmatter = true;
                frontmatter_started = true;
                continue;
            } else if frontmatter_started && in_frontmatter {
                in_frontmatter = false;
                continue;
            }
        }

        // Track fenced code blocks
        if trimmed.starts_with("```") {
            in_code_block = !in_code_block;
            continue;
        }

        if in_code_block {
            continue;
        }

        // In frontmatter, look for `tags:` field
        if in_frontmatter {
            if let Some(tag_value) = trimmed.strip_prefix("- ") {
                // YAML list item under tags:
                let tag = tag_value.trim().trim_matches('"').trim_matches('\'');
                if !tag.is_empty() && !tag.contains(' ') {
                    tags.push((tag.to_string(), line_number));
                }
            }
            continue;
        }

        // In body text, look for #tag patterns
        extract_inline_tags(line, line_number, &mut tags);
    }

    tags
}

/// Extract inline `#tag` patterns from a single line.
fn extract_inline_tags(line: &str, line_number: u32, tags: &mut Vec<(String, u32)>) {
    let chars: Vec<char> = line.chars().collect();
    let len = chars.len();
    let mut i = 0;

    while i < len {
        if chars[i] == '#' {
            // Must be at start of line or preceded by whitespace
            let at_boundary = i == 0 || chars[i - 1].is_whitespace();
            if !at_boundary {
                i += 1;
                continue;
            }

            // Check it's not a heading (# followed by space)
            if i + 1 >= len || chars[i + 1].is_whitespace() || chars[i + 1] == '#' {
                i += 1;
                continue;
            }

            // Collect tag characters (alphanumeric, _, -, /)
            let start = i + 1;
            let mut end = start;
            while end < len
                && (chars[end].is_alphanumeric()
                    || chars[end] == '_'
                    || chars[end] == '-'
                    || chars[end] == '/')
            {
                end += 1;
            }

            if end > start {
                let tag: String = chars[start..end].iter().collect();
                // Exclude hex color codes (6 hex digits)
                if !is_hex_color(&tag) {
                    tags.push((tag, line_number));
                }
            }

            i = end;
        } else {
            i += 1;
        }
    }
}

/// Check if a string looks like a hex color code.
fn is_hex_color(s: &str) -> bool {
    (s.len() == 3 || s.len() == 6) && s.chars().all(|c| c.is_ascii_hexdigit())
}

// ---------------------------------------------------------------------------
// Index operations
// ---------------------------------------------------------------------------

/// Update the tag index for a single file.
pub fn update_file_tags(index: &mut TagIndex, file_path: &str, content: &str) {
    // Remove old tags for this file
    if let Some(old_tags) = index.file_to_tags.remove(file_path) {
        for tag in &old_tags {
            if let Some(files) = index.tag_to_files.get_mut(tag) {
                files.remove(file_path);
                if files.is_empty() {
                    index.tag_to_files.remove(tag);
                }
            }
        }
    }

    // Extract and insert new tags
    let extracted = extract_tags(content);
    let mut file_tags: HashSet<String> = HashSet::new();

    for (tag, _line_number) in extracted {
        file_tags.insert(tag.clone());
        index
            .tag_to_files
            .entry(tag)
            .or_default()
            .insert(file_path.to_string());
    }

    if !file_tags.is_empty() {
        index.file_to_tags.insert(file_path.to_string(), file_tags);
    }
}

/// Remove a file from the tag index.
pub fn remove_file_tags(index: &mut TagIndex, file_path: &str) {
    if let Some(old_tags) = index.file_to_tags.remove(file_path) {
        for tag in &old_tags {
            if let Some(files) = index.tag_to_files.get_mut(tag) {
                files.remove(file_path);
                if files.is_empty() {
                    index.tag_to_files.remove(tag);
                }
            }
        }
    }
}

/// Get all tags in the vault with file counts.
pub fn get_all_tags(index: &TagIndex) -> Vec<TagInfo> {
    let mut tags: Vec<TagInfo> = index
        .tag_to_files
        .iter()
        .map(|(name, files)| TagInfo {
            name: name.clone(),
            file_count: files.len() as u32,
            files: files.iter().cloned().collect(),
        })
        .collect();

    // Sort by file count descending, then by name
    tags.sort_by(|a, b| b.file_count.cmp(&a.file_count).then(a.name.cmp(&b.name)));
    tags
}

/// Get all file paths that contain a specific tag.
pub fn get_files_by_tag(index: &TagIndex, tag: &str) -> Vec<String> {
    index
        .tag_to_files
        .get(tag)
        .map(|files| files.iter().cloned().collect())
        .unwrap_or_default()
}

/// Get all tags for a specific file.
pub fn get_tags_for_file(index: &TagIndex, file_path: &str) -> Vec<String> {
    index
        .file_to_tags
        .get(file_path)
        .map(|tags| tags.iter().cloned().collect())
        .unwrap_or_default()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_simple_tags() {
        let content = "This has #rust and #todo tags";
        let tags = extract_tags(content);
        assert_eq!(tags.len(), 2);
        assert_eq!(tags[0].0, "rust");
        assert_eq!(tags[1].0, "todo");
    }

    #[test]
    fn test_extract_nested_tags() {
        let content = "This has #lang/rust and #project/techtite tags";
        let tags = extract_tags(content);
        assert_eq!(tags.len(), 2);
        assert_eq!(tags[0].0, "lang/rust");
        assert_eq!(tags[1].0, "project/techtite");
    }

    #[test]
    fn test_skip_headings() {
        let content = "# Heading\n## Subheading\nText with #tag";
        let tags = extract_tags(content);
        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].0, "tag");
    }

    #[test]
    fn test_skip_code_blocks() {
        let content = "Text\n```\n#not_a_tag\n```\n#real_tag";
        let tags = extract_tags(content);
        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].0, "real_tag");
    }

    #[test]
    fn test_skip_hex_colors() {
        let content = "Color #ff0000 and #abc but #tag is real";
        let tags = extract_tags(content);
        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].0, "tag");
    }

    #[test]
    fn test_update_and_query_tags() {
        let mut index = TagIndex::new();
        update_file_tags(&mut index, "a.md", "Has #rust and #web tags");
        update_file_tags(&mut index, "b.md", "Also #rust here");

        let all = get_all_tags(&index);
        assert_eq!(all.len(), 2);

        let rust_files = get_files_by_tag(&index, "rust");
        assert_eq!(rust_files.len(), 2);

        let web_files = get_files_by_tag(&index, "web");
        assert_eq!(web_files.len(), 1);
    }

    #[test]
    fn test_remove_file_tags() {
        let mut index = TagIndex::new();
        update_file_tags(&mut index, "a.md", "#rust #web");
        update_file_tags(&mut index, "b.md", "#rust");

        remove_file_tags(&mut index, "a.md");

        let rust_files = get_files_by_tag(&index, "rust");
        assert_eq!(rust_files.len(), 1);

        let web_files = get_files_by_tag(&index, "web");
        assert_eq!(web_files.len(), 0);
    }
}
