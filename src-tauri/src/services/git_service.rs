//! Git operations service using git2 (libgit2 bindings).
//!
//! NOTE: git2 is not yet in Cargo.toml. All functions currently return
//! stub/mock data. Once git2 is added as a dependency, replace stubs
//! with real implementations following the patterns shown in comments.

use std::path::Path;

use crate::models::git::{
    BranchInfo, CommitInfo, DiffHunk, GitStatus,
};
use crate::utils::error::TechtiteError;

// ---------------------------------------------------------------------------
// Repository discovery
// ---------------------------------------------------------------------------

/// Check whether a `.git` directory exists under the given vault path.
/// When git2 is available, use `Repository::discover(vault_path)`.
pub fn is_git_repo(vault_path: &Path) -> bool {
    vault_path.join(".git").is_dir()
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

/// Retrieve the current git status (staged, unstaged, untracked).
///
/// Stub: returns a default empty status with branch "main".
/// Real impl: open repo via `git2::Repository::discover`, then call
/// `repo.statuses()` with `StatusOptions` to classify files.
pub fn get_status(vault_path: &Path) -> Result<GitStatus, TechtiteError> {
    if !is_git_repo(vault_path) {
        return Err(TechtiteError::Other(
            "Not a git repository".to_string(),
        ));
    }

    // TODO: Replace with real git2 implementation
    // let repo = git2::Repository::discover(vault_path)?;
    // let statuses = repo.statuses(Some(
    //     git2::StatusOptions::new()
    //         .include_untracked(true)
    //         .recurse_untracked_dirs(true)
    // ))?;
    // Classify into staged / unstaged / untracked ...

    Ok(GitStatus::default())
}

// ---------------------------------------------------------------------------
// Staging
// ---------------------------------------------------------------------------

/// Stage specified files (add to index).
///
/// Stub: no-op.
/// Real impl: `repo.index()?.add_path(path); index.write();`
pub fn stage(vault_path: &Path, paths: &[String]) -> Result<(), TechtiteError> {
    if !is_git_repo(vault_path) {
        return Err(TechtiteError::Other("Not a git repository".to_string()));
    }

    // TODO: Replace with real git2 implementation
    // let repo = git2::Repository::discover(vault_path)?;
    // let mut index = repo.index()?;
    // for p in paths {
    //     index.add_path(std::path::Path::new(p))?;
    // }
    // index.write()?;

    let _ = paths;
    Ok(())
}

/// Stage all changed files in the working directory.
///
/// Stub: no-op.
/// Real impl: `repo.index()?.add_all(["*"], ADD_DEFAULT, None)?;`
pub fn stage_all(vault_path: &Path) -> Result<(), TechtiteError> {
    if !is_git_repo(vault_path) {
        return Err(TechtiteError::Other("Not a git repository".to_string()));
    }

    // TODO: Replace with real git2 implementation
    // let repo = git2::Repository::discover(vault_path)?;
    // let mut index = repo.index()?;
    // index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)?;
    // index.write()?;

    Ok(())
}

/// Unstage specified files (reset index entries to HEAD).
///
/// Stub: no-op.
/// Real impl: reset index entries from HEAD tree for the given paths.
pub fn unstage(vault_path: &Path, paths: &[String]) -> Result<(), TechtiteError> {
    if !is_git_repo(vault_path) {
        return Err(TechtiteError::Other("Not a git repository".to_string()));
    }

    // TODO: Replace with real git2 implementation
    // let repo = git2::Repository::discover(vault_path)?;
    // let head = repo.head()?.peel_to_tree()?;
    // repo.reset_default(Some(&head.into_object()), paths)?;

    let _ = paths;
    Ok(())
}

// ---------------------------------------------------------------------------
// Commit
// ---------------------------------------------------------------------------

/// Create a commit from the current index.
///
/// Stub: returns a fake commit hash.
/// Real impl: build tree from index, create commit with signature.
pub fn create_commit(vault_path: &Path, message: &str) -> Result<String, TechtiteError> {
    if !is_git_repo(vault_path) {
        return Err(TechtiteError::Other("Not a git repository".to_string()));
    }

    // TODO: Replace with real git2 implementation
    // let repo = git2::Repository::discover(vault_path)?;
    // let sig = repo.signature()?;
    // let mut index = repo.index()?;
    // let tree_id = index.write_tree()?;
    // let tree = repo.find_tree(tree_id)?;
    // let parent = repo.head()?.peel_to_commit()?;
    // let oid = repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &[&parent])?;
    // Ok(oid.to_string())

    let _ = message;
    let fake_hash = format!("{:0>40}", uuid::Uuid::new_v4().simple().to_string());
    Ok(fake_hash)
}

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------

/// Get diff hunks, optionally filtered to a specific file.
///
/// Stub: returns empty diff.
/// Real impl: use `repo.diff_tree_to_index` (staged) or
/// `repo.diff_index_to_workdir` (unstaged).
pub fn get_diff(
    vault_path: &Path,
    path: Option<&str>,
    staged: bool,
) -> Result<Vec<DiffHunk>, TechtiteError> {
    if !is_git_repo(vault_path) {
        return Err(TechtiteError::Other("Not a git repository".to_string()));
    }

    // TODO: Replace with real git2 implementation
    // let repo = git2::Repository::discover(vault_path)?;
    // let diff = if staged {
    //     let head_tree = repo.head()?.peel_to_tree()?;
    //     repo.diff_tree_to_index(Some(&head_tree), None, None)?
    // } else {
    //     repo.diff_index_to_workdir(None, None)?
    // };
    // Convert diff to Vec<DiffHunk>...

    let _ = (path, staged);
    Ok(Vec::new())
}

/// Get diff hunks for a specific commit.
///
/// Stub: returns empty diff.
/// Real impl: find commit by hash, diff commit tree against parent tree.
pub fn get_commit_diff(vault_path: &Path, hash: &str) -> Result<Vec<DiffHunk>, TechtiteError> {
    if !is_git_repo(vault_path) {
        return Err(TechtiteError::Other("Not a git repository".to_string()));
    }

    // TODO: Replace with real git2 implementation
    // let repo = git2::Repository::discover(vault_path)?;
    // let oid = git2::Oid::from_str(hash)?;
    // let commit = repo.find_commit(oid)?;
    // let tree = commit.tree()?;
    // let parent_tree = commit.parent(0)?.tree()?;
    // let diff = repo.diff_tree_to_tree(Some(&parent_tree), Some(&tree), None)?;
    // Convert diff to Vec<DiffHunk>...

    let _ = hash;
    Ok(Vec::new())
}

// ---------------------------------------------------------------------------
// Log
// ---------------------------------------------------------------------------

/// Get commit history.
///
/// Stub: returns empty history.
/// Real impl: walk revisions with `repo.revwalk()`.
pub fn get_log(
    vault_path: &Path,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<Vec<CommitInfo>, TechtiteError> {
    if !is_git_repo(vault_path) {
        return Err(TechtiteError::Other("Not a git repository".to_string()));
    }

    // TODO: Replace with real git2 implementation
    // let repo = git2::Repository::discover(vault_path)?;
    // let mut revwalk = repo.revwalk()?;
    // revwalk.push_head()?;
    // revwalk.set_sorting(git2::Sort::TIME)?;
    // skip offset, take limit, map to CommitInfo...

    let _ = (limit, offset);
    Ok(Vec::new())
}

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------

/// List all branches (local and remote).
///
/// Stub: returns a single "main" branch marked as current.
/// Real impl: iterate `repo.branches(None)?`.
pub fn get_branches(vault_path: &Path) -> Result<Vec<BranchInfo>, TechtiteError> {
    if !is_git_repo(vault_path) {
        return Err(TechtiteError::Other("Not a git repository".to_string()));
    }

    // TODO: Replace with real git2 implementation
    // let repo = git2::Repository::discover(vault_path)?;
    // let branches = repo.branches(None)?;
    // ...

    Ok(vec![BranchInfo {
        name: "main".to_string(),
        is_current: true,
        upstream: None,
        ahead: 0,
        behind: 0,
    }])
}

/// Create a new branch from HEAD.
///
/// Stub: no-op.
/// Real impl: `repo.branch(name, &head_commit, false)?;`
pub fn create_branch(vault_path: &Path, name: &str) -> Result<(), TechtiteError> {
    if !is_git_repo(vault_path) {
        return Err(TechtiteError::Other("Not a git repository".to_string()));
    }

    // TODO: Replace with real git2 implementation
    // let repo = git2::Repository::discover(vault_path)?;
    // let head_commit = repo.head()?.peel_to_commit()?;
    // repo.branch(name, &head_commit, false)?;

    let _ = name;
    Ok(())
}

/// Checkout (switch to) an existing branch.
///
/// Stub: no-op.
/// Real impl: set HEAD reference to the branch, then checkout tree.
/// Must error if there are uncommitted changes.
pub fn checkout_branch(vault_path: &Path, name: &str) -> Result<(), TechtiteError> {
    if !is_git_repo(vault_path) {
        return Err(TechtiteError::Other("Not a git repository".to_string()));
    }

    // TODO: Replace with real git2 implementation
    // let repo = git2::Repository::discover(vault_path)?;
    //
    // // Safety check: error if working directory is dirty
    // let status = get_status(vault_path)?;
    // if !status.is_clean {
    //     return Err(TechtiteError::Other(
    //         "Cannot switch branches with uncommitted changes".to_string(),
    //     ));
    // }
    //
    // let refname = format!("refs/heads/{}", name);
    // let obj = repo.revparse_single(&refname)?;
    // repo.checkout_tree(&obj, None)?;
    // repo.set_head(&refname)?;

    let _ = name;
    Ok(())
}

// ---------------------------------------------------------------------------
// Remote operations (push / pull / fetch)
// ---------------------------------------------------------------------------

/// Push the current branch to origin.
///
/// Stub: no-op.
/// Real impl: use `repo.find_remote("origin")?.push(...)` with callbacks.
pub fn push(vault_path: &Path, _branch: &str) -> Result<(), TechtiteError> {
    if !is_git_repo(vault_path) {
        return Err(TechtiteError::Other("Not a git repository".to_string()));
    }

    // TODO: Replace with real git2 implementation
    // TODO (Unit 9): Obtain credentials from credential_service for RemoteCallbacks
    // let repo = git2::Repository::discover(vault_path)?;
    // let mut remote = repo.find_remote("origin")?;
    // let mut callbacks = git2::RemoteCallbacks::new();
    // callbacks.credentials(|_url, _user, _allowed| { ... });
    // let refspec = format!("refs/heads/{}:refs/heads/{}", branch, branch);
    // remote.push(&[&refspec], Some(git2::PushOptions::new().remote_callbacks(callbacks)))?;

    Ok(())
}

/// Pull (fetch + merge) from origin.
///
/// Stub: no-op, returns no conflicts.
/// Real impl: fetch, then merge analysis + fast-forward or normal merge.
pub fn pull(vault_path: &Path, _branch: &str) -> Result<PullResult, TechtiteError> {
    if !is_git_repo(vault_path) {
        return Err(TechtiteError::Other("Not a git repository".to_string()));
    }

    // TODO: Replace with real git2 implementation
    // TODO (Unit 9): Obtain credentials from credential_service for RemoteCallbacks
    // let repo = git2::Repository::discover(vault_path)?;
    // 1. fetch
    // 2. merge_analysis
    // 3. fast-forward or normal merge
    // 4. detect conflicts

    Ok(PullResult {
        has_conflicts: false,
        conflicts: Vec::new(),
    })
}

/// Set remote URL for the repository.
///
/// Stub: no-op.
/// Real impl: `repo.remote_set_url("origin", url)?;`
pub fn set_remote_url(vault_path: &Path, url: &str) -> Result<(), TechtiteError> {
    if !is_git_repo(vault_path) {
        return Err(TechtiteError::Other("Not a git repository".to_string()));
    }

    // TODO: Replace with real git2 implementation
    // let repo = git2::Repository::discover(vault_path)?;
    // repo.remote_set_url("origin", url)?;

    let _ = url;
    Ok(())
}

/// Test connection to the remote.
///
/// Stub: always returns true.
/// Real impl: try `remote.connect(Direction::Fetch)` and check result.
pub fn test_remote_connection(vault_path: &Path) -> Result<bool, TechtiteError> {
    if !is_git_repo(vault_path) {
        return Err(TechtiteError::Other("Not a git repository".to_string()));
    }

    // TODO: Replace with real git2 implementation
    // TODO (Unit 9): Obtain credentials from credential_service for RemoteCallbacks
    // let repo = git2::Repository::discover(vault_path)?;
    // let mut remote = repo.find_remote("origin")?;
    // match remote.connect(git2::Direction::Fetch) {
    //     Ok(_) => { remote.disconnect()?; Ok(true) }
    //     Err(_) => Ok(false)
    // }

    Ok(true)
}

/// Result of a pull operation.
pub struct PullResult {
    pub has_conflicts: bool,
    pub conflicts: Vec<crate::models::git::ConflictInfo>,
}
