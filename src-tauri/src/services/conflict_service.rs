//! Conflict detection and resolution service.
//!
//! Handles 3-way merge conflict detection, manual resolution (local/remote
//! priority), and AI-assisted auto-resolution via Claude Code SDK.
//!
//! NOTE: This is currently a stub implementation. Real conflict detection
//! requires git2 index conflict iteration.

use std::path::Path;

use crate::models::git::{ConflictInfo, ConflictResolution};
use crate::utils::error::TechtiteError;

/// Maximum number of files to attempt AI auto-resolution on in a single
/// batch (US-5.12 requirement).
pub const AI_RESOLVE_BATCH_LIMIT: usize = 10;

/// Confidence threshold for AI auto-resolution. Below this value,
/// fall back to manual resolution (US-5.12).
pub const AI_CONFIDENCE_THRESHOLD: f64 = 0.8;

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/// Detect conflicts in the repository index after a merge.
///
/// Stub: returns an empty list.
/// Real impl: iterate `repo.index()?.conflicts()?` and build ConflictInfo
/// for each conflict entry (ancestor, ours, theirs).
pub fn detect_conflicts(vault_path: &Path) -> Result<Vec<ConflictInfo>, TechtiteError> {
    if !vault_path.join(".git").is_dir() {
        return Err(TechtiteError::Other("Not a git repository".to_string()));
    }

    // TODO: Replace with real git2 implementation
    // let repo = git2::Repository::discover(vault_path)?;
    // let index = repo.index()?;
    // let conflicts = index.conflicts()?;
    // let mut result = Vec::new();
    // for conflict in conflicts {
    //     let conflict = conflict?;
    //     let ancestor = conflict.ancestor;
    //     let our = conflict.our;
    //     let their = conflict.their;
    //     // Read blob contents for each side
    //     // Determine conflict_type
    //     // Build ConflictInfo
    //     result.push(ConflictInfo { ... });
    // }
    // Ok(result)

    Ok(Vec::new())
}

/// Get a list of currently unresolved conflicts.
///
/// Stub: returns an empty list.
pub fn get_unresolved_conflicts(vault_path: &Path) -> Result<Vec<ConflictInfo>, TechtiteError> {
    detect_conflicts(vault_path)
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/// Resolve a single conflict.
///
/// Supports three strategies:
/// - Local: keep the local version
/// - Remote: keep the remote version
/// - Merged: use the provided merged content
///
/// Stub: no-op.
/// Real impl: write the chosen content to the file, then stage it to
/// clear the conflict marker in the index.
pub fn resolve_conflict(
    vault_path: &Path,
    file_path: &str,
    resolution: ConflictResolution,
) -> Result<(), TechtiteError> {
    if !vault_path.join(".git").is_dir() {
        return Err(TechtiteError::Other("Not a git repository".to_string()));
    }

    // TODO: Replace with real git2 implementation
    // let repo = git2::Repository::discover(vault_path)?;
    // let full_path = vault_path.join(file_path);
    //
    // match resolution {
    //     ConflictResolution::Local => {
    //         // Read "ours" blob from index stage 2
    //         // Write to working directory
    //     }
    //     ConflictResolution::Remote => {
    //         // Read "theirs" blob from index stage 3
    //         // Write to working directory
    //     }
    //     ConflictResolution::Merged { content } => {
    //         // Write merged content to working directory
    //         std::fs::write(&full_path, &content)?;
    //     }
    // }
    //
    // // Stage the resolved file to clear the conflict
    // let mut index = repo.index()?;
    // index.add_path(std::path::Path::new(file_path))?;
    // index.write()?;

    let _ = (file_path, resolution);
    Ok(())
}

// ---------------------------------------------------------------------------
// AI auto-resolution
// ---------------------------------------------------------------------------

/// Attempt AI-assisted conflict resolution using Claude Code SDK (US-5.12).
///
/// Sends the base, local, and remote content to the AI for a 3-way merge.
/// Returns the resolution with a confidence score. If confidence is below
/// the threshold, returns an error indicating manual resolution is needed.
///
/// Stub: always returns an error (not yet implemented).
///
/// TODO (Unit 7): Integrate with agent_registry to get Claude Code SDK agent.
/// TODO (Unit 9): Respect cost budget limits before making API calls.
pub async fn ai_resolve_conflict(
    _vault_path: &Path,
    conflict: &ConflictInfo,
) -> Result<AiResolutionResult, TechtiteError> {
    // TODO: Implement AI-assisted resolution
    // 1. Check if Claude Code SDK agent is available
    // 2. Send base_content + local_content + remote_content
    // 3. Parse AI response for merged content + confidence score
    // 4. If confidence >= AI_CONFIDENCE_THRESHOLD, return Merged resolution
    // 5. If confidence < threshold, return error for manual fallback

    let _ = conflict;
    Err(TechtiteError::Other(
        "AI conflict resolution not yet implemented. Waiting for Claude Code SDK integration (Unit 7).".to_string(),
    ))
}

/// Result of an AI-assisted conflict resolution attempt.
pub struct AiResolutionResult {
    /// The merged content produced by the AI.
    pub merged_content: String,
    /// Confidence score (0.0 to 1.0).
    pub confidence: f64,
    /// The resolution to apply.
    pub resolution: ConflictResolution,
}

/// Classify whether a file conflict is a binary conflict.
/// Binary conflicts always require manual selection (local or remote).
pub fn is_binary_conflict(conflict: &ConflictInfo) -> bool {
    // Simple heuristic: check for null bytes in content
    conflict.local_content.contains('\0') || conflict.remote_content.contains('\0')
}
