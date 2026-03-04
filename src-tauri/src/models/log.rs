use serde::{Deserialize, Serialize};

/// The type of system-level capture event.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum CaptureEventType {
    FileCreated,
    FileModified,
    FileDeleted,
    FileRenamed,
    GitCommit,
    GitPush,
    GitPull,
    TerminalCommand,
}

/// A system-level capture event recording file, git, or terminal activity.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureEvent {
    pub id: String,
    pub event_type: CaptureEventType,
    pub timestamp: String,
    pub file_path: Option<String>,
    pub agent_id: Option<String>,
    pub summary: String,
    pub raw_data: Option<String>,
}

/// A session log entry representing one agent work session.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionLog {
    pub id: String,
    pub agent_name: String,
    pub date: String,
    pub session_number: u32,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub summary: Option<String>,
    pub file_path: String,
}

/// A summary of a single session within a daily log.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionLogSummary {
    pub agent_name: String,
    pub summary: String,
    pub files_changed: u32,
    pub commits: u32,
}

/// A daily aggregation of all session logs for a given date.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyLog {
    pub id: String,
    pub date: String,
    pub sessions: Vec<SessionLogSummary>,
    pub total_files_changed: u32,
    pub total_commits: u32,
    pub file_path: String,
}

/// Status of the ambient background agent.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AmbientStatus {
    pub is_running: bool,
    pub last_check_at: Option<String>,
    pub task_completion_rate: f64,
}

/// Result of a periodic task check performed by the ambient agent.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskCheckResult {
    pub agent_id: String,
    pub agent_name: String,
    pub task: String,
    pub is_completed: bool,
    pub checked_at: String,
    pub message: Option<String>,
}
