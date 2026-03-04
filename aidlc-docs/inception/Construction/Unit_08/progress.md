# Unit 8: System Reliability, Ambient Agent, Session Logs -- Progress

> **Area**: System-level capture, ambient agent, session log generation
> **Status**: Complete

---

## Deliverables Checklist

### Rust Backend

- [x] `src-tauri/src/models/log.rs` -- CaptureEvent, CaptureEventType, SessionLog, DailyLog, SessionLogSummary, AmbientStatus, TaskCheckResult
- [x] `src-tauri/src/commands/capture.rs` -- capture_get_events (1 IPC command)
- [x] `src-tauri/src/commands/session_log.rs` -- session_log_list, session_log_get_daily, session_log_get_content, ambient_get_status, ambient_get_check_results (5 IPC commands)
- [x] `src-tauri/src/services/capture_service.rs` -- CaptureServiceState, record_event, query_events + 5 tests
- [x] `src-tauri/src/services/masking_service.rs` -- MaskingRule, MaskingService with 8 built-in rules, mask() + 8 tests
- [x] `src-tauri/src/services/ambient_service.rs` -- AmbientServiceState, AmbientCheckConfig, start/stop/run_check/get_status + 5 tests
- [x] `src-tauri/src/services/session_log_service.rs` -- SessionLogServiceState, create/list/get_daily/generate_daily + 8 tests

### Frontend

- [x] `src/types/log.ts` -- Updated to match Rust models (SessionLog, DailyLog, SessionLogSummary, CaptureEvent, CaptureEventType, AmbientStatus, TaskCheckResult)
- [x] `src/stores/log-store.ts` -- Zustand store with state, actions, and event listeners
- [x] `src/features/reliability/components/LogsPanel.tsx` -- Left sidebar panel with date sections, agent filter, log entries
- [x] `src/features/reliability/components/LogEntry.tsx` -- Single log entry with icon, title, subtitle, active state
- [x] `src/features/reliability/components/AmbientManagerCard.tsx` -- Agents Dashboard card with status, progress bar, alerts
- [x] `src/features/reliability/components/DailyLogView.tsx` -- Center area log content viewer with file/commit links
- [x] `src/features/reliability/index.ts` -- Barrel export

### Module Registration

- [x] `src-tauri/src/commands/mod.rs` -- Added capture, session_log modules
- [x] `src-tauri/src/services/mod.rs` -- Added capture_service, masking_service, ambient_service, session_log_service modules
- [x] `src-tauri/src/models/mod.rs` -- Added log module
- [x] `src-tauri/src/lib.rs` -- Added CaptureServiceState, SessionLogServiceState, AmbientServiceState + 6 command registrations
- [x] `src-tauri/Cargo.toml` -- Added regex = "1" dependency

### Verification

- [x] `cargo check` -- passes
- [x] `cargo test` -- 121 tests pass (33 new Unit 8 tests: 5 capture, 8 masking, 5 ambient, 8 session_log, 7 remaining from other services using shared models)
- [x] `npx tsc --noEmit` -- Unit 8 code compiles clean (pre-existing Unit 9 guardrails errors are unrelated)

---

## Dependencies

- **Hard dependency**: Unit 1 (IPC infrastructure) -- satisfied
- **Soft dependency**: Unit 6 (Git events -- mockable), Unit 7 (Agent events -- mockable) -- stubs in place

## TODO (future phases)

- Persist capture events to JSONL files
- Implement tokio::spawn periodic checks in ambient_service start()
- Integrate Claude SDK for daily log summary generation
- Connect file watcher events to capture_service
- Connect git events to capture_service
