//! Auto-sync scheduler service.
//!
//! Manages the background sync loop that periodically commits, pushes, and
//! pulls. Uses tokio for async scheduling. The interval is configurable via
//! VaultConfig.auto_sync_interval_sec (default: 300 seconds = 5 minutes).
//!
//! NOTE: This is currently a stub implementation. The actual sync loop will
//! be activated once git2 is added to Cargo.toml and git_service is fully
//! implemented.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use tauri::Emitter;
use tokio::sync::Mutex;

use crate::models::git::{SyncState, SyncStatus};

/// Auto-sync scheduler that runs periodic commit + push + pull cycles.
pub struct SyncScheduler {
    /// Sync interval duration.
    pub interval: Duration,
    /// Flag to control whether the sync loop is running.
    pub is_running: Arc<AtomicBool>,
    /// Current sync state (shared across threads).
    pub state: Arc<Mutex<SyncState>>,
}

impl SyncScheduler {
    /// Create a new SyncScheduler with the given interval in seconds.
    pub fn new(interval_sec: u64) -> Self {
        Self {
            interval: Duration::from_secs(interval_sec),
            is_running: Arc::new(AtomicBool::new(false)),
            state: Arc::new(Mutex::new(SyncState::default())),
        }
    }

    /// Start the background sync loop.
    ///
    /// Stub: the loop structure is in place but the actual sync cycle
    /// only updates state. Real implementation will call git_service
    /// operations.
    pub async fn start(&self, app_handle: tauri::AppHandle) {
        self.is_running.store(true, Ordering::Relaxed);

        let is_running = self.is_running.clone();
        let state = self.state.clone();
        let interval = self.interval;

        tokio::spawn(async move {
            let mut ticker = tokio::time::interval(interval);
            loop {
                ticker.tick().await;
                if !is_running.load(Ordering::Relaxed) {
                    break;
                }
                Self::sync_cycle(&state, &app_handle).await;
            }
        });
    }

    /// Stop the background sync loop.
    pub fn stop(&self) {
        self.is_running.store(false, Ordering::Relaxed);
    }

    /// Execute a single sync cycle.
    ///
    /// Stub: transitions state through Syncing -> Completed/Error and
    /// emits events. Real impl will:
    /// 1. Check for uncommitted changes
    /// 2. Stage all + auto-commit (with AI or template message)
    /// 3. Push to remote
    /// 4. Pull from remote
    /// 5. Detect conflicts
    async fn sync_cycle(state: &Arc<Mutex<SyncState>>, app_handle: &tauri::AppHandle) {
        // 1. Update state to Syncing
        {
            let mut s = state.lock().await;
            s.status = SyncStatus::Syncing;
            s.error_message = None;
            let _ = app_handle.emit("sync:state_changed", &*s);
        }

        // TODO: Implement actual sync cycle:
        // - git_service::get_status() to check for changes
        // - git_service::stage_all() if changes exist
        // - generate_commit_message() for auto-commit
        // - git_service::create_commit() with [auto] prefix
        // - git_service::push() to remote
        // - git_service::pull() from remote
        // - conflict_service::detect_conflicts() if pull has conflicts
        // - Emit sync:conflict_detected if conflicts found

        // TODO: Emit sync:conflict_detected if conflicts are found:
        // let _ = app_handle.emit("sync:conflict_detected", "");

        // TODO (Unit 7): Check agent_registry for Claude Code SDK availability
        //   to decide between AI-generated and template commit messages.

        // 2. Update state to Completed
        {
            let mut s = state.lock().await;
            s.status = SyncStatus::Completed;
            s.last_sync_at = Some(chrono::Utc::now().to_rfc3339());
            let _ = app_handle.emit("sync:state_changed", &*s);
        }
    }

    /// Trigger an immediate sync (bypass the interval timer).
    pub async fn trigger_now(&self, app_handle: &tauri::AppHandle) {
        Self::sync_cycle(&self.state, app_handle).await;
    }

    /// Get the current sync state.
    pub async fn get_state(&self) -> SyncState {
        self.state.lock().await.clone()
    }

    /// Reset the auto-commit batch timer.
    /// Called when a manual commit is made (US-5.9 requirement).
    pub fn reset_batch_timer(&self) {
        // TODO: When real implementation exists, reset the internal
        // debounce/batch timer so that the next auto-commit window
        // starts fresh after a manual commit.
    }
}

/// Generate a commit message for auto-sync.
///
/// When Claude Code SDK is available (Unit 7 agent_registry), use AI to
/// generate a conventional commit message. Otherwise, fall back to a
/// timestamp-based template.
///
/// Stub: always returns the template fallback.
pub fn generate_auto_commit_message(changed_file_count: usize) -> String {
    // TODO (Unit 7): Check if Claude Code SDK agent is available via
    //   agent_registry::get_available_sdk_agent(). If available, send
    //   file names + change types (NOT full diffs) for AI generation.

    let now = chrono::Local::now().format("%Y-%m-%d %H:%M");
    format!("[auto] {} — {} file(s) changed", now, changed_file_count)
}
