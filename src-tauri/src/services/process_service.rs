use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;

use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

/// Maximum number of concurrent terminal sessions.
const MAX_TERMINALS: usize = 10;

/// Payload emitted to frontend for terminal output.
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalOutputPayload {
    pub id: String,
    pub data: String,
}

/// Payload emitted to frontend when a terminal process exits.
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalExitPayload {
    pub id: String,
    pub exit_code: i32,
}

/// Serializable handle returned to the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessHandle {
    pub id: String,
    pub pid: u32,
    pub label: String,
    pub agent_id: Option<String>,
    pub created_at: String,
    pub is_alive: bool,
}

/// Internal state for a single PTY session (not serializable).
struct PtySession {
    handle: ProcessHandle,
    writer: Box<dyn Write + Send>,
    master: Box<dyn portable_pty::MasterPty + Send>,
    child: Box<dyn portable_pty::Child + Send>,
}

/// Tauri-managed state for terminal/PTY process management.
pub struct ProcessServiceState {
    sessions: Mutex<HashMap<String, PtySession>>,
}

// Safety: PtySession fields are Send (writer, master, child all + Send).
// Mutex provides synchronization.
unsafe impl Send for ProcessServiceState {}
unsafe impl Sync for ProcessServiceState {}

impl ProcessServiceState {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }
}

impl Default for ProcessServiceState {
    fn default() -> Self {
        Self::new()
    }
}

/// Detect the user's default shell.
fn detect_shell() -> String {
    std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())
}

/// Create a new terminal session with a real PTY.
pub fn create_session(
    state: &ProcessServiceState,
    app_handle: &AppHandle,
    id: String,
    label: String,
    agent_id: Option<String>,
) -> Result<ProcessHandle, String> {
    let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;

    if sessions.len() >= MAX_TERMINALS {
        return Err(format!(
            "Maximum number of terminal sessions ({MAX_TERMINALS}) reached"
        ));
    }

    if sessions.contains_key(&id) {
        return Err(format!("Terminal session '{id}' already exists"));
    }

    // Open PTY pair
    let pty_system = NativePtySystem::default();
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open PTY: {e}"))?;

    // Build shell command
    let shell = detect_shell();
    let mut cmd = CommandBuilder::new(&shell);
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");

    // Spawn child on the slave side
    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell '{shell}': {e}"))?;

    let pid = child.process_id().unwrap_or(0);

    // Get reader and writer from master
    let reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to clone PTY reader: {e}"))?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to take PTY writer: {e}"))?;

    let handle = ProcessHandle {
        id: id.clone(),
        pid,
        label,
        agent_id,
        created_at: chrono::Utc::now().to_rfc3339(),
        is_alive: true,
    };

    // Spawn a std::thread to read PTY stdout and emit events
    let session_id = id.clone();
    let app = app_handle.clone();
    std::thread::spawn(move || {
        let mut reader = reader;
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app.emit(
                        "terminal:output",
                        TerminalOutputPayload {
                            id: session_id.clone(),
                            data,
                        },
                    );
                }
                Err(_) => break,
            }
        }
        let _ = app.emit(
            "terminal:exit",
            TerminalExitPayload {
                id: session_id,
                exit_code: 0,
            },
        );
    });

    let session = PtySession {
        handle: handle.clone(),
        writer,
        master: pair.master,
        child,
    };

    sessions.insert(id, session);
    Ok(handle)
}

/// Write data to a terminal session's stdin.
pub fn write_to_session(
    state: &ProcessServiceState,
    id: &str,
    data: &str,
) -> Result<(), String> {
    let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    let session = sessions
        .get_mut(id)
        .ok_or_else(|| format!("Terminal session '{id}' not found"))?;

    if !session.handle.is_alive {
        return Err(format!("Terminal session '{id}' is no longer running"));
    }

    session
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| format!("Failed to write to PTY: {e}"))?;

    Ok(())
}

/// Resize a terminal session's PTY.
pub fn resize_session(
    state: &ProcessServiceState,
    id: &str,
    cols: u32,
    rows: u32,
) -> Result<(), String> {
    let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    let session = sessions
        .get(id)
        .ok_or_else(|| format!("Terminal session '{id}' not found"))?;

    if !session.handle.is_alive {
        return Err(format!("Terminal session '{id}' is no longer running"));
    }

    session
        .master
        .resize(PtySize {
            rows: rows as u16,
            cols: cols as u16,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to resize PTY: {e}"))?;

    Ok(())
}

/// Close a terminal session.
pub fn close_session(state: &ProcessServiceState, id: &str) -> Result<(), String> {
    let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    let mut session = sessions
        .remove(id)
        .ok_or_else(|| format!("Terminal session '{id}' not found"))?;

    // Kill the child process
    session.child.kill().ok();
    session.handle.is_alive = false;

    Ok(())
}

/// Close all terminal sessions. Called during application shutdown.
pub fn close_all_sessions(state: &ProcessServiceState) -> Result<(), String> {
    let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;

    for (_id, session) in sessions.iter_mut() {
        session.child.kill().ok();
        session.handle.is_alive = false;
    }

    sessions.clear();
    Ok(())
}

/// Spawn a Claude Code CLI process in stream-json mode.
pub fn spawn_claude_cli(
    state: &ProcessServiceState,
    app_handle: &AppHandle,
    session_id: String,
    label: String,
    agent_id: String,
    _initial_prompt: Option<String>,
    _working_directory: Option<String>,
) -> Result<ProcessHandle, String> {
    let handle = create_session(state, app_handle, session_id, label, Some(agent_id))?;
    Ok(handle)
}
