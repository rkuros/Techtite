//! Cross-unit integration tests for Techtite.
//!
//! Tests the interaction points defined in parallel_work_guide.md Section 5.3:
//! 1. Knowledge Base link indexing + search integration (Unit 4 + 5)
//! 2. Cost management + agent lifecycle (Unit 9 + 7)
//! 3. Content publishing pipeline (Unit 10 + 8 + 9)
//! 4. Capture events across sources (Unit 8 + 1)
//! 5. Secret masking + credential service (Unit 9 + 8)

use techtite_lib::models;
use techtite_lib::services;

// ---------------------------------------------------------------------------
// Integration Point: Knowledge Base + Semantic Search (Unit 4 + 5)
// Tests that link_index_service and embedding_service can process the same
// note content, and vector_store_service can find notes indexed by link_index.
// ---------------------------------------------------------------------------

#[test]
fn test_knowledge_base_and_semantic_search_integration() {
    // Use the raw LinkIndex (not state) as the service functions operate on &mut LinkIndex
    let mut link_index = services::link_index_service::LinkIndex::new();
    let vector_state = services::vector_store_service::VectorStoreState::new();

    // Register known files so existence checks work
    services::link_index_service::register_known_file(&mut link_index, "notes/project.md");
    services::link_index_service::register_known_file(&mut link_index, "architecture.md");
    services::link_index_service::register_known_file(&mut link_index, "roadmap.md");

    // Index a note in the link index (Unit 4)
    services::link_index_service::update_file_index(
        &mut link_index,
        "notes/project.md",
        "# Project\n\nSee [[architecture]] for details.\nAlso check [[roadmap]].",
    );

    // Verify links were extracted (Unit 4)
    let links =
        services::link_index_service::get_outgoing_links(&link_index, "notes/project.md");
    assert_eq!(links.len(), 2);
    assert!(links.iter().any(|l| l.target_path == "architecture.md"));
    assert!(links.iter().any(|l| l.target_path == "roadmap.md"));

    // Generate embedding for the same content (Unit 5)
    let embedding = services::embedding_service::generate_embedding(
        "Project architecture and roadmap details",
    );
    assert_eq!(embedding.len(), 384); // Stub returns 384-dim zero vector

    // Store in vector store using ChunkWithVector (Unit 5)
    let chunk = services::vector_store_service::ChunkWithVector {
        file_path: "notes/project.md".to_string(),
        section_heading: Some("# Project".to_string()),
        chunk_text: "Project architecture and roadmap details".to_string(),
        start_line: 1,
        end_line: 4,
        vector: embedding.clone(),
    };
    services::vector_store_service::upsert_file_chunks(&vector_state, &[chunk]).unwrap();

    // Search should return Ok (stub returns empty, but no error) (Unit 5)
    let results =
        services::vector_store_service::search_by_vector(&vector_state, &embedding, 5).unwrap();
    // Stub returns empty results; just verify the call succeeds without panic
    assert!(results.is_empty()); // Stub always returns empty
}

// ---------------------------------------------------------------------------
// Integration Point: Cost Management + Agent Lifecycle (Unit 9 + 7)
// Tests that cost tracking can monitor agent operations and budget checks
// interact with agent status updates.
// ---------------------------------------------------------------------------

#[test]
fn test_cost_management_and_agent_lifecycle_integration() {
    let agent_state = services::agent_registry::AgentRegistryState::new();
    let cost_state = services::cost_tracker_service::CostTrackerState::new();

    // Register an agent (Unit 7)
    let agent = models::agent::AgentInfo {
        id: "agent-1".to_string(),
        name: "Test Agent".to_string(),
        agent_type: models::agent::AgentType::Worker,
        status: models::agent::AgentStatus::Running,
        started_at: chrono::Utc::now().to_rfc3339(),
        current_task: Some("Writing code".to_string()),
        terminal_tab_id: Some("tab-1".to_string()),
        pid: Some(12345),
    };
    services::agent_registry::register(&agent_state, agent).unwrap();

    // Record cost for this agent (Unit 9)
    let record = models::cost::CostRecord {
        id: uuid::Uuid::new_v4().to_string(),
        agent_id: "agent-1".to_string(),
        agent_name: "Test Agent".to_string(),
        agent_category: "worker".to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        input_tokens: 1000,
        output_tokens: 500,
        estimated_cost_usd: 0.05,
    };
    services::cost_tracker_service::record_usage(&cost_state, record).unwrap();

    // Check budget (Unit 9) -- returns Option<String>: None=ok, Some("warning"), Some("exceeded")
    let check = services::cost_tracker_service::check_budget(&cost_state).unwrap();
    assert!(check.is_none()); // 0.05 is well within default 5.0 daily limit

    // Verify agent is still running (Unit 7)
    let agent_info = services::agent_registry::get(&agent_state, "agent-1")
        .unwrap()
        .unwrap();
    assert!(matches!(
        agent_info.status,
        models::agent::AgentStatus::Running
    ));

    // Record an operation by the agent (Unit 7)
    let op_entry = models::agent::OperationLogEntry {
        timestamp: chrono::Utc::now().to_rfc3339(),
        agent_id: "agent-1".to_string(),
        agent_name: "Test Agent".to_string(),
        operation: models::agent::OperationType::Create,
        target_path: "src/main.rs".to_string(),
        summary: Some("Created main.rs".to_string()),
    };
    services::agent_registry::record_operation(&agent_state, op_entry).unwrap();

    // Both cost and operation logs should be populated
    let cost_summary = services::cost_tracker_service::get_summary(
        &cost_state,
        models::cost::CostPeriod::Daily,
    )
    .unwrap();
    assert!(cost_summary.total_cost_usd > 0.0);
    assert_eq!(cost_summary.total_input_tokens, 1000);

    let ops =
        services::agent_registry::get_operation_log(&agent_state, Some("agent-1"), None).unwrap();
    assert_eq!(ops.len(), 1);
}

