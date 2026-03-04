use serde::{Deserialize, Serialize};

/// Query parameters for keyword-based full-text search.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeywordSearchQuery {
    pub query: String,
    #[serde(default = "default_max_results")]
    pub max_results: u32,
}

fn default_max_results() -> u32 {
    50
}

/// A single result from keyword search.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeywordSearchResult {
    pub file_path: String,
    pub line_number: u32,
    pub context: String,
    pub highlight_ranges: Vec<(u32, u32)>,
}
