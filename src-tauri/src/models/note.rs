use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Frontmatter metadata extracted from YAML header of a Markdown file.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Frontmatter {
    pub title: Option<String>,
    pub tags: Vec<String>,
    pub date: Option<String>,
    pub aliases: Vec<String>,
    pub extra: HashMap<String, serde_json::Value>,
}

impl Default for Frontmatter {
    fn default() -> Self {
        Self {
            title: None,
            tags: Vec::new(),
            date: None,
            aliases: Vec::new(),
            extra: HashMap::new(),
        }
    }
}

/// An internal link extracted from `[[target]]` or `[[target|display]]` syntax.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InternalLink {
    pub target_path: String,
    pub display_text: Option<String>,
    pub line_number: u32,
    pub exists: bool,
}

/// A backlink entry representing a reference from another file.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BacklinkEntry {
    pub source_path: String,
    pub line_number: u32,
    pub context: String,
}

/// Tag information with usage count across the vault.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagInfo {
    pub name: String,
    pub file_count: u32,
    pub files: Vec<String>,
}

/// Filter parameters for Graph View.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GraphFilter {
    pub tags: Option<Vec<String>>,
    pub folders: Option<Vec<String>>,
}

/// A node in the knowledge graph.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphNode {
    pub id: String,
    pub label: String,
    pub tags: Vec<String>,
    pub folder: String,
}

/// An edge (link) in the knowledge graph.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphEdge {
    pub source: String,
    pub target: String,
}

/// Complete graph data for rendering.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}
