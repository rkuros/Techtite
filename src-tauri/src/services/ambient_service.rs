use std::sync::Mutex;

use serde::{Deserialize, Serialize};

use crate::models::log::{AmbientStatus, TaskCheckResult};

/// Configuration for the ambient background agent's periodic checks.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AmbientCheckConfig {
    /// Interval between periodic checks, in seconds.
    pub check_interval_sec: u64,
    /// Seconds of user inactivity before the ambient agent considers the user idle.
    pub idle_threshold_sec: u64,
    /// Whether the ambient agent is enabled.
    pub enabled: bool,
}

impl Default for AmbientCheckConfig {
    fn default() -> Self {
        Self {
            check_interval_sec: 300, // 5 minutes
            idle_threshold_sec: 600, // 10 minutes
            enabled: true,
        }
    }
}

/// Tauri-managed state for the ambient background agent.
///
/// The ambient agent periodically checks task progress and emits
/// `ambient:alert` events when it detects issues or completions.
pub struct AmbientServiceState {
    pub status: Mutex<AmbientStatus>,
    pub check_results: Mutex<Vec<TaskCheckResult>>,
    pub config: Mutex<AmbientCheckConfig>,
}

impl AmbientServiceState {
    pub fn new() -> Self {
        Self {
            status: Mutex::new(AmbientStatus {
                is_running: false,
                last_check_at: None,
                task_completion_rate: 0.0,
            }),
            check_results: Mutex::new(Vec::new()),
            config: Mutex::new(AmbientCheckConfig::default()),
        }
    }
}

impl Default for AmbientServiceState {
    fn default() -> Self {
        Self::new()
    }
}

/// Get the current ambient agent status.
pub fn get_status(state: &AmbientServiceState) -> Result<AmbientStatus, String> {
    let status = state.status.lock().map_err(|e| e.to_string())?;
    Ok(status.clone())
}

/// Get all task check results.
pub fn get_check_results(state: &AmbientServiceState) -> Result<Vec<TaskCheckResult>, String> {
    let results = state.check_results.lock().map_err(|e| e.to_string())?;
    Ok(results.clone())
}

/// Start the ambient agent.
///
/// TODO: Use tokio::spawn to run periodic checks in the background.
/// For now, this just sets the status to running.
pub fn start(state: &AmbientServiceState) -> Result<(), String> {
    let mut status = state.status.lock().map_err(|e| e.to_string())?;
    status.is_running = true;
    Ok(())
}

/// Stop the ambient agent.
///
/// TODO: Cancel the spawned background task.
/// For now, this just sets the status to not running.
pub fn stop(state: &AmbientServiceState) -> Result<(), String> {
    let mut status = state.status.lock().map_err(|e| e.to_string())?;
    status.is_running = false;
    Ok(())
}

/// Run a single check cycle.
///
/// TODO: Integrate with Claude SDK to assess task progress.
/// For now, returns a sample TaskCheckResult.
pub fn run_check(state: &AmbientServiceState) -> Result<TaskCheckResult, String> {
    let now = chrono::Utc::now().to_rfc3339();

    let result = TaskCheckResult {
        agent_id: "ambient-manager".to_string(),
        agent_name: "Ambient Manager".to_string(),
        task: "Periodic system health check".to_string(),
        is_completed: true,
        checked_at: now.clone(),
        message: Some("All systems nominal".to_string()),
    };

    // Store the result
    let mut results = state.check_results.lock().map_err(|e| e.to_string())?;
    results.push(result.clone());

    // Update status
    let mut status = state.status.lock().map_err(|e| e.to_string())?;
    status.last_check_at = Some(now);

    // Recalculate completion rate
    let total = results.len() as f64;
    let completed = results.iter().filter(|r| r.is_completed).count() as f64;
    status.task_completion_rate = if total > 0.0 {
        completed / total
    } else {
        0.0
    };

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_status() {
        let state = AmbientServiceState::new();
        let status = get_status(&state).unwrap();
        assert!(!status.is_running);
        assert!(status.last_check_at.is_none());
        assert_eq!(status.task_completion_rate, 0.0);
    }

    #[test]
    fn test_start_stop() {
        let state = AmbientServiceState::new();

        start(&state).unwrap();
        assert!(get_status(&state).unwrap().is_running);

        stop(&state).unwrap();
        assert!(!get_status(&state).unwrap().is_running);
    }

    #[test]
    fn test_run_check() {
        let state = AmbientServiceState::new();

        let result = run_check(&state).unwrap();
        assert!(result.is_completed);
        assert_eq!(result.agent_name, "Ambient Manager");

        let status = get_status(&state).unwrap();
        assert!(status.last_check_at.is_some());
        assert_eq!(status.task_completion_rate, 1.0);

        let results = get_check_results(&state).unwrap();
        assert_eq!(results.len(), 1);
    }

    #[test]
    fn test_completion_rate_calculation() {
        let state = AmbientServiceState::new();

        // Run 3 checks, all completed
        run_check(&state).unwrap();
        run_check(&state).unwrap();
        run_check(&state).unwrap();

        let status = get_status(&state).unwrap();
        assert_eq!(status.task_completion_rate, 1.0);
    }

    #[test]
    fn test_default_config() {
        let state = AmbientServiceState::new();
        let config = state.config.lock().unwrap();
        assert_eq!(config.check_interval_sec, 300);
        assert_eq!(config.idle_threshold_sec, 600);
        assert!(config.enabled);
    }
}
