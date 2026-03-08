use std::sync::Mutex;

use crate::models::log::{DailyLog, SessionLog, SessionLogSummary};

/// Tauri-managed state for session log management.
///
/// Maintains in-memory lists of session logs and daily logs.
/// Future versions will persist to `<vault>/.techtite/logs/`.
pub struct SessionLogServiceState {
    pub session_logs: Mutex<Vec<SessionLog>>,
    pub daily_logs: Mutex<Vec<DailyLog>>,
}

impl SessionLogServiceState {
    pub fn new() -> Self {
        Self {
            session_logs: Mutex::new(Vec::new()),
            daily_logs: Mutex::new(Vec::new()),
        }
    }
}

impl Default for SessionLogServiceState {
    fn default() -> Self {
        Self::new()
    }
}

/// Create a new session log entry in memory.
///
/// Automatically assigns a session number based on existing sessions
/// for the given date and agent.
pub fn create_session_log(
    state: &SessionLogServiceState,
    agent_name: &str,
    date: &str,
) -> Result<SessionLog, String> {
    let mut logs = state.session_logs.lock().map_err(|e| e.to_string())?;

    // Determine next session number for this date+agent
    let session_number = logs
        .iter()
        .filter(|l| l.date == date && l.agent_name == agent_name)
        .count() as u32
        + 1;

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let session = SessionLog {
        id: id.clone(),
        agent_name: agent_name.to_string(),
        date: date.to_string(),
        session_number,
        started_at: now,
        ended_at: None,
        summary: None,
        file_path: format!(".techtite/logs/{date}/{agent_name}_{session_number}.md"),
    };

    logs.push(session.clone());
    Ok(session)
}

