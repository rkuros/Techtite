use std::collections::HashMap;
use std::sync::Mutex;

use crate::models::agent::{AgentInfo, AgentStatus, OperationLogEntry, OperationType};

/// Maximum number of concurrent agents allowed.
const MAX_AGENTS: usize = 5;

/// Maximum number of operation log entries kept in memory.
const MAX_IN_MEMORY_LOG_ENTRIES: usize = 1000;

/// Tauri-managed state for agent lifecycle management.
///
/// Maintains a registry of all agents (running, idle, completed, etc.)
/// and an in-memory operation log buffer.
pub struct AgentRegistryState {
    pub agents: Mutex<HashMap<String, AgentInfo>>,
    pub operation_log: Mutex<Vec<OperationLogEntry>>,
}

impl AgentRegistryState {
    pub fn new() -> Self {
        Self {
            agents: Mutex::new(HashMap::new()),
            operation_log: Mutex::new(Vec::new()),
        }
    }
}

impl Default for AgentRegistryState {
    fn default() -> Self {
        Self::new()
    }
}

/// Register a new agent in the registry.
///
/// Returns an error if the maximum agent limit is reached.
pub fn register(state: &AgentRegistryState, agent: AgentInfo) -> Result<AgentInfo, String> {
    let mut agents = state.agents.lock().map_err(|e| e.to_string())?;

    // Count running agents only for the limit check
    let running_count = agents
        .values()
        .filter(|a| matches!(a.status, AgentStatus::Running | AgentStatus::Idle))
        .count();

    if running_count >= MAX_AGENTS {
        return Err(format!(
            "Maximum number of concurrent agents ({MAX_AGENTS}) reached"
        ));
    }

    agents.insert(agent.id.clone(), agent.clone());
    Ok(agent)
}

/// Get all agents in the registry.
pub fn list(state: &AgentRegistryState) -> Result<Vec<AgentInfo>, String> {
    let agents = state.agents.lock().map_err(|e| e.to_string())?;
    Ok(agents.values().cloned().collect())
}

/// Get a specific agent by ID.
pub fn get(state: &AgentRegistryState, id: &str) -> Result<Option<AgentInfo>, String> {
    let agents = state.agents.lock().map_err(|e| e.to_string())?;
    Ok(agents.get(id).cloned())
}

/// Update an agent's status.
///
/// Valid transitions:
/// - Running -> Idle, Completed, Error, Stopped
/// - Idle -> Running, Completed, Error, Stopped
/// - Error -> Stopped
/// - Completed and Stopped are terminal states
pub fn update_status(
    state: &AgentRegistryState,
    id: &str,
    new_status: AgentStatus,
) -> Result<AgentInfo, String> {
    let mut agents = state.agents.lock().map_err(|e| e.to_string())?;
    let agent = agents
        .get_mut(id)
        .ok_or_else(|| format!("Agent '{id}' not found"))?;

    agent.status = new_status;
    Ok(agent.clone())
}

/// Update an agent's current task description.
///
/// Called when parsing `type: "assistant"` messages from Claude Code's
/// stream-json output.
pub fn update_current_task(
    state: &AgentRegistryState,
    id: &str,
    task: Option<String>,
) -> Result<AgentInfo, String> {
    let mut agents = state.agents.lock().map_err(|e| e.to_string())?;
    let agent = agents
        .get_mut(id)
        .ok_or_else(|| format!("Agent '{id}' not found"))?;

    agent.current_task = task;
    Ok(agent.clone())
}

/// Record an operation performed by an agent.
///
/// Stores the entry in the in-memory buffer (capped at MAX_IN_MEMORY_LOG_ENTRIES)
/// and appends to the on-disk log at `<vault>/.techtite/agent_logs/`.
///
/// Called when:
/// - stream-json `type: "tool_use"` events indicate file operations
/// - File system watcher detects changes attributed to an agent
pub fn record_operation(
    state: &AgentRegistryState,
    entry: OperationLogEntry,
) -> Result<(), String> {
    let mut log = state.operation_log.lock().map_err(|e| e.to_string())?;

    log.push(entry);

    // Trim to keep only the most recent entries in memory
    if log.len() > MAX_IN_MEMORY_LOG_ENTRIES {
        let excess = log.len() - MAX_IN_MEMORY_LOG_ENTRIES;
        log.drain(..excess);
    }

    // TODO: Persist to <vault>/.techtite/agent_logs/<agent_id>.jsonl
    // let log_path = vault_path.join(".techtite/agent_logs").join(format!("{}.jsonl", entry.agent_id));
    // let line = serde_json::to_string(&entry)? + "\n";
    // fs::OpenOptions::new().append(true).create(true).open(log_path)?.write_all(line.as_bytes())?;

    Ok(())
}

