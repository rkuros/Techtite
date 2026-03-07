use tauri::State;

use crate::services::fs_service;
use crate::AppState;

fn get_active_root(state: &AppState) -> Result<std::path::PathBuf, String> {
    let root = state.active_root.lock().map_err(|e| e.to_string())?;
    root.clone().ok_or_else(|| "No vault or project open".to_string())
}

#[tauri::command]
pub fn read_file(state: State<'_, AppState>, path: String) -> Result<String, String> {
    let root = get_active_root(&state)?;
    fs_service::read_file(&root, &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_file(state: State<'_, AppState>, path: String, content: String) -> Result<(), String> {
    let root = get_active_root(&state)?;
    fs_service::write_file(&root, &path, &content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_file(
    state: State<'_, AppState>,
    path: String,
    content: Option<String>,
) -> Result<(), String> {
    let root = get_active_root(&state)?;
    fs_service::create_file(&root, &path, content.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_dir(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let root = get_active_root(&state)?;
    fs_service::create_dir(&root, &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let root = get_active_root(&state)?;
    fs_service::delete(&root, &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename(state: State<'_, AppState>, old_path: String, new_path: String) -> Result<(), String> {
    let root = get_active_root(&state)?;
    fs_service::rename(&root, &old_path, &new_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn exists(state: State<'_, AppState>, path: String) -> Result<bool, String> {
    let root = get_active_root(&state)?;
    fs_service::exists(&root, &path).map_err(|e| e.to_string())
}
