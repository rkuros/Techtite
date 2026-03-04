use serde::{Deserialize, Serialize};

/// Target platform for content publishing.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum PublishTarget {
    Zenn,
    Note,
    X,
    Threads,
}

/// Lifecycle status of a publishable item (blog draft or SNS post).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum PublishStatus {
    Draft,
    ReadyForReview,
    Reviewed,
    Published,
    Failed,
}

/// Platform-specific metadata for blog drafts.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "platform")]
pub enum PlatformMetadata {
    #[serde(rename = "zenn")]
    Zenn {
        emoji: String,
        article_type: String,
        topics: Vec<String>,
    },
    #[serde(rename = "note")]
    Note {},
    #[serde(rename = "plain")]
    Plain {},
}

/// A blog draft generated from session logs.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BlogDraft {
    pub id: String,
    pub title: String,
    pub content: String,
    pub source_log_paths: Vec<String>,
    pub platform_metadata: Option<PlatformMetadata>,
    pub status: PublishStatus,
    pub created_at: String,
    pub published_at: Option<String>,
    pub published_url: Option<String>,
}

/// An SNS post (X or Threads) generated from source content.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SNSPost {
    pub id: String,
    pub content: String,
    pub platform: PublishTarget,
    pub char_count: u32,
    pub source_paths: Vec<String>,
    pub status: PublishStatus,
    pub created_at: String,
    pub published_url: Option<String>,
}

/// A reusable template for generating posts on a specific platform.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PostTemplate {
    pub id: String,
    pub platform: PublishTarget,
    pub name: String,
    pub template: String,
    pub variables: Vec<TemplateVariable>,
}

/// A variable placeholder used within a PostTemplate.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateVariable {
    pub name: String,
    pub description: String,
    pub default_value: Option<String>,
}

/// Result returned from a publish or post operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublishResult {
    pub success: bool,
    pub url: Option<String>,
    pub error_message: Option<String>,
}
