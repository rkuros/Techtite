use std::path::PathBuf;
use std::sync::Arc;

use tauri::State;

use crate::models::project::Project;
use crate::services::{project_service, watcher_service};
use crate::AppState;

#[tauri::command]
pub fn list_projects(state: State<'_, AppState>) -> Result<Vec<Project>, String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;
    project_service::list_projects(&vault.path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_active_project(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    project_path: String,
) -> Result<(), String> {
    let path = PathBuf::from(&project_path);
    if !path.exists() || !path.is_dir() {
        return Err(format!("Invalid project path: {}", project_path));
    }

    let mut active = state.active_root.lock().map_err(|e| e.to_string())?;
    *active = Some(path.clone());
    drop(active);

    // Restart file watcher on new root
    watcher_service::start_watching(
        app_handle,
        path,
        Arc::clone(&state.watcher_state),
    )?;

    // Save session
    let vault_path = {
        let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
        vault
            .as_ref()
            .map(|v| v.path.to_string_lossy().to_string())
            .ok_or("No vault open")?
    };
    project_service::save_session(&vault_path, Some(&project_path))
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn clear_active_project(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Reset to vault root
    let vault_path = {
        let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
        let v = vault.as_ref().ok_or("No vault open")?;
        v.path.clone()
    };

    let mut active = state.active_root.lock().map_err(|e| e.to_string())?;
    *active = Some(vault_path.clone());
    drop(active);

    // Restart watcher on vault root
    watcher_service::start_watching(
        app_handle,
        vault_path.clone(),
        Arc::clone(&state.watcher_state),
    )?;

    // Save session without project
    let vault_str = vault_path.to_string_lossy().to_string();
    project_service::save_session(&vault_str, None).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn add_custom_project(state: State<'_, AppState>, path: String) -> Result<Project, String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;
    let project_path = PathBuf::from(&path);
    project_service::add_custom_project(&vault.path, &project_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_custom_project(state: State<'_, AppState>, project_id: String) -> Result<(), String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;
    project_service::remove_custom_project(&vault.path, &project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn select_project_folder(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let folder = app_handle.dialog().file().blocking_pick_folder();
    Ok(folder.map(|p| p.to_string()))
}

#[tauri::command]
pub fn get_session() -> Result<Option<project_service::SessionState>, String> {
    project_service::load_session().map_err(|e| e.to_string())
}
