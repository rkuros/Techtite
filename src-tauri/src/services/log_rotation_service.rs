use std::sync::Mutex;

use crate::models::cost::{LogRotationConfig, LogStorageStatus};

/// Tauri-managed state for log rotation and storage monitoring.
///
/// Tracks log storage status and rotation configuration.
/// Actual compression requires the `flate2` crate (not yet added).
pub struct LogRotationState {
    pub config: Mutex<LogRotationConfig>,
    pub status: Mutex<LogStorageStatus>,
}

impl LogRotationState {
    pub fn new() -> Self {
        Self {
            config: Mutex::new(LogRotationConfig::default()),
            status: Mutex::new(LogStorageStatus {
                total_size_bytes: 0,
                raw_log_size_bytes: 0,
                compressed_size_bytes: 0,
                retention_days: 30,
            }),
        }
    }
}

impl Default for LogRotationState {
    fn default() -> Self {
        Self::new()
    }
}

/// Get the current log storage status.
///
/// Returns size metrics for raw and compressed logs, along with
/// the current retention policy in days.
pub fn get_status(state: &LogRotationState) -> Result<LogStorageStatus, String> {
    let status = state.status.lock().map_err(|e| e.to_string())?;
    Ok(status.clone())
}

/// Update the log rotation configuration.
///
/// Changes take effect on the next rotation cycle.
pub fn set_config(state: &LogRotationState, config: LogRotationConfig) -> Result<(), String> {
    let mut current = state.config.lock().map_err(|e| e.to_string())?;
    let mut status = state.status.lock().map_err(|e| e.to_string())?;

    // Update retention days in status to keep in sync
    status.retention_days = config.retention_days;
    *current = config;

    Ok(())
}

/// Check logs and perform rotation if needed.
///
/// TODO: Implement actual log scanning and rotation:
/// 1. Walk `<vault>/.techtite/logs/` directory
/// 2. Delete logs older than retention_days
/// 3. Compress logs older than 1 day using flate2 (requires adding flate2 to Cargo.toml)
/// 4. Apply filter rules to truncate/exclude matching patterns
/// 5. Enforce max_size_bytes limit by removing oldest compressed logs
///
/// For now, this is a stub that returns Ok without performing I/O.
pub fn check_and_rotate(state: &LogRotationState) -> Result<(), String> {
    let _config = state.config.lock().map_err(|e| e.to_string())?;

    // TODO: Implement when flate2 crate is added:
    //
    // let vault_log_dir = vault_path.join(".techtite/logs");
    // if !vault_log_dir.exists() { return Ok(()); }
    //
    // let cutoff = chrono::Utc::now() - chrono::Duration::days(config.retention_days as i64);
    //
    // for entry in std::fs::read_dir(&vault_log_dir)? {
    //     let entry = entry?;
    //     let metadata = entry.metadata()?;
    //     if let Ok(modified) = metadata.modified() {
    //         let modified: chrono::DateTime<chrono::Utc> = modified.into();
    //         if modified < cutoff {
    //             std::fs::remove_file(entry.path())?;
    //         }
    //     }
    // }
    //
    // // Compress recent logs with flate2
    // // Apply filter rules
    // // Update status metrics

    Ok(())
}
