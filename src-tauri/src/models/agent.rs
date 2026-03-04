use serde::{Deserialize, Serialize};

/// Information about a running or completed agent.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentInfo {
    pub id: String,
    pub name: String,
    pub agent_type: AgentType,
    pub status: AgentStatus,
    pub started_at: String,
    pub current_task: Option<String>,
    pub terminal_tab_id: Option<String>,
    pub pid: Option<u32>,
}

/// The type of agent: Worker (task-oriented) or Ambient (background monitoring).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AgentType {
    Worker,
    Ambient,
}

/// Agent lifecycle status.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum AgentStatus {
    Running,
    Idle,
    Completed,
    Error { message: String },
    Stopped,
}

/// Configuration for launching a new agent.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentConfig {
    pub name: String,
    pub initial_prompt: Option<String>,
    pub working_directory: Option<String>,
    pub mode: AgentMode,
}

/// Agent execution mode: CLI (terminal-visible) or SDK (programmatic).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AgentMode {
    Cli,
    Sdk,
}

/// A log entry recording an agent's file operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationLogEntry {
    pub timestamp: String,
    pub agent_id: String,
    pub agent_name: String,
    pub operation: OperationType,
    pub target_path: String,
    pub summary: Option<String>,
}

/// The type of file operation performed by an agent.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OperationType {
    Create,
    Modify,
    Delete,
    Rename,
    Commit,
}
