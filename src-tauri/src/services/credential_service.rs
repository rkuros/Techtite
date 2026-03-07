use std::collections::HashMap;
use std::sync::Mutex;

use crate::models::cost::CredentialEntry;

/// Tauri-managed state for credential storage.
///
/// Maintains metadata about stored credentials. The actual secret values
/// are kept in a separate secure store.
///
/// # FIXME: SECURITY — PLAINTEXT CREDENTIAL STORAGE
///
/// **This is a critical security issue.** Credentials are currently stored
/// in an in-memory `HashMap` with no encryption or OS-level protection.
/// Any memory dump, debugger attachment, or core dump will expose all
/// stored secrets in plaintext.
///
/// This MUST be replaced with the `keyring` crate before any release to
/// use OS-level secure storage (macOS Keychain, Windows Credential Locker,
/// Linux Secret Service). See: <https://crates.io/crates/keyring>
///
/// DO NOT ship this implementation to end users.
pub struct CredentialServiceState {
    pub entries: Mutex<Vec<CredentialEntry>>,
    /// In-memory value store — to be replaced with keyring crate.
    pub values: Mutex<HashMap<String, String>>,
}

impl CredentialServiceState {
    pub fn new() -> Self {
        Self {
            entries: Mutex::new(Vec::new()),
            values: Mutex::new(HashMap::new()),
        }
    }
}

impl Default for CredentialServiceState {
    fn default() -> Self {
        Self::new()
    }
}

/// List all stored credential entries (metadata only, no secret values).
pub fn list(state: &CredentialServiceState) -> Result<Vec<CredentialEntry>, String> {
    let entries = state.entries.lock().map_err(|e| e.to_string())?;
    Ok(entries.clone())
}

/// Store or update a credential.
///
/// If a credential with the same key already exists, its value and
/// last_updated_at timestamp are updated. Otherwise, a new entry is created.
///
/// TODO: Replace in-memory storage with keyring crate:
///   keyring::Entry::new(&service, &key)?.set_password(&value)?;
pub fn set(
    state: &CredentialServiceState,
    key: String,
    value: String,
    service: String,
) -> Result<(), String> {
    let mut entries = state.entries.lock().map_err(|e| e.to_string())?;
    let mut values = state.values.lock().map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().to_rfc3339();

    // Update existing or insert new
    if let Some(entry) = entries.iter_mut().find(|e| e.key == key) {
        entry.service = service;
        entry.last_updated_at = now;
    } else {
        entries.push(CredentialEntry {
            key: key.clone(),
            service,
            last_updated_at: now,
        });
    }

    // FIXME: SECURITY — storing credential in plaintext memory. Replace with keyring crate.
    eprintln!(
        "[credential_service] WARNING: Storing credential '{}' for service '{}' in plaintext memory. \
         This is insecure and must be replaced with OS-level secure storage (keyring crate) before release.",
        key,
        entries.iter().find(|e| e.key == key).map(|e| e.service.as_str()).unwrap_or("unknown"),
    );
    values.insert(key, value);

    Ok(())
}

/// Retrieve a credential value by key.
///
/// Returns the secret value if found, None otherwise.
///
/// TODO: Replace with keyring crate:
///   keyring::Entry::new(&service, &key)?.get_password().ok()
pub fn get(state: &CredentialServiceState, key: &str) -> Result<Option<String>, String> {
    let values = state.values.lock().map_err(|e| e.to_string())?;
    Ok(values.get(key).cloned())
}

/// Delete a credential by key.
///
/// Removes both the metadata entry and the stored value.
///
/// TODO: Replace with keyring crate:
///   keyring::Entry::new(&service, &key)?.delete_password()?;
pub fn delete(state: &CredentialServiceState, key: &str) -> Result<(), String> {
    let mut entries = state.entries.lock().map_err(|e| e.to_string())?;
    let mut values = state.values.lock().map_err(|e| e.to_string())?;

    entries.retain(|e| e.key != key);
    values.remove(key);

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_set_and_list() {
        let state = CredentialServiceState::new();
        set(&state, "API_KEY".to_string(), "sk-123".to_string(), "openai".to_string()).unwrap();

        let entries = list(&state).unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].key, "API_KEY");
        assert_eq!(entries[0].service, "openai");
    }

    #[test]
    fn test_set_and_get() {
        let state = CredentialServiceState::new();
        set(&state, "API_KEY".to_string(), "sk-123".to_string(), "openai".to_string()).unwrap();

        let value = get(&state, "API_KEY").unwrap();
        assert_eq!(value, Some("sk-123".to_string()));
    }

    #[test]
    fn test_get_nonexistent() {
        let state = CredentialServiceState::new();
        let value = get(&state, "MISSING").unwrap();
        assert!(value.is_none());
    }

    #[test]
    fn test_update_existing() {
        let state = CredentialServiceState::new();
        set(&state, "KEY".to_string(), "v1".to_string(), "svc".to_string()).unwrap();
        set(&state, "KEY".to_string(), "v2".to_string(), "svc-updated".to_string()).unwrap();

        let entries = list(&state).unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].service, "svc-updated");

        let value = get(&state, "KEY").unwrap();
        assert_eq!(value, Some("v2".to_string()));
    }

    #[test]
    fn test_delete() {
        let state = CredentialServiceState::new();
        set(&state, "KEY".to_string(), "val".to_string(), "svc".to_string()).unwrap();
        delete(&state, "KEY").unwrap();

        let entries = list(&state).unwrap();
        assert!(entries.is_empty());

        let value = get(&state, "KEY").unwrap();
        assert!(value.is_none());
    }

    #[test]
    fn test_delete_nonexistent() {
        let state = CredentialServiceState::new();
        // Should not error
        delete(&state, "MISSING").unwrap();
    }

    #[test]
    fn test_multiple_credentials() {
        let state = CredentialServiceState::new();
        set(&state, "KEY_A".to_string(), "a".to_string(), "svc1".to_string()).unwrap();
        set(&state, "KEY_B".to_string(), "b".to_string(), "svc2".to_string()).unwrap();
        set(&state, "KEY_C".to_string(), "c".to_string(), "svc3".to_string()).unwrap();

        let entries = list(&state).unwrap();
        assert_eq!(entries.len(), 3);

        delete(&state, "KEY_B").unwrap();
        let entries = list(&state).unwrap();
        assert_eq!(entries.len(), 2);
        assert!(entries.iter().all(|e| e.key != "KEY_B"));
    }
}
