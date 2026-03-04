use std::path::Path;
use std::sync::Mutex;

use crate::models::search::{KeywordSearchQuery, KeywordSearchResult};
use crate::utils::error::TechtiteError;

// ---------------------------------------------------------------------------
// Tantivy integration stub
//
// TODO: Add `tantivy` and `lindera-tantivy` to Cargo.toml dependencies:
//   tantivy = "0.22"
//   lindera-tantivy = "0.30"   # Japanese tokenizer
//
// Once Tantivy is added, this module should:
//   1. Create a Tantivy index schema with fields: path, title, body, tags, modified_at
//   2. Build the index on vault open (full scan, background task)
//   3. Perform incremental updates on fs:changed events
//   4. Execute full-text search queries with highlight range calculation
//   5. Store the index in `<vault>/.techtite/search_index/`
//
// For now, this module provides a basic in-memory grep-like search
// that scans vault files directly. This is functional but slow for
// large vaults. The Tantivy implementation will replace this.
// ---------------------------------------------------------------------------

/// Search engine state.
/// Currently holds no state since we do direct file scanning.
/// When Tantivy is integrated, this will hold the Index and IndexReader.
pub struct SearchEngineState {
    /// Placeholder for future Tantivy index handle
    _initialized: Mutex<bool>,
}

impl SearchEngineState {
    pub fn new() -> Self {
        Self {
            _initialized: Mutex::new(false),
        }
    }
}

/// Execute a keyword search across the vault.
/// Currently uses direct file scanning as a stub implementation.
/// Will be replaced with Tantivy index search.
pub fn search_keyword(
    vault_root: &Path,
    query: &KeywordSearchQuery,
) -> Result<Vec<KeywordSearchResult>, TechtiteError> {
    let query_lower = query.query.to_lowercase();

    if query_lower.is_empty() {
        return Ok(Vec::new());
    }

    let max_results = query.max_results as usize;
    let mut results: Vec<KeywordSearchResult> = Vec::new();

    // Walk the vault directory and search Markdown files
    search_directory(vault_root, vault_root, &query_lower, max_results, &mut results)?;

    // Sort by relevance (number of matches, then by path)
    results.sort_by(|a, b| a.file_path.cmp(&b.file_path).then(a.line_number.cmp(&b.line_number)));

    Ok(results)
}

/// Recursively search a directory for keyword matches.
fn search_directory(
    vault_root: &Path,
    dir: &Path,
    query: &str,
    max_results: usize,
    results: &mut Vec<KeywordSearchResult>,
) -> Result<(), TechtiteError> {
    if results.len() >= max_results {
        return Ok(());
    }

    let entries = std::fs::read_dir(dir)?;

    for entry in entries {
        if results.len() >= max_results {
            break;
        }

        let entry = entry?;
        let path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files/directories and .techtite
        if file_name.starts_with('.') {
            continue;
        }

        if path.is_dir() {
            // Skip node_modules, target, etc.
            if file_name == "node_modules" || file_name == "target" {
                continue;
            }
            search_directory(vault_root, &path, query, max_results, results)?;
        } else {
            // Search text files (Markdown, code, etc.)
            let is_searchable = matches!(
                path.extension().and_then(|e| e.to_str()),
                Some("md" | "txt" | "rs" | "ts" | "tsx" | "js" | "jsx" | "json" | "toml" | "yaml" | "yml" | "css" | "html")
            );

            if is_searchable {
                search_file(vault_root, &path, query, max_results, results)?;
            }
        }
    }

    Ok(())
}

