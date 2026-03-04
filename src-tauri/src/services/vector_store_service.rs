use std::sync::Mutex;

use serde::{Deserialize, Serialize};

use crate::models::semantic::IndexStatus;

// ---------------------------------------------------------------------------
// sqlite-vss vector store integration stub
//
// TODO: Add the following to Cargo.toml dependencies:
//   rusqlite = { version = "0.31", features = ["bundled"] }
//   sqlite-vss = "0.1"   # Or use rusqlite's loadable extension mechanism
//
// Once rusqlite + sqlite-vss are added, this module should:
//   1. Create a SQLite database at `<vault>/.techtite/vector_store.db`
//   2. Create tables:
//      - `chunks` (id INTEGER PK, file_path TEXT, section_heading TEXT,
//                   chunk_text TEXT, start_line INT, end_line INT,
//                   created_at TEXT, file_hash TEXT)
//      - `vss_chunks` (virtual table via sqlite-vss for vector similarity search)
//   3. Provide CRUD operations for chunks and their embedding vectors
//   4. Implement vector similarity search using sqlite-vss's `vss_search`
//   5. Support incremental updates (delete old chunks for a file, insert new ones)
//   6. Maintain file hashes to detect when re-indexing is needed
//
// sqlite-vss setup (future):
//   ```sql
//   CREATE VIRTUAL TABLE vss_chunks USING vss0(
//     embedding(384)     -- 384-dimensional vectors for all-MiniLM-L6-v2
//   );
//   ```
//
// Search query (future):
//   ```sql
//   SELECT c.*, v.distance
//   FROM vss_chunks v
//   JOIN chunks c ON c.rowid = v.rowid
//   WHERE vss_search(v.embedding, ?)
//   LIMIT ?;
//   ```
//
// Alternative approach: If sqlite-vss proves difficult to integrate,
// consider using a pure-Rust solution like `hnsw` or `usearch` crate
// for approximate nearest neighbor search, with rusqlite for metadata storage.
//
// For now, all functions return stubs (empty results, default status).
// ---------------------------------------------------------------------------

/// A chunk with its associated embedding vector, ready for storage.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChunkWithVector {
    pub file_path: String,
    pub section_heading: Option<String>,
    pub chunk_text: String,
    pub start_line: u32,
    pub end_line: u32,
    /// The embedding vector for this chunk (384 dimensions).
    pub vector: Vec<f32>,
}

/// A result from vector similarity search.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VectorSearchResult {
    pub file_path: String,
    pub section_heading: Option<String>,
    pub chunk_text: String,
    pub start_line: u32,
    pub end_line: u32,
    /// Cosine similarity score (0.0 to 1.0, higher is more similar).
    pub score: f64,
}

/// Tauri-managed state for the vector store.
///
/// Holds the database connection (when integrated) and index status.
/// Wrapped in a Mutex for thread-safe access from Tauri command handlers.
pub struct VectorStoreState {
    /// Current index status (file counts, build state, etc.).
    pub status: Mutex<IndexStatus>,

    /// Whether the database has been initialized.
    /// TODO: Replace with `Option<rusqlite::Connection>` when rusqlite is added.
    pub is_initialized: Mutex<bool>,
}

impl VectorStoreState {
    pub fn new() -> Self {
        Self {
            status: Mutex::new(IndexStatus::default()),
            is_initialized: Mutex::new(false),
        }
    }
}

impl Default for VectorStoreState {
    fn default() -> Self {
        Self::new()
    }
}

/// Search the vector store for chunks similar to the query vector.
///
/// **STUB IMPLEMENTATION**: Returns an empty vector.
///
/// TODO: When rusqlite + sqlite-vss are integrated, this should:
///   1. Execute a vss_search query against the vss_chunks virtual table
///   2. Join with the chunks table to get full metadata
///   3. Return results ordered by similarity score (descending)
///   4. Filter results below a minimum score threshold
///
/// # Arguments
/// - `_state` — The vector store managed state
/// - `_query_vector` — The embedding vector of the search query
/// - `_top_k` — Maximum number of results to return
///
/// # Returns
/// An empty vector (stub).
pub fn search_by_vector(
    _state: &VectorStoreState,
    _query_vector: &[f32],
    _top_k: usize,
) -> Result<Vec<VectorSearchResult>, String> {
    // Stub: return empty results.
    // When sqlite-vss is integrated, this will perform actual vector search.
    Ok(Vec::new())
}

