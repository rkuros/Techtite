use std::collections::HashMap;
use std::sync::Mutex;

use crate::models::cost::{
    AgentCostBreakdown, BudgetConfig, CostPeriod, CostRecord, CostSummary, DailyCostPoint,
};

/// Tauri-managed state for API cost tracking.
///
/// Maintains an in-memory ledger of cost records, budget configuration,
/// and provides aggregation helpers for the cost dashboard.
pub struct CostTrackerState {
    pub records: Mutex<Vec<CostRecord>>,
    pub budget: Mutex<BudgetConfig>,
}

impl CostTrackerState {
    pub fn new() -> Self {
        Self {
            records: Mutex::new(Vec::new()),
            budget: Mutex::new(BudgetConfig::default()),
        }
    }
}

impl Default for CostTrackerState {
    fn default() -> Self {
        Self::new()
    }
}

/// Record a new token usage event.
///
/// Called when parsing agent stream-json output that includes cost/token
/// metadata. Each record captures the agent, timestamp, token counts,
/// and estimated USD cost.
pub fn record_usage(state: &CostTrackerState, record: CostRecord) -> Result<(), String> {
    let mut records = state.records.lock().map_err(|e| e.to_string())?;
    records.push(record);
    Ok(())
}

/// Get an aggregated cost summary for a given period.
///
/// Aggregates all matching records by the specified period (daily/weekly/monthly)
/// and breaks down costs by agent.
pub fn get_summary(state: &CostTrackerState, period: CostPeriod) -> Result<CostSummary, String> {
    let records = state.records.lock().map_err(|e| e.to_string())?;

    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

    let filtered: Vec<&CostRecord> = records
        .iter()
        .filter(|r| {
            match &period {
                CostPeriod::Daily => {
                    // Match records from today
                    r.timestamp.starts_with(&today)
                }
                CostPeriod::Weekly => {
                    // Match records from the last 7 days
                    // Simplified: compare date strings (works for ISO format)
                    if let Some(record_date) = r.timestamp.get(..10) {
                        let days_ago = 7;
                        let cutoff = chrono::Utc::now()
                            - chrono::Duration::days(days_ago);
                        let cutoff_str = cutoff.format("%Y-%m-%d").to_string();
                        record_date >= cutoff_str.as_str()
                    } else {
                        false
                    }
                }
                CostPeriod::Monthly => {
                    // Match records from this month
                    let month_prefix = &today[..7]; // "YYYY-MM"
                    r.timestamp.starts_with(month_prefix)
                }
            }
        })
        .collect();

    let total_cost_usd: f64 = filtered.iter().map(|r| r.estimated_cost_usd).sum();
    let total_input_tokens: u64 = filtered.iter().map(|r| r.input_tokens).sum();
    let total_output_tokens: u64 = filtered.iter().map(|r| r.output_tokens).sum();

    // Build per-agent breakdown
    let mut agent_map: HashMap<String, (String, f64, u64)> = HashMap::new();
    for r in &filtered {
        let entry = agent_map
            .entry(r.agent_id.clone())
            .or_insert_with(|| (r.agent_name.clone(), 0.0, 0));
        entry.1 += r.estimated_cost_usd;
        entry.2 += r.input_tokens + r.output_tokens;
    }

    let by_agent: Vec<AgentCostBreakdown> = agent_map
        .into_iter()
        .map(|(agent_id, (agent_name, cost_usd, tokens))| AgentCostBreakdown {
            agent_id,
            agent_name,
            cost_usd,
            tokens,
        })
        .collect();

    Ok(CostSummary {
        period,
        total_cost_usd,
        total_input_tokens,
        total_output_tokens,
        by_agent,
    })
}

/// Get the current budget configuration.
pub fn get_budget(state: &CostTrackerState) -> Result<BudgetConfig, String> {
    let budget = state.budget.lock().map_err(|e| e.to_string())?;
    Ok(budget.clone())
}

/// Update the budget configuration.
pub fn set_budget(state: &CostTrackerState, config: BudgetConfig) -> Result<(), String> {
    let mut budget = state.budget.lock().map_err(|e| e.to_string())?;
    *budget = config;
    Ok(())
}

/// Get daily cost trend data for the specified number of days.
///
/// Returns one data point per day, ordered chronologically.
/// Days with no records return zero values.
pub fn get_trend(state: &CostTrackerState, days: u32) -> Result<Vec<DailyCostPoint>, String> {
    let records = state.records.lock().map_err(|e| e.to_string())?;

    let mut daily_map: HashMap<String, (f64, u64)> = HashMap::new();

    // Aggregate records by date
    for r in records.iter() {
        if let Some(date) = r.timestamp.get(..10) {
            let entry = daily_map
                .entry(date.to_string())
                .or_insert((0.0, 0));
            entry.0 += r.estimated_cost_usd;
            entry.1 += r.input_tokens + r.output_tokens;
        }
    }

    // Build result for the last N days
    let mut result = Vec::new();
    let now = chrono::Utc::now();
    for i in (0..days).rev() {
        let date = (now - chrono::Duration::days(i as i64))
            .format("%Y-%m-%d")
            .to_string();
        let (cost_usd, tokens) = daily_map.get(&date).copied().unwrap_or((0.0, 0));
        result.push(DailyCostPoint {
            date,
            cost_usd,
            tokens,
        });
    }

    Ok(result)
}

