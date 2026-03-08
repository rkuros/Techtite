# Unit 6: Git 統合・透過的同期 — 進捗

> **担当領域**: Git 操作（git2）、自動同期、競合検出・解決
> **ステータス**: スタブ実装完了（git2 依存待ち）

---

## 成果物チェックリスト

### Rust バックエンド

- [x] `src-tauri/src/models/git.rs` — GitStatus, FileChange, GitFileStatus, CommitInfo, DiffHunk, DiffLine, DiffLineType, BranchInfo, ConflictInfo, ConflictType, SyncState, SyncStatus, ConflictResolution
- [x] `src-tauri/src/services/git_service.rs` — git2 操作スタブ（is_git_repo, get_status, stage, stage_all, unstage, create_commit, get_diff, get_commit_diff, get_log, get_branches, create_branch, checkout_branch, push, pull, set_remote_url, test_remote_connection）
- [x] `src-tauri/src/services/sync_service.rs` — SyncScheduler（start, stop, sync_cycle, trigger_now, get_state, reset_batch_timer）、generate_auto_commit_message
- [x] `src-tauri/src/services/conflict_service.rs` — detect_conflicts, get_unresolved_conflicts, resolve_conflict, ai_resolve_conflict（スタブ）、is_binary_conflict
- [x] `src-tauri/src/commands/git.rs` — get_status, stage, unstage, commit, get_diff, get_log, get_commit_diff, get_branches, create_branch, checkout_branch
- [x] `src-tauri/src/commands/sync.rs` — get_state, trigger_now, set_remote, test_connection, get_conflicts, resolve_conflict

### フロントエンド

- [x] `src/features/git/components/GitPanel.tsx` — Git サイドバーパネル（CHANGES セクション、ステージ/アンステージ操作、ファイル一覧）
- [x] `src/features/git/components/DiffView.tsx` — 差分表示（追加行緑・削除行赤・コンテキスト行、行番号表示）
- [x] `src/features/git/components/CommitHistory.tsx` — コミット履歴リスト（ハッシュ・メッセージ・相対時刻、autoラベル）
- [x] `src/features/git/components/CommitForm.tsx` — コミットメッセージ入力（Ctrl+Enter でコミット）
- [x] `src/features/git/components/SyncStatus.tsx` — ステータスバー同期状態（ブランチ名・同期アイコン・ポップオーバー・Sync Now ボタン）
- [x] `src/features/git/components/ConflictModal.tsx` — 競合解決モーダル（Keep Local / Keep Remote / Ask AI）
- [x] `src/features/git/index.ts` — バレルエクスポート
- [x] `src/stores/git-store.ts` — Zustand ストア（状態・アクション・イベント購読）

### 共有ファイル変更

- [x] `src-tauri/src/commands/mod.rs` — git, sync モジュール追加
- [x] `src-tauri/src/services/mod.rs` — git_service, sync_service, conflict_service モジュール追加
- [x] `src-tauri/src/models/mod.rs` — git モジュール追加
- [x] `src-tauri/src/lib.rs` — 16 個の Unit 6 コマンドを invoke_handler に登録

### ビルド検証

- [x] `cargo check` — コンパイルエラーなし
- [x] `tsc --noEmit` — TypeScript エラーなし

---

## 実装詳細

### スタブ方針

git2 crate が Cargo.toml に追加されていないため、全 git_service 関数はスタブ実装:
- `is_git_repo()`: `.git` ディレクトリの存在チェック（実動作）
- `get_status()`: デフォルト空ステータスを返却
- `stage() / unstage()`: no-op
- `create_commit()`: UUID ベースのフェイクハッシュを返却
- `get_diff() / get_commit_diff()`: 空の DiffHunk リストを返却
- `get_log()`: 空の CommitInfo リストを返却
- `get_branches()`: "main" ブランチのみを返却
- `push() / pull()`: no-op（PullResult: 競合なし）

各関数に `// TODO: Replace with real git2 implementation` コメントと、実装時のコードスケッチを記載。

### TODO（弱依存）

- **Unit 7（エージェント）**: コミットメッセージ AI 生成、AI 競合解決（`ai_resolve_conflict`）
- **Unit 9（認証情報）**: git2 RemoteCallbacks の認証情報取得（`credential_service` 経由）

---

## 依存関係

- **強依存**: Unit 1（IPC 基盤）-- 完了
- **弱依存**: Unit 7（AI 稼働確認 → TODO コメントで対応）、Unit 9（認証情報 → TODO コメントで対応）

## 次のステップ

1. `git2` crate を Cargo.toml に追加
2. git_service.rs のスタブを実 git2 実装に置換
3. sync_service.rs の sync_cycle を実装（git_service 呼び出し + イベント発火）
4. conflict_service.rs の detect_conflicts を実 git2 index.conflicts() に置換
5. AppState に SyncScheduler を追加し、Vault open 時に start()
6. コマンドハンドラから git:status_changed / sync:conflict_detected イベントを発火
