# Techtite IPC コマンドレジストリ・イベントプロトコル

> **ステータス**: 確定
> **最終更新**: 2026-02-28
> **参照**: `shared_data_models.md`（データモデル）、`project_structure.md`（ファイル構造）

---

## 設計方針

- Tauri 2.x の IPC 機構を使用
- **コマンド（Command）**: フロントエンド → Rust。`#[tauri::command]` で定義。リクエスト/レスポンス型
- **イベント（Event）**: Rust → フロントエンド。`app.emit()` で発火。プッシュ型通知
- 命名規約: `<namespace>:<action>`（例: `fs:read_file`, `git:get_status`）
- すべてのコマンドは `Result<T, String>` を返却（エラーはメッセージ文字列）
- イベントペイロードは JSON シリアライズ

---

## 1. IPC コマンドレジストリ

### 1.1 ファイルシステム（Unit 1）

| コマンド名 | 入力 | 出力 | 説明 |
|-----------|------|------|------|
| `fs:read_file` | `{ path: string }` | `string` | ファイル内容（UTF-8）を読み取り |
| `fs:write_file` | `{ path: string, content: string }` | `void` | ファイル書き込み |
| `fs:create_file` | `{ path: string, content?: string }` | `void` | 新規ファイル作成 |
| `fs:create_dir` | `{ path: string }` | `void` | ディレクトリ作成 |
| `fs:delete` | `{ path: string }` | `void` | ファイル/ディレクトリ削除 |
| `fs:rename` | `{ oldPath: string, newPath: string }` | `void` | リネーム/移動 |
| `fs:exists` | `{ path: string }` | `boolean` | 存在確認 |

### 1.2 Vault 管理（Unit 1）

| コマンド名 | 入力 | 出力 | 説明 |
|-----------|------|------|------|
| `vault:open` | `{ path: string }` | `Vault` | Vault を開く |
| `vault:get_current` | — | `Vault \| null` | 現在の Vault 取得 |
| `vault:select_folder` | — | `string \| null` | フォルダ選択ダイアログ |
| `vault:get_config` | — | `VaultConfig` | Vault 設定取得 |
| `vault:update_config` | `VaultConfig` | `void` | Vault 設定更新 |

### 1.3 ウィンドウ状態（Unit 1）

| コマンド名 | 入力 | 出力 | 説明 |
|-----------|------|------|------|
| `window:save_state` | `WindowState` | `void` | ウィンドウ状態保存 |
| `window:load_state` | — | `WindowState \| null` | ウィンドウ状態復元 |

### 1.4 ファイルツリー（Unit 3）

| コマンド名 | 入力 | 出力 | 説明 |
|-----------|------|------|------|
| `file_tree:get_tree` | `{ includeIgnored?: boolean }` | `FileEntry` | ファイルツリー取得 |
| `file_tree:get_metadata` | `{ path: string }` | `FileMetadata` | ファイルメタデータ取得 |

### 1.5 ナレッジベース（Unit 4）

| コマンド名 | 入力 | 出力 | 説明 |
|-----------|------|------|------|
| `knowledge:get_outgoing_links` | `{ path: string }` | `InternalLink[]` | 内部リンク一覧 |
| `knowledge:get_backlinks` | `{ path: string }` | `BacklinkEntry[]` | バックリンク一覧 |
| `knowledge:get_all_tags` | — | `TagInfo[]` | 全タグ一覧 |
| `knowledge:get_files_by_tag` | `{ tag: string }` | `string[]` | タグでファイル検索 |
| `knowledge:get_graph_data` | `{ filter?: GraphFilter }` | `GraphData` | Graph View データ |
| `knowledge:get_local_graph` | `{ path: string, depth?: number }` | `GraphData` | ローカルグラフ |
| `knowledge:search_keyword` | `KeywordSearchQuery` | `KeywordSearchResult[]` | キーワード全文検索 |
| `knowledge:get_unlinked_mentions` | `{ path: string }` | `BacklinkEntry[]` | 未リンク言及検出 |

**補助型:**

