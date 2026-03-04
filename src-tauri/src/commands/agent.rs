use tauri::{AppHandle, Emitter, State};

use crate::models::agent::{
    AgentConfig, AgentInfo, AgentMode, AgentStatus, AgentType, OperationLogEntry,
};
use crate::services::agent_registry::{self, AgentRegistryState};
use crate::services::process_service::{self, ProcessServiceState};

/// List all registered agents.
///
/// Returns agents in all states (running, idle, completed, error, stopped).
/// The frontend can filter by status as needed.
///
/// IPC: `agent:list`
/// Input: (none)
/// Output: `AgentInfo[]`
#[tauri::command]
pub fn agent_list(state: State<'_, AgentRegistryState>) -> Result<Vec<AgentInfo>, String> {
    agent_registry::list(&state)
}

/// Start a new agent.
///
/// CLI mode: Spawns Claude Code as a PTY process with `--output-format stream-json`,
/// creates an associated terminal tab, and begins parsing the structured output
/// for operation tracking.
///
/// SDK mode: Intended for programmatic agent control via `@anthropic-ai/claude-code`
/// SDK in the frontend. Registers the agent in the backend for state tracking
/// but does not spawn a terminal process.
///
/// IPC: `agent:start`
/// Input: `AgentConfig`
/// Output: `AgentInfo`
#[tauri::command]
pub fn agent_start(
    config: AgentConfig,
    state: State<'_, AgentRegistryState>,
    process_state: State<'_, ProcessServiceState>,
    app: AppHandle,
) -> Result<AgentInfo, String> {
    let agent_id = uuid::Uuid::new_v4().to_string();
    let terminal_tab_id = match config.mode {
        AgentMode::Cli => Some(uuid::Uuid::new_v4().to_string()),
        AgentMode::Sdk => None, // SDK mode agents don't get terminal tabs
    };

    let mut agent = AgentInfo {
        id: agent_id.clone(),
        name: config.name.clone(),
        agent_type: AgentType::Worker,
        status: AgentStatus::Running,
        started_at: chrono::Utc::now().to_rfc3339(),
        current_task: config
            .initial_prompt
            .as_ref()
            .map(|p| {
                let truncated: String = p.chars().take(97).collect();
                if truncated.len() < p.len() {
                    format!("{}...", truncated)
                } else {
                    p.clone()
                }
            }),
        terminal_tab_id: terminal_tab_id.clone(),
        pid: None,
    };

    // Register the agent first
    let registered = agent_registry::register(&state, agent.clone())?;

    // For CLI mode, spawn the Claude Code process
    if let AgentMode::Cli = config.mode {
        if let Some(ref tab_id) = terminal_tab_id {
            let handle = process_service::spawn_claude_cli(
                &process_state,
                &app,
                tab_id.clone(),
                format!("Claude: {}", config.name),
                agent_id.clone(),
                config.initial_prompt,
                config.working_directory,
            )?;

            // Update agent with the actual PID
            agent.pid = Some(handle.pid);
            agent_registry::update_status(&state, &agent_id, AgentStatus::Running)?;
        }
    }

    // Emit status changed event
    let _ = app.emit("agent:status_changed", &registered);

    Ok(registered)
}

/// Stop a running agent.
///
/// Sends SIGTERM to the agent's process, updates the agent status to Stopped,
/// and cleans up the associated terminal session.
///
/// IPC: `agent:stop`
/// Input: `{ id: string }`
/// Output: `void`
#[tauri::command]
pub fn agent_stop(
    id: String,
    state: State<'_, AgentRegistryState>,
    process_state: State<'_, ProcessServiceState>,
    app: AppHandle,
) -> Result<(), String> {
    // Get agent info before stopping
    let agent = agent_registry::get(&state, &id)?
        .ok_or_else(|| format!("Agent '{id}' not found"))?;

    // Close the terminal session if one exists
    if let Some(ref tab_id) = agent.terminal_tab_id {
        // Ignore errors if the session is already closed
        let _ = process_service::close_session(&process_state, tab_id);
    }

    // Update agent status
    let updated = agent_registry::update_status(&state, &id, AgentStatus::Stopped)?;

    // Emit status changed event
    let _ = app.emit("agent:status_changed", &updated);

    Ok(())
}

/// Get operation log entries.
///
/// If `agent_id` is provided, returns entries for that specific agent.
/// Otherwise, returns entries for all agents in chronological order.
/// The `limit` parameter caps the number of returned entries (from the most recent).
///
/// IPC: `agent:get_operation_log`
/// Input: `{ agentId?: string, limit?: number }`
/// Output: `OperationLogEntry[]`
#[tauri::command]
pub fn agent_get_operation_log(
    agent_id: Option<String>,
    limit: Option<u32>,
    state: State<'_, AgentRegistryState>,
) -> Result<Vec<OperationLogEntry>, String> {
    agent_registry::get_operation_log(&state, agent_id.as_deref(), limit)
}
