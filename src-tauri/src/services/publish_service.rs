use std::sync::Mutex;

use crate::models::publish::{BlogDraft, PostTemplate, PublishTarget, SNSPost};

/// Tauri-managed state for the content publishing pipeline.
///
/// Maintains in-memory lists of blog drafts, SNS posts, and post templates.
/// Future versions will persist to `<vault>/.techtite/publish/`.
pub struct PublishServiceState {
    pub blog_drafts: Mutex<Vec<BlogDraft>>,
    pub sns_posts: Mutex<Vec<SNSPost>>,
    pub templates: Mutex<Vec<PostTemplate>>,
}

impl PublishServiceState {
    pub fn new() -> Self {
        Self {
            blog_drafts: Mutex::new(Vec::new()),
            sns_posts: Mutex::new(Vec::new()),
            templates: Mutex::new(Vec::new()),
        }
    }
}

impl Default for PublishServiceState {
    fn default() -> Self {
        Self::new()
    }
}

/// Convert internal wiki-style links to platform-appropriate format.
///
/// Handles two link patterns:
/// - `[[target]]` -- display text is the target itself
/// - `[[target|display]]` -- display text is specified after the pipe
///
/// For blog platforms (Zenn, Note): converts to markdown links `[display](./target)`
/// For SNS platforms (X, Threads): replaces with just the display text
pub fn convert_internal_links(content: &str, platform: &PublishTarget) -> String {
    let mut result = String::with_capacity(content.len());
    let chars: Vec<char> = content.chars().collect();
    let len = chars.len();
    let mut i = 0;

    while i < len {
        // Check for [[ pattern
        if i + 1 < len && chars[i] == '[' && chars[i + 1] == '[' {
            // Find the closing ]]
            if let Some(close_pos) = find_closing_brackets(&chars, i + 2) {
                let inner: String = chars[i + 2..close_pos].iter().collect();

                let (target, display) = if let Some(pipe_pos) = inner.find('|') {
                    let t = inner[..pipe_pos].trim().to_string();
                    let d = inner[pipe_pos + 1..].trim().to_string();
                    (t, d)
                } else {
                    let t = inner.trim().to_string();
                    let d = t.clone();
                    (t, d)
                };

                match platform {
                    PublishTarget::Zenn | PublishTarget::Note => {
                        result.push_str(&format!("[{}](./{})", display, target));
                    }
                    PublishTarget::X | PublishTarget::Threads => {
                        result.push_str(&display);
                    }
                }

                i = close_pos + 2; // Skip past ]]
                continue;
            }
        }

        result.push(chars[i]);
        i += 1;
    }

    result
}

/// Find the position of the closing `]]` starting from `start`.
fn find_closing_brackets(chars: &[char], start: usize) -> Option<usize> {
    let len = chars.len();
    let mut i = start;
    while i + 1 < len {
        if chars[i] == ']' && chars[i + 1] == ']' {
            return Some(i);
        }
        i += 1;
    }
    None
}

/// Strip `#tag` patterns from content for external publishing.
///
/// Removes hashtag-style tags that start with `#` followed by word characters.
/// Tags at the start of a word boundary are removed (including the `#` prefix).
/// Preserves `#` in heading markers (e.g. `# Heading`) by only matching tags
/// that are NOT preceded by a newline or start-of-string followed by spaces only.
pub fn strip_tags(content: &str) -> String {
    let mut result = String::with_capacity(content.len());
    let chars: Vec<char> = content.chars().collect();
    let len = chars.len();
    let mut i = 0;

    while i < len {
        if chars[i] == '#' {
            // Check if this is a markdown heading (# at start of line or after newline)
            let is_line_start = i == 0 || chars[i - 1] == '\n';
            if is_line_start {
                // This is a heading marker, keep it
                result.push(chars[i]);
                i += 1;
                continue;
            }

            // Check if preceded by whitespace or start of string (inline tag)
            let preceded_by_space = i == 0 || chars[i - 1].is_whitespace();
            if preceded_by_space {
                // Check if followed by word characters (tag pattern)
                let tag_start = i + 1;
                let mut tag_end = tag_start;
                while tag_end < len && (chars[tag_end].is_alphanumeric() || chars[tag_end] == '_') {
                    tag_end += 1;
                }

                if tag_end > tag_start {
                    // Skip the entire #tag
                    i = tag_end;
                    // Also skip trailing space if present
                    if i < len && chars[i] == ' ' {
                        i += 1;
                    }
                    continue;
                }
            }
        }

        result.push(chars[i]);
        i += 1;
    }

    result.trim().to_string()
}

/// Count characters for X (Twitter) posting.
///
/// X counts characters using a weighted system:
/// - Full-width characters (CJK, etc.) count as 2
/// - Half-width characters (ASCII, Latin) count as 1
/// - URLs count as 23 characters regardless of length (simplified: not implemented yet)
///
/// TODO: Implement proper URL counting (t.co wrapping = 23 chars per URL)
pub fn count_chars_x(text: &str) -> u32 {
    let mut count: u32 = 0;
    for ch in text.chars() {
        if is_fullwidth(ch) {
            count += 2;
        } else {
            count += 1;
        }
    }
    count
}