```typescript
interface GraphFilter {
  tags?: string[];
  folders?: string[];
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface GraphNode {
  id: string;        // ファイルパス
  label: string;     // ファイル名
  tags: string[];
  folder: string;
}

interface GraphEdge {
  source: string;    // ソースファイルパス
  target: string;    // ターゲットファイルパス
}
```

### 1.6 セマンティック検索・RAG（Unit 5）

| コマンド名 | 入力 | 出力 | 説明 |
|-----------|------|------|------|
| `semantic:search` | `SemanticSearchQuery` | `SemanticSearchResult[]` | セマンティック検索 |
| `semantic:hybrid_search` | `HybridSearchQuery` | `HybridSearchResult[]` | ハイブリッド検索 |
| `semantic:get_index_status` | — | `IndexStatus` | インデックス状態取得 |
| `semantic:rebuild_index` | — | `void` | インデックス再構築開始 |
| `semantic:chat` | `{ message: string, sessionId?: string }` | `ChatResponse` | AI チャット |

**補助型:**

```typescript
interface IndexStatus {
  totalFiles: number;
  indexedFiles: number;
  isBuilding: boolean;
  lastUpdatedAt: string | null;
}

interface ChatResponse {
  sessionId: string;
  message: string;
  references: { filePath: string; sectionHeading: string | null; score: number }[];
}
```

### 1.7 Git 操作（Unit 6）

| コマンド名 | 入力 | 出力 | 説明 |
|-----------|------|------|------|
| `git:get_status` | — | `GitStatus` | Git ステータス取得 |
| `git:stage` | `{ paths: string[] }` | `void` | ファイルをステージ |
| `git:unstage` | `{ paths: string[] }` | `void` | ステージ解除 |
| `git:commit` | `{ message: string }` | `string` | コミット作成（ハッシュ返却） |
| `git:get_diff` | `{ path?: string, staged?: boolean }` | `DiffHunk[]` | 差分取得 |
| `git:get_log` | `{ limit?: number, offset?: number }` | `CommitInfo[]` | コミット履歴 |
| `git:get_commit_diff` | `{ hash: string }` | `DiffHunk[]` | 特定コミットの差分 |
| `git:get_branches` | — | `BranchInfo[]` | ブランチ一覧 |
| `git:create_branch` | `{ name: string }` | `void` | ブランチ作成 |
| `git:checkout_branch` | `{ name: string }` | `void` | ブランチ切り替え |

### 1.8 同期（Unit 6）

| コマンド名 | 入力 | 出力 | 説明 |
|-----------|------|------|------|
| `sync:get_state` | — | `SyncState` | 同期状態取得 |
| `sync:trigger_now` | — | `void` | 即時同期実行 |
| `sync:set_remote` | `{ url: string, authType: string, credential: string }` | `void` | リモート設定 |
| `sync:test_connection` | — | `boolean` | 接続テスト |
| `sync:get_conflicts` | — | `ConflictInfo[]` | 競合一覧取得 |
| `sync:resolve_conflict` | `{ path: string, resolution: string }` | `void` | 競合解決 |

`resolution`: `"local"` | `"remote"` | `"merged"` + `{ mergedContent: string }`

### 1.9 ターミナル・エージェント管理（Unit 7）

| コマンド名 | 入力 | 出力 | 説明 |
|-----------|------|------|------|
| `terminal:create` | `{ label?: string }` | `string` | ターミナル作成（ID 返却） |
| `terminal:write` | `{ id: string, data: string }` | `void` | ターミナルに入力送信 |
| `terminal:resize` | `{ id: string, cols: number, rows: number }` | `void` | ターミナルリサイズ |
| `terminal:close` | `{ id: string }` | `void` | ターミナル終了 |
| `agent:list` | — | `AgentInfo[]` | エージェント一覧 |
| `agent:start` | `AgentConfig` | `AgentInfo` | エージェント起動 |
| `agent:stop` | `{ id: string }` | `void` | エージェント停止 |
| `agent:get_operation_log` | `{ agentId?: string, limit?: number }` | `OperationLogEntry[]` | 操作ログ取得 |

**補助型:**