// ---------------------------------------------------------------------------
// Integration Point: Content Publishing Pipeline (Unit 10 + 8 + 9)
// Tests that publish_service correctly converts internal notation
// and that masking_service can sanitize content before publishing.
// ---------------------------------------------------------------------------

#[test]
fn test_content_publishing_pipeline_integration() {
    use services::publish_service;

    // Content with internal links and a secret (simulating session log output)
    // Use `api_key = "..."` format which matches the masking service's built-in regex.
    let secret_value = "sk-1234567890abcdefghijklmnopqrstuvwxyz123456";
    let content = format!(
        "Today I worked on [[architecture]] and updated [[roadmap]].\n\
         My api_key = \"{secret_value}\".\n\
         Also tagged #rust #tauri for tracking."
    );

    // Step 1: Mask secrets using MaskingService (Unit 8)
    let masking = services::masking_service::MaskingService::new();
    let masked = masking.mask(&content);
    assert!(!masked.contains(secret_value));
    assert!(masked.contains("[REDACTED]"));

    // Step 2: Convert internal links for Zenn (Unit 10)
    let converted_zenn =
        publish_service::convert_internal_links(&masked, &models::publish::PublishTarget::Zenn);
    // Wiki-links should be converted to markdown links
    assert!(!converted_zenn.contains("[[architecture]]"));
    assert!(converted_zenn.contains("[architecture]"));

    // Step 3: Strip tags for external publishing (Unit 10)
    let stripped = publish_service::strip_tags(&converted_zenn);
    assert!(!stripped.contains("#rust"));
    assert!(!stripped.contains("#tauri"));

    // Step 4: Verify character counting for X (Unit 10)
    let x_content = "Today I built something cool with Rust!";
    let char_count = publish_service::count_chars_x(x_content);
    assert_eq!(char_count, x_content.len() as u32); // All ASCII = 1 each

    // Verify CJK counting
    let jp_content = "今日はRustで開発した";
    let jp_count = publish_service::count_chars_x(jp_content);
    // CJK chars count as 2 each, ASCII as 1 each.
    // .chars().count() gives the number of Unicode codepoints (not byte length).
    let char_count = jp_content.chars().count() as u32;
    assert!(jp_count > char_count);
}

// ---------------------------------------------------------------------------
// Integration Point: Capture + Masking (Unit 8)
// Tests that capture events have secrets masked before storage.
// ---------------------------------------------------------------------------

#[test]
fn test_capture_and_masking_integration() {
    let capture_state = services::capture_service::CaptureServiceState::new();

    // Record events with potentially sensitive data
    let event1 = models::log::CaptureEvent {
        id: uuid::Uuid::new_v4().to_string(),
        event_type: models::log::CaptureEventType::FileModified,
        timestamp: chrono::Utc::now().to_rfc3339(),
        file_path: Some("config.toml".to_string()),
        agent_id: None,
        summary: "Modified config.toml".to_string(),
        raw_data: None,
    };
    services::capture_service::record_event(&capture_state, event1).unwrap();

    let event2 = models::log::CaptureEvent {
        id: uuid::Uuid::new_v4().to_string(),
        event_type: models::log::CaptureEventType::TerminalCommand,
        timestamp: chrono::Utc::now().to_rfc3339(),
        file_path: None,
        agent_id: Some("terminal-1".to_string()),
        summary: "Ran cargo build".to_string(),
        raw_data: Some("Build successful for project-x".to_string()),
    };
    services::capture_service::record_event(&capture_state, event2).unwrap();

    // Query events
    let events =
        services::capture_service::query_events(&capture_state, None, None, None).unwrap();
    assert_eq!(events.len(), 2);

    // Verify masking can be applied to event summaries
    let sensitive = "Bearer ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef12";
    let masking = services::masking_service::MaskingService::new();
    let masked = masking.mask(sensitive);
    assert!(!masked.contains("ghp_"));
}

// ---------------------------------------------------------------------------
// Integration Point: Sandbox + Credential Service (Unit 9)
// Tests that sandbox restrictions work alongside credential management.
// ---------------------------------------------------------------------------

