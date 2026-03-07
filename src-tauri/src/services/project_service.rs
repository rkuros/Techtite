use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::models::project::Project;
use crate::utils::error::TechtiteError;

const TECHTITE_DIR: &str = ".techtite";
const PROJECTS_FILE: &str = "projects.json";

/// Directories to skip when auto-detecting projects.
const SKIP_DIRS: &[&str] = &[".techtite", "node_modules", "target"];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionState {
    pub vault_path: String,
    pub project_path: Option<String>,
}

/// Entry in `.techtite/projects.json` for custom projects.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct CustomProjectEntry {
    path: String,
}

/// Generate a deterministic project ID from an absolute path.
fn make_project_id(path: &Path) -> String {
    let mut hasher = DefaultHasher::new();
    path.to_string_lossy().hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

/// List all projects for a vault: auto-detected top-level directories + custom projects.
pub fn list_projects(vault_path: &Path) -> Result<Vec<Project>, TechtiteError> {
    let mut projects = Vec::new();

    // Auto-detect top-level directories in vault
    let entries = fs::read_dir(vault_path)?;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden directories and special directories
        if name.starts_with('.') || SKIP_DIRS.contains(&name.as_str()) {
            continue;
        }

        projects.push(Project {
            id: make_project_id(&path),
            name,
            path,
            is_custom: false,
        });
    }

    // Load custom projects from .techtite/projects.json
    let custom_projects = load_custom_projects(vault_path)?;
    for entry in custom_projects {
        let path = PathBuf::from(&entry.path);
        if !path.exists() || !path.is_dir() {
            continue; // Skip entries pointing to non-existent directories
        }

        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "Unknown".to_string());

        projects.push(Project {
            id: make_project_id(&path),
            name,
            path,
            is_custom: true,
        });
    }

    // Sort alphabetically by name
    projects.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(projects)
}

/// Add a custom project to `.techtite/projects.json`.
pub fn add_custom_project(
    vault_path: &Path,
    project_path: &Path,
) -> Result<Project, TechtiteError> {
    if !project_path.exists() || !project_path.is_dir() {
        return Err(TechtiteError::InvalidPath(
            project_path.to_string_lossy().to_string(),
        ));
    }

    let mut entries = load_custom_projects(vault_path)?;

    // Check if already registered
    let abs_path = project_path.to_string_lossy().to_string();
    if entries.iter().any(|e| e.path == abs_path) {
        // Already exists — just return the project
    } else {
        entries.push(CustomProjectEntry {
            path: abs_path.clone(),
        });
        save_custom_projects(vault_path, &entries)?;
    }

    let name = project_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    Ok(Project {
        id: make_project_id(project_path),
        name,
        path: project_path.to_path_buf(),
        is_custom: true,
    })
}

/// Remove a custom project from `.techtite/projects.json` by project ID.
pub fn remove_custom_project(vault_path: &Path, project_id: &str) -> Result<(), TechtiteError> {
    let entries = load_custom_projects(vault_path)?;

    let filtered: Vec<CustomProjectEntry> = entries
        .into_iter()
        .filter(|e| {
            let path = PathBuf::from(&e.path);
            make_project_id(&path) != project_id
        })
        .collect();

    save_custom_projects(vault_path, &filtered)?;
    Ok(())
}

/// Save the current session (vault + optional project) to app data directory.
pub fn save_session(vault_path: &str, project_path: Option<&str>) -> Result<(), TechtiteError> {
    let app_data = dirs_next::data_dir()
        .ok_or_else(|| TechtiteError::Other("Could not determine app data directory".to_string()))?
        .join("com.miyanorococo.techtite");
    fs::create_dir_all(&app_data)?;

    let session = SessionState {
        vault_path: vault_path.to_string(),
        project_path: project_path.map(|s| s.to_string()),
    };

    let content = serde_json::to_string_pretty(&session)?;
    fs::write(app_data.join("session.json"), content)?;
    Ok(())
}

/// Load the last session from app data directory.
pub fn load_session() -> Result<Option<SessionState>, TechtiteError> {
    let app_data = dirs_next::data_dir()
        .ok_or_else(|| TechtiteError::Other("Could not determine app data directory".to_string()))?
        .join("com.miyanorococo.techtite");
    let path = app_data.join("session.json");

    if !path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(path)?;
    let session: SessionState = serde_json::from_str(&content)?;
    Ok(Some(session))
}

/// Load custom project entries from `.techtite/projects.json`.
fn load_custom_projects(vault_path: &Path) -> Result<Vec<CustomProjectEntry>, TechtiteError> {
    let projects_path = vault_path.join(TECHTITE_DIR).join(PROJECTS_FILE);
    if !projects_path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(projects_path)?;
    let entries: Vec<CustomProjectEntry> = serde_json::from_str(&content)?;
    Ok(entries)
}

/// Save custom project entries to `.techtite/projects.json`.
fn save_custom_projects(
    vault_path: &Path,
    entries: &[CustomProjectEntry],
) -> Result<(), TechtiteError> {
    let techtite_dir = vault_path.join(TECHTITE_DIR);
    fs::create_dir_all(&techtite_dir)?;

    let content = serde_json::to_string_pretty(entries)?;
    fs::write(techtite_dir.join(PROJECTS_FILE), content)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_make_project_id_deterministic() {
        let path = Path::new("/some/path/to/project");
        let id1 = make_project_id(path);
        let id2 = make_project_id(path);
        assert_eq!(id1, id2);
        assert_eq!(id1.len(), 16);
    }

    #[test]
    fn test_make_project_id_different_paths() {
        let id1 = make_project_id(Path::new("/path/a"));
        let id2 = make_project_id(Path::new("/path/b"));
        assert_ne!(id1, id2);
    }

    #[test]
    fn test_list_projects_auto_detect() {
        let dir = tempfile::tempdir().unwrap();
        // Create some subdirectories
        fs::create_dir(dir.path().join("project-a")).unwrap();
        fs::create_dir(dir.path().join("project-b")).unwrap();
        fs::create_dir(dir.path().join(".hidden")).unwrap();
        fs::create_dir(dir.path().join("node_modules")).unwrap();
        // Create a file (should be skipped)
        fs::write(dir.path().join("readme.md"), "hello").unwrap();

        let projects = list_projects(dir.path()).unwrap();
        let names: Vec<&str> = projects.iter().map(|p| p.name.as_str()).collect();

        assert!(names.contains(&"project-a"));
        assert!(names.contains(&"project-b"));
        assert!(!names.contains(&".hidden"));
        assert!(!names.contains(&"node_modules"));
        assert_eq!(projects.len(), 2);

        for p in &projects {
            assert!(!p.is_custom);
        }
    }

    #[test]
    fn test_add_and_remove_custom_project() {
        let vault_dir = tempfile::tempdir().unwrap();
        let project_dir = tempfile::tempdir().unwrap();

        // Initialize .techtite
        fs::create_dir_all(vault_dir.path().join(".techtite")).unwrap();

        let project = add_custom_project(vault_dir.path(), project_dir.path()).unwrap();
        assert!(project.is_custom);
        assert_eq!(project.path, project_dir.path().to_path_buf());

        // Should appear in list
        let projects = list_projects(vault_dir.path()).unwrap();
        assert!(projects.iter().any(|p| p.id == project.id));

        // Remove it
        remove_custom_project(vault_dir.path(), &project.id).unwrap();
        let projects = list_projects(vault_dir.path()).unwrap();
        assert!(!projects.iter().any(|p| p.id == project.id));
    }
}
