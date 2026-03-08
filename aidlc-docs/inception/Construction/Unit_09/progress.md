# Unit 9: ガードレール・セキュリティ — 進捗

> **担当領域**: コスト管理、ログローテーション、サンドボックス、認証情報管理
> **ステータス**: 完了

---

## 成果物チェックリスト

### Rust バックエンド

- [x] `src-tauri/src/models/cost.rs` — CostRecord, CostSummary, BudgetConfig, LogStorageStatus, LogRotationConfig, FilterRule, CredentialEntry, SandboxConfig
- [x] `src-tauri/src/commands/guardrails.rs` — 6 IPC commands (cost_get_summary, cost_get_budget, cost_set_budget, cost_get_trend, log_rotation_get_status, log_rotation_set_config)
- [x] `src-tauri/src/commands/credentials.rs` — 5 IPC commands (credential_list, credential_set, credential_delete, sandbox_get_config, sandbox_set_config)
- [x] `src-tauri/src/services/cost_tracker_service.rs` — CostTrackerState, record_usage, get_summary, get_budget, set_budget, get_trend, check_budget + 8 unit tests
- [x] `src-tauri/src/services/log_rotation_service.rs` — LogRotationState, get_status, set_config, check_and_rotate (stub with TODO for flate2)
- [x] `src-tauri/src/services/sandbox_service.rs` — SandboxServiceState, validate_command, is_path_restricted + 7 unit tests
- [x] `src-tauri/src/services/credential_service.rs` — CredentialServiceState, list, set, get, delete + 7 unit tests (stub with TODO for keyring crate)

### モジュール登録

- [x] `src-tauri/src/commands/mod.rs` — guardrails, credentials 追加
- [x] `src-tauri/src/services/mod.rs` — cost_tracker_service, log_rotation_service, sandbox_service, credential_service 追加
- [x] `src-tauri/src/models/mod.rs` — cost 追加
- [x] `src-tauri/src/lib.rs` — 4 state (.manage) + 11 commands (invoke_handler) 登録

### フロントエンド

- [x] `src/stores/cost-store.ts` — Zustand store (cost, budget, credential, sandbox, log rotation)
- [x] `src/features/guardrails/components/CostDisplay.tsx` — コスト表示・期間切替・エージェント別内訳・CSS棒グラフ
- [x] `src/features/guardrails/components/BudgetBar.tsx` — 予算進捗バー (green/yellow/red)
- [x] `src/features/guardrails/components/CredentialManager.tsx` — 認証情報管理 (一覧・追加・削除)
- [x] `src/features/guardrails/components/CostStatusBadge.tsx` — StatusBar "$X.XX / $Y.YY" badge
- [x] `src/features/guardrails/index.ts` — barrel export
- [x] `src/types/cost.ts` — TS types updated to match Rust backend (CostSummary, CostPeriod)

### 検証

- [x] `cargo check` — Rust compiles clean (no errors, no warnings from Unit 9 code)
- [x] `cargo test` — 121 tests pass (22 new Unit 9 tests: 8 cost_tracker + 7 credential + 7 sandbox)
- [x] `npx tsc --noEmit` — TypeScript compiles clean

---

## 依存関係

- **強依存**: Unit 1（IPC 基盤） -- 完了
- **弱依存**: Unit 7（エージェント停止連携） -- 完了

## ブロッカー

なし（全依存関係解決済み）

## 残作業 (TODO)

- `credential_service.rs`: keyring crate 統合 (OS-level secure storage)
- `log_rotation_service.rs`: flate2 crate 統合 (ログ圧縮)、実ファイルI/O
- `cost_tracker_service.rs`: ディスク永続化 (現在はインメモリのみ)
