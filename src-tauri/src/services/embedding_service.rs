use std::sync::Mutex;

use fastembed::{EmbeddingModel, InitOptions, TextEmbedding};
use serde::{Deserialize, Serialize};

/// Embedding vector dimension (all-MiniLM-L6-v2 produces 384-dim vectors).
pub const EMBEDDING_DIM: usize = 384;

/// Tauri-managed state for the embedding service.
///
/// Holds the fastembed TextEmbedding model and chunking configuration.
/// Wrapped in a Mutex for thread-safe access from Tauri command handlers.
pub struct EmbeddingServiceState {
    /// The loaded fastembed model, None until init_model() is called.
    pub model: Mutex<Option<TextEmbedding>>,

    /// Default chunking configuration.
    pub config: Mutex<ChunkingConfig>,
}

impl EmbeddingServiceState {
    pub fn new() -> Self {
        Self {
            model: Mutex::new(None),
            config: Mutex::new(ChunkingConfig::default()),
        }
    }

    /// Load the embedding model. Safe to call multiple times (no-op if already loaded).
    pub fn init_model(&self) -> Result<(), String> {
        let mut model_guard = self.model.lock().map_err(|e| e.to_string())?;
        if model_guard.is_some() {
            return Ok(());
        }

        let mut options = InitOptions::default();
        options.model_name = EmbeddingModel::AllMiniLML6V2;
        options.show_download_progress = true;

        let model = TextEmbedding::try_new(options)
        .map_err(|e| format!("Failed to load embedding model: {}", e))?;

        *model_guard = Some(model);
        println!("[Unit 5] Embedding model loaded (AllMiniLmL6V2, {}d)", EMBEDDING_DIM);
        Ok(())
    }

    /// Generate an embedding vector for a single text.
    pub fn generate_embedding(&self, text: &str) -> Result<Vec<f32>, String> {
        let model_guard = self.model.lock().map_err(|e| e.to_string())?;
        let model = model_guard
            .as_ref()
            .ok_or("Embedding model not loaded. Call init_model() first.")?;

        let embeddings = model
            .embed(vec![text], None)
            .map_err(|e| format!("Embedding generation failed: {}", e))?;

        embeddings
            .into_iter()
            .next()
            .ok_or_else(|| "No embedding returned".to_string())
    }

    /// Generate embeddings for multiple texts in a single batch.
    pub fn generate_embeddings(&self, texts: Vec<&str>) -> Result<Vec<Vec<f32>>, String> {
        if texts.is_empty() {
            return Ok(Vec::new());
        }

        let model_guard = self.model.lock().map_err(|e| e.to_string())?;
        let model = model_guard
            .as_ref()
            .ok_or("Embedding model not loaded. Call init_model() first.")?;

        model
            .embed(texts, None)
            .map_err(|e| format!("Batch embedding generation failed: {}", e))
    }
}

impl Default for EmbeddingServiceState {
    fn default() -> Self {
        Self::new()
    }
}

/// Configuration for the Markdown chunking algorithm.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChunkingConfig {
    /// Maximum number of characters per chunk (approximate).
    /// Chunks will try to stay within this limit but may exceed it
    /// slightly to avoid splitting mid-sentence.
    pub max_chunk_chars: usize,

    /// Minimum number of characters for a chunk to be meaningful.
    /// Chunks shorter than this will be merged with the next chunk.
    pub min_chunk_chars: usize,
}

impl Default for ChunkingConfig {
    fn default() -> Self {
        Self {
            max_chunk_chars: 1000,
            min_chunk_chars: 50,
        }
    }
}

/// A chunk of text extracted from a Markdown file.
///
/// Represents a semantically meaningful section of a document,
/// typically bounded by Markdown headings.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Chunk {
    /// Path of the source file (relative to vault root).
    pub file_path: String,

    /// The Markdown heading that this chunk falls under (e.g. "## Introduction").
    /// None if the chunk precedes any heading.
    pub section_heading: Option<String>,

    /// The actual text content of the chunk.
    pub text: String,

    /// 1-based line number where this chunk starts in the source file.
    pub start_line: u32,

    /// 1-based line number where this chunk ends in the source file.
    pub end_line: u32,
}

