use tauri::State;

use crate::services::process_service::{self, ProcessServiceState};

/// Create a new terminal session.
///
/// Spawns a PTY process running the user's default shell and returns
/// the unique session ID. The session's stdout is bridged to
/// `terminal:output` events via the event system.
///
/// IPC: `terminal:create`
/// Input: `{ label?: string }`
/// Output: `string` (session ID)
#[tauri::command]
pub fn terminal_create(
    label: Option<String>,
    app_handle: tauri::AppHandle,
    state: State<'_, ProcessServiceState>,
) -> Result<String, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let label = label.unwrap_or_else(|| "Shell".to_string());

    let handle = process_service::create_session(&state, &app_handle, id.clone(), label, None)?;
    Ok(handle.id)
}

/// Send input data to a terminal session's stdin.
///
/// Forwards keystrokes from the frontend (xterm.js `onData` callback)
/// to the PTY process's stdin pipe.
///
/// IPC: `terminal:write`
/// Input: `{ id: string, data: string }`
/// Output: `void`
#[tauri::command]
pub fn terminal_write(
    id: String,
    data: String,
    state: State<'_, ProcessServiceState>,
) -> Result<(), String> {
    process_service::write_to_session(&state, &id, &data)
}

/// Resize a terminal session's PTY.
///
/// Called when xterm.js FitAddon recalculates the terminal dimensions
/// (e.g., when the panel is resized). Propagates the new cols/rows
/// to the underlying PTY.
///
/// IPC: `terminal:resize`
/// Input: `{ id: string, cols: number, rows: number }`
/// Output: `void`
#[tauri::command]
pub fn terminal_resize(
    id: String,
    cols: u32,
    rows: u32,
    state: State<'_, ProcessServiceState>,
) -> Result<(), String> {
    process_service::resize_session(&state, &id, cols, rows)
}

/// Close a terminal session.
///
/// Sends SIGTERM to the PTY process, waits for graceful shutdown
/// (5 second timeout), then SIGKILL if needed. Cleans up all
/// associated resources and removes the session from state.
///
/// IPC: `terminal:close`
/// Input: `{ id: string }`
/// Output: `void`
#[tauri::command]
pub fn terminal_close(
    id: String,
    state: State<'_, ProcessServiceState>,
) -> Result<(), String> {
    process_service::close_session(&state, &id)
}