```typescript
interface OperationLogEntry {
  timestamp: string;
  agentId: string;
  agentName: string;
  operation: "create" | "modify" | "delete" | "rename" | "commit";
  targetPath: string;
  summary: string | null;
}
```

### 1.10 システムキャプチャ・セッションログ（Unit 8）

| コマンド名 | 入力 | 出力 | 説明 |
|-----------|------|------|------|
| `capture:get_events` | `{ since?: string, limit?: number, agentId?: string }` | `CaptureEvent[]` | キャプチャイベント取得 |
| `session_log:list` | `{ date?: string, agentName?: string }` | `SessionLog[]` | セッションログ一覧 |
| `session_log:get_daily` | `{ date: string }` | `DailyLog \| null` | デイリーログ取得 |
| `session_log:get_content` | `{ path: string }` | `string` | ログ内容取得（マークダウン） |
| `ambient:get_status` | — | `AmbientStatus` | アンビエントエージェント状態 |
| `ambient:get_check_results` | — | `TaskCheckResult[]` | タスクチェック結果 |

**補助型:**

```typescript
interface AmbientStatus {
  isRunning: boolean;
  lastCheckAt: string | null;
  taskCompletionRate: number;    // 0.0〜1.0
}

interface TaskCheckResult {
  agentId: string;
  agentName: string;
  task: string;
  isCompleted: boolean;
  checkedAt: string;
  message: string | null;
}
```

### 1.11 ガードレール・認証情報（Unit 9）

| コマンド名 | 入力 | 出力 | 説明 |
|-----------|------|------|------|
| `cost:get_summary` | `{ period: CostPeriod }` | `CostSummary` | コストサマリー取得 |
| `cost:get_budget` | — | `BudgetConfig` | 予算設定取得 |
| `cost:set_budget` | `BudgetConfig` | `void` | 予算設定更新 |
| `cost:get_trend` | `{ days: number }` | `DailyCostPoint[]` | コスト推移データ |
| `log_rotation:get_status` | — | `LogStorageStatus` | ログストレージ状態 |
| `log_rotation:set_config` | `LogRotationConfig` | `void` | ローテーション設定 |
| `credential:list` | — | `CredentialEntry[]` | 認証情報一覧 |
| `credential:set` | `{ key: string, value: string, service: string }` | `void` | 認証情報追加/更新 |
| `credential:delete` | `{ key: string }` | `void` | 認証情報削除 |
| `sandbox:get_config` | — | `SandboxConfig` | サンドボックス設定 |
| `sandbox:set_config` | `SandboxConfig` | `void` | サンドボックス設定更新 |

**補助型:**

```typescript
interface DailyCostPoint {
  date: string;
  costUsd: number;
  tokens: number;
}

interface LogStorageStatus {
  totalSizeBytes: number;
  rawLogSizeBytes: number;
  compressedSizeBytes: number;
  retentionDays: number;
}

interface LogRotationConfig {
  retentionDays: number;
  maxSizeBytes: number | null;
  filterRules: FilterRule[];
}

interface FilterRule {
  pattern: string;          // glob パターン
  action: "exclude" | "truncate";
  maxLineCount?: number;     // truncate 時の最大行数
}

interface CredentialEntry {
  key: string;
  service: string;          // "github", "zenn", "x", "threads", "note", "anthropic"
  lastUpdatedAt: string;
}

interface SandboxConfig {
  enabled: boolean;
  allowedCommands: string[];
  blockedCommands: string[];
  restrictedPaths: string[];
}
```

### 1.12 コンテンツ公開（Unit 10）

| コマンド名 | 入力 | 出力 | 説明 |
|-----------|------|------|------|
| `publish:generate_blog_draft` | `{ sessionLogPaths: string[] }` | `BlogDraft` | ブログ下書き生成 |
| `publish:generate_sns_post` | `{ sourcePaths: string[], platform: string }` | `SNSPost` | SNS 投稿文生成 |
| `publish:convert_notation` | `{ content: string, platform: string }` | `string` | 記法変換 |
| `publish:publish_zenn` | `{ draft: BlogDraft }` | `PublishResult` | Zenn 公開 |
| `publish:publish_note` | `{ draft: BlogDraft }` | `PublishResult` | Note 公開 |
| `publish:post_x` | `{ post: SNSPost }` | `PublishResult` | X 投稿 |
| `publish:post_threads` | `{ post: SNSPost }` | `PublishResult` | Threads 投稿 |
| `publish:get_templates` | — | `PostTemplate[]` | テンプレート一覧 |
| `publish:set_template` | `PostTemplate` | `void` | テンプレート保存 |

