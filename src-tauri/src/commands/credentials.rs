use tauri::State;

use crate::models::cost::{CredentialEntry, SandboxConfig};
use crate::services::credential_service::{self, CredentialServiceState};
use crate::services::sandbox_service::{self, SandboxServiceState};

/// List all stored credentials (metadata only, no secret values).
///
/// IPC: `credential_list`
/// Input: (none)
/// Output: `CredentialEntry[]`
#[tauri::command]
pub fn credential_list(
    state: State<'_, CredentialServiceState>,
) -> Result<Vec<CredentialEntry>, String> {
    credential_service::list(&state)
}

/// Store or update a credential.
///
/// If a credential with the same key exists, its value and timestamp
/// are updated. The secret value is stored securely (TODO: via OS keyring).
///
/// IPC: `credential_set`
/// Input: `{ key: string, value: string, service: string }`
/// Output: `void`
#[tauri::command]
pub fn credential_set(
    key: String,
    value: String,
    service: String,
    state: State<'_, CredentialServiceState>,
) -> Result<(), String> {
    if key.is_empty() {
        return Err("Credential key cannot be empty".to_string());
    }
    if value.is_empty() {
        return Err("Credential value cannot be empty".to_string());
    }
    credential_service::set(&state, key, value, service)
}

/// Delete a credential by key.
///
/// Removes both the metadata entry and the stored secret value.
///
/// IPC: `credential_delete`
/// Input: `{ key: string }`
/// Output: `void`
#[tauri::command]
pub fn credential_delete(
    key: String,
    state: State<'_, CredentialServiceState>,
) -> Result<(), String> {
    credential_service::delete(&state, &key)
}

/// Get the current sandbox configuration.
///
/// IPC: `sandbox_get_config`
/// Input: (none)
/// Output: `SandboxConfig`
#[tauri::command]
pub fn sandbox_get_config(
    state: State<'_, SandboxServiceState>,
) -> Result<SandboxConfig, String> {
    sandbox_service::get_config(&state)
}

/// Update the sandbox configuration.
///
/// Changes take effect immediately for all subsequent command validations.
///
/// IPC: `sandbox_set_config`
/// Input: `SandboxConfig`
/// Output: `void`
#[tauri::command]
pub fn sandbox_set_config(
    config: SandboxConfig,
    state: State<'_, SandboxServiceState>,
) -> Result<(), String> {
    sandbox_service::set_config(&state, config)
}