/// List session logs with optional filters.
///
/// - `date`: Only return logs for this date (YYYY-MM-DD)
/// - `agent_name`: Only return logs for this agent
pub fn list_session_logs(
    state: &SessionLogServiceState,
    date: Option<&str>,
    agent_name: Option<&str>,
) -> Result<Vec<SessionLog>, String> {
    let logs = state.session_logs.lock().map_err(|e| e.to_string())?;

    let filtered: Vec<SessionLog> = logs
        .iter()
        .filter(|l| {
            if let Some(date) = date {
                if l.date != date {
                    return false;
                }
            }
            if let Some(name) = agent_name {
                if l.agent_name != name {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    Ok(filtered)
}

/// Get the daily log for a specific date.
///
/// Returns None if no daily log exists for the given date.
pub fn get_daily_log(
    state: &SessionLogServiceState,
    date: &str,
) -> Result<Option<DailyLog>, String> {
    let logs = state.daily_logs.lock().map_err(|e| e.to_string())?;
    Ok(logs.iter().find(|l| l.date == date).cloned())
}

/// Generate a daily log by aggregating session logs for the given date.
///
/// TODO: Integrate with Claude SDK to generate natural language summaries.
/// For now, creates a basic aggregation from in-memory session data.
pub fn generate_daily_log(
    state: &SessionLogServiceState,
    date: &str,
) -> Result<DailyLog, String> {
    let session_logs = state.session_logs.lock().map_err(|e| e.to_string())?;

    let sessions_for_date: Vec<&SessionLog> = session_logs
        .iter()
        .filter(|l| l.date == date)
        .collect();

    let summaries: Vec<SessionLogSummary> = sessions_for_date
        .iter()
        .map(|s| SessionLogSummary {
            agent_name: s.agent_name.clone(),
            summary: s
                .summary
                .clone()
                .unwrap_or_else(|| format!("Session {} (no summary yet)", s.session_number)),
            files_changed: 0, // TODO: Count from capture events
            commits: 0,       // TODO: Count from git events
        })
        .collect();

    let daily = DailyLog {
        id: uuid::Uuid::new_v4().to_string(),
        date: date.to_string(),
        sessions: summaries,
        total_files_changed: 0, // TODO: Aggregate from sessions
        total_commits: 0,       // TODO: Aggregate from sessions
        file_path: format!(".techtite/logs/{date}/daily.md"),
    };

    // Store the generated daily log
    let mut daily_logs = state.daily_logs.lock().map_err(|e| e.to_string())?;

    // Replace existing daily log for this date if present
    if let Some(pos) = daily_logs.iter().position(|l| l.date == date) {
        daily_logs[pos] = daily.clone();
    } else {
        daily_logs.push(daily.clone());
    }

    Ok(daily)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_session_log() {
        let state = SessionLogServiceState::new();
        let session = create_session_log(&state, "Agent A", "2026-02-28").unwrap();

        assert_eq!(session.agent_name, "Agent A");
        assert_eq!(session.date, "2026-02-28");
        assert_eq!(session.session_number, 1);
        assert!(session.ended_at.is_none());
    }

    #[test]
    fn test_session_number_increments() {
        let state = SessionLogServiceState::new();

        let s1 = create_session_log(&state, "Agent A", "2026-02-28").unwrap();
        let s2 = create_session_log(&state, "Agent A", "2026-02-28").unwrap();
        let s3 = create_session_log(&state, "Agent B", "2026-02-28").unwrap();

        assert_eq!(s1.session_number, 1);
        assert_eq!(s2.session_number, 2);
        // Different agent resets the count
        assert_eq!(s3.session_number, 1);
    }

    #[test]
    fn test_list_session_logs_all() {
        let state = SessionLogServiceState::new();
        create_session_log(&state, "Agent A", "2026-02-28").unwrap();
        create_session_log(&state, "Agent B", "2026-02-28").unwrap();
        create_session_log(&state, "Agent A", "2026-03-01").unwrap();

        let all = list_session_logs(&state, None, None).unwrap();
        assert_eq!(all.len(), 3);
    }

    #[test]
    fn test_list_session_logs_by_date() {
        let state = SessionLogServiceState::new();
        create_session_log(&state, "Agent A", "2026-02-28").unwrap();
        create_session_log(&state, "Agent B", "2026-02-28").unwrap();
        create_session_log(&state, "Agent A", "2026-03-01").unwrap();

        let filtered = list_session_logs(&state, Some("2026-02-28"), None).unwrap();
        assert_eq!(filtered.len(), 2);
    }

    #[test]
    fn test_list_session_logs_by_agent() {
        let state = SessionLogServiceState::new();
        create_session_log(&state, "Agent A", "2026-02-28").unwrap();
        create_session_log(&state, "Agent B", "2026-02-28").unwrap();
        create_session_log(&state, "Agent A", "2026-03-01").unwrap();

        let filtered = list_session_logs(&state, None, Some("Agent A")).unwrap();
        assert_eq!(filtered.len(), 2);
    }

    #[test]
    fn test_list_session_logs_by_date_and_agent() {
        let state = SessionLogServiceState::new();
        create_session_log(&state, "Agent A", "2026-02-28").unwrap();
        create_session_log(&state, "Agent B", "2026-02-28").unwrap();
        create_session_log(&state, "Agent A", "2026-03-01").unwrap();

        let filtered =
            list_session_logs(&state, Some("2026-02-28"), Some("Agent A")).unwrap();
        assert_eq!(filtered.len(), 1);
        assert_eq!(filtered[0].agent_name, "Agent A");
        assert_eq!(filtered[0].date, "2026-02-28");
    }

    #[test]
    fn test_get_daily_log_none() {
        let state = SessionLogServiceState::new();
        let result = get_daily_log(&state, "2026-02-28").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_generate_daily_log() {
        let state = SessionLogServiceState::new();
        create_session_log(&state, "Agent A", "2026-02-28").unwrap();
        create_session_log(&state, "Agent B", "2026-02-28").unwrap();

        let daily = generate_daily_log(&state, "2026-02-28").unwrap();
        assert_eq!(daily.date, "2026-02-28");
        assert_eq!(daily.sessions.len(), 2);

        // Verify it's also stored
        let stored = get_daily_log(&state, "2026-02-28").unwrap();
        assert!(stored.is_some());
        assert_eq!(stored.unwrap().sessions.len(), 2);
    }

    #[test]
    fn test_generate_daily_log_replaces_existing() {
        let state = SessionLogServiceState::new();
        create_session_log(&state, "Agent A", "2026-02-28").unwrap();

        generate_daily_log(&state, "2026-02-28").unwrap();

        // Add another session and regenerate
        create_session_log(&state, "Agent B", "2026-02-28").unwrap();
        let daily = generate_daily_log(&state, "2026-02-28").unwrap();

        assert_eq!(daily.sessions.len(), 2);

        // Should not duplicate daily logs
        let daily_logs = state.daily_logs.lock().unwrap();
        let count = daily_logs.iter().filter(|l| l.date == "2026-02-28").count();
        assert_eq!(count, 1);
    }
}
