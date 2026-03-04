use tauri::State;

use crate::models::cost::{BudgetConfig, CostPeriod, CostSummary, DailyCostPoint, LogRotationConfig, LogStorageStatus};
use crate::services::cost_tracker_service::{self, CostTrackerState};
use crate::services::log_rotation_service::{self, LogRotationState};

/// Get a cost summary for the given period.
///
/// IPC: `cost_get_summary`
/// Input: `{ period: "daily" | "weekly" | "monthly" }`
/// Output: `CostSummary`
#[tauri::command]
pub fn cost_get_summary(
    period: String,
    state: State<'_, CostTrackerState>,
) -> Result<CostSummary, String> {
    let cost_period = match period.as_str() {
        "daily" => CostPeriod::Daily,
        "weekly" => CostPeriod::Weekly,
        "monthly" => CostPeriod::Monthly,
        _ => return Err(format!("Invalid period: '{period}'. Use 'daily', 'weekly', or 'monthly'.")),
    };
    cost_tracker_service::get_summary(&state, cost_period)
}

/// Get the current budget configuration.
///
/// IPC: `cost_get_budget`
/// Input: (none)
/// Output: `BudgetConfig`
#[tauri::command]
pub fn cost_get_budget(
    state: State<'_, CostTrackerState>,
) -> Result<BudgetConfig, String> {
    cost_tracker_service::get_budget(&state)
}

/// Update the budget configuration.
///
/// IPC: `cost_set_budget`
/// Input: `BudgetConfig`
/// Output: `void`
#[tauri::command]
pub fn cost_set_budget(
    config: BudgetConfig,
    state: State<'_, CostTrackerState>,
) -> Result<(), String> {
    cost_tracker_service::set_budget(&state, config)
}

/// Get daily cost trend data for the specified number of days.
///
/// IPC: `cost_get_trend`
/// Input: `{ days: number }`
/// Output: `DailyCostPoint[]`
#[tauri::command]
pub fn cost_get_trend(
    days: u32,
    state: State<'_, CostTrackerState>,
) -> Result<Vec<DailyCostPoint>, String> {
    if days == 0 {
        return Err("Days must be greater than 0".to_string());
    }
    if days > 365 {
        return Err("Maximum trend period is 365 days".to_string());
    }
    cost_tracker_service::get_trend(&state, days)
}

/// Get the current log storage status.
///
/// IPC: `log_rotation_get_status`
/// Input: (none)
/// Output: `LogStorageStatus`
#[tauri::command]
pub fn log_rotation_get_status(
    state: State<'_, LogRotationState>,
) -> Result<LogStorageStatus, String> {
    log_rotation_service::get_status(&state)
}

/// Update the log rotation configuration.
///
/// IPC: `log_rotation_set_config`
/// Input: `LogRotationConfig`
/// Output: `void`
#[tauri::command]
pub fn log_rotation_set_config(
    config: LogRotationConfig,
    state: State<'_, LogRotationState>,
) -> Result<(), String> {
    log_rotation_service::set_config(&state, config)
}
