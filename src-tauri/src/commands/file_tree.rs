use std::fs;
use std::path::Path;

use chrono::{DateTime, Utc};
use tauri::State;

use crate::models::file::{FileEntry, FileMetadata, FileType, GitFileStatus};
use crate::utils::path::resolve_vault_path;
use crate::AppState;

/// Build a file tree recursively from the given directory.
/// Excludes `.techtite/` always, and `.gitignore`-matched entries unless `include_ignored` is true.
fn build_file_tree(
    vault_root: &Path,
    current_dir: &Path,
    gitignore_patterns: &[String],
    include_ignored: bool,
) -> Result<Vec<FileEntry>, String> {
    let mut entries: Vec<FileEntry> = Vec::new();

    let read_dir = fs::read_dir(current_dir).map_err(|e| {
        format!(
            "Failed to read directory {}: {}",
            current_dir.display(),
            e
        )
    })?;

    for entry in read_dir {
        let entry = entry.map_err(|e| format!("Failed to read dir entry: {e}"))?;
        let path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();

        // Always exclude .techtite and .git directories
        if file_name == ".techtite" || file_name == ".git" {
            continue;
        }

        // Compute relative path from vault root
        let relative_path = path
            .strip_prefix(vault_root)
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| file_name.clone());

        // Apply .gitignore filtering unless include_ignored is true
        if !include_ignored && is_gitignored(&relative_path, &file_name, path.is_dir(), gitignore_patterns) {
            continue;
        }

        let is_dir = path.is_dir();
        let children = if is_dir {
            Some(build_file_tree(
                vault_root,
                &path,
                gitignore_patterns,
                include_ignored,
            )?)
        } else {
            None
        };

        entries.push(FileEntry {
            path: relative_path,
            name: file_name,
            is_dir,
            children,
        });
    }

    // Sort: directories first, then alphabetically
    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

/// Simple .gitignore pattern matching.
/// Supports basic glob patterns: exact match, wildcard prefix (`*.ext`), directory patterns (`dir/`).
fn is_gitignored(
    relative_path: &str,
    file_name: &str,
    is_dir: bool,
    patterns: &[String],
) -> bool {
    for pattern in patterns {
        let pattern = pattern.trim();

        // Skip empty lines and comments
        if pattern.is_empty() || pattern.starts_with('#') {
            continue;
        }

        // Directory-only pattern (ending with /)
        if let Some(dir_pattern) = pattern.strip_suffix('/') {
            if is_dir && (file_name == dir_pattern || relative_path == dir_pattern) {
                return true;
            }
            continue;
        }

        // Wildcard pattern (e.g., *.ext)
        if let Some(ext) = pattern.strip_prefix("*.") {
            if file_name.ends_with(&format!(".{ext}")) {
                return true;
            }
            continue;
        }

        // Exact name match or path match
        if file_name == pattern || relative_path == pattern {
            return true;
        }

        // Pattern with path separator — match against relative path
        if pattern.contains('/') && relative_path.starts_with(pattern) {
            return true;
        }
    }

    false
}

/// Parse .gitignore file and return a list of patterns.
fn parse_gitignore(vault_root: &Path) -> Vec<String> {
    let gitignore_path = vault_root.join(".gitignore");
    if !gitignore_path.exists() {
        return Vec::new();
    }

    match fs::read_to_string(&gitignore_path) {
        Ok(content) => content
            .lines()
            .filter(|line| {
                let trimmed = line.trim();
                !trimmed.is_empty() && !trimmed.starts_with('#')
            })
            .map(|line| line.trim().to_string())
            .collect(),
        Err(_) => Vec::new(),
    }
}

