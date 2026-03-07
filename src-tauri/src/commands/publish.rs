use tauri::State;

use crate::models::publish::{
    BlogDraft, PostTemplate, PublishResult, PublishStatus, PublishTarget, SNSPost,
};
use crate::services::publish_service::{self, PublishServiceState};
use crate::AppState;

/// Generate a blog draft from session log files.
///
/// Reads the specified session log files and creates a BlogDraft with
/// placeholder content. The actual AI-powered generation will be added later.
///
/// IPC: `publish_generate_blog_draft`
/// Input: `{ sessionLogPaths: string[] }`
/// Output: `BlogDraft`
///
/// TODO: Integrate with Claude SDK to generate meaningful blog content
/// from session logs.
#[tauri::command]
pub fn publish_generate_blog_draft(
    session_log_paths: Vec<String>,
    _state: State<'_, AppState>,
    publish_state: State<'_, PublishServiceState>,
) -> Result<BlogDraft, String> {
    if session_log_paths.is_empty() {
        return Err("At least one session log path is required".to_string());
    }

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    // TODO: Read actual session log files and generate content via Claude SDK.
    // For now, create a placeholder draft with stub content.
    let placeholder_content = format!(
        "# Draft Blog Post\n\n\
        > This draft was generated from {} session log(s).\n\n\
        ## Summary\n\n\
        TODO: AI-generated summary of the session logs will appear here.\n\n\
        ## Details\n\n\
        TODO: AI-generated detailed content from the following logs:\n\n{}\n",
        session_log_paths.len(),
        session_log_paths
            .iter()
            .map(|p| format!("- `{}`", p))
            .collect::<Vec<_>>()
            .join("\n")
    );

    let draft = BlogDraft {
        id,
        title: "Untitled Blog Draft".to_string(),
        content: placeholder_content,
        source_log_paths: session_log_paths,
        platform_metadata: None,
        status: PublishStatus::Draft,
        created_at: now,
        published_at: None,
        published_url: None,
    };

    // Store the draft in memory
    let mut drafts = publish_state
        .blog_drafts
        .lock()
        .map_err(|e| e.to_string())?;
    drafts.push(draft.clone());

    Ok(draft)
}

/// Generate an SNS post from source files.
///
/// Reads the specified source files and creates an SNSPost with
/// placeholder content for the given platform.
///
/// IPC: `publish_generate_sns_post`
/// Input: `{ sourcePaths: string[], platform: string }`
/// Output: `SNSPost`
///
/// TODO: Integrate with Claude SDK to generate platform-appropriate post content.
#[tauri::command]
pub fn publish_generate_sns_post(
    source_paths: Vec<String>,
    platform: String,
    _state: State<'_, AppState>,
    publish_state: State<'_, PublishServiceState>,
) -> Result<SNSPost, String> {
    if source_paths.is_empty() {
        return Err("At least one source path is required".to_string());
    }

    let target = parse_platform(&platform)?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    // TODO: Read actual source files and generate content via Claude SDK.
    // For now, create a placeholder post.
    let placeholder_content = match &target {
        PublishTarget::X => format!(
            "New blog post from today's session! Check out what I built. #dev #rust (Generated from {} source(s))",
            source_paths.len()
        ),
        PublishTarget::Threads => format!(
            "Just published a new dev log from today's coding session. \
            Covered some interesting topics! (Generated from {} source(s))",
            source_paths.len()
        ),
        _ => return Err(format!("SNS post generation not supported for platform: {platform}")),
    };

    let char_count = publish_service::count_chars_x(&placeholder_content);

    let post = SNSPost {
        id,
        content: placeholder_content,
        platform: target,
        char_count,
        source_paths,
        status: PublishStatus::Draft,
        created_at: now,
        published_url: None,
    };

    // Store the post in memory
    let mut posts = publish_state
        .sns_posts
        .lock()
        .map_err(|e| e.to_string())?;
    posts.push(post.clone());

    Ok(post)
}

/// Convert internal notation to platform-appropriate format.
///
/// Performs two transformations:
/// 1. Replace `[[target]]` and `[[target|display]]` wiki-links with
///    platform-appropriate links (markdown for blogs, plain text for SNS)
/// 2. Strip `#tag` patterns for external publishing
///
/// IPC: `publish_convert_notation`
/// Input: `{ content: string, platform: string }`
/// Output: `string`
#[tauri::command]
pub fn publish_convert_notation(content: String, platform: String) -> Result<String, String> {
    let target = parse_platform(&platform)?;
    let converted = publish_service::convert_internal_links(&content, &target);
    let stripped = publish_service::strip_tags(&converted);
    Ok(stripped)
}

/// Publish a blog draft to Zenn.
///
/// IPC: `publish_publish_zenn`
/// Input: `{ draft: BlogDraft }`
/// Output: `PublishResult`
///
/// TODO: Implement actual Zenn publishing via their GitHub-based workflow.
/// Zenn articles are typically published by pushing markdown files to a
/// connected GitHub repository. This command will need to:
/// 1. Format the draft as a Zenn-compatible markdown file with frontmatter
/// 2. Write the file to the Zenn repository
/// 3. Commit and push via the Git service
#[tauri::command]
pub fn publish_publish_zenn(
    draft: BlogDraft,
    publish_state: State<'_, PublishServiceState>,
) -> Result<PublishResult, String> {
    // TODO: Implement actual Zenn publishing workflow:
    // 1. Validate that the draft has Zenn metadata
    // 2. Generate Zenn frontmatter (emoji, type, topics, published)
    // 3. Write to articles/ directory in Zenn repo
    // 4. Git commit and push
    // 5. Emit publish:draft_progress during generation steps
    // 6. Emit publish:publish_progress during publishing steps
    let _ = (&draft, &publish_state);
    Err("Not yet implemented".to_string())
}

