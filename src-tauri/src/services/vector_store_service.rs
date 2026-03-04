use std::sync::Mutex;

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

use crate::models::semantic::IndexStatus;
use crate::services::embedding_service::EMBEDDING_DIM;

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
/// Holds the SQLite database connection and index status.
/// Wrapped in a Mutex for thread-safe access from Tauri command handlers.
pub struct VectorStoreState {
    /// Current index status (file counts, build state, etc.).
    pub status: Mutex<IndexStatus>,

    /// The SQLite database connection, None until init_db() is called.
    pub db: Mutex<Option<Connection>>,
}

impl VectorStoreState {
    pub fn new() -> Self {
        Self {
            status: Mutex::new(IndexStatus::default()),
            db: Mutex::new(None),
        }
    }
}

impl Default for VectorStoreState {
    fn default() -> Self {
        Self::new()
    }
}

/// Initialize the vector store database at the given vault path.
///
/// Creates `<vault_path>/.techtite/vector_store.db` with the chunks table.
pub fn init_db(state: &VectorStoreState, vault_path: &std::path::Path) -> Result<(), String> {
    let db_dir = vault_path.join(".techtite");
    std::fs::create_dir_all(&db_dir)
        .map_err(|e| format!("Failed to create .techtite directory: {}", e))?;

    let db_path = db_dir.join("vector_store.db");
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open vector store DB: {}", e))?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_path TEXT NOT NULL,
            section_heading TEXT,
            chunk_text TEXT NOT NULL,
            start_line INTEGER NOT NULL,
            end_line INTEGER NOT NULL,
            vector BLOB NOT NULL,
            file_hash TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_chunks_file ON chunks(file_path);",
    )
    .map_err(|e| format!("Failed to create chunks table: {}", e))?;

    let mut db_guard = state.db.lock().map_err(|e| e.to_string())?;
    *db_guard = Some(conn);

    println!("[Unit 5] Vector store initialized at {}", db_path.display());
    Ok(())
}

/// Search the vector store for chunks similar to the query vector.
///
/// Loads all vectors from the database and computes cosine similarity
/// against the query vector. Returns top-k results sorted by score descending.
pub fn search_by_vector(
    state: &VectorStoreState,
    query_vector: &[f32],
    top_k: usize,
) -> Result<Vec<VectorSearchResult>, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let conn = match db_guard.as_ref() {
        Some(c) => c,
        None => return Ok(Vec::new()), // DB not initialized yet
    };

    if query_vector.is_empty() {
        return Ok(Vec::new());
    }

    let mut stmt = conn
        .prepare(
            "SELECT file_path, section_heading, chunk_text, start_line, end_line, vector FROM chunks",
        )
        .map_err(|e| format!("Query preparation failed: {}", e))?;

    let mut results: Vec<VectorSearchResult> = Vec::new();

    let rows = stmt
        .query_map([], |row| {
            let file_path: String = row.get(0)?;
            let section_heading: Option<String> = row.get(1)?;
            let chunk_text: String = row.get(2)?;
            let start_line: u32 = row.get(3)?;
            let end_line: u32 = row.get(4)?;
            let vector_blob: Vec<u8> = row.get(5)?;
            Ok((file_path, section_heading, chunk_text, start_line, end_line, vector_blob))
        })
        .map_err(|e| format!("Query execution failed: {}", e))?;

    for row_result in rows {
        let (file_path, section_heading, chunk_text, start_line, end_line, vector_blob) =
            row_result.map_err(|e| format!("Row read failed: {}", e))?;

        let stored_vector = blob_to_f32_vec(&vector_blob);
        if stored_vector.len() != EMBEDDING_DIM {
            continue; // Skip corrupt entries
        }

        let score = cosine_similarity(query_vector, &stored_vector);
        results.push(VectorSearchResult {
            file_path,
            section_heading,
            chunk_text,
            start_line,
            end_line,
            score,
        });
    }

    // Sort by score descending and take top-k
    results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    results.truncate(top_k);

    Ok(results)
}

/// Get the current status of the semantic index.
pub fn get_index_status(state: &VectorStoreState) -> Result<IndexStatus, String> {
    let status = state.status.lock().map_err(|e| e.to_string())?;
    Ok(status.clone())
}

