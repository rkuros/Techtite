use serde::{Deserialize, Serialize};

/// Git repository status containing staged, unstaged, and untracked files.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    pub branch: String,
    pub is_clean: bool,
    pub staged: Vec<FileChange>,
    pub unstaged: Vec<FileChange>,
    pub untracked: Vec<String>,
}

impl Default for GitStatus {
    fn default() -> Self {
        Self {
            branch: "main".to_string(),
            is_clean: true,
            staged: Vec::new(),
            unstaged: Vec::new(),
            untracked: Vec::new(),
        }
    }
}

impl GitStatus {
    /// Format a summary of changes for commit message generation.
    pub fn format_changes_summary(&self) -> String {
        let mut lines = Vec::new();
        for change in &self.staged {
            lines.push(format!("  {} ({})", change.path, change.status.as_str()));
        }
        for change in &self.unstaged {
            lines.push(format!("  {} ({})", change.path, change.status.as_str()));
        }
        for path in &self.untracked {
            lines.push(format!("  {} (untracked)", path));
        }
        lines.join("\n")
    }
}

/// A single file change with its path and status.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileChange {
    pub path: String,
    pub status: GitFileStatus,
}

/// Git file status values.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum GitFileStatus {
    Unmodified,
    Modified,
    Added,
    Deleted,
    Renamed,
    Untracked,
    Conflicted,
}

impl GitFileStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Unmodified => "unmodified",
            Self::Modified => "modified",
            Self::Added => "added",
            Self::Deleted => "deleted",
            Self::Renamed => "renamed",
            Self::Untracked => "untracked",
            Self::Conflicted => "conflicted",
        }
    }
}

/// Information about a single commit.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitInfo {
    pub hash: String,
    pub message: String,
    pub author: String,
    pub timestamp: String,
    pub is_auto_commit: bool,
    pub changed_files: Vec<String>,
}

/// A diff hunk for a specific file.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffHunk {
    pub file_path: String,
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub lines: Vec<DiffLine>,
}

/// A single line within a diff hunk.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffLine {
    pub line_type: DiffLineType,
    pub content: String,
}

/// Type of a diff line.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DiffLineType {
    Context,
    Addition,
    Deletion,
}

/// Information about a Git branch.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BranchInfo {
    pub name: String,
    pub is_current: bool,
    pub upstream: Option<String>,
    pub ahead: u32,
    pub behind: u32,
}

/// Information about a merge conflict on a specific file.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConflictInfo {
    pub file_path: String,
    pub conflict_type: ConflictType,
    pub local_content: String,
    pub remote_content: String,
    pub base_content: Option<String>,
}

/// The type of a merge conflict.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConflictType {
    Content,
    BothModified,
    DeletedByUs,
    DeletedByThem,
    BothAdded,
}

/// Current synchronization state.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncState {
    pub status: SyncStatus,
    pub last_sync_at: Option<String>,
    pub error_message: Option<String>,
}

impl Default for SyncState {
    fn default() -> Self {
        Self {
            status: SyncStatus::Idle,
            last_sync_at: None,
            error_message: None,
        }
    }
}

/// Sync status enum.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SyncStatus {
    Idle,
    Syncing,
    Completed,
    Error,
}

/// Resolution strategy for a conflict.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConflictResolution {
    Local,
    Remote,
    Merged { content: String },
}