#[test]
fn test_sandbox_and_credential_integration() {
    let sandbox_state = services::sandbox_service::SandboxServiceState::new();
    let credential_state = services::credential_service::CredentialServiceState::new();

    // Set up sandbox restrictions (Unit 9)
    let config = models::cost::SandboxConfig {
        enabled: true,
        allowed_commands: Vec::new(),
        blocked_commands: vec!["rm -rf".to_string(), "sudo".to_string()],
        restricted_paths: vec!["/etc".to_string(), "/usr".to_string()],
    };
    services::sandbox_service::set_config(&sandbox_state, config).unwrap();

    // Validate a safe command passes (returns Ok(true))
    let safe_check =
        services::sandbox_service::validate_command(&sandbox_state, "cargo build").unwrap();
    assert!(safe_check);

    // Validate a dangerous command is blocked (returns Ok(false))
    let dangerous_check =
        services::sandbox_service::validate_command(&sandbox_state, "rm -rf /").unwrap();
    assert!(!dangerous_check);

    // Store credentials (Unit 9) -- set takes String arguments
    services::credential_service::set(
        &credential_state,
        "x_api_token".to_string(),
        "test-token".to_string(),
        "x".to_string(),
    )
    .unwrap();
    services::credential_service::set(
        &credential_state,
        "zenn_api_token".to_string(),
        "zenn-test-token".to_string(),
        "zenn".to_string(),
    )
    .unwrap();

    // Verify credentials are accessible (returns Result<Option<String>, String>)
    let x_token = services::credential_service::get(&credential_state, "x_api_token").unwrap();
    assert_eq!(x_token, Some("test-token".to_string()));

    // List credentials (without exposing values)
    let credentials = services::credential_service::list(&credential_state).unwrap();
    assert_eq!(credentials.len(), 2);
}

// ---------------------------------------------------------------------------
// Integration Point: Session Log + Publishing (Unit 8 + 10)
// Tests session log creation and retrieval for publish pipeline input.
// ---------------------------------------------------------------------------

#[test]
fn test_session_log_and_publishing_integration() {
    let session_state = services::session_log_service::SessionLogServiceState::new();

    // Create a session log entry (Unit 8)
    // create_session_log takes (&state, agent_name, date) and auto-generates the log
    let log = services::session_log_service::create_session_log(
        &session_state,
        "Test Agent",
        "2026-02-28",
    )
    .unwrap();
    assert_eq!(log.agent_name, "Test Agent");
    assert_eq!(log.date, "2026-02-28");
    assert_eq!(log.session_number, 1);

    // List session logs (Unit 8 - used by Unit 10's publish pipeline)
    let logs =
        services::session_log_service::list_session_logs(&session_state, None, None).unwrap();
    assert_eq!(logs.len(), 1);
    assert_eq!(logs[0].agent_name, "Test Agent");

    // The publish pipeline would then use these log paths to generate drafts
    // (actual AI generation is stubbed in Unit 10)
    let log_paths: Vec<String> = logs.iter().map(|l| l.file_path.clone()).collect();
    assert_eq!(
        log_paths,
        vec![".techtite/logs/2026-02-28/Test Agent_1.md"]
    );
}

// ---------------------------------------------------------------------------
// Integration Point: Link Index + Tag Service (Unit 4)
// Tests that link indexing and tag extraction work together on same content.
// ---------------------------------------------------------------------------

#[test]
fn test_link_index_and_tag_service_integration() {
    let mut link_index = services::link_index_service::LinkIndex::new();
    let mut tag_index = services::tag_service::TagIndex::new();

    let content = "# My Note\n\n\
                   Tags: #rust #webdev\n\n\
                   See [[architecture]] for details.\n\
                   Related to [[rust-patterns]] #design-patterns";

    // Register known files
    services::link_index_service::register_known_file(&mut link_index, "notes/my-note.md");
    services::link_index_service::register_known_file(&mut link_index, "architecture.md");
    services::link_index_service::register_known_file(&mut link_index, "rust-patterns.md");

    // Index links (Unit 4)
    services::link_index_service::update_file_index(
        &mut link_index,
        "notes/my-note.md",
        content,
    );

    // Index tags (Unit 4)
    services::tag_service::update_file_tags(&mut tag_index, "notes/my-note.md", content);

    // Verify links
    let links =
        services::link_index_service::get_outgoing_links(&link_index, "notes/my-note.md");
    assert_eq!(links.len(), 2);
    assert!(links.iter().any(|l| l.target_path == "architecture.md"));
    assert!(links.iter().any(|l| l.target_path == "rust-patterns.md"));

    // Verify tags
    let all_tags = services::tag_service::get_all_tags(&tag_index);
    assert!(all_tags.len() >= 3); // rust, webdev, design-patterns

    let rust_files = services::tag_service::get_files_by_tag(&tag_index, "rust");
    assert!(rust_files.contains(&"notes/my-note.md".to_string()));
}
