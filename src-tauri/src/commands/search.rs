use tauri::State;

use crate::models::search::{KeywordSearchQuery, KeywordSearchResult};
use crate::services::search_service;
use crate::AppState;

/// Execute a keyword-based full-text search across the vault.
/// IPC command: `knowledge:search_keyword`
///
/// Currently uses a direct file scanning approach as a stub.
/// Will be replaced with Tantivy-based search once the dependency is added.
#[tauri::command]
pub fn search_keyword(
    state: State<'_, AppState>,
    query: String,
    max_results: Option<u32>,
) -> Result<Vec<KeywordSearchResult>, String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;

    let search_query = KeywordSearchQuery {
        query,
        max_results: max_results.unwrap_or(50),
    };

    search_service::search_keyword(&vault.path, &search_query).map_err(|e| e.to_string())
}