/// Get operation log entries, optionally filtered by agent ID.
///
/// If `agent_id` is None, returns entries for all agents.
/// Results are ordered chronologically (oldest first).
pub fn get_operation_log(
    state: &AgentRegistryState,
    agent_id: Option<&str>,
    limit: Option<u32>,
) -> Result<Vec<OperationLogEntry>, String> {
    let log = state.operation_log.lock().map_err(|e| e.to_string())?;

    let filtered: Vec<OperationLogEntry> = log
        .iter()
        .filter(|entry| {
            agent_id
                .map(|id| entry.agent_id == id)
                .unwrap_or(true)
        })
        .cloned()
        .collect();

    // Apply limit from the end (most recent entries)
    let result = if let Some(limit) = limit {
        let limit = limit as usize;
        if filtered.len() > limit {
            filtered[filtered.len() - limit..].to_vec()
        } else {
            filtered
        }
    } else {
        filtered
    };

    Ok(result)
}

/// Remove an agent from the registry.
///
/// Typically called after an agent has been stopped and its resources
/// have been cleaned up.
pub fn remove(state: &AgentRegistryState, id: &str) -> Result<(), String> {
    let mut agents = state.agents.lock().map_err(|e| e.to_string())?;
    agents.remove(id);
    Ok(())
}

