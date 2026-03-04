use tauri::State;

use crate::models::log::{AmbientStatus, DailyLog, SessionLog, TaskCheckResult};
use crate::services::ambient_service::{self, AmbientServiceState};
use crate::services::fs_service;
use crate::services::session_log_service::{self, SessionLogServiceState};
use crate::AppState;

/// List session logs with optional date and agent name filters.
///
/// IPC: `session_log:list`
/// Input: `{ date?: string, agentName?: string }`
/// Output: `SessionLog[]`
#[tauri::command]
pub fn session_log_list(
    date: Option<String>,
    agent_name: Option<String>,
    state: State<'_, SessionLogServiceState>,
) -> Result<Vec<SessionLog>, String> {
    session_log_service::list_session_logs(&state, date.as_deref(), agent_name.as_deref())
}

/// Get the daily log for a specific date.
///
/// Returns null if no daily log exists for the given date.
///
/// IPC: `session_log:get_daily`
/// Input: `{ date: string }`
/// Output: `DailyLog | null`
#[tauri::command]
pub fn session_log_get_daily(
    date: String,
    state: State<'_, SessionLogServiceState>,
) -> Result<Option<DailyLog>, String> {
    session_log_service::get_daily_log(&state, &date)
}

/// Read the content of a session log or daily log file.
///
/// The path should be relative to the vault root
/// (e.g., `.techtite/logs/2026-02-28/daily.md`).
///
/// IPC: `session_log:get_content`
/// Input: `{ path: string }`
/// Output: `string`
#[tauri::command]
pub fn session_log_get_content(
    path: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let vault = state.current_vault.lock().map_err(|e| e.to_string())?;
    let vault = vault.as_ref().ok_or("No vault open")?;
    fs_service::read_file(&vault.path, &path).map_err(|e| e.to_string())
}

/// Get the current ambient agent status.
///
/// IPC: `ambient:get_status`
/// Input: (none)
/// Output: `AmbientStatus`
#[tauri::command]
pub fn ambient_get_status(
    state: State<'_, AmbientServiceState>,
) -> Result<AmbientStatus, String> {
    ambient_service::get_status(&state)
}

/// Get all task check results from the ambient agent.
///
/// IPC: `ambient:get_check_results`
/// Input: (none)
/// Output: `TaskCheckResult[]`
#[tauri::command]
pub fn ambient_get_check_results(
    state: State<'_, AmbientServiceState>,
) -> Result<Vec<TaskCheckResult>, String> {
    ambient_service::get_check_results(&state)
}