/// Determine the file type based on extension.
fn detect_file_type(path: &Path) -> FileType {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "md" | "markdown" => FileType::Markdown,
        "rs" => FileType::Code {
            language: "rust".to_string(),
        },
        "ts" | "tsx" => FileType::Code {
            language: "typescript".to_string(),
        },
        "js" | "jsx" => FileType::Code {
            language: "javascript".to_string(),
        },
        "py" => FileType::Code {
            language: "python".to_string(),
        },
        "json" => FileType::Code {
            language: "json".to_string(),
        },
        "toml" => FileType::Code {
            language: "toml".to_string(),
        },
        "yaml" | "yml" => FileType::Code {
            language: "yaml".to_string(),
        },
        "html" | "htm" => FileType::Code {
            language: "html".to_string(),
        },
        "css" | "scss" | "sass" => FileType::Code {
            language: "css".to_string(),
        },
        "sh" | "bash" | "zsh" => FileType::Code {
            language: "shell".to_string(),
        },
        "go" => FileType::Code {
            language: "go".to_string(),
        },
        "java" => FileType::Code {
            language: "java".to_string(),
        },
        "c" | "h" => FileType::Code {
            language: "c".to_string(),
        },
        "cpp" | "hpp" | "cc" => FileType::Code {
            language: "cpp".to_string(),
        },
        "png" | "jpg" | "jpeg" | "gif" | "svg" | "webp" | "bmp" | "ico" => FileType::Image,
        "exe" | "dll" | "so" | "dylib" | "wasm" | "o" | "a" => FileType::Binary,
        _ => FileType::Other,
    }
}

/// List immediate children of a directory (non-recursive).
/// Used by the column browser to lazily load directory contents.
///
/// IPC command: `list_dir_entries`
/// Input: `{ path: string }` (absolute path)
/// Output: `FileEntry[]`
#[tauri::command]
pub fn list_dir_entries(path: String) -> Result<Vec<FileEntry>, String> {
    let dir = Path::new(&path);
    if !dir.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }

    let mut entries: Vec<FileEntry> = Vec::new();

    for entry in fs::read_dir(dir).map_err(|e| format!("Failed to read directory: {e}"))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {e}"))?;
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files/dirs
        if name.starts_with('.') {
            continue;
        }

        let entry_path = entry.path();
        entries.push(FileEntry {
            path: entry_path.to_string_lossy().to_string(),
            name,
            is_dir: entry_path.is_dir(),
            children: None,
        });
    }

    // Sort: directories first, then alphabetically
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

/// Get the file tree for the current vault.
///
/// IPC command: `file_tree:get_tree`
///
/// Returns the full recursive tree structure of the vault, with directories first
/// and entries sorted alphabetically. Excludes `.techtite/` and `.git/` always.
/// By default also excludes `.gitignore`-matched entries unless `include_ignored` is true.
#[tauri::command]
pub fn get_tree(
    state: State<'_, AppState>,
    include_ignored: Option<bool>,
) -> Result<FileEntry, String> {
    let root = state.active_root.lock().map_err(|e| e.to_string())?;
    let vault_root = root.as_ref().ok_or("No vault or project open")?;

    let gitignore_patterns = parse_gitignore(vault_root);
    let include = include_ignored.unwrap_or(false);

    let children = build_file_tree(vault_root, vault_root, &gitignore_patterns, include)?;

    let name = vault_root
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "Root".to_string());

    Ok(FileEntry {
        path: "".to_string(),
        name,
        is_dir: true,
        children: Some(children),
    })
}

