use std::sync::Mutex;

use crate::models::log::CaptureEvent;

/// Maximum number of capture events kept in memory.
const MAX_BUFFER_SIZE: usize = 5000;

/// Tauri-managed state for system-level capture events.
///
/// Maintains an in-memory buffer of recent events. Future versions will
/// persist events to JSONL files under `<vault>/.techtite/capture/`.
pub struct CaptureServiceState {
    pub events: Mutex<Vec<CaptureEvent>>,
}

impl CaptureServiceState {
    pub fn new() -> Self {
        Self {
            events: Mutex::new(Vec::new()),
        }
    }
}

impl Default for CaptureServiceState {
    fn default() -> Self {
        Self::new()
    }
}

/// Record a new capture event into the in-memory buffer.
///
/// When the buffer exceeds MAX_BUFFER_SIZE, the oldest events are drained.
/// TODO: Persist to `<vault>/.techtite/capture/<date>.jsonl`
pub fn record_event(state: &CaptureServiceState, event: CaptureEvent) -> Result<(), String> {
    let mut events = state.events.lock().map_err(|e| e.to_string())?;
    events.push(event);

    // Trim oldest events when buffer is full
    if events.len() > MAX_BUFFER_SIZE {
        let excess = events.len() - MAX_BUFFER_SIZE;
        events.drain(..excess);
    }

    Ok(())
}

/// Query capture events from the in-memory buffer with optional filters.
///
/// - `since`: Only return events with timestamp >= this value (ISO 8601)
/// - `limit`: Maximum number of events to return (from most recent)
/// - `agent_id`: Only return events attributed to this agent
pub fn query_events(
    state: &CaptureServiceState,
    since: Option<&str>,
    limit: Option<u32>,
    agent_id: Option<&str>,
) -> Result<Vec<CaptureEvent>, String> {
    let events = state.events.lock().map_err(|e| e.to_string())?;

    let filtered: Vec<CaptureEvent> = events
        .iter()
        .filter(|e| {
            // Filter by timestamp if `since` is provided
            if let Some(since) = since {
                if e.timestamp.as_str() < since {
                    return false;
                }
            }
            // Filter by agent_id if provided
            if let Some(agent_id) = agent_id {
                match &e.agent_id {
                    Some(id) if id == agent_id => {}
                    _ => return false,
                }
            }
            true
        })
        .cloned()
        .collect();

    // Apply limit from the end (most recent events)
    let result = if let Some(limit) = limit {
        let limit = limit as usize;
        if filtered.len() > limit {
            filtered[filtered.len() - limit..].to_vec()
        } else {
            filtered
        }
    } else {
        filtered
    };

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::log::CaptureEventType;

    fn make_event(id: &str, agent_id: Option<&str>, timestamp: &str) -> CaptureEvent {
        CaptureEvent {
            id: id.to_string(),
            event_type: CaptureEventType::FileModified,
            timestamp: timestamp.to_string(),
            file_path: Some("src/main.rs".to_string()),
            agent_id: agent_id.map(|s| s.to_string()),
            summary: format!("Event {id}"),
            raw_data: None,
        }
    }

    #[test]
    fn test_record_and_query() {
        let state = CaptureServiceState::new();

        record_event(&state, make_event("e1", None, "2026-01-01T00:00:00Z")).unwrap();
        record_event(&state, make_event("e2", None, "2026-01-01T01:00:00Z")).unwrap();

        let events = query_events(&state, None, None, None).unwrap();
        assert_eq!(events.len(), 2);
        assert_eq!(events[0].id, "e1");
        assert_eq!(events[1].id, "e2");
    }

    #[test]
    fn test_query_with_since_filter() {
        let state = CaptureServiceState::new();

        record_event(&state, make_event("e1", None, "2026-01-01T00:00:00Z")).unwrap();
        record_event(&state, make_event("e2", None, "2026-01-01T01:00:00Z")).unwrap();
        record_event(&state, make_event("e3", None, "2026-01-01T02:00:00Z")).unwrap();

        let events = query_events(&state, Some("2026-01-01T01:00:00Z"), None, None).unwrap();
        assert_eq!(events.len(), 2);
        assert_eq!(events[0].id, "e2");
        assert_eq!(events[1].id, "e3");
    }

    #[test]
    fn test_query_with_agent_filter() {
        let state = CaptureServiceState::new();

        record_event(&state, make_event("e1", Some("agent1"), "2026-01-01T00:00:00Z")).unwrap();
        record_event(&state, make_event("e2", Some("agent2"), "2026-01-01T01:00:00Z")).unwrap();
        record_event(&state, make_event("e3", None, "2026-01-01T02:00:00Z")).unwrap();

        let events = query_events(&state, None, None, Some("agent1")).unwrap();
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].id, "e1");
    }

    #[test]
    fn test_query_with_limit() {
        let state = CaptureServiceState::new();

        for i in 0..10 {
            record_event(
                &state,
                make_event(&format!("e{i}"), None, &format!("2026-01-01T{i:02}:00:00Z")),
            )
            .unwrap();
        }

        let events = query_events(&state, None, Some(3), None).unwrap();
        assert_eq!(events.len(), 3);
        // Should return the 3 most recent events
        assert_eq!(events[0].id, "e7");
        assert_eq!(events[1].id, "e8");
        assert_eq!(events[2].id, "e9");
    }

    #[test]
    fn test_buffer_overflow_trims_oldest() {
        let state = CaptureServiceState::new();

        // Fill buffer beyond max
        for i in 0..MAX_BUFFER_SIZE + 100 {
            record_event(
                &state,
                make_event(&format!("e{i}"), None, "2026-01-01T00:00:00Z"),
            )
            .unwrap();
        }

        let events = state.events.lock().unwrap();
        assert_eq!(events.len(), MAX_BUFFER_SIZE);
        // The first event should be the one added after the trim
        assert_eq!(events[0].id, "e100");
    }
}
