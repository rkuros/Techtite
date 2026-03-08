use serde::{Deserialize, Serialize};

/// A single API cost record tracking token usage for an agent interaction.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CostRecord {
    pub id: String,
    pub agent_id: String,
    pub agent_name: String,
    pub agent_category: String,
    pub timestamp: String,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub estimated_cost_usd: f64,
}

/// Aggregated cost summary for a given period.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CostSummary {
    pub period: CostPeriod,
    pub total_cost_usd: f64,
    pub total_input_tokens: u64,
    pub total_output_tokens: u64,
    pub by_agent: Vec<AgentCostBreakdown>,
}

/// Per-agent cost breakdown within a summary.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentCostBreakdown {
    pub agent_id: String,
    pub agent_name: String,
    pub cost_usd: f64,
    pub tokens: u64,
}

/// Time period for cost aggregation.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CostPeriod {
    Daily,
    Weekly,
    Monthly,
}

/// Budget configuration with daily/monthly limits and warning threshold.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BudgetConfig {
    pub daily_limit_usd: f64,
    pub monthly_limit_usd: f64,
    pub warning_threshold: f64,
}

impl Default for BudgetConfig {
    fn default() -> Self {
        Self {
            daily_limit_usd: 5.0,
            monthly_limit_usd: 100.0,
            warning_threshold: 0.8,
        }
    }
}

/// A single data point for daily cost trend charts.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyCostPoint {
    pub date: String,
    pub cost_usd: f64,
    pub tokens: u64,
}

/// Current status of log storage usage.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogStorageStatus {
    pub total_size_bytes: u64,
    pub raw_log_size_bytes: u64,
    pub compressed_size_bytes: u64,
    pub retention_days: u32,
}

/// Configuration for log rotation policy.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogRotationConfig {
    pub retention_days: u32,
    pub max_size_bytes: Option<u64>,
    pub filter_rules: Vec<FilterRule>,
}

impl Default for LogRotationConfig {
    fn default() -> Self {
        Self {
            retention_days: 30,
            max_size_bytes: None,
            filter_rules: Vec::new(),
        }
    }
}

/// A rule for filtering log entries during rotation.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilterRule {
    pub pattern: String,
    pub action: String,
    pub max_line_count: Option<u32>,
}

/// Metadata for a stored credential (value is never exposed).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CredentialEntry {
    pub key: String,
    pub service: String,
    pub last_updated_at: String,
}

/// Sandbox configuration for restricting agent commands and paths.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SandboxConfig {
    pub enabled: bool,
    pub allowed_commands: Vec<String>,
    pub blocked_commands: Vec<String>,
    pub restricted_paths: Vec<String>,
}

impl Default for SandboxConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            allowed_commands: Vec::new(),
            blocked_commands: vec![
                "rm -rf /".to_string(),
                "mkfs".to_string(),
                "dd".to_string(),
                "chmod -R 777".to_string(),
                "curl | sh".to_string(),
                "wget | sh".to_string(),
            ],
            restricted_paths: vec![
                "/etc".to_string(),
                "/usr".to_string(),
                "/System".to_string(),
                "/Windows".to_string(),
            ],
        }
    }
}
