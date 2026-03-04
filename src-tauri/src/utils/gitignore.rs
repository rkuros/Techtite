use std::fs;
use std::path::Path;

/// Ensure that the given pattern is in the .gitignore file.
/// If the file doesn't exist, creates it. If the pattern already exists, does nothing.
pub fn ensure_gitignore_entry(vault_root: &Path, pattern: &str) -> Result<(), std::io::Error> {
    let gitignore_path = vault_root.join(".gitignore");

    if gitignore_path.exists() {
        let content = fs::read_to_string(&gitignore_path)?;
        if content.lines().any(|line| line.trim() == pattern) {
            return Ok(());
        }
        // Append the pattern
        let separator = if content.ends_with('\n') { "" } else { "\n" };
        fs::write(&gitignore_path, format!("{content}{separator}{pattern}\n"))?;
    } else {
        fs::write(&gitignore_path, format!("{pattern}\n"))?;
    }

    Ok(())
}
