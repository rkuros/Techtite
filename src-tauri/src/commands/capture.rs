use tauri::State;

use crate::models::log::CaptureEvent;
use crate::services::capture_service::{self, CaptureServiceState};

/// Get recent capture events from the in-memory buffer.
///
/// Supports filtering by timestamp, agent, and result count limit.
///
/// IPC: `capture:get_events`
/// Input: `{ since?: string, limit?: number, agentId?: string }`
/// Output: `CaptureEvent[]`
#[tauri::command]
pub fn capture_get_events(
    since: Option<String>,
    limit: Option<u32>,
    agent_id: Option<String>,
    state: State<'_, CaptureServiceState>,
) -> Result<Vec<CaptureEvent>, String> {
    capture_service::query_events(&state, since.as_deref(), limit, agent_id.as_deref())
}