/// Check if current spending exceeds budget thresholds.
///
/// Returns:
/// - Ok(None) if within budget
/// - Ok(Some("warning")) if past warning threshold
/// - Ok(Some("exceeded")) if past the limit
pub fn check_budget(state: &CostTrackerState) -> Result<Option<String>, String> {
    let budget = state.budget.lock().map_err(|e| e.to_string())?;
    let records = state.records.lock().map_err(|e| e.to_string())?;

    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

    let daily_cost: f64 = records
        .iter()
        .filter(|r| r.timestamp.starts_with(&today))
        .map(|r| r.estimated_cost_usd)
        .sum();

    if daily_cost >= budget.daily_limit_usd {
        return Ok(Some("exceeded".to_string()));
    }

    if daily_cost >= budget.daily_limit_usd * budget.warning_threshold {
        return Ok(Some("warning".to_string()));
    }

    Ok(None)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_record(agent_id: &str, cost: f64, input_tokens: u64, output_tokens: u64) -> CostRecord {
        CostRecord {
            id: uuid::Uuid::new_v4().to_string(),
            agent_id: agent_id.to_string(),
            agent_name: format!("Agent {agent_id}"),
            agent_category: "worker".to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            input_tokens,
            output_tokens,
            estimated_cost_usd: cost,
        }
    }

    #[test]
    fn test_record_and_get_summary() {
        let state = CostTrackerState::new();
        record_usage(&state, make_record("a1", 0.05, 1000, 500)).unwrap();
        record_usage(&state, make_record("a1", 0.03, 600, 300)).unwrap();
        record_usage(&state, make_record("a2", 0.10, 2000, 1000)).unwrap();

        let summary = get_summary(&state, CostPeriod::Daily).unwrap();
        assert!((summary.total_cost_usd - 0.18).abs() < 0.001);
        assert_eq!(summary.total_input_tokens, 3600);
        assert_eq!(summary.total_output_tokens, 1800);
        assert_eq!(summary.by_agent.len(), 2);
    }

    #[test]
    fn test_budget_default() {
        let state = CostTrackerState::new();
        let budget = get_budget(&state).unwrap();
        assert!((budget.daily_limit_usd - 5.0).abs() < f64::EPSILON);
        assert!((budget.monthly_limit_usd - 100.0).abs() < f64::EPSILON);
        assert!((budget.warning_threshold - 0.8).abs() < f64::EPSILON);
    }

    #[test]
    fn test_set_budget() {
        let state = CostTrackerState::new();
        let new_budget = BudgetConfig {
            daily_limit_usd: 10.0,
            monthly_limit_usd: 200.0,
            warning_threshold: 0.9,
        };
        set_budget(&state, new_budget).unwrap();

        let budget = get_budget(&state).unwrap();
        assert!((budget.daily_limit_usd - 10.0).abs() < f64::EPSILON);
        assert!((budget.monthly_limit_usd - 200.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_get_trend() {
        let state = CostTrackerState::new();
        record_usage(&state, make_record("a1", 0.05, 1000, 500)).unwrap();

        let trend = get_trend(&state, 7).unwrap();
        assert_eq!(trend.len(), 7);
        // Today's entry should have the recorded cost
        let today_entry = trend.last().unwrap();
        assert!((today_entry.cost_usd - 0.05).abs() < 0.001);
    }

    #[test]
    fn test_check_budget_within() {
        let state = CostTrackerState::new();
        record_usage(&state, make_record("a1", 1.0, 1000, 500)).unwrap();

        let result = check_budget(&state).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_check_budget_warning() {
        let state = CostTrackerState::new();
        // Default daily limit = 5.0, warning threshold = 0.8, so warning at 4.0
        record_usage(&state, make_record("a1", 4.5, 10000, 5000)).unwrap();

        let result = check_budget(&state).unwrap();
        assert_eq!(result, Some("warning".to_string()));
    }

    #[test]
    fn test_check_budget_exceeded() {
        let state = CostTrackerState::new();
        record_usage(&state, make_record("a1", 5.5, 50000, 25000)).unwrap();

        let result = check_budget(&state).unwrap();
        assert_eq!(result, Some("exceeded".to_string()));
    }

    #[test]
    fn test_empty_summary() {
        let state = CostTrackerState::new();
        let summary = get_summary(&state, CostPeriod::Daily).unwrap();
        assert!((summary.total_cost_usd).abs() < f64::EPSILON);
        assert!(summary.by_agent.is_empty());
    }
}
