use crate::models::file::FileType;

/// Determine the file type based on file extension.
///
/// Returns a `FileType` enum variant: Markdown, Code (with language), Image, Binary, or Other.
#[tauri::command]
pub fn get_file_type(path: String) -> Result<FileType, String> {
    let ext = std::path::Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let file_type = match ext.as_str() {
        "md" | "markdown" | "mdx" => FileType::Markdown,
        // Code files
        "ts" | "tsx" | "js" | "jsx" | "mjs" | "cjs" => FileType::Code {
            language: get_language_for_ext(&ext),
        },
        "py" | "pyw" => FileType::Code {
            language: "python".to_string(),
        },
        "rs" => FileType::Code {
            language: "rust".to_string(),
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
        "cpp" | "cc" | "cxx" | "hpp" | "hxx" => FileType::Code {
            language: "cpp".to_string(),
        },
        "css" | "scss" | "sass" | "less" => FileType::Code {
            language: ext.clone(),
        },
        "html" | "htm" => FileType::Code {
            language: "html".to_string(),
        },
        "json" => FileType::Code {
            language: "json".to_string(),
        },
        "yaml" | "yml" => FileType::Code {
            language: "yaml".to_string(),
        },
        "toml" => FileType::Code {
            language: "toml".to_string(),
        },
        "xml" => FileType::Code {
            language: "xml".to_string(),
        },
        "sql" => FileType::Code {
            language: "sql".to_string(),
        },
        "sh" | "bash" | "zsh" => FileType::Code {
            language: "shell".to_string(),
        },
        "rb" => FileType::Code {
            language: "ruby".to_string(),
        },
        "php" => FileType::Code {
            language: "php".to_string(),
        },
        "swift" => FileType::Code {
            language: "swift".to_string(),
        },
        "kt" | "kts" => FileType::Code {
            language: "kotlin".to_string(),
        },
        "lua" => FileType::Code {
            language: "lua".to_string(),
        },
        // Image files
        "png" | "jpg" | "jpeg" | "gif" | "svg" | "webp" | "bmp" | "ico" => FileType::Image,
        // Binary files
        "exe" | "dll" | "so" | "dylib" | "bin" | "wasm" | "zip" | "tar" | "gz" | "pdf" => {
            FileType::Binary
        }
        _ => FileType::Other,
    };

    Ok(file_type)
}

/// Get the language name for a code file based on its extension.
///
/// Returns the programming language identifier string (e.g., "typescript", "python", "rust").
#[tauri::command]
pub fn get_language(path: String) -> Result<String, String> {
    let ext = std::path::Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    Ok(get_language_for_ext(&ext))
}

/// Internal helper: map file extension to language name.
fn get_language_for_ext(ext: &str) -> String {
    match ext {
        "ts" | "tsx" => "typescript".to_string(),
        "js" | "jsx" | "mjs" | "cjs" => "javascript".to_string(),
        "py" | "pyw" => "python".to_string(),
        "rs" => "rust".to_string(),
        "go" => "go".to_string(),
        "java" => "java".to_string(),
        "c" | "h" => "c".to_string(),
        "cpp" | "cc" | "cxx" | "hpp" | "hxx" => "cpp".to_string(),
        "css" => "css".to_string(),
        "scss" => "scss".to_string(),
        "sass" => "sass".to_string(),
        "less" => "less".to_string(),
        "html" | "htm" => "html".to_string(),
        "json" => "json".to_string(),
        "yaml" | "yml" => "yaml".to_string(),
        "toml" => "toml".to_string(),
        "xml" => "xml".to_string(),
        "sql" => "sql".to_string(),
        "sh" | "bash" | "zsh" => "shell".to_string(),
        "rb" => "ruby".to_string(),
        "php" => "php".to_string(),
        "swift" => "swift".to_string(),
        "kt" | "kts" => "kotlin".to_string(),
        "lua" => "lua".to_string(),
        "md" | "markdown" | "mdx" => "markdown".to_string(),
        _ => "plaintext".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_file_type_markdown() {
        let result = get_file_type("notes/hello.md".to_string()).unwrap();
        assert!(matches!(result, FileType::Markdown));
    }

    #[test]
    fn test_get_file_type_code() {
        let result = get_file_type("src/main.ts".to_string()).unwrap();
        match result {
            FileType::Code { language } => assert_eq!(language, "typescript"),
            _ => panic!("Expected Code variant"),
        }
    }

    #[test]
    fn test_get_file_type_image() {
        let result = get_file_type("assets/photo.png".to_string()).unwrap();
        assert!(matches!(result, FileType::Image));
    }

    #[test]
    fn test_get_language() {
        assert_eq!(get_language("test.py".to_string()).unwrap(), "python");
        assert_eq!(get_language("test.rs".to_string()).unwrap(), "rust");
        assert_eq!(get_language("test.tsx".to_string()).unwrap(), "typescript");
        assert_eq!(get_language("test.unknown".to_string()).unwrap(), "plaintext");
    }
}
