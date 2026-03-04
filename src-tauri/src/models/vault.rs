use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Vault {
    pub id: String,
    pub path: PathBuf,
    pub name: String,
    pub is_git_repo: bool,
    pub config: VaultConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultConfig {
    pub session_log_dir: String,
    pub rag_enabled: bool,
    pub auto_sync_enabled: bool,
    pub auto_sync_interval_sec: u64,
    pub log_granularity: LogGranularity,
}

impl Default for VaultConfig {
    fn default() -> Self {
        Self {
            session_log_dir: "session-logs".to_string(),
            rag_enabled: true,
            auto_sync_enabled: true,
            auto_sync_interval_sec: 300,
            log_granularity: LogGranularity::Standard,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LogGranularity {
    Detailed,
    Standard,
    Compact,
}