**補助型:**

```typescript
interface PublishResult {
  success: boolean;
  url: string | null;
  errorMessage: string | null;
}
```

---

## 2. イベントプロトコル（Rust → フロントエンド）

### 2.1 ファイルシステムイベント

| イベント名 | ペイロード | 発火元 | 購読先 | 説明 |
|-----------|----------|--------|--------|------|
| `fs:changed` | `{ path: string, changeType: string }` | Unit 1 (watcher) | Unit 2, 3, 4, 7 | ファイル変更検出 |
| `fs:external_change` | `{ path: string, agentId?: string }` | Unit 1 (watcher) | Unit 2 | 外部プロセスによるファイル変更 |

`changeType`: `"created"` | `"modified"` | `"deleted"` | `"renamed"`

### 2.2 Git・同期イベント

| イベント名 | ペイロード | 発火元 | 購読先 | 説明 |
|-----------|----------|--------|--------|------|
| `git:status_changed` | `GitStatus` | Unit 6 | Unit 6 (UI) | Git ステータス変更 |
| `sync:state_changed` | `SyncState` | Unit 6 | Unit 6 (UI), Unit 1 (StatusBar) | 同期状態変更 |
| `sync:conflict_detected` | `ConflictInfo[]` | Unit 6 | Unit 6 (UI) | 競合検出 |
| `sync:conflict_resolved` | `{ path: string, resolution: string }` | Unit 6 | Unit 6 (UI) | 競合解決完了 |

### 2.3 エージェントイベント

| イベント名 | ペイロード | 発火元 | 購読先 | 説明 |
|-----------|----------|--------|--------|------|
| `agent:status_changed` | `AgentInfo` | Unit 7 | Unit 7 (UI), Unit 1 (StatusBar) | エージェント状態変更 |
| `agent:output` | `{ agentId: string, data: string }` | Unit 7 | Unit 7 (TerminalInstance) | エージェント出力 |
| `agent:operation` | `OperationLogEntry` | Unit 7 | Unit 7 (UI), Unit 8 | エージェント操作発生 |

### 2.4 ターミナルイベント

| イベント名 | ペイロード | 発火元 | 購読先 | 説明 |
|-----------|----------|--------|--------|------|
| `terminal:output` | `{ id: string, data: string }` | Unit 7 | Unit 7 (TerminalInstance) | ターミナル出力データ |
| `terminal:exit` | `{ id: string, exitCode: number }` | Unit 7 | Unit 7 (UI) | ターミナルプロセス終了 |

### 2.5 システムキャプチャ・ログイベント

| イベント名 | ペイロード | 発火元 | 購読先 | 説明 |
|-----------|----------|--------|--------|------|
| `capture:event` | `CaptureEvent` | Unit 8 | Unit 8 (ambient) | キャプチャイベント発生 |
| `session_log:updated` | `{ logId: string }` | Unit 8 | Unit 8 (UI) | セッションログ更新 |
| `ambient:alert` | `{ message: string, severity: string }` | Unit 8 | Unit 7 (Dashboard), Unit 1 (Toast) | アンビエントエージェントアラート |

`severity`: `"info"` | `"warning"` | `"error"`

### 2.6 コスト・ガードレールイベント

| イベント名 | ペイロード | 発火元 | 購読先 | 説明 |
|-----------|----------|--------|--------|------|
| `cost:updated` | `{ totalCostUsd: number, periodUsage: number }` | Unit 9 | Unit 9 (UI), Unit 1 (StatusBar) | コスト更新 |
| `cost:warning` | `{ message: string, usage: number, limit: number }` | Unit 9 | Unit 9 (UI), Unit 1 (Toast) | 予算警告 |
| `cost:limit_reached` | `{ period: string }` | Unit 9 | Unit 7 (agent stop), Unit 1 (Toast) | 予算上限到達 |

