//! Git operations service using git2 (libgit2 bindings).

use std::path::Path;

use git2::{DiffOptions, Repository, Sort, StatusOptions};

use crate::models::git::{
    BranchInfo, CommitInfo, DiffHunk, DiffLine, DiffLineType, FileChange, GitFileStatus, GitStatus,
};
use crate::utils::error::TechtiteError;

// ---------------------------------------------------------------------------
// Repository discovery
// ---------------------------------------------------------------------------

/// Open the git repository at (or above) the given vault path.
fn open_repo(vault_path: &Path) -> Result<Repository, TechtiteError> {
    Repository::discover(vault_path).map_err(|e| {
        if e.code() == git2::ErrorCode::NotFound {
            TechtiteError::Other("Not a git repository".to_string())
        } else {
            TechtiteError::Git(e)
        }
    })
}

/// Check whether a git repository can be discovered under the given vault path.
pub fn is_git_repo(vault_path: &Path) -> bool {
    Repository::discover(vault_path).is_ok()
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

/// Retrieve the current git status (staged, unstaged, untracked).
pub fn get_status(vault_path: &Path) -> Result<GitStatus, TechtiteError> {
    let repo = open_repo(vault_path)?;

    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .include_ignored(false);

    let statuses = repo.statuses(Some(&mut opts))?;

    let mut staged = Vec::new();
    let mut unstaged = Vec::new();
    let mut untracked = Vec::new();

    for entry in statuses.iter() {
        let path = entry.path().unwrap_or("").to_string();
        let s = entry.status();

        // Staged changes (index vs HEAD)
        if s.intersects(
            git2::Status::INDEX_NEW
                | git2::Status::INDEX_MODIFIED
                | git2::Status::INDEX_DELETED
                | git2::Status::INDEX_RENAMED,
        ) {
            let status = if s.contains(git2::Status::INDEX_NEW) {
                GitFileStatus::Added
            } else if s.contains(git2::Status::INDEX_MODIFIED) {
                GitFileStatus::Modified
            } else if s.contains(git2::Status::INDEX_DELETED) {
                GitFileStatus::Deleted
            } else if s.contains(git2::Status::INDEX_RENAMED) {
                GitFileStatus::Renamed
            } else {
                GitFileStatus::Modified
            };
            staged.push(FileChange {
                path: path.clone(),
                status,
            });
        }

        // Unstaged changes (workdir vs index)
        if s.intersects(
            git2::Status::WT_MODIFIED | git2::Status::WT_DELETED | git2::Status::WT_RENAMED,
        ) {
            let status = if s.contains(git2::Status::WT_MODIFIED) {
                GitFileStatus::Modified
            } else if s.contains(git2::Status::WT_DELETED) {
                GitFileStatus::Deleted
            } else if s.contains(git2::Status::WT_RENAMED) {
                GitFileStatus::Renamed
            } else {
                GitFileStatus::Modified
            };
            unstaged.push(FileChange {
                path: path.clone(),
                status,
            });
        }

        // Untracked
        if s.contains(git2::Status::WT_NEW) {
            untracked.push(path.clone());
        }

        // Conflicted
        if s.contains(git2::Status::CONFLICTED) {
            unstaged.push(FileChange {
                path,
                status: GitFileStatus::Conflicted,
            });
        }
    }

    // Current branch name
    let branch = match repo.head() {
        Ok(head) => head.shorthand().unwrap_or("HEAD").to_string(),
        Err(_) => "HEAD (no commits)".to_string(),
    };

    let is_clean = staged.is_empty() && unstaged.is_empty() && untracked.is_empty();

    Ok(GitStatus {
        branch,
        is_clean,
        staged,
        unstaged,
        untracked,
    })
}

// ---------------------------------------------------------------------------
// Staging
// ---------------------------------------------------------------------------

/// Stage specified files (add to index).
pub fn stage(vault_path: &Path, paths: &[String]) -> Result<(), TechtiteError> {
    let repo = open_repo(vault_path)?;
    let mut index = repo.index()?;

    for p in paths {
        let file_path = Path::new(p);
        let full_path = repo
            .workdir()
            .ok_or_else(|| TechtiteError::Other("Bare repository".to_string()))?
            .join(file_path);
        if full_path.exists() {
            index.add_path(file_path)?;
        } else {
            index.remove_path(file_path)?;
        }
    }
    index.write()?;
    Ok(())
}

/// Stage all changed files in the working directory.
pub fn stage_all(vault_path: &Path) -> Result<(), TechtiteError> {
    let repo = open_repo(vault_path)?;
    let mut index = repo.index()?;
    index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)?;
    index.update_all(["*"].iter(), None)?;
    index.write()?;
    Ok(())
}

