use tauri::State;

use crate::services::fs_service;
use crate::AppState;

#[tauri::command]
pub fn read_file(state: State<'_, AppState>, path: String) -> Result<String, String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;
    fs_service::read_file(&vault.path, &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_file(state: State<'_, AppState>, path: String, content: String) -> Result<(), String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;
    fs_service::write_file(&vault.path, &path, &content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_file(
    state: State<'_, AppState>,
    path: String,
    content: Option<String>,
) -> Result<(), String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;
    fs_service::create_file(&vault.path, &path, content.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_dir(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;
    fs_service::create_dir(&vault.path, &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;
    fs_service::delete(&vault.path, &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename(state: State<'_, AppState>, old_path: String, new_path: String) -> Result<(), String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;
    fs_service::rename(&vault.path, &old_path, &new_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn exists(state: State<'_, AppState>, path: String) -> Result<bool, String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;
    fs_service::exists(&vault.path, &path).map_err(|e| e.to_string())
}
