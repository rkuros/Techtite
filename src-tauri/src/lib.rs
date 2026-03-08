pub mod commands;
pub mod models;
pub mod services;
pub mod utils;

use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use tauri::Emitter;
use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};

use models::vault::Vault;
use services::watcher_service::WatcherState;
use services::link_index_service::LinkIndexState;
use services::tag_service::TagIndexState;
use services::process_service::ProcessServiceState;
use services::agent_registry::AgentRegistryState;
// Unit 5: Semantic Search & RAG
use services::embedding_service::EmbeddingServiceState;
use services::vector_store_service::VectorStoreState;
// Unit 8: System Reliability & Session Logs
use services::capture_service::CaptureServiceState;
use services::session_log_service::SessionLogServiceState;
use services::ambient_service::AmbientServiceState;
// Unit 9: Guardrails & Security
use services::cost_tracker_service::CostTrackerState;
use services::log_rotation_service::LogRotationState;
use services::sandbox_service::SandboxServiceState;
use services::credential_service::CredentialServiceState;
// Unit 10: Content Publishing Pipeline
use services::publish_service::PublishServiceState;

/// Global application state managed by Tauri.
pub struct AppState {
    pub current_vault: Mutex<Option<Vault>>,
    pub active_root: Mutex<Option<PathBuf>>,
    pub watcher_state: Arc<Mutex<WatcherState>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            current_vault: Mutex::new(None),
            active_root: Mutex::new(None),
            watcher_state: Arc::new(Mutex::new(WatcherState::new())),
        })
        // Unit 4: Knowledge Base state
        .manage(LinkIndexState::new())
        .manage(TagIndexState::new())
        // Unit 7: Terminal / Agent state
        .manage(ProcessServiceState::new())
        .manage(AgentRegistryState::new())
        // Unit 5: Semantic Search & RAG state
        .manage(EmbeddingServiceState::new())
        .manage(VectorStoreState::new())
        // Unit 8: System Reliability state
        .manage(CaptureServiceState::new())
        .manage(SessionLogServiceState::new())
        .manage(AmbientServiceState::new())
        // Unit 9: Guardrails & Security state
        .manage(CostTrackerState::new())
        .manage(LogRotationState::new())
        .manage(SandboxServiceState::new())
        .manage(CredentialServiceState::new())
        // Unit 10: Content Publishing state
        .manage(PublishServiceState::new())
        .invoke_handler(tauri::generate_handler![
            // Unit 1: File System
            commands::fs::read_file,
            commands::fs::write_file,
            commands::fs::create_file,
            commands::fs::create_dir,
            commands::fs::delete,
            commands::fs::rename,
            commands::fs::exists,
            // Unit 1: Vault Management
            commands::vault::open,
            commands::vault::get_current,
            commands::vault::select_folder,
            commands::vault::get_config,
            commands::vault::update_config,
            commands::vault::create_vault_dir,
            commands::vault::get_home_dir,
            commands::vault::close_vault,
            commands::vault::delete_vault,
            // Unit 1: Window State
            commands::window::save_state,
            commands::window::load_state,
            // Project Management
            commands::project::list_projects,
            commands::project::set_active_project,
            commands::project::clear_active_project,
            commands::project::add_custom_project,
            commands::project::remove_custom_project,
            commands::project::select_project_folder,
            commands::project::get_session,
            // Unit 2: Editor
            commands::editor::get_file_type,
            commands::editor::get_language,
            // Unit 3: File Tree
            commands::file_tree::get_tree,
            commands::file_tree::get_metadata,
            commands::file_tree::list_dir_entries,
            // Unit 4: Knowledge Base
            commands::knowledge::get_outgoing_links,
            commands::knowledge::get_backlinks,
            commands::knowledge::get_all_tags,
            commands::knowledge::get_files_by_tag,
            commands::knowledge::get_graph_data,
            commands::knowledge::get_local_graph,
            commands::knowledge::get_unlinked_mentions,
            commands::search::search_keyword,
            // Unit 5: Semantic Search & RAG
            commands::semantic::semantic_search,
            commands::semantic::semantic_hybrid_search,
            commands::semantic::semantic_get_index_status,
            commands::semantic::semantic_rebuild_index,
            commands::semantic::semantic_chat,
            // Unit 6: Git Integration & Transparent Sync
            commands::git::get_status,
            commands::git::stage,
            commands::git::unstage,
            commands::git::commit,
            commands::git::get_diff,
            commands::git::get_log,
            commands::git::get_commit_diff,
            commands::git::get_branches,
            commands::git::create_branch,
            commands::git::checkout_branch,
            commands::sync::get_state,
            commands::sync::trigger_now,
            commands::sync::set_remote,
            commands::sync::test_connection,
            commands::sync::get_conflicts,
            commands::sync::resolve_conflict,
            // Unit 7: Terminal / Agents
            commands::terminal::terminal_create,
            commands::terminal::terminal_write,
            commands::terminal::terminal_resize,
            commands::terminal::terminal_close,
            commands::agent::agent_list,
            commands::agent::agent_start,
            commands::agent::agent_stop,
            commands::agent::agent_get_operation_log,
            // Unit 8: System Reliability & Session Logs
            commands::capture::capture_get_events,
            commands::session_log::session_log_list,
            commands::session_log::session_log_get_daily,
            commands::session_log::session_log_get_content,
            commands::session_log::ambient_get_status,
            commands::session_log::ambient_get_check_results,
            // Unit 9: Guardrails & Security
            commands::guardrails::cost_get_summary,
            commands::guardrails::cost_get_budget,
            commands::guardrails::cost_set_budget,
            commands::guardrails::cost_get_trend,
            commands::guardrails::log_rotation_get_status,
            commands::guardrails::log_rotation_set_config,
            commands::credentials::credential_list,
            commands::credentials::credential_set,
            commands::credentials::credential_delete,
            commands::credentials::sandbox_get_config,
            commands::credentials::sandbox_set_config,
            // Unit 10: Content Publishing Pipeline
            commands::publish::publish_generate_blog_draft,
            commands::publish::publish_generate_sns_post,
            commands::publish::publish_convert_notation,
            commands::publish::publish_publish_zenn,
            commands::publish::publish_publish_note,
            commands::publish::publish_post_x,
            commands::publish::publish_post_threads,
            commands::publish::publish_get_templates,
            commands::publish::publish_set_template,
        ])
        .setup(|app| {
            // Native menu bar
            let settings_item = MenuItemBuilder::with_id("app-settings", "Settings...")
                .accelerator("CmdOrCtrl+,")
                .build(app)?;

            let app_menu = SubmenuBuilder::new(app, "Techtite")
                .item(&settings_item)
                .separator()
                .text("app-about", "About Techtite")
                .build()?;

            let vault_menu = SubmenuBuilder::new(app, "Vault")
                .text("vault-create", "Create New Vault...")
                .text("vault-open", "Open Vault...")
                .text("vault-close", "Close Vault")
                .separator()
                .text("vault-delete", "Delete Current Vault...")
                .build()?;

            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;

            let window_menu = SubmenuBuilder::new(app, "Window")
                .minimize()
                .close_window()
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&app_menu)
                .item(&vault_menu)
                .item(&edit_menu)
                .item(&window_menu)
                .build()?;

            app.set_menu(menu)?;

            app.on_menu_event(move |app_handle, event| {
                match event.id().0.as_str() {
                    "vault-create" => { let _ = app_handle.emit("menu-event", "vault-create"); }
                    "vault-open" => { let _ = app_handle.emit("menu-event", "vault-open"); }
                    "vault-close" => { let _ = app_handle.emit("menu-event", "vault-close"); }
                    "vault-delete" => { let _ = app_handle.emit("menu-event", "vault-delete"); }
                    "app-settings" => { let _ = app_handle.emit("menu-event", "app-settings"); }
                    "app-about" => { let _ = app_handle.emit("menu-event", "app-about"); }
                    _ => {}
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error running Techtite");
}
