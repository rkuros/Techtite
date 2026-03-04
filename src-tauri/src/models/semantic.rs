use serde::{Deserialize, Serialize};

/// A single result from semantic (vector similarity) search.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticSearchResult {
    pub file_path: String,
    pub section_heading: Option<String>,
    pub chunk_text: String,
    pub score: f64,
    pub start_line: u32,
    pub end_line: u32,
}

/// A single result from hybrid (keyword + semantic) search.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HybridSearchResult {
    pub file_path: String,
    pub section_heading: Option<String>,
    pub chunk_text: String,
    pub keyword_score: f64,
    pub semantic_score: f64,
    pub combined_score: f64,
    pub start_line: u32,
    pub end_line: u32,
}

/// Status of the semantic search index.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexStatus {
    pub total_files: u32,
    pub indexed_files: u32,
    pub is_building: bool,
    pub last_updated_at: Option<String>,
}

impl Default for IndexStatus {
    fn default() -> Self {
        Self {
            total_files: 0,
            indexed_files: 0,
            is_building: false,
            last_updated_at: None,
        }
    }
}

/// A response from the RAG-powered chat endpoint.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatResponse {
    pub session_id: String,
    pub message: String,
    pub references: Vec<ChatReference>,
}

/// A reference document cited in a chat response.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatReference {
    pub file_path: String,
    pub section_heading: Option<String>,
    pub score: f64,
}

/// Configuration for the semantic index build process.
///
/// Controls chunking parameters and concurrency limits when
/// indexing vault files into the vector store.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexConfig {
    /// Maximum number of files to process concurrently during index build.
    pub max_concurrent_files: usize,
    /// Maximum number of tokens per chunk (approximate, based on whitespace splitting).
    pub max_chunk_tokens: usize,
    /// Number of overlapping tokens between adjacent chunks for context continuity.
    pub overlap_tokens: usize,
}

impl Default for IndexConfig {
    fn default() -> Self {
        Self {
            max_concurrent_files: 4,
            max_chunk_tokens: 256,
            overlap_tokens: 32,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_index_status_default() {
        let status = IndexStatus::default();
        assert_eq!(status.total_files, 0);
        assert_eq!(status.indexed_files, 0);
        assert!(!status.is_building);
        assert!(status.last_updated_at.is_none());
    }

    #[test]
    fn test_index_config_default() {
        let config = IndexConfig::default();
        assert_eq!(config.max_concurrent_files, 4);
        assert_eq!(config.max_chunk_tokens, 256);
        assert_eq!(config.overlap_tokens, 32);
    }

    #[test]
    fn test_semantic_search_result_serialization() {
        let result = SemanticSearchResult {
            file_path: "notes/test.md".to_string(),
            section_heading: Some("Introduction".to_string()),
            chunk_text: "This is a test chunk.".to_string(),
            score: 0.95,
            start_line: 1,
            end_line: 10,
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("filePath"));
        assert!(json.contains("sectionHeading"));
        assert!(json.contains("chunkText"));
        assert!(json.contains("startLine"));
        assert!(json.contains("endLine"));
    }

    #[test]
    fn test_hybrid_search_result_serialization() {
        let result = HybridSearchResult {
            file_path: "notes/test.md".to_string(),
            section_heading: None,
            chunk_text: "Hybrid result text.".to_string(),
            keyword_score: 0.4,
            semantic_score: 0.8,
            combined_score: 0.68,
            start_line: 5,
            end_line: 15,
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("keywordScore"));
        assert!(json.contains("semanticScore"));
        assert!(json.contains("combinedScore"));
    }

    #[test]
    fn test_chat_response_serialization() {
        let response = ChatResponse {
            session_id: "sess-001".to_string(),
            message: "Based on your notes...".to_string(),
            references: vec![ChatReference {
                file_path: "notes/ref.md".to_string(),
                section_heading: Some("Summary".to_string()),
                score: 0.9,
            }],
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("sessionId"));
        assert!(json.contains("sectionHeading"));
    }
}