/// Search a single file for keyword matches.
fn search_file(
    vault_root: &Path,
    file_path: &Path,
    query: &str,
    max_results: usize,
    results: &mut Vec<KeywordSearchResult>,
) -> Result<(), TechtiteError> {
    let content = match std::fs::read_to_string(file_path) {
        Ok(c) => c,
        Err(_) => return Ok(()), // Skip unreadable files
    };

    let relative_path = file_path
        .strip_prefix(vault_root)
        .unwrap_or(file_path)
        .to_string_lossy()
        .to_string();

    for (line_idx, line) in content.lines().enumerate() {
        if results.len() >= max_results {
            break;
        }

        let line_lower = line.to_lowercase();
        if let Some(pos) = line_lower.find(query) {
            let line_number = (line_idx + 1) as u32;

            // Calculate highlight range
            let highlight_start = pos as u32;
            let highlight_end = (pos + query.len()) as u32;

            // Build context (the matched line, trimmed if too long)
            let context = if line.len() > 200 {
                let start = pos.saturating_sub(50);
                let end = (pos + query.len() + 50).min(line.len());
                format!("...{}...", &line[start..end])
            } else {
                line.to_string()
            };

            results.push(KeywordSearchResult {
                file_path: relative_path.clone(),
                line_number,
                context,
                highlight_ranges: vec![(highlight_start, highlight_end)],
            });
        }
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Future Tantivy implementation sketch (commented out)
// ---------------------------------------------------------------------------

/*
TODO: Tantivy implementation

use tantivy::schema::*;
use tantivy::{doc, Index, IndexWriter, ReloadPolicy};

pub fn create_tantivy_schema() -> Schema {
    let mut schema_builder = Schema::builder();
    schema_builder.add_text_field("path", STRING | STORED);
    schema_builder.add_text_field("title", TEXT | STORED);
    schema_builder.add_text_field("body", TEXT | STORED);
    schema_builder.add_text_field("tags", TEXT | STORED);
    schema_builder.add_u64_field("modified_at", INDEXED | STORED);
    schema_builder.build()
}

pub fn build_full_index(vault_root: &Path) -> Result<Index, TechtiteError> {
    let index_path = vault_root.join(".techtite").join("search_index");
    std::fs::create_dir_all(&index_path)?;

    let schema = create_tantivy_schema();
    let index = Index::create_in_dir(&index_path, schema.clone())?;

    // TODO: Configure Japanese tokenizer (lindera)
    // TODO: Walk vault, parse each file, add documents
    // TODO: Run in background with tokio::spawn

    Ok(index)
}
*/

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup_vault() -> TempDir {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path();

        std::fs::write(root.join("hello.md"), "Hello World\nThis is a test").unwrap();
        std::fs::write(root.join("rust.md"), "Learning Rust\n#rust #programming").unwrap();
        std::fs::create_dir_all(root.join("notes")).unwrap();
        std::fs::write(
            root.join("notes").join("daily.md"),
            "Daily note\nHello from daily",
        )
        .unwrap();

        dir
    }

    #[test]
    fn test_search_keyword_basic() {
        let dir = setup_vault();
        let query = KeywordSearchQuery {
            query: "hello".to_string(),
            max_results: 50,
        };

        let results = search_keyword(dir.path(), &query).unwrap();
        assert!(results.len() >= 2); // "hello.md" and "notes/daily.md"
    }

    #[test]
    fn test_search_keyword_case_insensitive() {
        let dir = setup_vault();
        let query = KeywordSearchQuery {
            query: "RUST".to_string(),
            max_results: 50,
        };

        let results = search_keyword(dir.path(), &query).unwrap();
        assert!(!results.is_empty());
    }

    #[test]
    fn test_search_keyword_max_results() {
        let dir = setup_vault();
        let query = KeywordSearchQuery {
            query: "a".to_string(),
            max_results: 1,
        };

        let results = search_keyword(dir.path(), &query).unwrap();
        assert!(results.len() <= 1);
    }

    #[test]
    fn test_search_keyword_empty_query() {
        let dir = setup_vault();
        let query = KeywordSearchQuery {
            query: "".to_string(),
            max_results: 50,
        };

        let results = search_keyword(dir.path(), &query).unwrap();
        assert!(results.is_empty());
    }
}
