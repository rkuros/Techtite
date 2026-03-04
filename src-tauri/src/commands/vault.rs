use std::path::{Path, PathBuf};
use std::sync::Arc;

use tauri::State;

use crate::models::vault::{Vault, VaultConfig};
use crate::services::link_index_service::{self, LinkIndexState};
use crate::services::tag_service::{self, TagIndexState};
use crate::services::{vault_service, watcher_service};
use crate::AppState;

/// Walk the vault directory and collect all `.md` file paths (relative to vault root).
fn collect_md_files(vault_root: &Path) -> Vec<(String, PathBuf)> {
    let mut files = Vec::new();
    collect_md_files_recursive(vault_root, vault_root, &mut files);
    files
}

fn collect_md_files_recursive(
    vault_root: &Path,
    dir: &Path,
    files: &mut Vec<(String, PathBuf)>,
) {
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files/directories and special dirs
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

/// Build the link and tag indices by scanning all `.md` files in the vault.
fn build_indices(
    vault_root: &Path,
    link_state: &LinkIndexState,
    tag_state: &TagIndexState,
) -> Result<(), String> {
    let md_files = collect_md_files(vault_root);

    let mut link_index = link_state.index.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut tag_index = tag_state.index.lock().map_err(|e| format!("Lock error: {}", e))?;

    // First pass: register all known files so link existence checks work
    for (relative_path, _) in &md_files {
        link_index_service::register_known_file(&mut link_index, relative_path);
    }

    // Second pass: extract links and tags from each file
    for (relative_path, full_path) in &md_files {
        let content = match std::fs::read_to_string(full_path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        link_index_service::update_file_index(&mut link_index, relative_path, &content);
        tag_service::update_file_tags(&mut tag_index, relative_path, &content);
    }

    Ok(())
}

#[tauri::command]
pub fn open(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    link_state: State<'_, LinkIndexState>,
    tag_state: State<'_, TagIndexState>,
    path: String,
) -> Result<Vault, String> {
    let vault_path = PathBuf::from(&path);
    let vault = vault_service::open_vault(&vault_path).map_err(|e| e.to_string())?;

    // Start file watcher
    watcher_service::start_watching(
        app_handle,
        vault_path.clone(),
        Arc::clone(&state.watcher_state),
    )?;

    // Build link and tag indices from vault contents
    build_indices(&vault_path, &link_state, &tag_state)?;

    // Store current vault
    let mut current = state.current_vault.lock().map_err(|e| e.to_string())?;
    *current = Some(vault.clone());

    Ok(vault)
}

#[tauri::command]
pub fn get_current(state: State<'_, AppState>) -> Result<Option<Vault>, String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    Ok(vault.clone())
}

#[tauri::command]
pub async fn select_folder(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let folder = app_handle
        .dialog()
        .file()
        .blocking_pick_folder();

    Ok(folder.map(|p| p.to_string()))
}

#[tauri::command]
pub fn get_config(state: State<'_, AppState>) -> Result<VaultConfig, String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;
    vault_service::get_config(&vault.path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_config(state: State<'_, AppState>, config: VaultConfig) -> Result<(), String> {
    let mut vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let v = vault.as_mut().ok_or("No vault open")?;
    vault_service::update_config(&v.path, &config).map_err(|e| e.to_string())?;
    v.config = config;
    Ok(())
}