/// Unstage specified files (reset index entries to HEAD).
pub fn unstage(vault_path: &Path, paths: &[String]) -> Result<(), TechtiteError> {
    let repo = open_repo(vault_path)?;

    match repo.head() {
        Ok(head) => {
            let head_commit = head.peel_to_commit()?;
            let head_tree = head_commit.tree()?;
            let pathspecs: Vec<&str> = paths.iter().map(|s| s.as_str()).collect();
            repo.reset_default(Some(head_tree.as_object()), pathspecs)?;
        }
        Err(_) => {
            // No commits yet — remove from index entirely
            let mut index = repo.index()?;
            for p in paths {
                index.remove_path(Path::new(p))?;
            }
            index.write()?;
        }
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Commit
// ---------------------------------------------------------------------------

/// Create a commit from the current index.
pub fn create_commit(vault_path: &Path, message: &str) -> Result<String, TechtiteError> {
    let repo = open_repo(vault_path)?;
    let sig = repo.signature()?;
    let mut index = repo.index()?;
    let tree_id = index.write_tree()?;
    let tree = repo.find_tree(tree_id)?;

    let oid = match repo.head() {
        Ok(head) => {
            let parent = head.peel_to_commit()?;
            repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &[&parent])?
        }
        Err(_) => {
            // Initial commit (no parent)
            repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &[])?
        }
    };

    Ok(oid.to_string())
}

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------

/// Get diff hunks, optionally filtered to a specific file.
pub fn get_diff(
    vault_path: &Path,
    path: Option<&str>,
    staged: bool,
) -> Result<Vec<DiffHunk>, TechtiteError> {
    let repo = open_repo(vault_path)?;

    let mut diff_opts = DiffOptions::new();
    if let Some(p) = path {
        diff_opts.pathspec(p);
    }

    let diff = if staged {
        let head_tree = match repo.head() {
            Ok(head) => Some(head.peel_to_tree()?),
            Err(_) => None,
        };
        repo.diff_tree_to_index(head_tree.as_ref(), None, Some(&mut diff_opts))?
    } else {
        repo.diff_index_to_workdir(None, Some(&mut diff_opts))?
    };

    collect_diff_hunks(&diff)
}

/// Get diff hunks for a specific commit.
pub fn get_commit_diff(vault_path: &Path, hash: &str) -> Result<Vec<DiffHunk>, TechtiteError> {
    let repo = open_repo(vault_path)?;
    let oid = git2::Oid::from_str(hash)
        .map_err(|_| TechtiteError::Other(format!("Invalid commit hash: {}", hash)))?;
    let commit = repo.find_commit(oid)?;
    let tree = commit.tree()?;

    let parent_tree = if commit.parent_count() > 0 {
        Some(commit.parent(0)?.tree()?)
    } else {
        None
    };

    let diff = repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), None)?;
    collect_diff_hunks(&diff)
}

/// Convert a git2 Diff into our DiffHunk model.
fn collect_diff_hunks(diff: &git2::Diff) -> Result<Vec<DiffHunk>, TechtiteError> {
    let mut hunks: Vec<DiffHunk> = Vec::new();

    diff.print(git2::DiffFormat::Patch, |delta, hunk, line| {
        let file_path = delta
            .new_file()
            .path()
            .or_else(|| delta.old_file().path())
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        if let Some(ref hunk_header) = hunk {
            let need_new = hunks.last().map_or(true, |last| {
                last.file_path != file_path
                    || last.old_start != hunk_header.old_start()
                    || last.new_start != hunk_header.new_start()
            });

            if need_new {
                hunks.push(DiffHunk {
                    file_path: file_path.clone(),
                    old_start: hunk_header.old_start(),
                    old_lines: hunk_header.old_lines(),
                    new_start: hunk_header.new_start(),
                    new_lines: hunk_header.new_lines(),
                    lines: Vec::new(),
                });
            }
        } else if hunks.is_empty() {
            return true;
        }

        if hunk.is_some() {
            let line_type = match line.origin() {
                '+' => DiffLineType::Addition,
                '-' => DiffLineType::Deletion,
                _ => DiffLineType::Context,
            };

            let content = String::from_utf8_lossy(line.content()).to_string();
            let content = content.trim_end_matches('\n').to_string();

            if let Some(last_hunk) = hunks.last_mut() {
                last_hunk.lines.push(DiffLine {
                    line_type,
                    content,
                });
            }
        }

        true
    })?;

    Ok(hunks)
}

// ---------------------------------------------------------------------------
// Log
// ---------------------------------------------------------------------------