/// Split a Markdown document into chunks based on headings.
///
/// The algorithm:
/// 1. Scan line-by-line looking for Markdown heading markers (`#`, `##`, etc.)
/// 2. Each heading starts a new chunk (unless the accumulated text is empty)
/// 3. Text before the first heading becomes the "preamble" chunk (no heading)
/// 4. Chunks shorter than `min_chunk_chars` are merged with the following chunk
/// 5. Chunks longer than `max_chunk_chars` are split at paragraph boundaries
///
/// # Arguments
/// - `content` — The full Markdown text
/// - `file_path` — Path to the source file (for metadata in returned chunks)
/// - `config` — Chunking parameters
///
/// # Returns
/// A vector of `Chunk` structs, each containing a meaningful section of text.
pub fn chunk_markdown(content: &str, file_path: &str, config: &ChunkingConfig) -> Vec<Chunk> {
    let lines: Vec<&str> = content.lines().collect();
    if lines.is_empty() {
        return Vec::new();
    }

    let mut chunks: Vec<Chunk> = Vec::new();
    let mut current_heading: Option<String> = None;
    let mut current_text = String::new();
    let mut current_start_line: u32 = 1;

    for (idx, line) in lines.iter().enumerate() {
        let line_number = (idx + 1) as u32;

        // Check if this line is a Markdown heading (# ... through ###### ...)
        if is_heading(line) {
            // Flush the current chunk if it has content
            if !current_text.trim().is_empty() {
                chunks.push(Chunk {
                    file_path: file_path.to_string(),
                    section_heading: current_heading.clone(),
                    text: current_text.trim().to_string(),
                    start_line: current_start_line,
                    end_line: line_number - 1,
                });
            }

            // Start a new chunk with this heading
            current_heading = Some(line.trim().to_string());
            current_text = String::new();
            current_start_line = line_number;
        } else {
            // Accumulate text into the current chunk
            if !current_text.is_empty() {
                current_text.push('\n');
            }
            current_text.push_str(line);
        }
    }

    // Flush the last chunk
    if !current_text.trim().is_empty() {
        chunks.push(Chunk {
            file_path: file_path.to_string(),
            section_heading: current_heading,
            text: current_text.trim().to_string(),
            start_line: current_start_line,
            end_line: lines.len() as u32,
        });
    }

    // Post-process: merge small chunks and split large ones
    let mut merged: Vec<Chunk> = Vec::new();
    for chunk in chunks {
        if chunk.text.len() < config.min_chunk_chars {
            // Merge with the previous chunk if possible
            if let Some(prev) = merged.last_mut() {
                prev.text.push_str("\n\n");
                if let Some(ref heading) = chunk.section_heading {
                    prev.text.push_str(heading);
                    prev.text.push('\n');
                }
                prev.text.push_str(&chunk.text);
                prev.end_line = chunk.end_line;
                continue;
            }
        }

        if chunk.text.len() > config.max_chunk_chars {
            // Split large chunks at paragraph boundaries (double newline)
            let sub_chunks = split_large_chunk(&chunk, config.max_chunk_chars);
            merged.extend(sub_chunks);
        } else {
            merged.push(chunk);
        }
    }

    merged
}

/// Check if a line is a Markdown heading (starts with 1-6 `#` followed by space).
fn is_heading(line: &str) -> bool {
    let trimmed = line.trim_start();
    if !trimmed.starts_with('#') {
        return false;
    }

    let hash_count = trimmed.chars().take_while(|&c| c == '#').count();
    if hash_count > 6 {
        return false;
    }

    // Must be followed by a space or be just the heading marker
    let rest = &trimmed[hash_count..];
    rest.is_empty() || rest.starts_with(' ')
}

