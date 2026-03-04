use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{AppHandle, Emitter};

const TECHTITE_DIR: &str = ".techtite";

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FsChangedPayload {
    pub path: String,
    pub change_type: String,
}

pub struct WatcherState {
    watcher: Option<RecommendedWatcher>,
}

impl WatcherState {
    pub fn new() -> Self {
        Self { watcher: None }
    }
}

/// Start watching a vault directory for file changes.
pub fn start_watching(
    app_handle: AppHandle,
    vault_root: PathBuf,
    state: Arc<Mutex<WatcherState>>,
) -> Result<(), String> {
    let vault_root_clone = vault_root.clone();

    let mut watcher = RecommendedWatcher::new(
        move |result: Result<Event, notify::Error>| {
            if let Ok(event) = result {
                handle_fs_event(&app_handle, &vault_root_clone, event);
            }
        },
        Config::default().with_poll_interval(Duration::from_millis(100)),
    )
    .map_err(|e| format!("Failed to create watcher: {e}"))?;

    watcher
        .watch(&vault_root, RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch directory: {e}"))?;

    if let Ok(mut s) = state.lock() {
        s.watcher = Some(watcher);
    }

    Ok(())
}

/// Stop the file watcher.
pub fn stop_watching(state: Arc<Mutex<WatcherState>>) {
    if let Ok(mut s) = state.lock() {
        s.watcher = None;
    }
}

fn handle_fs_event(app_handle: &AppHandle, vault_root: &PathBuf, event: Event) {
    for path in &event.paths {
        // Skip .techtite directory changes
        if path
            .strip_prefix(vault_root)
            .map(|p| p.starts_with(TECHTITE_DIR))
            .unwrap_or(false)
        {
            continue;
        }

        let relative_path = path
            .strip_prefix(vault_root)
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| path.to_string_lossy().to_string());

        let change_type = match event.kind {
            EventKind::Create(_) => "created",
            EventKind::Modify(_) => "modified",
            EventKind::Remove(_) => "deleted",
            _ => return,
        };

        let payload = FsChangedPayload {
            path: relative_path,
            change_type: change_type.to_string(),
        };

        let _ = app_handle.emit("fs:changed", &payload);
    }
}
