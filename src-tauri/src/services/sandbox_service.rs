use std::sync::Mutex;

use crate::models::cost::SandboxConfig;

/// Tauri-managed state for sandbox policy enforcement.
///
/// Controls which commands agents are permitted to execute
/// and which filesystem paths are off-limits.
pub struct SandboxServiceState {
    pub config: Mutex<SandboxConfig>,
}

impl SandboxServiceState {
    pub fn new() -> Self {
        Self {
            config: Mutex::new(SandboxConfig::default()),
        }
    }
}

impl Default for SandboxServiceState {
    fn default() -> Self {
        Self::new()
    }
}

/// Get the current sandbox configuration.
pub fn get_config(state: &SandboxServiceState) -> Result<SandboxConfig, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;
    Ok(config.clone())
}

/// Update the sandbox configuration.
pub fn set_config(state: &SandboxServiceState, config: SandboxConfig) -> Result<(), String> {
    let mut current = state.config.lock().map_err(|e| e.to_string())?;
    *current = config;
    Ok(())
}

/// Validate a command against the sandbox policy.
///
/// Returns Ok(true) if the command is allowed, Ok(false) if blocked.
/// When the sandbox is disabled, all commands are allowed.
///
/// Rules:
/// 1. If sandbox is disabled, allow everything.
/// 2. If the command matches any blocked_commands pattern, deny.
/// 3. If allowed_commands is non-empty, the command must match at least one.
/// 4. Otherwise, allow.
pub fn validate_command(state: &SandboxServiceState, command: &str) -> Result<bool, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;

    if !config.enabled {
        return Ok(true);
    }

    let cmd_lower = command.to_lowercase();

    // Check blocklist first (takes priority)
    for blocked in &config.blocked_commands {
        if cmd_lower.contains(&blocked.to_lowercase()) {
            return Ok(false);
        }
    }

    // If allowlist is defined, command must match at least one entry
    if !config.allowed_commands.is_empty() {
        let allowed = config
            .allowed_commands
            .iter()
            .any(|a| cmd_lower.contains(&a.to_lowercase()));
        return Ok(allowed);
    }

    Ok(true)
}

/// Check if a filesystem path is within a restricted zone.
///
/// Returns Ok(true) if the path is restricted (should be denied),
/// Ok(false) if the path is accessible.
///
/// Compares path prefixes against the configured restricted_paths list.
pub fn is_path_restricted(state: &SandboxServiceState, path: &str) -> Result<bool, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;

    if !config.enabled {
        return Ok(false);
    }

    for restricted in &config.restricted_paths {
        if path.starts_with(restricted) {
            return Ok(true);
        }
    }

    Ok(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_sandbox_enabled() {
        let state = SandboxServiceState::new();
        let config = get_config(&state).unwrap();
        assert!(config.enabled);
        assert!(!config.blocked_commands.is_empty());
    }

    #[test]
    fn test_validate_allowed_command() {
        let state = SandboxServiceState::new();
        assert!(validate_command(&state, "git status").unwrap());
        assert!(validate_command(&state, "npm install").unwrap());
    }

    #[test]
    fn test_validate_blocked_command() {
        let state = SandboxServiceState::new();
        assert!(!validate_command(&state, "rm -rf /").unwrap());
        assert!(!validate_command(&state, "mkfs.ext4 /dev/sda1").unwrap());
        assert!(!validate_command(&state, "dd if=/dev/zero of=/dev/sda").unwrap());
    }

    #[test]
    fn test_validate_disabled_sandbox() {
        let state = SandboxServiceState::new();
        set_config(
            &state,
            SandboxConfig {
                enabled: false,
                ..SandboxConfig::default()
            },
        )
        .unwrap();

        // Even blocked commands are allowed when sandbox is disabled
        assert!(validate_command(&state, "rm -rf /").unwrap());
    }

    #[test]
    fn test_allowlist_enforcement() {
        let state = SandboxServiceState::new();
        set_config(
            &state,
            SandboxConfig {
                enabled: true,
                allowed_commands: vec!["git".to_string(), "npm".to_string()],
                blocked_commands: Vec::new(),
                restricted_paths: Vec::new(),
            },
        )
        .unwrap();

        assert!(validate_command(&state, "git push").unwrap());
        assert!(validate_command(&state, "npm install").unwrap());
        assert!(!validate_command(&state, "cargo build").unwrap());
    }

    #[test]
    fn test_path_restricted() {
        let state = SandboxServiceState::new();
        assert!(is_path_restricted(&state, "/etc/passwd").unwrap());
        assert!(is_path_restricted(&state, "/usr/bin/something").unwrap());
        assert!(!is_path_restricted(&state, "/home/user/project").unwrap());
    }

    #[test]
    fn test_path_not_restricted_when_disabled() {
        let state = SandboxServiceState::new();
        set_config(
            &state,
            SandboxConfig {
                enabled: false,
                ..SandboxConfig::default()
            },
        )
        .unwrap();

        assert!(!is_path_restricted(&state, "/etc/passwd").unwrap());
    }

    #[test]
    fn test_blocklist_priority_over_allowlist() {
        let state = SandboxServiceState::new();
        set_config(
            &state,
            SandboxConfig {
                enabled: true,
                allowed_commands: vec!["rm".to_string()],
                blocked_commands: vec!["rm -rf /".to_string()],
                restricted_paths: Vec::new(),
            },
        )
        .unwrap();

        // "rm file.txt" is allowed (matches allowlist, not blocklist)
        assert!(validate_command(&state, "rm file.txt").unwrap());
        // "rm -rf /" is blocked (blocklist takes priority)
        assert!(!validate_command(&state, "rm -rf /").unwrap());
    }
}