/// Publish a blog draft to Note.
///
/// IPC: `publish_publish_note`
/// Input: `{ draft: BlogDraft }`
/// Output: `PublishResult`
///
/// TODO: Implement actual Note publishing via their API.
/// Note.com provides an API for creating and publishing articles.
/// This command will need to:
/// 1. Authenticate via OAuth or API key (from credential_service)
/// 2. Convert markdown to Note-compatible format
/// 3. POST to the Note API
#[tauri::command]
pub fn publish_publish_note(
    draft: BlogDraft,
    publish_state: State<'_, PublishServiceState>,
) -> Result<PublishResult, String> {
    // TODO: Implement actual Note API integration:
    // 1. Get API credentials from credential_service
    // 2. Convert content to Note format
    // 3. POST to Note API
    // 4. Emit publish:draft_progress during generation steps
    // 5. Emit publish:publish_progress during publishing steps
    let _ = (&draft, &publish_state);
    Err("Not yet implemented".to_string())
}

/// Post an SNS post to X (Twitter).
///
/// IPC: `publish_post_x`
/// Input: `{ post: SNSPost }`
/// Output: `PublishResult`
///
/// TODO: Implement actual X API v2 integration via reqwest.
/// Will need:
/// 1. OAuth 2.0 authentication (from credential_service)
/// 2. POST to https://api.twitter.com/2/tweets
/// 3. Handle rate limiting and error responses
#[tauri::command]
pub fn publish_post_x(
    post: SNSPost,
    publish_state: State<'_, PublishServiceState>,
) -> Result<PublishResult, String> {
    // Validate character count for X
    let char_count = publish_service::count_chars_x(&post.content);
    if char_count > 280 {
        return Err(format!(
            "Post exceeds X character limit: {} / 280",
            char_count
        ));
    }

    // TODO: Implement actual X API v2 posting:
    // 1. Get OAuth credentials from credential_service
    // 2. POST to X API v2 /tweets endpoint
    // 3. Parse response for tweet URL
    // 4. Emit publish:publish_progress during posting steps
    let _ = (&post, &publish_state);
    Err("Not yet implemented".to_string())
}

/// Post an SNS post to Threads.
///
/// IPC: `publish_post_threads`
/// Input: `{ post: SNSPost }`
/// Output: `PublishResult`
///
/// TODO: Implement actual Threads API integration.
/// Threads uses the Meta/Instagram Graph API. Will need:
/// 1. Meta OAuth authentication (from credential_service)
/// 2. POST to Threads publishing endpoint
/// 3. Handle media container creation flow
#[tauri::command]
pub fn publish_post_threads(
    post: SNSPost,
    publish_state: State<'_, PublishServiceState>,
) -> Result<PublishResult, String> {
    // Threads has a 500 character limit
    if post.content.len() > 500 {
        return Err(format!(
            "Post exceeds Threads character limit: {} / 500",
            post.content.len()
        ));
    }

    // TODO: Implement actual Threads API posting:
    // 1. Get Meta OAuth credentials from credential_service
    // 2. Create media container via Graph API
    // 3. Publish the container
    // 4. Emit publish:publish_progress during posting steps
    let _ = (&post, &publish_state);
    Err("Not yet implemented".to_string())
}

/// Get all stored post templates.
///
/// IPC: `publish_get_templates`
/// Input: (none)
/// Output: `PostTemplate[]`
#[tauri::command]
pub fn publish_get_templates(
    publish_state: State<'_, PublishServiceState>,
) -> Result<Vec<PostTemplate>, String> {
    let templates = publish_state
        .templates
        .lock()
        .map_err(|e| e.to_string())?;
    Ok(templates.clone())
}

/// Store or update a post template.
///
/// If a template with the same ID already exists, it is replaced.
/// Otherwise, the new template is added.
///
/// IPC: `publish_set_template`
/// Input: `PostTemplate`
/// Output: `void`
#[tauri::command]
pub fn publish_set_template(
    template: PostTemplate,
    publish_state: State<'_, PublishServiceState>,
) -> Result<(), String> {
    if template.id.is_empty() {
        return Err("Template ID cannot be empty".to_string());
    }
    if template.name.is_empty() {
        return Err("Template name cannot be empty".to_string());
    }

    let mut templates = publish_state
        .templates
        .lock()
        .map_err(|e| e.to_string())?;

    // Update existing or insert new
    if let Some(pos) = templates.iter().position(|t| t.id == template.id) {
        templates[pos] = template;
    } else {
        templates.push(template);
    }

    Ok(())
}

/// Parse a platform string into a PublishTarget enum.
fn parse_platform(platform: &str) -> Result<PublishTarget, String> {
    match platform.to_lowercase().as_str() {
        "zenn" => Ok(PublishTarget::Zenn),
        "note" => Ok(PublishTarget::Note),
        "x" | "twitter" => Ok(PublishTarget::X),
        "threads" => Ok(PublishTarget::Threads),
        _ => Err(format!(
            "Unknown platform: '{}'. Use 'zenn', 'note', 'x', or 'threads'.",
            platform
        )),
    }
}