### 2.7 セマンティック検索イベント

| イベント名 | ペイロード | 発火元 | 購読先 | 説明 |
|-----------|----------|--------|--------|------|
| `semantic:index_progress` | `IndexStatus` | Unit 5 | Unit 5 (UI), Unit 1 (StatusBar) | インデックス構築進捗 |
| `semantic:index_completed` | `IndexStatus` | Unit 5 | Unit 5 (UI) | インデックス構築完了 |

### 2.8 コンテンツ公開イベント

| イベント名 | ペイロード | 発火元 | 購読先 | 説明 |
|-----------|----------|--------|--------|------|
| `publish:progress` | `{ platform: string, step: string }` | Unit 10 | Unit 10 (UI) | 公開処理進捗 |
| `publish:completed` | `PublishResult` | Unit 10 | Unit 10 (UI), Unit 1 (Toast) | 公開完了 |

---

## 3. イベント購読マトリクス

どのユニットがどのイベントを購読するかの一覧。

| イベント | Unit 1 | Unit 2 | Unit 3 | Unit 4 | Unit 5 | Unit 6 | Unit 7 | Unit 8 | Unit 9 | Unit 10 |
|---------|--------|--------|--------|--------|--------|--------|--------|--------|--------|---------|
| `fs:changed` | — | **購読** | **購読** | **購読** | — | — | **購読** | — | — | — |
| `fs:external_change` | — | **購読** | — | — | — | — | — | — | — | — |
| `git:status_changed` | — | — | — | — | — | **購読** | — | — | — | — |
| `sync:state_changed` | **購読** | — | — | — | — | **購読** | — | — | — | — |
| `sync:conflict_detected` | — | — | — | — | — | **購読** | — | — | — | — |
| `agent:status_changed` | **購読** | — | — | — | — | — | **購読** | — | — | — |
| `agent:output` | — | — | — | — | — | — | **購読** | — | — | — |
| `agent:operation` | — | — | — | — | — | — | **購読** | **購読** | — | — |
| `terminal:output` | — | — | — | — | — | — | **購読** | — | — | — |
| `capture:event` | — | — | — | — | — | — | — | **購読** | — | — |
| `session_log:updated` | — | — | — | — | — | — | — | **購読** | — | — |
| `ambient:alert` | **購読** | — | — | — | — | — | **購読** | — | — | — |
| `cost:updated` | **購読** | — | — | — | — | — | — | — | **購読** | — |
| `cost:warning` | **購読** | — | — | — | — | — | — | — | **購読** | — |
| `cost:limit_reached` | **購読** | — | — | — | — | — | **購読** | — | **購読** | — |
| `semantic:index_progress` | **購読** | — | — | — | **購読** | — | — | — | — | — |
| `publish:completed` | **購読** | — | — | — | — | — | — | — | — | **購読** |

---

## 4. コマンド登録パターン

### Rust 側（main.rs への登録）

```rust
// src-tauri/src/main.rs
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // Unit 1: ファイルシステム・Vault
            commands::fs::read_file,
            commands::fs::write_file,
            commands::fs::create_file,
            // ... 各ユニットのコマンドを追記（追記のみ。既存行は変更しない）
        ])
        .run(tauri::generate_context!())
        .expect("error running Techtite");
}
```

### フロントエンド側（IPC ラッパー）

```typescript
// src/shared/utils/ipc.ts
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// コマンド呼び出しの型安全ラッパー
export async function invokeCommand<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  return invoke<T>(cmd, args);
}

// イベント購読の型安全ラッパー
export function listenEvent<T>(event: string, handler: (payload: T) => void) {
  return listen<T>(event, (e) => handler(e.payload));
}
```

各ユニットは `invokeCommand` / `listenEvent` を通じて IPC 通信を行う。コマンド名とペイロード型は本ドキュメントに準拠する。