/// Get metadata for a specific file.
///
/// IPC command: `file_tree:get_metadata`
///
/// Returns file size, timestamps, detected file type, and placeholder fields
/// for frontmatter, tags, outgoing links, and git status.
#[tauri::command]
pub fn get_metadata(
    state: State<'_, AppState>,
    path: String,
) -> Result<FileMetadata, String> {
    let root = state.active_root.lock().map_err(|e| e.to_string())?;
    let vault_root = root.as_ref().ok_or("No vault or project open")?;

    let full_path = resolve_vault_path(vault_root, &path).map_err(|e| e.to_string())?;

    if !full_path.exists() {
        return Err(format!("File not found: {path}"));
    }

    let metadata = fs::metadata(&full_path).map_err(|e| {
        format!("Failed to read metadata for {path}: {e}")
    })?;

    let size_bytes = metadata.len();

    let modified_at = metadata
        .modified()
        .ok()
        .map(|t| {
            let dt: DateTime<Utc> = t.into();
            dt.to_rfc3339()
        })
        .unwrap_or_default();

    let created_at = metadata
        .created()
        .ok()
        .map(|t| {
            let dt: DateTime<Utc> = t.into();
            dt.to_rfc3339()
        })
        .unwrap_or_default();

    let file_type = detect_file_type(&full_path);

    // TODO: Parse frontmatter from markdown files (Unit 4 integration)
    let frontmatter = None;

    // TODO: Extract tags from frontmatter and inline #tags (Unit 4 integration)
    let tags = Vec::new();

    // TODO: Extract outgoing [[links]] from content (Unit 4 integration)
    let outgoing_links = Vec::new();

    // TODO: Get git status for this file (Unit 6 integration)
    let git_status: Option<GitFileStatus> = None;

    Ok(FileMetadata {
        path,
        size_bytes,
        modified_at,
        created_at,
        file_type,
        frontmatter,
        tags,
        outgoing_links,
        git_status,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup_vault() -> TempDir {
        let dir = tempfile::tempdir().unwrap();
        // Create some test files
        fs::write(dir.path().join("readme.md"), "# Hello").unwrap();
        fs::write(dir.path().join("notes.md"), "Some notes").unwrap();
        fs::create_dir(dir.path().join("subfolder")).unwrap();
        fs::write(
            dir.path().join("subfolder").join("nested.md"),
            "Nested content",
        )
        .unwrap();
        fs::create_dir(dir.path().join(".techtite")).unwrap();
        fs::write(
            dir.path().join(".techtite").join("config.json"),
            "{}",
        )
        .unwrap();
        dir
    }

    #[test]
    fn test_build_file_tree_excludes_techtite() {
        let dir = setup_vault();
        let root = dir.path();
        let patterns = parse_gitignore(root);
        let tree = build_file_tree(root, root, &patterns, false).unwrap();

        // .techtite should be excluded
        assert!(
            tree.iter().all(|e| e.name != ".techtite"),
            "Expected .techtite to be excluded"
        );
    }

    #[test]
    fn test_build_file_tree_includes_files() {
        let dir = setup_vault();
        let root = dir.path();
        let patterns = parse_gitignore(root);
        let tree = build_file_tree(root, root, &patterns, false).unwrap();

        let names: Vec<&str> = tree.iter().map(|e| e.name.as_str()).collect();
        assert!(names.contains(&"readme.md"));
        assert!(names.contains(&"notes.md"));
        assert!(names.contains(&"subfolder"));
    }

    #[test]
    fn test_build_file_tree_dirs_first() {
        let dir = setup_vault();
        let root = dir.path();
        let patterns = parse_gitignore(root);
        let tree = build_file_tree(root, root, &patterns, false).unwrap();

        // First entry should be the subfolder (directories come first)
        if let Some(first) = tree.first() {
            assert!(first.is_dir, "Expected first entry to be a directory");
        }
    }

    #[test]
    fn test_gitignore_filtering() {
        let dir = setup_vault();
        let root = dir.path();

        // Create a .gitignore that excludes *.log files
        fs::write(root.join(".gitignore"), "*.log\nbuild/\n").unwrap();
        fs::write(root.join("debug.log"), "log content").unwrap();
        fs::create_dir(root.join("build")).unwrap();
        fs::write(root.join("build").join("out.js"), "built").unwrap();

        let patterns = parse_gitignore(root);
        let tree = build_file_tree(root, root, &patterns, false).unwrap();

        let names: Vec<&str> = tree.iter().map(|e| e.name.as_str()).collect();
        assert!(!names.contains(&"debug.log"), "Expected .log file to be excluded");
        assert!(!names.contains(&"build"), "Expected build/ dir to be excluded");
    }

    #[test]
    fn test_detect_file_type() {
        assert!(matches!(detect_file_type(Path::new("test.md")), FileType::Markdown));
        assert!(matches!(
            detect_file_type(Path::new("app.tsx")),
            FileType::Code { .. }
        ));
        assert!(matches!(detect_file_type(Path::new("photo.png")), FileType::Image));
        assert!(matches!(detect_file_type(Path::new("app.exe")), FileType::Binary));
        assert!(matches!(detect_file_type(Path::new("readme.txt")), FileType::Other));
    }
}
