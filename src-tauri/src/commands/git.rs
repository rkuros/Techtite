use tauri::State;

use crate::models::git::{BranchInfo, CommitInfo, DiffHunk, GitStatus};
use crate::services::git_service;
use crate::AppState;

/// Get the current git status (staged, unstaged, untracked files).
/// IPC: git:get_status
#[tauri::command]
pub fn get_status(state: State<'_, AppState>) -> Result<GitStatus, String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;
    git_service::get_status(&vault.path).map_err(|e| e.to_string())
}

/// Stage specified files.
/// IPC: git:stage
#[tauri::command]
pub fn stage(state: State<'_, AppState>, paths: Vec<String>) -> Result<(), String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;
    git_service::stage(&vault.path, &paths).map_err(|e| e.to_string())?;

    // TODO: Emit git:status_changed event after staging
    // app_handle.emit("git:status_changed", &git_service::get_status(&vault.path)?)?;

    Ok(())
}

/// Unstage specified files.
/// IPC: git:unstage
#[tauri::command]
pub fn unstage(state: State<'_, AppState>, paths: Vec<String>) -> Result<(), String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;
    git_service::unstage(&vault.path, &paths).map_err(|e| e.to_string())?;

    // TODO: Emit git:status_changed event after unstaging

    Ok(())
}

/// Create a commit with the given message. Returns the commit hash.
/// IPC: git:commit
#[tauri::command]
pub fn commit(state: State<'_, AppState>, message: String) -> Result<String, String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;
    let hash = git_service::create_commit(&vault.path, &message).map_err(|e| e.to_string())?;

    // TODO: Emit git:status_changed event after commit (status should reset)
    // TODO: Notify sync_service to reset auto-commit batch timer

    Ok(hash)
}

/// Get diff hunks, optionally filtered to a specific file and staged/unstaged.
/// IPC: git:get_diff
#[tauri::command]
pub fn get_diff(
    state: State<'_, AppState>,
    path: Option<String>,
    staged: Option<bool>,
) -> Result<Vec<DiffHunk>, String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;
    git_service::get_diff(&vault.path, path.as_deref(), staged.unwrap_or(false))
        .map_err(|e| e.to_string())
}

/// Get commit history with optional limit and offset.
/// IPC: git:get_log
#[tauri::command]
pub fn get_log(
    state: State<'_, AppState>,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<Vec<CommitInfo>, String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;
    git_service::get_log(&vault.path, limit, offset).map_err(|e| e.to_string())
}

/// Get diff hunks for a specific commit.
/// IPC: git:get_commit_diff
#[tauri::command]
pub fn get_commit_diff(state: State<'_, AppState>, hash: String) -> Result<Vec<DiffHunk>, String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;
    git_service::get_commit_diff(&vault.path, &hash).map_err(|e| e.to_string())
}

/// Get all branches.
/// IPC: git:get_branches
#[tauri::command]
pub fn get_branches(state: State<'_, AppState>) -> Result<Vec<BranchInfo>, String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;
    git_service::get_branches(&vault.path).map_err(|e| e.to_string())
}

/// Create a new branch from HEAD.
/// IPC: git:create_branch
#[tauri::command]
pub fn create_branch(state: State<'_, AppState>, name: String) -> Result<(), String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;
    git_service::create_branch(&vault.path, &name).map_err(|e| e.to_string())
}

/// Checkout (switch to) an existing branch.
/// Errors if there are uncommitted changes.
/// IPC: git:checkout_branch
#[tauri::command]
pub fn checkout_branch(state: State<'_, AppState>, name: String) -> Result<(), String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;
    git_service::checkout_branch(&vault.path, &name).map_err(|e| e.to_string())?;

    // TODO: Emit git:status_changed event after branch switch

    Ok(())
}
