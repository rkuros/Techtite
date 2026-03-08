use tauri::State;

use crate::models::note::{BacklinkEntry, GraphData, GraphFilter, InternalLink, TagInfo};
use crate::services::link_index_service::{self, LinkIndexState};
use crate::services::tag_service::{self, TagIndexState};
use crate::AppState;

/// Get outgoing internal links from a specific file.
/// IPC command: `knowledge:get_outgoing_links`
#[tauri::command]
pub fn get_outgoing_links(
    link_state: State<'_, LinkIndexState>,
    path: String,
) -> Result<Vec<InternalLink>, String> {
    let index = link_state
        .index
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    Ok(link_index_service::get_outgoing_links(&index, &path))
}

/// Get backlinks (incoming links) pointing to a specific file.
/// IPC command: `knowledge:get_backlinks`
#[tauri::command]
pub fn get_backlinks(
    link_state: State<'_, LinkIndexState>,
    path: String,
) -> Result<Vec<BacklinkEntry>, String> {
    let index = link_state
        .index
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    Ok(link_index_service::get_backlinks(&index, &path))
}

/// Get all tags in the vault with file counts.
/// IPC command: `knowledge:get_all_tags`
#[tauri::command]
pub fn get_all_tags(
    tag_state: State<'_, TagIndexState>,
) -> Result<Vec<TagInfo>, String> {
    let index = tag_state
        .index
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    Ok(tag_service::get_all_tags(&index))
}

/// Get file paths that contain a specific tag.
/// IPC command: `knowledge:get_files_by_tag`
#[tauri::command]
pub fn get_files_by_tag(
    tag_state: State<'_, TagIndexState>,
    tag: String,
) -> Result<Vec<String>, String> {
    let index = tag_state
        .index
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    Ok(tag_service::get_files_by_tag(&index, &tag))
}

/// Get graph data for the full vault graph visualization.
/// IPC command: `knowledge:get_graph_data`
#[tauri::command]
pub fn get_graph_data(
    link_state: State<'_, LinkIndexState>,
    filter: Option<GraphFilter>,
) -> Result<GraphData, String> {
    let index = link_state
        .index
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    let filter = filter.unwrap_or_default();
    Ok(link_index_service::build_graph_data(&index, &filter))
}

/// Get a local graph centered on a specific file.
/// IPC command: `knowledge:get_local_graph`
#[tauri::command]
pub fn get_local_graph(
    link_state: State<'_, LinkIndexState>,
    path: String,
    depth: Option<u32>,
) -> Result<GraphData, String> {
    let index = link_state
        .index
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    let depth = depth.unwrap_or(2);
    Ok(link_index_service::build_local_graph(&index, &path, depth))
}

/// Get unlinked mentions of a file throughout the vault.
/// IPC command: `knowledge:get_unlinked_mentions`
#[tauri::command]
pub fn get_unlinked_mentions(
    app_state: State<'_, AppState>,
    link_state: State<'_, LinkIndexState>,
    path: String,
) -> Result<Vec<BacklinkEntry>, String> {
    let vault = app_state
        .current_vault
        .lock()
        .map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;

    let index = link_state
        .index
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    link_index_service::get_unlinked_mentions(&index, &path, &vault.path)
        .map_err(|e| e.to_string())
}
