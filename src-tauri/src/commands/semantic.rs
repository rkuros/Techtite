use tauri::State;

use crate::models::semantic::{ChatResponse, HybridSearchResult, IndexStatus, SemanticSearchResult};
use crate::services::embedding_service::EmbeddingServiceState;
use crate::services::vector_store_service::{self, VectorStoreState};

/// Execute a semantic (vector similarity) search across the vault.
///
/// IPC command: `semantic_search`
///
/// Generates an embedding for the query text, then searches the vector
/// store for the most similar chunks. Returns results ranked by cosine
/// similarity score.
///
/// **STUB IMPLEMENTATION**: Returns an empty vector.
/// Will produce real results once ONNX Runtime and sqlite-vss are integrated.
///
/// # Arguments
/// - `query` — Natural language search query
/// - `top_k` — Maximum number of results (default: 10)
#[tauri::command]
pub fn semantic_search(
    _embedding_state: State<'_, EmbeddingServiceState>,
    vector_state: State<'_, VectorStoreState>,
    query: String,
    top_k: Option<u32>,
) -> Result<Vec<SemanticSearchResult>, String> {
    if query.trim().is_empty() {
        return Ok(Vec::new());
    }

    let top_k = top_k.unwrap_or(10) as usize;

    // TODO: When ONNX is integrated:
    // 1. Generate embedding for the query text
    // 2. Search vector store by similarity
    // 3. Convert VectorSearchResult -> SemanticSearchResult
    //
    // let query_embedding = embedding_service::generate_embedding(&query);
    // let vector_results = vector_store_service::search_by_vector(&vector_state, &query_embedding, top_k)?;
    // let results = vector_results.into_iter().map(|r| SemanticSearchResult { ... }).collect();

    let vector_results = vector_store_service::search_by_vector(&vector_state, &[], top_k)?;

    let results: Vec<SemanticSearchResult> = vector_results
        .into_iter()
        .map(|r| SemanticSearchResult {
            file_path: r.file_path,
            section_heading: r.section_heading,
            chunk_text: r.chunk_text,
            score: r.score,
            start_line: r.start_line,
            end_line: r.end_line,
        })
        .collect();

    Ok(results)
}

/// Execute a hybrid (keyword + semantic) search across the vault.
///
/// IPC command: `semantic_hybrid_search`
///
/// Combines keyword search (from Unit 4's Tantivy index) with semantic
/// vector search, blending the scores with configurable weights.
///
/// **STUB IMPLEMENTATION**: Returns an empty vector.
/// Will produce real results once both search backends are integrated.
///
/// # Arguments
/// - `query` — Natural language search query
/// - `top_k` — Maximum number of results (default: 10)
/// - `keyword_weight` — Weight for keyword search scores (default: 0.3)
/// - `semantic_weight` — Weight for semantic search scores (default: 0.7)
#[tauri::command]
pub fn semantic_hybrid_search(
    _embedding_state: State<'_, EmbeddingServiceState>,
    _vector_state: State<'_, VectorStoreState>,
    query: String,
    top_k: Option<u32>,
    keyword_weight: Option<f64>,
    semantic_weight: Option<f64>,
) -> Result<Vec<HybridSearchResult>, String> {
    if query.trim().is_empty() {
        return Ok(Vec::new());
    }

    let _top_k = top_k.unwrap_or(10) as usize;
    let _kw_weight = keyword_weight.unwrap_or(0.3);
    let _sem_weight = semantic_weight.unwrap_or(0.7);

    // TODO: When both backends are integrated:
    // 1. Run keyword search (via search_service::search_keyword)
    // 2. Run semantic search (generate embedding, search vector store)
    // 3. Merge results by file_path + chunk overlap
    // 4. Calculate combined_score = kw_weight * keyword_score + sem_weight * semantic_score
    // 5. Sort by combined_score descending
    // 6. Return top_k results

    Ok(Vec::new())
}

/// Get the current status of the semantic search index.
///
/// IPC command: `semantic_get_index_status`
///
/// Returns information about the index build state, including
/// total files, indexed files, and whether a build is in progress.
///
/// # Returns
/// An `IndexStatus` struct with current index state.
#[tauri::command]
pub fn semantic_get_index_status(
    vector_state: State<'_, VectorStoreState>,
) -> Result<IndexStatus, String> {
    vector_store_service::get_index_status(&vector_state)
}

/// Trigger a full rebuild of the semantic search index.
///
/// IPC command: `semantic_rebuild_index`
///
/// Clears all existing chunks and re-indexes every Markdown file
/// in the vault. This operation runs in the background and emits
/// progress events.
///
/// **STUB IMPLEMENTATION**: Logs a message and returns immediately.
///
/// Events emitted (future):
/// - `semantic:index_progress` — `{ current: u32, total: u32 }` during build
/// - `semantic:index_completed` — `{ totalFiles: u32, duration_ms: u64 }` on completion
#[tauri::command]
pub fn semantic_rebuild_index(
    vector_state: State<'_, VectorStoreState>,
) -> Result<(), String> {
    println!("[Unit 5] semantic_rebuild_index called (stub)");
    vector_store_service::rebuild_index(&vector_state)
}

/// Send a message to the RAG-powered AI chat.
///
/// IPC command: `semantic_chat`
///
/// Retrieves relevant document chunks via semantic search, constructs
/// a prompt with context, and returns an AI-generated response with
/// references to source documents.
///
/// **STUB IMPLEMENTATION**: Returns a placeholder response with a
/// generated session ID.
///
/// TODO: When LLM integration is added:
/// 1. Retrieve top-K relevant chunks via semantic search
/// 2. Build a RAG prompt: system message + context chunks + user message
/// 3. Call LLM API (local model via ort or remote API)
/// 4. Parse response and extract/verify references
/// 5. Return ChatResponse with session tracking
///
/// # Arguments
/// - `message` — The user's chat message
/// - `session_id` — Optional session ID for conversation continuity.
///                   If None, a new session is created.
#[tauri::command]
pub fn semantic_chat(
    _embedding_state: State<'_, EmbeddingServiceState>,
    _vector_state: State<'_, VectorStoreState>,
    message: String,
    session_id: Option<String>,
) -> Result<ChatResponse, String> {
    let session = session_id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    // Stub: return a placeholder response indicating the feature is not yet active.
    Ok(ChatResponse {
        session_id: session,
        message: format!(
            "RAG chat is not yet active. Your message was: \"{}\". \
             This feature will be available once the embedding model and \
             vector store are fully integrated.",
            message
        ),
        references: Vec::new(),
    })
}

#[cfg(test)]
mod tests {
    use crate::models::semantic::{ChatReference, ChatResponse};

    // Note: Tauri command functions require State<'_> which cannot be easily
    // constructed in unit tests. Integration tests with a full Tauri app
    // handle or the use of tauri::test utilities would be needed.
    //
    // The underlying service functions are tested in their respective modules.
    // These tests verify the model types and serialization.

    #[test]
    fn test_chat_reference_creation() {
        let reference = ChatReference {
            file_path: "notes/test.md".to_string(),
            section_heading: Some("Introduction".to_string()),
            score: 0.95,
        };
        assert_eq!(reference.file_path, "notes/test.md");
        assert_eq!(reference.score, 0.95);
    }

    #[test]
    fn test_chat_response_creation() {
        let response = ChatResponse {
            session_id: "test-session".to_string(),
            message: "Test response".to_string(),
            references: vec![],
        };
        assert_eq!(response.session_id, "test-session");
        assert!(response.references.is_empty());
    }
}