/// Get commit history.
pub fn get_log(
    vault_path: &Path,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<Vec<CommitInfo>, TechtiteError> {
    let repo = open_repo(vault_path)?;

    let head = match repo.head() {
        Ok(h) => h,
        Err(_) => return Ok(Vec::new()),
    };

    let mut revwalk = repo.revwalk()?;
    revwalk.push(
        head.target()
            .ok_or_else(|| TechtiteError::Other("HEAD has no target".to_string()))?,
    )?;
    revwalk.set_sorting(Sort::TIME)?;

    let skip = offset.unwrap_or(0) as usize;
    let take = limit.unwrap_or(50) as usize;

    let mut commits = Vec::new();

    for (i, oid_result) in revwalk.enumerate() {
        if i < skip {
            continue;
        }
        if commits.len() >= take {
            break;
        }

        let oid = oid_result?;
        let commit = repo.find_commit(oid)?;

        let changed_files = {
            let tree = commit.tree()?;
            let parent_tree = if commit.parent_count() > 0 {
                Some(commit.parent(0)?.tree()?)
            } else {
                None
            };
            let diff = repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), None)?;
            let mut files = Vec::new();
            diff.foreach(
                &mut |delta, _| {
                    if let Some(p) = delta.new_file().path().or_else(|| delta.old_file().path()) {
                        files.push(p.to_string_lossy().to_string());
                    }
                    true
                },
                None,
                None,
                None,
            )?;
            files
        };

        let message = commit.message().unwrap_or("").to_string();
        let is_auto_commit = message.starts_with("[auto]") || message.starts_with("auto:");

        let author = commit.author();
        let author_name = author.name().unwrap_or("Unknown").to_string();

        let timestamp = chrono::DateTime::from_timestamp(commit.time().seconds(), 0)
            .map(|dt| dt.to_rfc3339())
            .unwrap_or_default();

        commits.push(CommitInfo {
            hash: oid.to_string(),
            message: message.trim().to_string(),
            author: author_name,
            timestamp,
            is_auto_commit,
            changed_files,
        });
    }

    Ok(commits)
}

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------

/// List all local branches.
pub fn get_branches(vault_path: &Path) -> Result<Vec<BranchInfo>, TechtiteError> {
    let repo = open_repo(vault_path)?;

    let current_branch = repo
        .head()
        .ok()
        .and_then(|h| h.shorthand().map(|s| s.to_string()));

    let mut branches_out = Vec::new();
    let branches = repo.branches(Some(git2::BranchType::Local))?;

    for branch_result in branches {
        let (branch, _branch_type) = branch_result?;
        let name = branch.name()?.unwrap_or("(unnamed)").to_string();
        let is_current = current_branch.as_deref() == Some(name.as_str());

        let upstream = branch
            .upstream()
            .ok()
            .and_then(|u| u.name().ok().flatten().map(|s| s.to_string()));

        let (ahead, behind) = if let Ok(local_oid) = branch.get().resolve().and_then(|r| {
            r.target()
                .ok_or_else(|| git2::Error::from_str("no target"))
        }) {
            if let Some(ref us) = upstream {
                if let Ok(remote_ref) = repo.find_reference(&format!("refs/remotes/{}", us)) {
                    if let Some(remote_oid) = remote_ref.target() {
                        repo.graph_ahead_behind(local_oid, remote_oid)
                            .unwrap_or((0, 0))
                    } else {
                        (0, 0)
                    }
                } else {
                    (0, 0)
                }
            } else {
                (0, 0)
            }
        } else {
            (0, 0)
        };

        branches_out.push(BranchInfo {
            name,
            is_current,
            upstream,
            ahead: ahead as u32,
            behind: behind as u32,
        });
    }

    if branches_out.is_empty() {
        branches_out.push(BranchInfo {
            name: current_branch.unwrap_or_else(|| "main".to_string()),
            is_current: true,
            upstream: None,
            ahead: 0,
            behind: 0,
        });
    }

    Ok(branches_out)
}

/// Create a new branch from HEAD.
pub fn create_branch(vault_path: &Path, name: &str) -> Result<(), TechtiteError> {
    let repo = open_repo(vault_path)?;
    let head_commit = repo.head()?.peel_to_commit()?;
    repo.branch(name, &head_commit, false)?;
    Ok(())
}

/// Checkout (switch to) an existing branch.
pub fn checkout_branch(vault_path: &Path, name: &str) -> Result<(), TechtiteError> {
    let repo = open_repo(vault_path)?;

    let status = get_status(vault_path)?;
    if !status.is_clean {
        return Err(TechtiteError::Other(
            "Cannot switch branches with uncommitted changes".to_string(),
        ));
    }

    let refname = format!("refs/heads/{}", name);
    let obj = repo.revparse_single(&refname)?;
    repo.checkout_tree(&obj, None)?;
    repo.set_head(&refname)?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Remote operations (push / pull / fetch) — stubs, out of scope for now
// ---------------------------------------------------------------------------

/// Push the current branch to origin. (Stub — out of scope)
pub fn push(vault_path: &Path, _branch: &str) -> Result<(), TechtiteError> {
    let _repo = open_repo(vault_path)?;
    Ok(())
}

/// Pull (fetch + merge) from origin. (Stub — out of scope)
pub fn pull(vault_path: &Path, _branch: &str) -> Result<PullResult, TechtiteError> {
    let _repo = open_repo(vault_path)?;
    Ok(PullResult {
        has_conflicts: false,
        conflicts: Vec::new(),
    })
}

/// Set remote URL for the repository.
pub fn set_remote_url(vault_path: &Path, url: &str) -> Result<(), TechtiteError> {
    let repo = open_repo(vault_path)?;
    repo.remote_set_url("origin", url)?;
    Ok(())
}

/// Test connection to the remote. (Stub — out of scope)
pub fn test_remote_connection(vault_path: &Path) -> Result<bool, TechtiteError> {
    let _repo = open_repo(vault_path)?;
    Ok(true)
}

/// Result of a pull operation.
pub struct PullResult {
    pub has_conflicts: bool,
    pub conflicts: Vec<crate::models::git::ConflictInfo>,
}
