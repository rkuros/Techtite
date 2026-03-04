use std::collections::{HashMap, HashSet};
use std::path::Path;
use std::sync::Mutex;

use crate::models::note::{
    BacklinkEntry, GraphData, GraphEdge, GraphFilter, GraphNode, InternalLink,
};
use crate::utils::error::TechtiteError;

/// In-memory link index.
/// Stores forward links (source -> targets) and reverse index (target -> sources).
///
/// Future: Replace with SQLite-backed persistent index using `metadata.db`.
/// The in-memory approach works for MVP and small-to-medium vaults.
pub struct LinkIndex {
    /// Forward index: source_path -> Vec<InternalLink>
    forward: HashMap<String, Vec<InternalLink>>,
    /// Reverse index: target_path -> Vec<BacklinkEntry>
    reverse: HashMap<String, Vec<BacklinkEntry>>,
    /// Set of all known file paths in the vault
    known_files: HashSet<String>,
}

impl LinkIndex {
    pub fn new() -> Self {
        Self {
            forward: HashMap::new(),
            reverse: HashMap::new(),
            known_files: HashSet::new(),
        }
    }
}

/// Thread-safe link index state managed by Tauri.
pub struct LinkIndexState {
    pub index: Mutex<LinkIndex>,
}

impl LinkIndexState {
    pub fn new() -> Self {
        Self {
            index: Mutex::new(LinkIndex::new()),
        }
    }
}

// ---------------------------------------------------------------------------
// Regex for extracting [[internal links]]
// Supported forms:
//   [[target]]
//   [[target|display text]]
//   [[target#section]]
//   [[target#section|display text]]
// ---------------------------------------------------------------------------

/// Extract all `[[...]]` internal links from Markdown content.
pub fn extract_internal_links(content: &str) -> Vec<InternalLink> {
    let mut links = Vec::new();

    for (line_idx, line) in content.lines().enumerate() {
        let line_number = (line_idx + 1) as u32;
        let mut search_from = 0;

        while let Some(start) = line[search_from..].find("[[") {
            let abs_start = search_from + start;
            if let Some(end) = line[abs_start + 2..].find("]]") {
                let inner = &line[abs_start + 2..abs_start + 2 + end];

                // Parse inner content: target#section|display
                let (target_with_section, display) = if let Some(pipe_pos) = inner.find('|') {
                    (&inner[..pipe_pos], Some(inner[pipe_pos + 1..].to_string()))
                } else {
                    (inner, None)
                };

                // Strip #section part for the target path
                let target = if let Some(hash_pos) = target_with_section.find('#') {
                    &target_with_section[..hash_pos]
                } else {
                    target_with_section
                };

                let target = target.trim();
                if !target.is_empty() {
                    // Normalize: add .md extension if not present
                    let target_path = normalize_link_target(target);

                    links.push(InternalLink {
                        target_path,
                        display_text: display,
                        line_number,
                        exists: false, // Caller will set this based on vault state
                    });
                }

                search_from = abs_start + 2 + end + 2;
            } else {
                break; // No closing ]]
            }
        }
    }

    links
}

/// Normalize a link target to a file path.
/// Adds `.md` extension if not already present.
fn normalize_link_target(target: &str) -> String {
    let target = target.trim();
    if target.ends_with(".md") || target.contains('.') {
        target.to_string()
    } else {
        format!("{}.md", target)
    }
}

/// Extract context text around a link for backlink display.
/// Returns up to ~80 chars around the link occurrence.
fn extract_context(content: &str, line_number: u32) -> String {
    let lines: Vec<&str> = content.lines().collect();
    let idx = (line_number as usize).saturating_sub(1);
    if idx < lines.len() {
        let line = lines[idx];
        // Use char boundary-safe truncation for multibyte (e.g. Japanese) text
        let truncated: String = line.chars().take(120).collect();
        if truncated.len() < line.len() {
            format!("{}...", truncated)
        } else {
            line.to_string()
        }
    } else {
        String::new()
    }
}

/// Update the link index for a single file.
/// Removes old entries and inserts new ones.
pub fn update_file_index(
    index: &mut LinkIndex,
    file_path: &str,
    content: &str,
) {
    // Remove old forward entries for this file
    index.forward.remove(file_path);

    // Remove old reverse entries sourced from this file
    for entries in index.reverse.values_mut() {
        entries.retain(|e| e.source_path != file_path);
    }

    // Extract new links
    let mut links = extract_internal_links(content);

    // Check existence against known files
    for link in &mut links {
        link.exists = index.known_files.contains(&link.target_path);
    }

    // Build reverse entries
    for link in &links {
        let backlink = BacklinkEntry {
            source_path: file_path.to_string(),
            line_number: link.line_number,
            context: extract_context(content, link.line_number),
        };
        index
            .reverse
            .entry(link.target_path.clone())
            .or_default()
            .push(backlink);
    }

    // Register this file as known
    index.known_files.insert(file_path.to_string());

    // Store forward links
    if !links.is_empty() {
        index.forward.insert(file_path.to_string(), links);
    }
}

