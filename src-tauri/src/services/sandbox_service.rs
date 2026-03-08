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

/// Extract the base command name (first token) from a command string.
/// Handles paths (e.g., "/usr/bin/rm" -> "rm").
fn extract_command_name(command: &str) -> String {
    let first_token = command.split_whitespace().next().unwrap_or("");
    // Strip directory path: "/usr/bin/rm" -> "rm"
    first_token
        .rsplit('/')
        .next()
        .unwrap_or(first_token)
        .to_lowercase()
}

/// Characters/patterns that indicate shell injection or chaining attempts.
const SHELL_META_CHARS: &[&str] = &[";", "&&", "||", "|", "`", "$(", "${", "\n", "\r"];

/// Check if a command string contains shell bypass patterns.
fn has_shell_bypass(command: &str) -> bool {
    SHELL_META_CHARS.iter().any(|meta| command.contains(meta))
}

/// Validate a command against the sandbox policy.
///
/// Returns Ok(true) if the command is allowed, Ok(false) if blocked.
/// When the sandbox is disabled, all commands are allowed.
///
/// Rules:
/// 1. If sandbox is disabled, allow everything.
/// 2. Reject commands with shell injection patterns (semicolons, pipes, backticks, $()).
/// 3. If the command's base name matches any blocked_commands entry, deny.
/// 4. If allowed_commands is non-empty, the command's base name must match at least one.
/// 5. Otherwise, allow.
pub fn validate_command(state: &SandboxServiceState, command: &str) -> Result<bool, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;

    if !config.enabled {
        return Ok(true);
    }

    // Block shell injection / chaining attempts
    if has_shell_bypass(command) {
        return Ok(false);
    }

    let base_cmd = extract_command_name(command);
    let cmd_lower = command.to_lowercase();

    // Check blocklist first (takes priority)
    for blocked in &config.blocked_commands {
        let blocked_lower = blocked.to_lowercase();
        let blocked_base = extract_command_name(&blocked_lower);
        let blocked_has_args = blocked_lower.contains(' ');

        if blocked_has_args {
            // Multi-word pattern (e.g., "rm -rf /"): match as prefix of the full command
            if cmd_lower.starts_with(&blocked_lower) {
                return Ok(false);
            }
        } else {
            // Single-word pattern (e.g., "mkfs", "dd"): match base command name exactly
            // Also handle dotted variants (e.g., "mkfs" blocks "mkfs.ext4")
            if base_cmd == blocked_base || base_cmd.starts_with(&format!("{}.", blocked_base)) {
                return Ok(false);
            }
        }
    }

    // If allowlist is defined, the base command must match at least one entry
    if !config.allowed_commands.is_empty() {
        let allowed = config
            .allowed_commands
            .iter()
            .any(|a| base_cmd == a.to_lowercase());
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
    fn test_shell_bypass_blocked() {
        let state = SandboxServiceState::new();
        // Shell injection patterns should be blocked
        assert!(!validate_command(&state, "echo hello; rm -rf /").unwrap());
        assert!(!validate_command(&state, "echo hello && rm -rf /").unwrap());
        assert!(!validate_command(&state, "echo hello | sh").unwrap());
        assert!(!validate_command(&state, "echo `whoami`").unwrap());
        assert!(!validate_command(&state, "echo $(whoami)").unwrap());
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

    #[test]
    fn test_extract_command_name() {
        assert_eq!(extract_command_name("git status"), "git");
        assert_eq!(extract_command_name("/usr/bin/rm -rf /"), "rm");
        assert_eq!(extract_command_name("mkfs.ext4 /dev/sda1"), "mkfs.ext4");
        assert_eq!(extract_command_name(""), "");
    }
}