/// Insert or update chunks for a file in the vector store.
///
/// Deletes all existing chunks for the file, then inserts the new ones.
pub fn upsert_file_chunks(
    state: &VectorStoreState,
    chunks: &[ChunkWithVector],
) -> Result<(), String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let conn = match db_guard.as_ref() {
        Some(c) => c,
        None => return Err("Vector store not initialized".to_string()),
    };

    if chunks.is_empty() {
        return Ok(());
    }

    let file_path = &chunks[0].file_path;

    // Delete existing chunks for this file
    conn.execute("DELETE FROM chunks WHERE file_path = ?1", params![file_path])
        .map_err(|e| format!("Failed to delete old chunks: {}", e))?;

    // Insert new chunks
    let mut stmt = conn
        .prepare(
            "INSERT INTO chunks (file_path, section_heading, chunk_text, start_line, end_line, vector)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        )
        .map_err(|e| format!("Insert preparation failed: {}", e))?;

    for chunk in chunks {
        let vector_blob = f32_vec_to_blob(&chunk.vector);
        stmt.execute(params![
            chunk.file_path,
            chunk.section_heading,
            chunk.chunk_text,
            chunk.start_line,
            chunk.end_line,
            vector_blob,
        ])
        .map_err(|e| format!("Failed to insert chunk: {}", e))?;
    }

    Ok(())
}

/// Delete all chunks for a specific file.
pub fn delete_file_chunks(
    state: &VectorStoreState,
    file_path: &str,
) -> Result<(), String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let conn = match db_guard.as_ref() {
        Some(c) => c,
        None => return Err("Vector store not initialized".to_string()),
    };

    conn.execute("DELETE FROM chunks WHERE file_path = ?1", params![file_path])
        .map_err(|e| format!("Failed to delete chunks: {}", e))?;

    Ok(())
}

/// Rebuild the entire vector index from scratch.
pub fn rebuild_index(state: &VectorStoreState) -> Result<(), String> {
    let mut status = state.status.lock().map_err(|e| e.to_string())?;
    status.is_building = false;
    status.total_files = 0;
    status.indexed_files = 0;

    // Clear all chunks if DB is initialized
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = db_guard.as_ref() {
        conn.execute("DELETE FROM chunks", [])
            .map_err(|e| format!("Failed to clear chunks: {}", e))?;
    }

    println!("[Unit 5] Vector index cleared for rebuild");
    Ok(())
}

// --- Vector BLOB conversion helpers ---

/// Convert an f32 slice to a byte blob for SQLite storage.
fn f32_vec_to_blob(v: &[f32]) -> Vec<u8> {
    bytemuck::cast_slice(v).to_vec()
}

/// Convert a byte blob from SQLite back to f32 vector.
fn blob_to_f32_vec(blob: &[u8]) -> Vec<f32> {
    if blob.len() % 4 != 0 {
        return Vec::new();
    }
    bytemuck::cast_slice(blob).to_vec()
}

