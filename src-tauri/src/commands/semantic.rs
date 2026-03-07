use std::path::PathBuf;

use tauri::State;

use crate::models::semantic::{ChatResponse, HybridSearchResult, IndexStatus, SemanticSearchResult};
use crate::services::embedding_service::{self, EmbeddingServiceState};
use crate::services::vector_store_service::{self, ChunkWithVector, VectorStoreState};
use crate::AppState;

/// Execute a semantic (vector similarity) search across the vault.
///
/// IPC command: `semantic_search`
///
/// Generates an embedding for the query text, then searches the vector
/// store for the most similar chunks. Returns results ranked by cosine
/// similarity score.
#[tauri::command]
pub fn semantic_search(
    embedding_state: State<'_, EmbeddingServiceState>,
    vector_state: State<'_, VectorStoreState>,
    query: String,
    top_k: Option<u32>,
) -> Result<Vec<SemanticSearchResult>, String> {
    if query.trim().is_empty() {
        return Ok(Vec::new());
    }

    let top_k = top_k.unwrap_or(10) as usize;

    // Generate embedding for the query
    let query_embedding = embedding_state.generate_embedding(&query)?;

    // Search vector store by similarity
    let vector_results = vector_store_service::search_by_vector(&vector_state, &query_embedding, top_k)?;

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
/// **STUB IMPLEMENTATION**: Returns an empty vector.
/// Will produce real results once both search backends are integrated.
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

    // TODO: Combine keyword search + semantic search
    Ok(Vec::new())
}

/// Get the current status of the semantic search index.
///
/// IPC command: `semantic_get_index_status`
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
/// Walks all .md files in the vault, chunks them, generates embeddings,
/// and stores the vectors in the SQLite database.
#[tauri::command]
pub fn semantic_rebuild_index(
    app_state: State<'_, AppState>,
    embedding_state: State<'_, EmbeddingServiceState>,
    vector_state: State<'_, VectorStoreState>,
) -> Result<(), String> {
    // Get vault path
    let vault = app_state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault_path = vault
        .as_ref()
        .map(|v| PathBuf::from(&v.path))
        .ok_or("No vault open")?;

    println!("[Unit 5] Starting semantic index rebuild for {}", vault_path.display());

    // Clear existing index
    vector_store_service::rebuild_index(&vector_state)?;

    // Collect all .md files
    let md_files = collect_md_files(&vault_path);
    let total_files = md_files.len() as u32;

    // Set building status and total_files atomically in a single lock scope
    {
        let mut status = vector_state.status.lock().map_err(|e| e.to_string())?;
        status.is_building = true;
        status.total_files = total_files;
    }

    let config = {
        let cfg = embedding_state.config.lock().map_err(|e| e.to_string())?;
        cfg.clone()
    };

    let mut indexed_count: u32 = 0;

    for (relative_path, full_path) in &md_files {
        let content = match std::fs::read_to_string(full_path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let chunks = embedding_service::chunk_markdown(&content, relative_path, &config);
        if chunks.is_empty() {
            continue;
        }

        // Collect chunk texts for batch embedding
        let texts: Vec<&str> = chunks.iter().map(|c| c.text.as_str()).collect();

        let embeddings = match embedding_state.generate_embeddings(texts) {
            Ok(e) => e,
            Err(err) => {
                eprintln!(
                    "[Unit 5] Warning: Failed to generate embeddings for {}: {}",
                    relative_path, err
                );
                continue;
            }
        };

        // Build ChunkWithVector entries
        let chunks_with_vectors: Vec<ChunkWithVector> = chunks
            .into_iter()
            .zip(embeddings.into_iter())
            .map(|(chunk, vector)| ChunkWithVector {
                file_path: chunk.file_path,
                section_heading: chunk.section_heading,
                chunk_text: chunk.text,
                start_line: chunk.start_line,
                end_line: chunk.end_line,
                vector,
            })
            .collect();

        vector_store_service::upsert_file_chunks(&vector_state, &chunks_with_vectors)?;

        indexed_count += 1;
        if indexed_count % 10 == 0 {
            println!("[Unit 5] Indexed {}/{} files", indexed_count, total_files);
        }
    }

    // Update final status
    {
        let mut status = vector_state.status.lock().map_err(|e| e.to_string())?;
        status.is_building = false;
        status.indexed_files = indexed_count;
        status.last_updated_at = Some(chrono::Utc::now().to_rfc3339());
    }

    println!(
        "[Unit 5] Semantic index rebuild complete: {}/{} files indexed",
        indexed_count, total_files
    );

    Ok(())
}

/// Send a message to the RAG-powered AI chat.
///
/// IPC command: `semantic_chat`
///
/// **STUB IMPLEMENTATION**: Returns a placeholder response.
/// Claude API integration is a separate task.
#[tauri::command]
pub fn semantic_chat(
    _embedding_state: State<'_, EmbeddingServiceState>,
    _vector_state: State<'_, VectorStoreState>,
    message: String,
    session_id: Option<String>,
) -> Result<ChatResponse, String> {
    let session = session_id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    Ok(ChatResponse {
        session_id: session,
        message: format!(
            "RAG chat is not yet active. Your message was: \"{}\". \
             This feature will be available once the LLM API is integrated.",
            message
        ),
        references: Vec::new(),
    })
}

/// Walk the vault directory and collect all `.md` file paths.
fn collect_md_files(vault_root: &std::path::Path) -> Vec<(String, PathBuf)> {
    let mut files = Vec::new();
    collect_md_files_recursive(vault_root, vault_root, &mut files);
    files
}

fn collect_md_files_recursive(
    vault_root: &std::path::Path,
    dir: &std::path::Path,
    files: &mut Vec<(String, PathBuf)>,
) {
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if name.starts_with('.') || name == "node_modules" || name == "target" {
            continue;
        }

        if path.is_dir() {
            collect_md_files_recursive(vault_root, &path, files);
        } else if path.extension().and_then(|e| e.to_str()) == Some("md") {
            let relative = path
                .strip_prefix(vault_root)
                .unwrap_or(&path)
                .to_string_lossy()
                .to_string();
            files.push((relative, path));
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::models::semantic::{ChatReference, ChatResponse};

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