/// Remove a file from the index entirely.
pub fn remove_file_from_index(index: &mut LinkIndex, file_path: &str) {
    index.forward.remove(file_path);
    index.known_files.remove(file_path);

    // Remove reverse entries sourced from this file
    for entries in index.reverse.values_mut() {
        entries.retain(|e| e.source_path != file_path);
    }
    // Clean up empty reverse entries
    index.reverse.retain(|_, v| !v.is_empty());
}

/// Register a file path as known (exists in the vault).
pub fn register_known_file(index: &mut LinkIndex, file_path: &str) {
    index.known_files.insert(file_path.to_string());
}

/// Get outgoing links from a specific file.
pub fn get_outgoing_links(index: &LinkIndex, file_path: &str) -> Vec<InternalLink> {
    index.forward.get(file_path).cloned().unwrap_or_default()
}

/// Get backlinks pointing to a specific file.
pub fn get_backlinks(index: &LinkIndex, file_path: &str) -> Vec<BacklinkEntry> {
    index.reverse.get(file_path).cloned().unwrap_or_default()
}

/// Get unlinked mentions of a file throughout the vault.
/// Searches for the file name (without extension) in all other files.
pub fn get_unlinked_mentions(
    index: &LinkIndex,
    file_path: &str,
    vault_root: &Path,
) -> Result<Vec<BacklinkEntry>, TechtiteError> {
    let file_name = Path::new(file_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_string();

    if file_name.is_empty() {
        return Ok(Vec::new());
    }

    // Get all linked sources so we can exclude them
    let linked_sources: HashSet<String> = index
        .reverse
        .get(file_path)
        .map(|entries| entries.iter().map(|e| e.source_path.clone()).collect())
        .unwrap_or_default();

    let mut mentions = Vec::new();

    for known_path in &index.known_files {
        if known_path == file_path || linked_sources.contains(known_path) {
            continue;
        }

        // Read the file content to search for mentions
        let full_path = vault_root.join(known_path);
        let content = match std::fs::read_to_string(&full_path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        for (line_idx, line) in content.lines().enumerate() {
            let line_number = (line_idx + 1) as u32;

            // Check if the line contains the file name but not as a [[link]]
            if line.contains(&file_name) {
                // Verify it's not inside a [[ ]] link
                let is_linked = line.contains(&format!("[[{}", &file_name));
                if !is_linked {
                    mentions.push(BacklinkEntry {
                        source_path: known_path.clone(),
                        line_number,
                        context: {
                            let truncated: String = line.chars().take(120).collect();
                            if truncated.len() < line.len() {
                                format!("{}...", truncated)
                            } else {
                                line.to_string()
                            }
                        },
                    });
                }
            }
        }
    }

    Ok(mentions)
}

/// Build complete graph data from the link index.
pub fn build_graph_data(index: &LinkIndex, filter: &GraphFilter) -> GraphData {
    let mut nodes_map: HashMap<String, GraphNode> = HashMap::new();
    let mut edges: Vec<GraphEdge> = Vec::new();

    // Create nodes for all known files
    for file_path in &index.known_files {
        let label = Path::new(file_path)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or(file_path)
            .to_string();

        let folder = Path::new(file_path)
            .parent()
            .and_then(|p| p.to_str())
            .unwrap_or("")
            .to_string();

        // Apply folder filter
        if let Some(ref folders) = filter.folders {
            if !folders.is_empty() && !folders.iter().any(|f| folder.starts_with(f)) {
                continue;
            }
        }

        nodes_map.insert(
            file_path.clone(),
            GraphNode {
                id: file_path.clone(),
                label,
                tags: Vec::new(), // Tags are populated by tag_service
                folder,
            },
        );
    }

    // Apply tag filter (requires tags to be populated)
    if let Some(ref tags) = filter.tags {
        if !tags.is_empty() {
            nodes_map.retain(|_, node| node.tags.iter().any(|t| tags.contains(t)));
        }
    }

    // Build edges from forward links
    for (source, links) in &index.forward {
        if !nodes_map.contains_key(source) {
            continue;
        }
        for link in links {
            if nodes_map.contains_key(&link.target_path) {
                edges.push(GraphEdge {
                    source: source.clone(),
                    target: link.target_path.clone(),
                });
            }
        }
    }

    GraphData {
        nodes: nodes_map.into_values().collect(),
        edges,
    }
}

/// Build a local graph centered on a specific file with a given depth (hops).
pub fn build_local_graph(
    index: &LinkIndex,
    center_path: &str,
    depth: u32,
) -> GraphData {
    let mut visited: HashSet<String> = HashSet::new();
    let mut frontier: Vec<String> = vec![center_path.to_string()];
    visited.insert(center_path.to_string());

    // BFS to collect nodes within `depth` hops
    for _ in 0..depth {
        let mut next_frontier: Vec<String> = Vec::new();

        for path in &frontier {
            // Outgoing links
            if let Some(links) = index.forward.get(path) {
                for link in links {
                    if visited.insert(link.target_path.clone()) {
                        next_frontier.push(link.target_path.clone());
                    }
                }
            }

            // Incoming links (backlinks)
            if let Some(backlinks) = index.reverse.get(path) {
                for bl in backlinks {
                    if visited.insert(bl.source_path.clone()) {
                        next_frontier.push(bl.source_path.clone());
                    }
                }
            }
        }

        frontier = next_frontier;
    }

    // Build nodes
    let mut nodes: Vec<GraphNode> = Vec::new();
    let mut edges: Vec<GraphEdge> = Vec::new();

    for file_path in &visited {
        let label = Path::new(file_path)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or(file_path)
            .to_string();

        let folder = Path::new(file_path)
            .parent()
            .and_then(|p| p.to_str())
            .unwrap_or("")
            .to_string();

        nodes.push(GraphNode {
            id: file_path.clone(),
            label,
            tags: Vec::new(),
            folder,
        });
    }

    // Build edges between visited nodes
    for source in &visited {
        if let Some(links) = index.forward.get(source) {
            for link in links {
                if visited.contains(&link.target_path) {
                    edges.push(GraphEdge {
                        source: source.clone(),
                        target: link.target_path.clone(),
                    });
                }
            }
        }
    }

    GraphData { nodes, edges }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_internal_links_basic() {
        let content = "Hello [[World]] and [[Foo Bar]]";
        let links = extract_internal_links(content);
        assert_eq!(links.len(), 2);
        assert_eq!(links[0].target_path, "World.md");
        assert_eq!(links[0].line_number, 1);
        assert_eq!(links[1].target_path, "Foo Bar.md");
    }

    #[test]
    fn test_extract_internal_links_with_display_text() {
        let content = "See [[target|my link]] for details";
        let links = extract_internal_links(content);
        assert_eq!(links.len(), 1);
        assert_eq!(links[0].target_path, "target.md");
        assert_eq!(links[0].display_text, Some("my link".to_string()));
    }

    #[test]
    fn test_extract_internal_links_with_section() {
        let content = "See [[target#section]] here";
        let links = extract_internal_links(content);
        assert_eq!(links.len(), 1);
        assert_eq!(links[0].target_path, "target.md");
    }

    #[test]
    fn test_extract_internal_links_with_extension() {
        let content = "Link to [[notes/daily.md]]";
        let links = extract_internal_links(content);
        assert_eq!(links.len(), 1);
        assert_eq!(links[0].target_path, "notes/daily.md");
    }

    #[test]
    fn test_extract_internal_links_multiline() {
        let content = "Line 1 [[A]]\nLine 2\nLine 3 [[B]] and [[C]]";
        let links = extract_internal_links(content);
        assert_eq!(links.len(), 3);
        assert_eq!(links[0].line_number, 1);
        assert_eq!(links[1].line_number, 3);
        assert_eq!(links[2].line_number, 3);
    }

    #[test]
    fn test_update_and_query_index() {
        let mut index = LinkIndex::new();
        register_known_file(&mut index, "a.md");
        register_known_file(&mut index, "b.md");

        update_file_index(&mut index, "a.md", "Link to [[b]]");

        let outgoing = get_outgoing_links(&index, "a.md");
        assert_eq!(outgoing.len(), 1);
        assert_eq!(outgoing[0].target_path, "b.md");
        assert!(outgoing[0].exists);

        let backlinks = get_backlinks(&index, "b.md");
        assert_eq!(backlinks.len(), 1);
        assert_eq!(backlinks[0].source_path, "a.md");
    }

    #[test]
    fn test_normalize_link_target() {
        assert_eq!(normalize_link_target("hello"), "hello.md");
        assert_eq!(normalize_link_target("hello.md"), "hello.md");
        assert_eq!(normalize_link_target("image.png"), "image.png");
    }
}