/// Parse a line of Claude Code's stream-json output.
///
/// The stream-json format emits newline-delimited JSON objects with a `type` field:
/// - `type: "assistant"` -> Update current task
/// - `type: "tool_use"` with file operations -> Record operation
/// - `type: "result"` -> Mark agent as completed
///
/// Unknown types are silently ignored for forward compatibility.
pub fn parse_stream_json_line(
    state: &AgentRegistryState,
    agent_id: &str,
    agent_name: &str,
    line: &str,
) -> Result<Option<OperationLogEntry>, String> {
    let value: serde_json::Value =
        serde_json::from_str(line).map_err(|e| format!("Failed to parse stream-json: {e}"))?;

    let msg_type = value
        .get("type")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    match msg_type {
        "assistant" => {
            // Extract message content as current task summary
            let content = value
                .get("message")
                .or_else(|| value.get("content"))
                .and_then(|v| v.as_str())
                .map(|s| {
                    // Truncate to reasonable length for display
                    let truncated: String = s.chars().take(197).collect();
                    if truncated.len() < s.len() {
                        format!("{}...", truncated)
                    } else {
                        s.to_string()
                    }
                });
            update_current_task(state, agent_id, content)?;
            Ok(None)
        }
        "tool_use" => {
            // Check if this is a file operation
            let tool_name = value
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("");

            let operation = match tool_name {
                "create_file" | "write_file" => Some(OperationType::Create),
                "edit_file" | "str_replace_editor" => Some(OperationType::Modify),
                "delete_file" => Some(OperationType::Delete),
                "rename_file" | "move_file" => Some(OperationType::Rename),
                _ => None,
            };

            if let Some(op) = operation {
                let target_path = value
                    .get("input")
                    .and_then(|i| i.get("path").or_else(|| i.get("file_path")))
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown")
                    .to_string();

                let summary = value
                    .get("input")
                    .and_then(|i| i.get("description"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());

                let entry = OperationLogEntry {
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    agent_id: agent_id.to_string(),
                    agent_name: agent_name.to_string(),
                    operation: op,
                    target_path,
                    summary,
                };

                record_operation(state, entry.clone())?;
                Ok(Some(entry))
            } else {
                Ok(None)
            }
        }
        "result" => {
            // Session completed
            update_status(state, agent_id, AgentStatus::Completed)?;
            Ok(None)
        }
        _ => {
            // Unknown type — ignore for forward compatibility
            Ok(None)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::agent::AgentType;

    fn make_agent(id: &str, name: &str) -> AgentInfo {
        AgentInfo {
            id: id.to_string(),
            name: name.to_string(),
            agent_type: AgentType::Worker,
            status: AgentStatus::Running,
            started_at: chrono::Utc::now().to_rfc3339(),
            current_task: None,
            terminal_tab_id: None,
            pid: None,
        }
    }

    #[test]
    fn test_register_and_list() {
        let state = AgentRegistryState::new();
        let agent = make_agent("a1", "Agent 1");
        register(&state, agent).unwrap();

        let agents = list(&state).unwrap();
        assert_eq!(agents.len(), 1);
        assert_eq!(agents[0].name, "Agent 1");
    }

    #[test]
    fn test_max_agents_enforced() {
        let state = AgentRegistryState::new();
        for i in 0..MAX_AGENTS {
            register(&state, make_agent(&format!("a{i}"), &format!("Agent {i}"))).unwrap();
        }
        let result = register(&state, make_agent("overflow", "Overflow"));
        assert!(result.is_err());
    }

    #[test]
    fn test_update_status() {
        let state = AgentRegistryState::new();
        register(&state, make_agent("a1", "Agent 1")).unwrap();

        let updated = update_status(&state, "a1", AgentStatus::Idle).unwrap();
        assert!(matches!(updated.status, AgentStatus::Idle));
    }

    #[test]
    fn test_record_and_get_operation_log() {
        let state = AgentRegistryState::new();
        register(&state, make_agent("a1", "Agent 1")).unwrap();

        let entry = OperationLogEntry {
            timestamp: chrono::Utc::now().to_rfc3339(),
            agent_id: "a1".to_string(),
            agent_name: "Agent 1".to_string(),
            operation: OperationType::Create,
            target_path: "src/main.rs".to_string(),
            summary: Some("Created main.rs".to_string()),
        };
        record_operation(&state, entry).unwrap();

        let log = get_operation_log(&state, Some("a1"), None).unwrap();
        assert_eq!(log.len(), 1);
        assert_eq!(log[0].target_path, "src/main.rs");

        // Filter by different agent returns empty
        let log = get_operation_log(&state, Some("a2"), None).unwrap();
        assert!(log.is_empty());
    }

    #[test]
    fn test_operation_log_limit() {
        let state = AgentRegistryState::new();
        register(&state, make_agent("a1", "Agent 1")).unwrap();

        for i in 0..10 {
            let entry = OperationLogEntry {
                timestamp: chrono::Utc::now().to_rfc3339(),
                agent_id: "a1".to_string(),
                agent_name: "Agent 1".to_string(),
                operation: OperationType::Modify,
                target_path: format!("file_{i}.rs"),
                summary: None,
            };
            record_operation(&state, entry).unwrap();
        }

        let log = get_operation_log(&state, None, Some(3)).unwrap();
        assert_eq!(log.len(), 3);
        // Should return the 3 most recent entries
        assert_eq!(log[0].target_path, "file_7.rs");
    }

    #[test]
    fn test_parse_stream_json_assistant() {
        let state = AgentRegistryState::new();
        register(&state, make_agent("a1", "Agent 1")).unwrap();

        let line = r#"{"type": "assistant", "message": "Analyzing the codebase..."}"#;
        let result = parse_stream_json_line(&state, "a1", "Agent 1", line).unwrap();
        assert!(result.is_none());

        let agent = get(&state, "a1").unwrap().unwrap();
        assert_eq!(agent.current_task.as_deref(), Some("Analyzing the codebase..."));
    }

    #[test]
    fn test_parse_stream_json_tool_use() {
        let state = AgentRegistryState::new();
        register(&state, make_agent("a1", "Agent 1")).unwrap();

        let line = r#"{"type": "tool_use", "name": "edit_file", "input": {"path": "src/lib.rs", "description": "Added new module"}}"#;
        let result = parse_stream_json_line(&state, "a1", "Agent 1", line).unwrap();
        assert!(result.is_some());

        let entry = result.unwrap();
        assert_eq!(entry.target_path, "src/lib.rs");
        assert!(matches!(entry.operation, OperationType::Modify));
    }

    #[test]
    fn test_parse_stream_json_result() {
        let state = AgentRegistryState::new();
        register(&state, make_agent("a1", "Agent 1")).unwrap();

        let line = r#"{"type": "result", "status": "success"}"#;
        parse_stream_json_line(&state, "a1", "Agent 1", line).unwrap();

        let agent = get(&state, "a1").unwrap().unwrap();
        assert!(matches!(agent.status, AgentStatus::Completed));
    }
}
