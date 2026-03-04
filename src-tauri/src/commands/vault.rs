use std::path::PathBuf;
use std::sync::Arc;

use tauri::State;

use crate::models::vault::{Vault, VaultConfig};
use crate::services::{vault_service, watcher_service};
use crate::AppState;

#[tauri::command]
pub fn open(app_handle: tauri::AppHandle, state: State<'_, AppState>, path: String) -> Result<Vault, String> {
    let vault_path = PathBuf::from(&path);
    let vault = vault_service::open_vault(&vault_path).map_err(|e| e.to_string())?;

    // Start file watcher
    watcher_service::start_watching(
        app_handle,
        vault_path,
        Arc::clone(&state.watcher_state),
    )?;

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
pub async fn select_folder() -> Result<Option<String>, String> {
    // Use native dialog via tauri-plugin-dialog
    // In actual implementation this would use the dialog plugin
    // For now return None as placeholder - actual dialog integration depends on runtime
    Ok(None)
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