/// Get the current status of the semantic index.
///
/// **STUB IMPLEMENTATION**: Returns the default IndexStatus.
///
/// TODO: When integrated, this should query the database for:
///   - Total number of Markdown files in the vault
///   - Number of files that have been indexed (have chunks in the DB)
///   - Whether a build is currently in progress
///   - Timestamp of the last successful index update
///
/// # Arguments
/// - `state` — The vector store managed state
///
/// # Returns
/// The current `IndexStatus`.
pub fn get_index_status(state: &VectorStoreState) -> Result<IndexStatus, String> {
    let status = state.status.lock().map_err(|e| e.to_string())?;
    Ok(status.clone())
}

/// Insert or update chunks for a file in the vector store.
///
/// **STUB IMPLEMENTATION**: No-op, returns Ok.
///
/// TODO: When integrated, this should:
///   1. Begin a transaction
///   2. Delete all existing chunks for this file_path
///   3. Insert the new chunks into the `chunks` table
///   4. Insert the corresponding vectors into the `vss_chunks` virtual table
///   5. Update the file hash for change detection
///   6. Commit the transaction
///
/// # Arguments
/// - `_state` — The vector store managed state
/// - `_chunks` — The chunks with their embedding vectors
pub fn upsert_file_chunks(
    _state: &VectorStoreState,
    _chunks: &[ChunkWithVector],
) -> Result<(), String> {
    // Stub: no-op
    Ok(())
}

/// Delete all chunks for a specific file.
///
/// **STUB IMPLEMENTATION**: No-op, returns Ok.
///
/// TODO: When integrated, delete from both `chunks` and `vss_chunks` tables.
///
/// # Arguments
/// - `_state` — The vector store managed state
/// - `_file_path` — The file path whose chunks should be removed
pub fn delete_file_chunks(
    _state: &VectorStoreState,
    _file_path: &str,
) -> Result<(), String> {
    // Stub: no-op
    Ok(())
}

/// Rebuild the entire vector index from scratch.
///
/// **STUB IMPLEMENTATION**: Logs a message and returns Ok.
///
/// TODO: When integrated, this should:
///   1. Set index status to is_building = true
///   2. Clear all existing chunks and vectors
///   3. Walk the vault directory for all Markdown files
///   4. For each file (with concurrency limit from IndexConfig):
///      a. Read file content
///      b. Chunk with chunk_markdown()
///      c. Generate embeddings with generate_embedding()
///      d. Insert into the vector store
///      e. Emit semantic:index_progress event with current/total counts
///   5. Set index status to is_building = false, update last_updated_at
///   6. Emit semantic:index_completed event
///
/// # Arguments
/// - `state` — The vector store managed state
pub fn rebuild_index(state: &VectorStoreState) -> Result<(), String> {
    let mut status = state.status.lock().map_err(|e| e.to_string())?;
    // In a real implementation, this would kick off a background task.
    // For now, just log and set a reasonable default.
    status.is_building = false;
    status.total_files = 0;
    status.indexed_files = 0;
    println!("[Unit 5] semantic index rebuild requested (stub — no-op)");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vector_store_state_new() {
        let state = VectorStoreState::new();
        let initialized = state.is_initialized.lock().unwrap();
        assert!(!*initialized);
    }

    #[test]
    fn test_get_index_status_default() {
        let state = VectorStoreState::new();
        let status = get_index_status(&state).unwrap();
        assert_eq!(status.total_files, 0);
        assert_eq!(status.indexed_files, 0);
        assert!(!status.is_building);
        assert!(status.last_updated_at.is_none());
    }

    #[test]
    fn test_search_by_vector_stub() {
        let state = VectorStoreState::new();
        let query = vec![0.0_f32; 384];
        let results = search_by_vector(&state, &query, 10).unwrap();
        assert!(results.is_empty());
    }

    #[test]
    fn test_upsert_file_chunks_stub() {
        let state = VectorStoreState::new();
        let chunks = vec![ChunkWithVector {
            file_path: "test.md".to_string(),
            section_heading: Some("## Test".to_string()),
            chunk_text: "Test content".to_string(),
            start_line: 1,
            end_line: 5,
            vector: vec![0.0_f32; 384],
        }];
        assert!(upsert_file_chunks(&state, &chunks).is_ok());
    }

    #[test]
    fn test_delete_file_chunks_stub() {
        let state = VectorStoreState::new();
        assert!(delete_file_chunks(&state, "test.md").is_ok());
    }

    #[test]
    fn test_rebuild_index_stub() {
        let state = VectorStoreState::new();
        assert!(rebuild_index(&state).is_ok());
    }

    #[test]
    fn test_vector_search_result_serialization() {
        let result = VectorSearchResult {
            file_path: "notes/test.md".to_string(),
            section_heading: Some("Introduction".to_string()),
            chunk_text: "Sample text".to_string(),
            start_line: 1,
            end_line: 10,
            score: 0.92,
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("filePath"));
        assert!(json.contains("sectionHeading"));
        assert!(json.contains("chunkText"));
    }
}