/// Compute cosine similarity between two vectors.
fn cosine_similarity(a: &[f32], b: &[f32]) -> f64 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }

    let mut dot = 0.0_f64;
    let mut norm_a = 0.0_f64;
    let mut norm_b = 0.0_f64;

    for i in 0..a.len() {
        let ai = a[i] as f64;
        let bi = b[i] as f64;
        dot += ai * bi;
        norm_a += ai * ai;
        norm_b += bi * bi;
    }

    let denom = norm_a.sqrt() * norm_b.sqrt();
    if denom == 0.0 {
        0.0
    } else {
        dot / denom
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vector_store_state_new() {
        let state = VectorStoreState::new();
        let db = state.db.lock().unwrap();
        assert!(db.is_none());
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
    fn test_search_by_vector_no_db() {
        let state = VectorStoreState::new();
        let query = vec![0.0_f32; 384];
        let results = search_by_vector(&state, &query, 10).unwrap();
        assert!(results.is_empty());
    }

    #[test]
    fn test_search_by_vector_empty_query() {
        let state = VectorStoreState::new();
        let results = search_by_vector(&state, &[], 10).unwrap();
        assert!(results.is_empty());
    }

    #[test]
    fn test_f32_blob_roundtrip() {
        let original = vec![1.0_f32, 2.0, 3.0, -0.5, 0.0];
        let blob = f32_vec_to_blob(&original);
        let restored = blob_to_f32_vec(&blob);
        assert_eq!(original, restored);
    }

    #[test]
    fn test_blob_to_f32_invalid_length() {
        let blob = vec![0u8, 1, 2]; // Not multiple of 4
        let result = blob_to_f32_vec(&blob);
        assert!(result.is_empty());
    }

    #[test]
    fn test_cosine_similarity_identical() {
        let a = vec![1.0_f32, 0.0, 0.0];
        let score = cosine_similarity(&a, &a);
        assert!((score - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_cosine_similarity_orthogonal() {
        let a = vec![1.0_f32, 0.0, 0.0];
        let b = vec![0.0_f32, 1.0, 0.0];
        let score = cosine_similarity(&a, &b);
        assert!(score.abs() < 1e-6);
    }

    #[test]
    fn test_cosine_similarity_opposite() {
        let a = vec![1.0_f32, 0.0];
        let b = vec![-1.0_f32, 0.0];
        let score = cosine_similarity(&a, &b);
        assert!((score + 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_cosine_similarity_empty() {
        let score = cosine_similarity(&[], &[]);
        assert_eq!(score, 0.0);
    }

    #[test]
    fn test_cosine_similarity_different_lengths() {
        let a = vec![1.0_f32, 0.0];
        let b = vec![1.0_f32];
        let score = cosine_similarity(&a, &b);
        assert_eq!(score, 0.0);
    }

    #[test]
    fn test_init_db_and_crud() {
        let state = VectorStoreState::new();
        let tmp_dir = tempfile::tempdir().unwrap();

        // Initialize DB
        init_db(&state, tmp_dir.path()).unwrap();
        assert!(state.db.lock().unwrap().is_some());

        // Upsert chunks
        let chunks = vec![
            ChunkWithVector {
                file_path: "test.md".to_string(),
                section_heading: Some("## Test".to_string()),
                chunk_text: "Test content".to_string(),
                start_line: 1,
                end_line: 5,
                vector: vec![1.0_f32; EMBEDDING_DIM],
            },
            ChunkWithVector {
                file_path: "test.md".to_string(),
                section_heading: None,
                chunk_text: "More content".to_string(),
                start_line: 6,
                end_line: 10,
                vector: vec![0.5_f32; EMBEDDING_DIM],
            },
        ];
        upsert_file_chunks(&state, &chunks).unwrap();

        // Search
        let query = vec![1.0_f32; EMBEDDING_DIM];
        let results = search_by_vector(&state, &query, 10).unwrap();
        assert_eq!(results.len(), 2);
        // First result should be the one with identical vector
        assert_eq!(results[0].chunk_text, "Test content");
        assert!((results[0].score - 1.0).abs() < 1e-6);

        // Delete file chunks
        delete_file_chunks(&state, "test.md").unwrap();
        let results = search_by_vector(&state, &query, 10).unwrap();
        assert!(results.is_empty());
    }

    #[test]
    fn test_upsert_replaces_existing() {
        let state = VectorStoreState::new();
        let tmp_dir = tempfile::tempdir().unwrap();
        init_db(&state, tmp_dir.path()).unwrap();

        // Insert initial chunk
        let chunks_v1 = vec![ChunkWithVector {
            file_path: "doc.md".to_string(),
            section_heading: None,
            chunk_text: "Version 1".to_string(),
            start_line: 1,
            end_line: 1,
            vector: vec![1.0_f32; EMBEDDING_DIM],
        }];
        upsert_file_chunks(&state, &chunks_v1).unwrap();

        // Upsert with new content (should replace)
        let chunks_v2 = vec![ChunkWithVector {
            file_path: "doc.md".to_string(),
            section_heading: None,
            chunk_text: "Version 2".to_string(),
            start_line: 1,
            end_line: 1,
            vector: vec![1.0_f32; EMBEDDING_DIM],
        }];
        upsert_file_chunks(&state, &chunks_v2).unwrap();

        let query = vec![1.0_f32; EMBEDDING_DIM];
        let results = search_by_vector(&state, &query, 10).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].chunk_text, "Version 2");
    }

    #[test]
    fn test_rebuild_clears_chunks() {
        let state = VectorStoreState::new();
        let tmp_dir = tempfile::tempdir().unwrap();
        init_db(&state, tmp_dir.path()).unwrap();

        let chunks = vec![ChunkWithVector {
            file_path: "test.md".to_string(),
            section_heading: None,
            chunk_text: "Content".to_string(),
            start_line: 1,
            end_line: 1,
            vector: vec![1.0_f32; EMBEDDING_DIM],
        }];
        upsert_file_chunks(&state, &chunks).unwrap();

        rebuild_index(&state).unwrap();

        let query = vec![1.0_f32; EMBEDDING_DIM];
        let results = search_by_vector(&state, &query, 10).unwrap();
        assert!(results.is_empty());
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