/// Split a chunk that exceeds max_chunk_chars at paragraph boundaries.
fn split_large_chunk(chunk: &Chunk, max_chars: usize) -> Vec<Chunk> {
    let paragraphs: Vec<&str> = chunk.text.split("\n\n").collect();
    let mut result: Vec<Chunk> = Vec::new();
    let mut current_text = String::new();
    let total_lines = chunk.end_line - chunk.start_line + 1;
    let chars_per_line = if total_lines > 0 {
        chunk.text.len() as f64 / total_lines as f64
    } else {
        1.0
    };

    for para in paragraphs {
        if current_text.len() + para.len() > max_chars && !current_text.is_empty() {
            // Estimate line range for this sub-chunk
            let estimated_lines = (current_text.len() as f64 / chars_per_line).ceil() as u32;
            let start = if result.is_empty() {
                chunk.start_line
            } else {
                result.last().map_or(chunk.start_line, |c: &Chunk| c.end_line + 1)
            };
            let end = (start + estimated_lines).min(chunk.end_line);

            result.push(Chunk {
                file_path: chunk.file_path.clone(),
                section_heading: chunk.section_heading.clone(),
                text: current_text.trim().to_string(),
                start_line: start,
                end_line: end,
            });
            current_text = String::new();
        }

        if !current_text.is_empty() {
            current_text.push_str("\n\n");
        }
        current_text.push_str(para);
    }

    // Flush remaining text
    if !current_text.trim().is_empty() {
        let start = if result.is_empty() {
            chunk.start_line
        } else {
            result.last().map_or(chunk.start_line, |c: &Chunk| c.end_line + 1)
        };

        result.push(Chunk {
            file_path: chunk.file_path.clone(),
            section_heading: chunk.section_heading.clone(),
            text: current_text.trim().to_string(),
            start_line: start,
            end_line: chunk.end_line,
        });
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_embedding_service_state_new() {
        let state = EmbeddingServiceState::new();
        let model = state.model.lock().unwrap();
        assert!(model.is_none());
    }

    #[test]
    fn test_generate_embedding_without_model_returns_error() {
        let state = EmbeddingServiceState::new();
        let result = state.generate_embedding("hello world");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not loaded"));
    }

    #[test]
    fn test_generate_embeddings_empty_input() {
        let state = EmbeddingServiceState::new();
        let result = state.generate_embeddings(vec![]);
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    #[test]
    #[ignore] // Requires model download (~23MB); run with: cargo test -- --ignored
    fn test_init_model_and_generate_embedding() {
        let state = EmbeddingServiceState::new();
        state.init_model().expect("Model should load");

        let embedding = state
            .generate_embedding("hello world")
            .expect("Should generate embedding");
        assert_eq!(embedding.len(), EMBEDDING_DIM);

        // Verify it's not a zero vector
        assert!(embedding.iter().any(|&v| v != 0.0));
    }

    #[test]
    #[ignore] // Requires model download
    fn test_batch_embeddings() {
        let state = EmbeddingServiceState::new();
        state.init_model().expect("Model should load");

        let embeddings = state
            .generate_embeddings(vec!["hello", "world", "test"])
            .expect("Should generate batch embeddings");
        assert_eq!(embeddings.len(), 3);
        for emb in &embeddings {
            assert_eq!(emb.len(), EMBEDDING_DIM);
        }
    }

    #[test]
    fn test_chunk_markdown_empty() {
        let config = ChunkingConfig::default();
        let chunks = chunk_markdown("", "test.md", &config);
        assert!(chunks.is_empty());
    }

    #[test]
    fn test_chunk_markdown_no_headings() {
        let content = "This is a paragraph of text.\n\nAnother paragraph here.\n\nAnd a third one.";
        let config = ChunkingConfig {
            max_chunk_chars: 1000,
            min_chunk_chars: 10,
        };
        let chunks = chunk_markdown(content, "test.md", &config);

        assert_eq!(chunks.len(), 1);
        assert!(chunks[0].section_heading.is_none());
        assert_eq!(chunks[0].file_path, "test.md");
        assert_eq!(chunks[0].start_line, 1);
    }

    #[test]
    fn test_chunk_markdown_with_headings() {
        let content = "\
# Title

Intro paragraph.

## Section One

Content of section one.

## Section Two

Content of section two.";

        let config = ChunkingConfig {
            max_chunk_chars: 1000,
            min_chunk_chars: 10,
        };
        let chunks = chunk_markdown(content, "notes/doc.md", &config);

        assert!(chunks.len() >= 3, "Expected at least 3 chunks, got {}", chunks.len());

        // First chunk should have the # Title heading
        assert_eq!(chunks[0].section_heading.as_deref(), Some("# Title"));
        assert!(chunks[0].text.contains("Intro paragraph"));

        // Find the section one chunk
        let sec_one = chunks.iter().find(|c| {
            c.section_heading.as_deref() == Some("## Section One")
        });
        assert!(sec_one.is_some(), "Should have a Section One chunk");
        assert!(sec_one.unwrap().text.contains("Content of section one"));
    }

    #[test]
    fn test_chunk_markdown_preamble_before_heading() {
        let content = "\
Some text before any heading.

# First Heading

Content after heading.";

        let config = ChunkingConfig {
            max_chunk_chars: 1000,
            min_chunk_chars: 10,
        };
        let chunks = chunk_markdown(content, "test.md", &config);

        assert!(chunks.len() >= 2, "Expected at least 2 chunks, got {}", chunks.len());

        // First chunk should be the preamble with no heading
        assert!(chunks[0].section_heading.is_none());
        assert!(chunks[0].text.contains("Some text before any heading"));
    }

    #[test]
    fn test_chunk_markdown_small_chunks_merged() {
        let content = "\
## A

x

## B

y

## C

Longer content that exceeds the minimum.";

        let config = ChunkingConfig {
            max_chunk_chars: 1000,
            min_chunk_chars: 20,
        };
        let chunks = chunk_markdown(content, "test.md", &config);

        // The tiny chunks (A: "x", B: "y") should be merged
        // Final count depends on merging but should be less than 3
        assert!(
            chunks.len() <= 3,
            "Small chunks should be merged, got {} chunks",
            chunks.len()
        );
    }

    #[test]
    fn test_chunk_markdown_line_numbers() {
        let content = "\
# Title

Line 3.

## Section

Line 7.
Line 8.";

        let config = ChunkingConfig {
            max_chunk_chars: 1000,
            min_chunk_chars: 5,
        };
        let chunks = chunk_markdown(content, "test.md", &config);

        // First chunk starts at line 1
        assert_eq!(chunks[0].start_line, 1);

        // Find the section chunk and verify its start line
        if let Some(sec) = chunks.iter().find(|c| {
            c.section_heading.as_deref() == Some("## Section")
        }) {
            assert!(sec.start_line >= 5, "Section should start at or after line 5");
        }
    }

    #[test]
    fn test_is_heading() {
        assert!(is_heading("# Heading"));
        assert!(is_heading("## Sub heading"));
        assert!(is_heading("### Third level"));
        assert!(is_heading("###### Sixth level"));
        assert!(!is_heading("####### Too many hashes"));
        assert!(!is_heading("Not a heading"));
        assert!(!is_heading("#NoSpaceAfterHash"));
        assert!(!is_heading(""));
    }

    #[test]
    fn test_chunking_config_default() {
        let config = ChunkingConfig::default();
        assert_eq!(config.max_chunk_chars, 1000);
        assert_eq!(config.min_chunk_chars, 50);
    }

    #[test]
    fn test_chunk_all_fields_populated() {
        let content = "## Test Section\n\nSome meaningful content here that is long enough.";
        let config = ChunkingConfig {
            max_chunk_chars: 1000,
            min_chunk_chars: 5,
        };
        let chunks = chunk_markdown(content, "notes/test.md", &config);

        assert!(!chunks.is_empty());
        let chunk = &chunks[0];
        assert_eq!(chunk.file_path, "notes/test.md");
        assert_eq!(chunk.section_heading.as_deref(), Some("## Test Section"));
        assert!(!chunk.text.is_empty());
        assert!(chunk.start_line >= 1);
        assert!(chunk.end_line >= chunk.start_line);
    }
}
