use std::path::{Path, PathBuf};

use crate::utils::error::TechtiteError;

/// Resolve a relative path against the vault root, ensuring it stays within the vault.
/// Handles the case where the target file doesn't exist yet (e.g., for write/create).
pub fn resolve_vault_path(vault_root: &Path, relative_path: &str) -> Result<PathBuf, TechtiteError> {
    if has_path_traversal(relative_path) {
        return Err(TechtiteError::PathOutsideVault(
            relative_path.to_string(),
        ));
    }

    // Canonicalize vault root to handle symlinks (macOS /var -> /private/var)
    let vault_canonical = vault_root
        .canonicalize()
        .unwrap_or_else(|_| vault_root.to_path_buf());

    let resolved = vault_canonical.join(relative_path);

    // For existing paths, verify via canonicalize
    if resolved.exists() {
        let canonical = resolved.canonicalize().map_err(|_| {
            TechtiteError::InvalidPath(relative_path.to_string())
        })?;
        if !canonical.starts_with(&vault_canonical) {
            return Err(TechtiteError::PathOutsideVault(
                relative_path.to_string(),
            ));
        }
    }

    Ok(resolved)
}

/// Convert an absolute path to a vault-relative path.
pub fn to_relative_path(vault_root: &Path, absolute_path: &Path) -> Option<String> {
    absolute_path
        .strip_prefix(vault_root)
        .ok()
        .map(|p| p.to_string_lossy().to_string())
}

/// Check if a path contains traversal patterns (../).
pub fn has_path_traversal(path: &str) -> bool {
    path.contains("..") || path.starts_with('/')
}
