use std::fs;
use std::path::Path;

use crate::utils::error::TechtiteError;
use crate::utils::path::{has_path_traversal, resolve_vault_path};

/// Read a file's content as UTF-8 string.
pub fn read_file(vault_root: &Path, relative_path: &str) -> Result<String, TechtiteError> {
    if has_path_traversal(relative_path) {
        return Err(TechtiteError::InvalidPath(relative_path.to_string()));
    }
    let full_path = resolve_vault_path(vault_root, relative_path)?;
    if !full_path.exists() {
        return Err(TechtiteError::FileNotFound(relative_path.to_string()));
    }
    fs::read_to_string(&full_path).map_err(|e| {
        if e.kind() == std::io::ErrorKind::InvalidData {
            TechtiteError::Other(format!(
                "Cannot read '{}' as text: file appears to be binary or uses an unsupported encoding",
                relative_path
            ))
        } else {
            TechtiteError::Io(e)
        }
    })
}

/// Write content to a file, creating parent directories if needed.
pub fn write_file(vault_root: &Path, relative_path: &str, content: &str) -> Result<(), TechtiteError> {
    if has_path_traversal(relative_path) {
        return Err(TechtiteError::InvalidPath(relative_path.to_string()));
    }
    let full_path = resolve_vault_path(vault_root, relative_path)?;
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&full_path, content)?;
    Ok(())
}

/// Create a new file with optional content.
pub fn create_file(vault_root: &Path, relative_path: &str, content: Option<&str>) -> Result<(), TechtiteError> {
    if has_path_traversal(relative_path) {
        return Err(TechtiteError::InvalidPath(relative_path.to_string()));
    }
    let full_path = resolve_vault_path(vault_root, relative_path)?;
    if full_path.exists() {
        return Err(TechtiteError::Other(format!(
            "File already exists: {relative_path}"
        )));
    }
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&full_path, content.unwrap_or(""))?;
    Ok(())
}

/// Create a directory.
pub fn create_dir(vault_root: &Path, relative_path: &str) -> Result<(), TechtiteError> {
    if has_path_traversal(relative_path) {
        return Err(TechtiteError::InvalidPath(relative_path.to_string()));
    }
    let full_path = resolve_vault_path(vault_root, relative_path)?;
    fs::create_dir_all(&full_path)?;
    Ok(())
}

/// Delete a file or directory.
pub fn delete(vault_root: &Path, relative_path: &str) -> Result<(), TechtiteError> {
    if has_path_traversal(relative_path) {
        return Err(TechtiteError::InvalidPath(relative_path.to_string()));
    }
    let full_path = resolve_vault_path(vault_root, relative_path)?;
    if !full_path.exists() {
        return Err(TechtiteError::FileNotFound(relative_path.to_string()));
    }
    if full_path.is_dir() {
        fs::remove_dir_all(&full_path)?;
    } else {
        fs::remove_file(&full_path)?;
    }
    Ok(())
}

/// Rename or move a file/directory.
pub fn rename(vault_root: &Path, old_path: &str, new_path: &str) -> Result<(), TechtiteError> {
    if has_path_traversal(old_path) || has_path_traversal(new_path) {
        return Err(TechtiteError::InvalidPath(format!(
            "{old_path} -> {new_path}"
        )));
    }
    let old_full = resolve_vault_path(vault_root, old_path)?;
    let new_full = resolve_vault_path(vault_root, new_path)?;
    if !old_full.exists() {
        return Err(TechtiteError::FileNotFound(old_path.to_string()));
    }
    if let Some(parent) = new_full.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::rename(&old_full, &new_full)?;
    Ok(())
}

/// Check if a file or directory exists.
pub fn exists(vault_root: &Path, relative_path: &str) -> Result<bool, TechtiteError> {
    if has_path_traversal(relative_path) {
        return Err(TechtiteError::InvalidPath(relative_path.to_string()));
    }
    let full_path = resolve_vault_path(vault_root, relative_path)?;
    Ok(full_path.exists())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup() -> TempDir {
        tempfile::tempdir().unwrap()
    }

    #[test]
    fn test_read_write_file() {
        let dir = setup();
        let root = dir.path();
        write_file(root, "test.md", "hello").unwrap();
        let content = read_file(root, "test.md").unwrap();
        assert_eq!(content, "hello");
    }

    #[test]
    fn test_path_traversal_blocked() {
        let dir = setup();
        let root = dir.path();
        let result = read_file(root, "../etc/passwd");
        assert!(result.is_err());
    }

    #[test]
    fn test_create_and_delete() {
        let dir = setup();
        let root = dir.path();
        create_file(root, "new.md", Some("content")).unwrap();
        assert!(exists(root, "new.md").unwrap());
        delete(root, "new.md").unwrap();
        assert!(!exists(root, "new.md").unwrap());
    }

    #[test]
    fn test_rename_file() {
        let dir = setup();
        let root = dir.path();
        create_file(root, "old.md", Some("data")).unwrap();
        rename(root, "old.md", "new.md").unwrap();
        assert!(!exists(root, "old.md").unwrap());
        assert_eq!(read_file(root, "new.md").unwrap(), "data");
    }
}