/// Determine if a character is full-width (CJK or similar).
///
/// Full-width ranges include:
/// - CJK Unified Ideographs (U+4E00..U+9FFF)
/// - Hiragana (U+3040..U+309F)
/// - Katakana (U+30A0..U+30FF)
/// - Full-width forms (U+FF00..U+FFEF)
/// - CJK Symbols and Punctuation (U+3000..U+303F)
/// - Various CJK extensions
fn is_fullwidth(ch: char) -> bool {
    let cp = ch as u32;
    matches!(
        cp,
        0x1100..=0x115F   // Hangul Jamo
        | 0x2E80..=0x303E // CJK Radicals, Kangxi Radicals, CJK Symbols
        | 0x3041..=0x33BF // Hiragana, Katakana, Bopomofo, etc.
        | 0x3400..=0x4DBF // CJK Unified Ideographs Extension A
        | 0x4E00..=0x9FFF // CJK Unified Ideographs
        | 0xA000..=0xA4CF // Yi Syllables, Yi Radicals
        | 0xAC00..=0xD7AF // Hangul Syllables
        | 0xF900..=0xFAFF // CJK Compatibility Ideographs
        | 0xFE30..=0xFE4F // CJK Compatibility Forms
        | 0xFF01..=0xFF60 // Full-width ASCII variants
        | 0xFFE0..=0xFFE6 // Full-width currency symbols
        | 0x20000..=0x2FFFF // CJK Unified Ideographs Extension B-F
        | 0x30000..=0x3FFFF // CJK Unified Ideographs Extension G+
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- convert_internal_links tests ----

    #[test]
    fn test_convert_simple_link_zenn() {
        let input = "See [[my-note]] for details.";
        let result = convert_internal_links(input, &PublishTarget::Zenn);
        assert_eq!(result, "See [my-note](./my-note) for details.");
    }

    #[test]
    fn test_convert_display_link_zenn() {
        let input = "Check [[my-note|this note]] out.";
        let result = convert_internal_links(input, &PublishTarget::Zenn);
        assert_eq!(result, "Check [this note](./my-note) out.");
    }

    #[test]
    fn test_convert_simple_link_note() {
        let input = "See [[my-note]] for details.";
        let result = convert_internal_links(input, &PublishTarget::Note);
        assert_eq!(result, "See [my-note](./my-note) for details.");
    }

    #[test]
    fn test_convert_simple_link_x() {
        let input = "See [[my-note]] for details.";
        let result = convert_internal_links(input, &PublishTarget::X);
        assert_eq!(result, "See my-note for details.");
    }

    #[test]
    fn test_convert_display_link_x() {
        let input = "Check [[my-note|this note]] out.";
        let result = convert_internal_links(input, &PublishTarget::X);
        assert_eq!(result, "Check this note out.");
    }

    #[test]
    fn test_convert_simple_link_threads() {
        let input = "See [[my-note]] for details.";
        let result = convert_internal_links(input, &PublishTarget::Threads);
        assert_eq!(result, "See my-note for details.");
    }

    #[test]
    fn test_convert_multiple_links() {
        let input = "Links: [[note-a]] and [[note-b|Note B]].";
        let result = convert_internal_links(input, &PublishTarget::Zenn);
        assert_eq!(
            result,
            "Links: [note-a](./note-a) and [Note B](./note-b)."
        );
    }

    #[test]
    fn test_convert_no_links() {
        let input = "No links here, just plain text.";
        let result = convert_internal_links(input, &PublishTarget::Zenn);
        assert_eq!(result, "No links here, just plain text.");
    }

    #[test]
    fn test_convert_unclosed_link() {
        let input = "Unclosed [[link text here";
        let result = convert_internal_links(input, &PublishTarget::Zenn);
        assert_eq!(result, "Unclosed [[link text here");
    }

    // ---- strip_tags tests ----

    #[test]
    fn test_strip_inline_tag() {
        let input = "This is a #tag in text.";
        let result = strip_tags(input);
        assert_eq!(result, "This is a in text.");
    }

    #[test]
    fn test_strip_multiple_tags() {
        let input = "Hello #rust #tauri world.";
        let result = strip_tags(input);
        assert_eq!(result, "Hello world.");
    }

    #[test]
    fn test_strip_preserves_headings() {
        let input = "# Heading\nSome #tag text.";
        let result = strip_tags(input);
        assert_eq!(result, "# Heading\nSome text.");
    }

    #[test]
    fn test_strip_no_tags() {
        let input = "No tags here.";
        let result = strip_tags(input);
        assert_eq!(result, "No tags here.");
    }

    #[test]
    fn test_strip_tag_with_underscore() {
        let input = "A #complex_tag here.";
        let result = strip_tags(input);
        assert_eq!(result, "A here.");
    }

    // ---- count_chars_x tests ----

    #[test]
    fn test_count_ascii() {
        let text = "Hello";
        assert_eq!(count_chars_x(text), 5);
    }

    #[test]
    fn test_count_cjk() {
        let text = "こんにちは";
        assert_eq!(count_chars_x(text), 10); // 5 chars * 2
    }

    #[test]
    fn test_count_mixed() {
        let text = "Hello世界";
        assert_eq!(count_chars_x(text), 9); // 5 + 2*2
    }

    #[test]
    fn test_count_empty() {
        assert_eq!(count_chars_x(""), 0);
    }

    #[test]
    fn test_count_fullwidth_ascii() {
        // Full-width exclamation mark U+FF01
        let text = "\u{FF01}";
        assert_eq!(count_chars_x(text), 2);
    }

    #[test]
    fn test_count_spaces_and_punctuation() {
        let text = "Hello, world!";
        assert_eq!(count_chars_x(text), 13);
    }

    // ---- PublishServiceState tests ----

    #[test]
    fn test_state_new_empty() {
        let state = PublishServiceState::new();
        assert!(state.blog_drafts.lock().unwrap().is_empty());
        assert!(state.sns_posts.lock().unwrap().is_empty());
        assert!(state.templates.lock().unwrap().is_empty());
    }

    #[test]
    fn test_state_default() {
        let state = PublishServiceState::default();
        assert!(state.blog_drafts.lock().unwrap().is_empty());
    }
}
