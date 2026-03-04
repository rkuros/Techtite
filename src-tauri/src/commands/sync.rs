use tauri::State;

use crate::models::git::{ConflictInfo, ConflictResolution, SyncState};
use crate::services::{conflict_service, git_service};
use crate::AppState;

/// Get the current sync state (status, lastSyncAt, errorMessage).
/// IPC: sync:get_state
#[tauri::command]
pub fn get_state(_state: State<'_, AppState>) -> Result<SyncState, String> {
    // TODO: Read from the actual SyncScheduler state managed in AppState.
    // For now, return default idle state.
    Ok(SyncState::default())
}

/// Trigger an immediate sync (bypass the interval timer).
/// IPC: sync:trigger_now
#[tauri::command]
pub fn trigger_now(_state: State<'_, AppState>) -> Result<(), String> {
    // TODO: Call sync_scheduler.trigger_now() from AppState.
    // The sync scheduler needs to be added to AppState and initialized
    // during app setup.
    //
    // Example:
    // let scheduler = state.sync_scheduler.lock().map_err(|e| e.to_string())?;
    // tokio::spawn(async move { scheduler.trigger_now(&app_handle).await });

    Ok(())
}

/// Set remote repository URL and authentication.
/// IPC: sync:set_remote
///
/// TODO (Unit 9): Store credentials via credential_service instead of
/// accepting them directly. The credential parameter should be passed
/// to credential_service::set() for secure OS keychain storage.
#[tauri::command]
pub fn set_remote(
    state: State<'_, AppState>,
    url: String,
    auth_type: String,
    credential: String,
) -> Result<(), String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;

    git_service::set_remote_url(&vault.path, &url).map_err(|e| e.to_string())?;

    // TODO (Unit 9): Store auth_type + credential in credential_service
    // credential_service::set("git_remote", &auth_type, &credential)?;
    let _ = (auth_type, credential);

    Ok(())
}

/// Test connection to the configured remote repository.
/// IPC: sync:test_connection
#[tauri::command]
pub fn test_connection(state: State<'_, AppState>) -> Result<bool, String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;

    git_service::test_remote_connection(&vault.path).map_err(|e| e.to_string())
}

/// Get a list of unresolved merge conflicts.
/// IPC: sync:get_conflicts
#[tauri::command]
pub fn get_conflicts(state: State<'_, AppState>) -> Result<Vec<ConflictInfo>, String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;

    conflict_service::get_unresolved_conflicts(&vault.path).map_err(|e| e.to_string())
}

/// Resolve a merge conflict for a specific file.
/// IPC: sync:resolve_conflict
///
/// The `resolution` parameter accepts: "local", "remote", or "merged".
/// When resolution is "merged", `merged_content` must be provided.
/// When resolution is "ai", the system attempts AI auto-resolution.
#[tauri::command]
pub fn resolve_conflict(
    state: State<'_, AppState>,
    path: String,
    resolution: String,
    merged_content: Option<String>,
) -> Result<(), String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;

    let conflict_resolution = match resolution.as_str() {
        "local" => ConflictResolution::Local,
        "remote" => ConflictResolution::Remote,
        "merged" => {
            let content = merged_content.ok_or("merged_content is required for 'merged' resolution")?;
            ConflictResolution::Merged { content }
        }
        "ai" => {
            // TODO (Unit 7): Implement AI-assisted resolution
            // 1. Find the conflict info for this path
            // 2. Call conflict_service::ai_resolve_conflict()
            // 3. If confidence is high enough, apply the resolution
            // 4. Otherwise, return an error suggesting manual resolution
            return Err(
                "AI conflict resolution not yet available. Please choose local or remote."
                    .to_string(),
            );
        }
        _ => {
            return Err(format!(
                "Invalid resolution: '{}'. Must be 'local', 'remote', 'merged', or 'ai'",
                resolution
            ));
        }
    };

    conflict_service::resolve_conflict(&vault.path, &path, conflict_resolution)
        .map_err(|e| e.to_string())?;

    // TODO: Emit sync:conflict_resolved event
    // app_handle.emit("sync:conflict_resolved", serde_json::json!({
    //     "path": path,
    //     "resolution": resolution,
    // }))?;

    Ok(())
}
