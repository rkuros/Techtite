# Unit 7: ターミナル・エージェントダッシュボード — 進捗

> **担当領域**: ターミナルエミュレータ（xterm.js）、エージェントプロセス管理（PTY）、ダッシュボード
> **ステータス**: 実装完了（スタブ・プレースホルダー含む）

---

## 成果物チェックリスト

### Rust バックエンド

- [x] `src-tauri/src/commands/terminal.rs` — terminal_create, terminal_write, terminal_resize, terminal_close
- [x] `src-tauri/src/commands/agent.rs` — agent_list, agent_start, agent_stop, agent_get_operation_log
- [x] `src-tauri/src/services/process_service.rs` — PTY プロセス管理（スタブ。portable_pty 未導入）
- [x] `src-tauri/src/services/agent_registry.rs` — エージェント状態管理、stream-json パーサー、操作ログ
- [x] `src-tauri/src/models/agent.rs` — AgentInfo, AgentStatus, AgentConfig, AgentType, AgentMode, OperationLogEntry
- [x] `src-tauri/src/commands/mod.rs` — terminal, agent モジュール追加
- [x] `src-tauri/src/services/mod.rs` — process_service, agent_registry モジュール追加
- [x] `src-tauri/src/models/mod.rs` — agent モジュール追加
- [x] `src-tauri/src/lib.rs` — ProcessServiceState, AgentRegistryState を manage に登録、8 コマンドを invoke_handler に登録

### フロントエンド

- [x] `src/features/terminal/components/TerminalPanel.tsx` — ターミナルパネル（右側、タブバー + インスタンス + イベントリスナー + Ctrl+` トグル）
- [x] `src/features/terminal/components/TerminalTab.tsx` — ターミナルタブ（アクティブハイライト、閉じるボタン）
- [x] `src/features/terminal/components/TerminalInstance.tsx` — xterm.js プレースホルダー（コメントに実装指示記載）
- [x] `src/features/terminal/components/AgentsDashboard.tsx` — エージェントダッシュボード（一覧、起動ダイアログ、コスト表示プレースホルダー）
- [x] `src/features/terminal/components/AgentCard.tsx` — エージェントカード（状態ドット、現在タスク、アクションボタン）
- [x] `src/features/terminal/components/AgentCountBadge.tsx` — ステータスバーエージェント数バッジ
- [x] `src/features/terminal/index.ts` — バレルエクスポート
- [x] `src/stores/terminal-store.ts` — ターミナル・エージェント状態（Zustand ストア、IPC アクション、イベントリスナー初期化）

### テスト

- [x] Rust ユニットテスト: 11 テスト全パス（process_service: 4、agent_registry: 7）
- [x] `cargo check` — 警告なしでコンパイル成功
- [x] TypeScript — `tsc --noEmit` エラーなし

---

## 残作業（後続ユニット・依存ライブラリ導入時）

1. **PTY 実装**: `portable_pty` crate を Cargo.toml に追加後、`process_service.rs` の TODO スタブを実装
2. **xterm.js 実装**: `@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-search` を npm install 後、`TerminalInstance.tsx` のコメントに従い実装
3. **Unit 8 統合**: `AmbientManagerCard` を AgentsDashboard にインポート
4. **Unit 9 統合**: `cost:updated` イベント購読で AgentCard にトークン数・コスト表示
5. **AppLayout 統合**: `TerminalPanel` と `AgentsDashboard` を AppLayout の実際のスロットに接続

---

## 依存関係

- **強依存**: Unit 1（IPC 基盤） — 解決済み
- **弱依存**: Unit 8（AmbientManagerCard）、Unit 9（cost:updated イベント）

## ブロッカー

なし（全ファイル実装完了）
