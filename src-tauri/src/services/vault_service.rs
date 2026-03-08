use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::Path;

use crate::models::vault::{Vault, VaultConfig};
use crate::utils::error::TechtiteError;
use crate::utils::gitignore;

const TECHTITE_DIR: &str = ".techtite";
const CONFIG_FILE: &str = "config.json";

/// Open a vault at the given path.
/// Initializes the .techtite directory if it doesn't exist.
pub fn open_vault(path: &Path) -> Result<Vault, TechtiteError> {
    if !path.exists() || !path.is_dir() {
        return Err(TechtiteError::InvalidPath(
            path.to_string_lossy().to_string(),
        ));
    }

    // Initialize .techtite directory
    let techtite_dir = path.join(TECHTITE_DIR);
    if !techtite_dir.exists() {
        fs::create_dir_all(&techtite_dir)?;
        fs::create_dir_all(techtite_dir.join("raw_logs"))?;
        fs::create_dir_all(techtite_dir.join("agent_logs"))?;
    }

    // Ensure .techtite is in .gitignore
    gitignore::ensure_gitignore_entry(path, ".techtite/")?;

    // Load or create config
    let config_path = techtite_dir.join(CONFIG_FILE);
    let config = if config_path.exists() {
        let content = fs::read_to_string(&config_path)?;
        serde_json::from_str(&content)?
    } else {
        let config = VaultConfig::default();
        let content = serde_json::to_string_pretty(&config)?;
        fs::write(&config_path, content)?;
        config
    };

    // Detect git repo
    let is_git_repo = path.join(".git").exists();

    // Generate vault name from directory name
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "Unnamed Vault".to_string());

    // Deterministic vault ID from path
    let mut hasher = DefaultHasher::new();
    path.to_string_lossy().hash(&mut hasher);
    let id = format!("{:016x}", hasher.finish());

    Ok(Vault {
        id,
        path: path.to_path_buf(),
        name,
        is_git_repo,
        config,
    })
}

/// Update the vault configuration.
pub fn update_config(vault_path: &Path, config: &VaultConfig) -> Result<(), TechtiteError> {
    let config_path = vault_path.join(TECHTITE_DIR).join(CONFIG_FILE);
    let content = serde_json::to_string_pretty(config)?;
    fs::write(config_path, content)?;
    Ok(())
}

/// Get the vault configuration.
pub fn get_config(vault_path: &Path) -> Result<VaultConfig, TechtiteError> {
    let config_path = vault_path.join(TECHTITE_DIR).join(CONFIG_FILE);
    if !config_path.exists() {
        return Ok(VaultConfig::default());
    }
    let content = fs::read_to_string(config_path)?;
    Ok(serde_json::from_str(&content)?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_open_vault_creates_techtite_dir() {
        let dir = tempfile::tempdir().unwrap();
        let vault = open_vault(dir.path()).unwrap();
        assert!(dir.path().join(".techtite").exists());
        assert!(dir.path().join(".techtite/config.json").exists());
        assert!(!vault.name.is_empty());
    }

    #[test]
    fn test_update_and_get_config() {
        let dir = tempfile::tempdir().unwrap();
        let _vault = open_vault(dir.path()).unwrap();
        let mut config = VaultConfig::default();
        config.auto_sync_interval_sec = 600;
        update_config(dir.path(), &config).unwrap();
        let loaded = get_config(dir.path()).unwrap();
        assert_eq!(loaded.auto_sync_interval_sec, 600);
    }
}
