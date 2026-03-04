use std::collections::HashMap;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

/// Maximum number of concurrent terminal sessions.
const MAX_TERMINALS: usize = 10;

/// Represents a managed PTY process handle.
///
/// In the real implementation, this would hold:
/// - A `ChildStdin` writer for sending input to the PTY
/// - A stdout reader task handle
/// - Process lifecycle tracking
///
/// Currently stubbed because `portable_pty` / full PTY support
/// is not yet added to Cargo.toml.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessHandle {
    pub id: String,
    pub pid: u32,
    pub label: String,
    pub agent_id: Option<String>,
    pub created_at: String,
    /// Whether the process is still running.
    pub is_alive: bool,
}

/// Tauri-managed state for terminal/PTY process management.
///
/// Holds a map of active terminal sessions keyed by session ID.
pub struct ProcessServiceState {
    pub sessions: Mutex<HashMap<String, ProcessHandle>>,
}

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

/// Create a new terminal session.
///
/// In the real implementation this would:
/// 1. Use `portable_pty` or `tauri-plugin-shell` to spawn a PTY process
/// 2. Set TERM=xterm-256color environment variable
/// 3. Spawn a tokio task to bridge stdout to `terminal:output` events
/// 4. Return the session ID
///
/// Currently returns a stub session with a placeholder PID.
pub fn create_session(
    state: &ProcessServiceState,
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

    let handle = ProcessHandle {
        id: id.clone(),
        pid: 0, // Stub: real implementation assigns actual PID
        label,
        agent_id,
        created_at: chrono::Utc::now().to_rfc3339(),
        is_alive: true,
    };

    // TODO: Spawn actual PTY process here
    // let pty_system = portable_pty::native_pty_system();
    // let pair = pty_system.openpty(PtySize { rows: 24, cols: 80, .. })?;
    // let cmd = CommandBuilder::new(shell);
    // let child = pair.slave.spawn_command(cmd)?;
    // let reader = pair.master.try_clone_reader()?;
    // let writer = pair.master.take_writer()?;
    //
    // // Spawn stdout bridge task
    // tokio::spawn(async move {
    //     let mut buf = [0u8; 4096];
    //     loop {
    //         match reader.read(&mut buf) {
    //             Ok(0) => break,
    //             Ok(n) => {
    //                 let data = String::from_utf8_lossy(&buf[..n]).to_string();
    //                 let _ = app.emit("terminal:output", TerminalOutputPayload { id, data });
    //             }
    //             Err(_) => break,
    //         }
    //     }
    //     let _ = app.emit("terminal:exit", TerminalExitPayload { id, exit_code: 0 });
    // });

    sessions.insert(id, handle.clone());
    Ok(handle)
}

/// Write data to a terminal session's stdin.
///
/// In the real implementation this would write to the PTY master's stdin.
pub fn write_to_session(
    state: &ProcessServiceState,
    id: &str,
    _data: &str,
) -> Result<(), String> {
    let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    let handle = sessions
        .get(id)
        .ok_or_else(|| format!("Terminal session '{id}' not found"))?;

    if !handle.is_alive {
        return Err(format!("Terminal session '{id}' is no longer running"));
    }

    // TODO: Write data to PTY stdin
    // handle.stdin_writer.write_all(data.as_bytes())?;

    Ok(())
}

/// Resize a terminal session's PTY.
///
/// In the real implementation this would call `pty.resize()` with the new dimensions.
pub fn resize_session(
    state: &ProcessServiceState,
    id: &str,
    _cols: u32,
    _rows: u32,
) -> Result<(), String> {
    let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    let handle = sessions
        .get(id)
        .ok_or_else(|| format!("Terminal session '{id}' not found"))?;

    if !handle.is_alive {
        return Err(format!("Terminal session '{id}' is no longer running"));
    }

    // TODO: Resize PTY
    // handle.pty_master.resize(PtySize { rows, cols, .. })?;

    Ok(())
}

/// Close a terminal session.
///
/// In the real implementation this would:
/// 1. Send SIGTERM to the child process
/// 2. Wait for graceful shutdown (timeout 5s)
/// 3. Send SIGKILL if still running
/// 4. Clean up resources
pub fn close_session(state: &ProcessServiceState, id: &str) -> Result<(), String> {
    let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    let handle = sessions
        .get_mut(id)
        .ok_or_else(|| format!("Terminal session '{id}' not found"))?;

    // TODO: Send SIGTERM, then SIGKILL after timeout
    // handle.child.kill()?;

    handle.is_alive = false;
    sessions.remove(id);
    Ok(())
}

/// Close all terminal sessions. Called during application shutdown.
pub fn close_all_sessions(state: &ProcessServiceState) -> Result<(), String> {
    let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;

    // TODO: Send SIGTERM to all processes, then SIGKILL after 5s timeout
    for (_id, handle) in sessions.iter_mut() {
        handle.is_alive = false;
    }

    sessions.clear();
    Ok(())
}

/// Spawn a Claude Code CLI process in stream-json mode.
///
/// In the real implementation this would:
/// 1. Spawn `claude --output-format stream-json` as a PTY process
/// 2. Parse NDJSON output to extract agent operations
/// 3. Emit `agent:operation` events for file changes
/// 4. Update agent status via `agent:status_changed` events
pub fn spawn_claude_cli(
    state: &ProcessServiceState,
    session_id: String,
    label: String,
    agent_id: String,
    _initial_prompt: Option<String>,
    _working_directory: Option<String>,
) -> Result<ProcessHandle, String> {
    // Create the session with agent_id association
    let handle = create_session(state, session_id, label, Some(agent_id))?;

    // TODO: Spawn Claude Code CLI process
    // let cmd = Command::new("claude")
    //     .args(["--output-format", "stream-json"])
    //     .env("TERM", "xterm-256color");
    //
    // if let Some(prompt) = initial_prompt {
    //     cmd.arg("--prompt").arg(prompt);
    // }
    //
    // if let Some(dir) = working_directory {
    //     cmd.current_dir(dir);
    // }
    //
    // // Spawn and set up NDJSON parser on stdout
    // tokio::spawn(async move {
    //     parse_stream_json(reader, agent_id, app).await;
    // });

    Ok(handle)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_and_close_session() {
        let state = ProcessServiceState::new();
        let handle =
            create_session(&state, "test-1".into(), "Shell".into(), None).unwrap();
        assert_eq!(handle.id, "test-1");
        assert!(handle.is_alive);

        close_session(&state, "test-1").unwrap();
        let sessions = state.sessions.lock().unwrap();
        assert!(!sessions.contains_key("test-1"));
    }

    #[test]
    fn test_duplicate_session_rejected() {
        let state = ProcessServiceState::new();
        create_session(&state, "dup".into(), "Shell".into(), None).unwrap();
        let result = create_session(&state, "dup".into(), "Shell 2".into(), None);
        assert!(result.is_err());
    }

    #[test]
    fn test_write_to_nonexistent_session() {
        let state = ProcessServiceState::new();
        let result = write_to_session(&state, "no-such", "hello");
        assert!(result.is_err());
    }

    #[test]
    fn test_close_all_sessions() {
        let state = ProcessServiceState::new();
        create_session(&state, "s1".into(), "Shell 1".into(), None).unwrap();
        create_session(&state, "s2".into(), "Shell 2".into(), None).unwrap();
        close_all_sessions(&state).unwrap();
        let sessions = state.sessions.lock().unwrap();
        assert!(sessions.is_empty());
    }
}
