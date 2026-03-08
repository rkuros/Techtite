# Techtite 共有データモデル・型定義

> **ステータス**: 確定
> **最終更新**: 2026-02-28
> **参照**: `tech_stack.md`、`project_structure.md`

---

## 設計方針

- Rust struct と TypeScript 型は **1:1 対応** を原則とする
- IPC 通信では `serde_json` / JSON でシリアライズし、フロントエンドで TypeScript 型にマッピング
- 型名は Rust / TypeScript で **同一名** を使用する
- `Option<T>` (Rust) → `T | null` (TypeScript) で対応
- `Vec<T>` (Rust) → `T[]` (TypeScript) で対応
- タイムスタンプは **ISO 8601 文字列**（`chrono::DateTime<Utc>` → `string`）で統一
- ID は **文字列**（UUID v4）で統一

---

## 1. コアデータモデル

### 1.1 Vault

```rust
// Rust (src-tauri/src/models/vault.rs)
pub struct Vault {
    pub id: String,                    // UUID
    pub path: PathBuf,                 // Vault ルートパス
    pub name: String,                  // 表示名（フォルダ名から自動取得）
    pub is_git_repo: bool,             // Git リポジトリかどうか
    pub config: VaultConfig,
}

pub struct VaultConfig {
    pub session_log_dir: String,       // セッションログ保存先（相対パス）
    pub rag_enabled: bool,             // RAG 機能の有効/無効
    pub auto_sync_enabled: bool,       // 自動同期の有効/無効
    pub auto_sync_interval_sec: u64,   // 自動同期間隔（デフォルト: 300）
    pub log_granularity: LogGranularity, // ログ粒度
}

pub enum LogGranularity {
    Detailed,   // 全操作記録
    Standard,   // 主要操作 + 判断
    Compact,    // マイルストーンのみ
}
```

```typescript
// TypeScript (src/types/vault.ts)
interface Vault {
  id: string;
  path: string;
  name: string;
  isGitRepo: boolean;
  config: VaultConfig;
}

interface VaultConfig {
  sessionLogDir: string;
  ragEnabled: boolean;
  autoSyncEnabled: boolean;
  autoSyncIntervalSec: number;
  logGranularity: LogGranularity;
}

type LogGranularity = "detailed" | "standard" | "compact";
```

### 1.2 FileEntry / FileMetadata

```rust
// Rust (src-tauri/src/models/file.rs)
pub struct FileEntry {
    pub path: String,                  // Vault ルートからの相対パス
    pub name: String,                  // ファイル名
    pub is_dir: bool,
    pub children: Option<Vec<FileEntry>>, // ディレクトリの場合の子要素
}

pub struct FileMetadata {
    pub path: String,
    pub size_bytes: u64,
    pub modified_at: String,           // ISO 8601
    pub created_at: String,            // ISO 8601
    pub file_type: FileType,
    pub frontmatter: Option<Frontmatter>,
    pub tags: Vec<String>,
    pub outgoing_links: Vec<String>,   // この ファイルからの内部リンク先
    pub git_status: Option<GitFileStatus>,
}

pub enum FileType {
    Markdown,
    Code { language: String },
    Image,
    Binary,
    Other,
}

pub enum GitFileStatus {
    Unmodified,
    Modified,
    Added,
    Deleted,
    Renamed,
    Untracked,
    Conflicted,
}
```

```typescript
// TypeScript (src/types/file.ts)
interface FileEntry {
  path: string;
  name: string;
  isDir: boolean;
  children?: FileEntry[];
}

interface FileMetadata {
  path: string;
  sizeBytes: number;
  modifiedAt: string;
  createdAt: string;
  fileType: FileType;
  frontmatter: Frontmatter | null;
  tags: string[];
  outgoingLinks: string[];
  gitStatus: GitFileStatus | null;
}

type FileType =
  | { type: "markdown" }
  | { type: "code"; language: string }
  | { type: "image" }
  | { type: "binary" }
  | { type: "other" };

type GitFileStatus =
  | "unmodified" | "modified" | "added" | "deleted"
  | "renamed" | "untracked" | "conflicted";
```

### 1.3 Note / Frontmatter / Link / Tag

```rust
// Rust (src-tauri/src/models/note.rs)
pub struct Frontmatter {
    pub title: Option<String>,
    pub tags: Vec<String>,
    pub date: Option<String>,          // ISO 8601 日付
    pub aliases: Vec<String>,
    pub extra: HashMap<String, serde_json::Value>, // 任意のフィールド
}

pub struct InternalLink {
    pub target_path: String,           // リンク先ファイルパス
    pub display_text: Option<String>,  // 表示テキスト（ある場合）
    pub line_number: u32,              // リンクが存在する行番号
    pub exists: bool,                  // リンク先ファイルが存在するか
}

pub struct BacklinkEntry {
    pub source_path: String,           // リンク元ファイルパス
    pub line_number: u32,
    pub context: String,               // リンク周辺のテキスト
}

pub struct TagInfo {
    pub name: String,                  // タグ名（"#" なし）
    pub file_count: u32,               // このタグを持つファイル数
    pub files: Vec<String>,            // ファイルパス一覧
}
```

```typescript
// TypeScript (src/types/note.ts)
interface Frontmatter {
  title: string | null;
  tags: string[];
  date: string | null;
  aliases: string[];
  extra: Record<string, unknown>;
}

interface InternalLink {
  targetPath: string;
  displayText: string | null;
  lineNumber: number;
  exists: boolean;
}

interface BacklinkEntry {
  sourcePath: string;
  lineNumber: number;
  context: string;
}

interface TagInfo {
  name: string;
  fileCount: number;
  files: string[];
}
```

---

## 2. エディタ・UI 状態モデル

### 2.1 EditorState / TabState / PaneLayout

```rust
// Rust (src-tauri/src/models/editor.rs) — ウィンドウ状態保存用
pub struct WindowState {
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
    pub maximized: bool,
    pub pane_layout: PaneLayout,
    pub open_tabs: Vec<TabState>,
    pub sidebar_width: u32,
    pub terminal_height: u32,
    pub active_sidebar_panel: String,
}

pub struct PaneLayout {
    pub direction: SplitDirection,
    pub sizes: Vec<f64>,              // 各ペインの比率
    pub children: Vec<PaneNode>,
}

pub enum PaneNode {
    Leaf { tab_group_id: String },
    Split(PaneLayout),
}

pub enum SplitDirection {
    Horizontal,
    Vertical,
}

pub struct TabState {
    pub id: String,
    pub file_path: String,
    pub is_dirty: bool,               // 未保存の変更あり
    pub scroll_position: u32,
    pub cursor_line: u32,
    pub cursor_column: u32,
    pub view_mode: ViewMode,
}

pub enum ViewMode {
    LivePreview,
    Source,
    ReadOnly,
}
```

```typescript
// TypeScript (src/types/editor.ts)
interface WindowState {
  width: number;
  height: number;
  x: number;
  y: number;
  maximized: boolean;
  paneLayout: PaneLayout;
  openTabs: TabState[];
  sidebarWidth: number;
  terminalHeight: number;
  activeSidebarPanel: string;
}

interface PaneLayout {
  direction: "horizontal" | "vertical";
  sizes: number[];
  children: PaneNode[];
}

type PaneNode =
  | { type: "leaf"; tabGroupId: string }
  | { type: "split"; layout: PaneLayout };

interface TabState {
  id: string;
  filePath: string;
  isDirty: boolean;
  scrollPosition: number;
  cursorLine: number;
  cursorColumn: number;
  viewMode: "livePreview" | "source" | "readOnly";
}
```

---

## 3. 検索モデル

### 3.1 SearchQuery / SearchResult

```rust
// Rust (src-tauri/src/models/search.rs)

// キーワード検索
pub struct KeywordSearchQuery {
    pub query: String,
    pub max_results: u32,              // デフォルト: 50
}

pub struct KeywordSearchResult {
    pub file_path: String,
    pub line_number: u32,
    pub context: String,               // マッチ周辺テキスト
    pub highlight_ranges: Vec<(u32, u32)>, // マッチ箇所の文字位置
}

// セマンティック検索
pub struct SemanticSearchQuery {
    pub query: String,
    pub top_k: u32,                    // デフォルト: 10
    pub min_score: f32,                // 最低類似度（デフォルト: 0.5）
}

pub struct SemanticSearchResult {
    pub file_path: String,
    pub section_heading: Option<String>,
    pub chunk_text: String,            // マッチしたチャンクのテキスト
    pub score: f32,                    // 類似度スコア（0.0〜1.0）
}

// ハイブリッド検索
pub struct HybridSearchQuery {
    pub query: String,
    pub top_k: u32,
    pub keyword_weight: f32,           // キーワード検索の重み（デフォルト: 0.3）
    pub semantic_weight: f32,          // セマンティック検索の重み（デフォルト: 0.7）
}

pub struct HybridSearchResult {
    pub file_path: String,
    pub section_heading: Option<String>,
    pub context: String,
    pub keyword_score: Option<f32>,
    pub semantic_score: Option<f32>,
    pub combined_score: f32,
}
```

```typescript
// TypeScript (src/types/search.ts)
interface KeywordSearchQuery {
  query: string;
  maxResults?: number;
}

interface KeywordSearchResult {
  filePath: string;
  lineNumber: number;
  context: string;
  highlightRanges: [number, number][];
}

interface SemanticSearchQuery {
  query: string;
  topK?: number;
  minScore?: number;
}

interface SemanticSearchResult {
  filePath: string;
  sectionHeading: string | null;
  chunkText: string;
  score: number;
}

interface HybridSearchQuery {
  query: string;
  topK?: number;
  keywordWeight?: number;
  semanticWeight?: number;
}

interface HybridSearchResult {
  filePath: string;
  sectionHeading: string | null;
  context: string;
  keywordScore: number | null;
  semanticScore: number | null;
  combinedScore: number;
}
```

---

## 4. Git モデル

```rust
// Rust (src-tauri/src/models/git.rs)
pub struct GitStatus {
    pub branch: String,
    pub is_clean: bool,
    pub staged: Vec<FileChange>,
    pub unstaged: Vec<FileChange>,
    pub untracked: Vec<String>,
}

pub struct FileChange {
    pub path: String,
    pub status: GitFileStatus,
}

pub struct CommitInfo {
    pub hash: String,
    pub message: String,
    pub author: String,
    pub timestamp: String,             // ISO 8601
    pub is_auto_commit: bool,          // 自動コミットフラグ
    pub changed_files: Vec<String>,
}

pub struct DiffHunk {
    pub file_path: String,
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub lines: Vec<DiffLine>,
}

pub struct DiffLine {
    pub line_type: DiffLineType,
    pub content: String,
}

pub enum DiffLineType {
    Context,
    Addition,
    Deletion,
}

pub struct BranchInfo {
    pub name: String,
    pub is_current: bool,
    pub upstream: Option<String>,
    pub ahead: u32,
    pub behind: u32,
}

pub struct ConflictInfo {
    pub file_path: String,
    pub conflict_type: ConflictType,
    pub local_content: String,
    pub remote_content: String,
    pub base_content: Option<String>,
}

pub enum ConflictType {
    Content,
    BothModified,
    DeletedByUs,
    DeletedByThem,
    BothAdded,
}

pub struct SyncState {
    pub status: SyncStatus,
    pub last_sync_at: Option<String>,  // ISO 8601
    pub error_message: Option<String>,
}

pub enum SyncStatus {
    Idle,
    Syncing,
    Completed,
    Error,
}
```

```typescript
// TypeScript (src/types/git.ts)
interface GitStatus {
  branch: string;
  isClean: boolean;
  staged: FileChange[];
  unstaged: FileChange[];
  untracked: string[];
}

interface FileChange {
  path: string;
  status: GitFileStatus;
}

interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  timestamp: string;
  isAutoCommit: boolean;
  changedFiles: string[];
}

interface DiffHunk {
  filePath: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

interface DiffLine {
  lineType: "context" | "addition" | "deletion";
  content: string;
}

interface BranchInfo {
  name: string;
  isCurrent: boolean;
  upstream: string | null;
  ahead: number;
  behind: number;
}

interface ConflictInfo {
  filePath: string;
  conflictType: "content" | "both_modified" | "deleted_by_us" | "deleted_by_them" | "both_added";
  localContent: string;
  remoteContent: string;
  baseContent: string | null;
}

interface SyncState {
  status: "idle" | "syncing" | "completed" | "error";
  lastSyncAt: string | null;
  errorMessage: string | null;
}
```

---

## 5. エージェントモデル

```rust
// Rust (src-tauri/src/models/agent.rs)
pub struct AgentInfo {
    pub id: String,                    // UUID
    pub name: String,                  // 表示名（ユーザー設定）
    pub agent_type: AgentType,
    pub status: AgentStatus,
    pub started_at: String,            // ISO 8601
    pub current_task: Option<String>,  // 現在の作業内容サマリー
    pub terminal_tab_id: Option<String>,
    pub pid: Option<u32>,              // プロセス ID
}

pub enum AgentType {
    Worker,                            // 作業エージェント
    Ambient,                           // アンビエントエージェント
}

pub enum AgentStatus {
    Running,
    Idle,
    Completed,
    Error { message: String },
    Stopped,
}

pub struct AgentConfig {
    pub name: String,
    pub initial_prompt: Option<String>, // 起動時のコンテキスト・指示
    pub working_directory: Option<String>,
    pub mode: AgentMode,
}

pub enum AgentMode {
    Cli,                               // CLI モード（ターミナル表示）
    Sdk,                               // SDK モード（プログラム的制御）
}
```

```typescript
// TypeScript (src/types/agent.ts)
interface AgentInfo {
  id: string;
  name: string;
  agentType: "worker" | "ambient";
  status: AgentStatus;
  startedAt: string;
  currentTask: string | null;
  terminalTabId: string | null;
  pid: number | null;
}

type AgentStatus =
  | { type: "running" }
  | { type: "idle" }
  | { type: "completed" }
  | { type: "error"; message: string }
  | { type: "stopped" };

interface AgentConfig {
  name: string;
  initialPrompt?: string;
  workingDirectory?: string;
  mode: "cli" | "sdk";
}
```

---

## 6. セッションログ・キャプチャモデル

```rust
// Rust (src-tauri/src/models/session_log.rs)
pub struct SessionLog {
    pub id: String,
    pub agent_id: String,
    pub agent_name: String,
    pub date: String,                  // YYYY-MM-DD
    pub session_number: u32,           // その日の何番目のセッションか
    pub started_at: String,
    pub ended_at: Option<String>,
    pub file_path: String,             // ログファイルのパス
    pub summary: Option<String>,       // セッション要約
    pub changed_files: Vec<String>,
    pub commits: Vec<String>,          // コミットハッシュ
}

pub struct DailyLog {
    pub date: String,                  // YYYY-MM-DD
    pub file_path: String,
    pub sessions: Vec<SessionLogSummary>,
    pub total_files_changed: u32,
    pub total_commits: u32,
}

pub struct SessionLogSummary {
    pub session_id: String,
    pub agent_name: String,
    pub summary: String,
}
```

```rust
// Rust (src-tauri/src/models/capture.rs)
pub struct CaptureEvent {
    pub id: String,
    pub timestamp: String,
    pub event_type: CaptureEventType,
    pub agent_id: Option<String>,      // 特定エージェントに帰属する場合
    pub data: serde_json::Value,       // イベント固有データ
}

pub enum CaptureEventType {
    FileCreated { path: String },
    FileModified { path: String },
    FileDeleted { path: String },
    FileRenamed { old_path: String, new_path: String },
    GitCommit { hash: String, message: String },
    GitPush { branch: String },
    GitPull { branch: String },
    TerminalCommand { command: String, exit_code: Option<i32> },
    TerminalOutput { content: String },
}
```

```typescript
// TypeScript (src/types/log.ts)
interface SessionLog {
  id: string;
  agentId: string;
  agentName: string;
  date: string;
  sessionNumber: number;
  startedAt: string;
  endedAt: string | null;
  filePath: string;
  summary: string | null;
  changedFiles: string[];
  commits: string[];
}

interface DailyLog {
  date: string;
  filePath: string;
  sessions: SessionLogSummary[];
  totalFilesChanged: number;
  totalCommits: number;
}

interface SessionLogSummary {
  sessionId: string;
  agentName: string;
  summary: string;
}

interface CaptureEvent {
  id: string;
  timestamp: string;
  eventType: CaptureEventType;
  agentId: string | null;
  data: Record<string, unknown>;
}

type CaptureEventType =
  | { type: "file_created"; path: string }
  | { type: "file_modified"; path: string }
  | { type: "file_deleted"; path: string }
  | { type: "file_renamed"; oldPath: string; newPath: string }
  | { type: "git_commit"; hash: string; message: string }
  | { type: "git_push"; branch: string }
  | { type: "git_pull"; branch: string }
  | { type: "terminal_command"; command: string; exitCode: number | null }
  | { type: "terminal_output"; content: string };
```

---

## 7. コスト・ガードレールモデル

```rust
// Rust (src-tauri/src/models/cost.rs)
pub struct CostRecord {
    pub agent_id: String,
    pub agent_name: String,
    pub agent_category: AgentCategory,
    pub timestamp: String,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub estimated_cost_usd: f64,
}

pub enum AgentCategory {
    Worker,
    Ambient,
    Rag,
}

pub struct CostSummary {
    pub period: CostPeriod,
    pub total_tokens: u64,
    pub total_cost_usd: f64,
    pub by_agent: Vec<AgentCostBreakdown>,
    pub by_category: Vec<CategoryCostBreakdown>,
}

pub enum CostPeriod {
    Daily { date: String },
    Monthly { year: u32, month: u32 },
}

pub struct AgentCostBreakdown {
    pub agent_id: String,
    pub agent_name: String,
    pub tokens: u64,
    pub cost_usd: f64,
}

pub struct CategoryCostBreakdown {
    pub category: AgentCategory,
    pub tokens: u64,
    pub cost_usd: f64,
}

pub struct BudgetConfig {
    pub daily_limit_usd: Option<f64>,
    pub monthly_limit_usd: Option<f64>,
    pub warning_threshold: f64,        // 0.0〜1.0（デフォルト: 0.8）
}
```

```typescript
// TypeScript (src/types/cost.ts)
interface CostRecord {
  agentId: string;
  agentName: string;
  agentCategory: "worker" | "ambient" | "rag";
  timestamp: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

interface CostSummary {
  period: CostPeriod;
  totalTokens: number;
  totalCostUsd: number;
  byAgent: AgentCostBreakdown[];
  byCategory: CategoryCostBreakdown[];
}

type CostPeriod =
  | { type: "daily"; date: string }
  | { type: "monthly"; year: number; month: number };

interface AgentCostBreakdown {
  agentId: string;
  agentName: string;
  tokens: number;
  costUsd: number;
}

interface CategoryCostBreakdown {
  category: "worker" | "ambient" | "rag";
  tokens: number;
  costUsd: number;
}

interface BudgetConfig {
  dailyLimitUsd: number | null;
  monthlyLimitUsd: number | null;
  warningThreshold: number;
}
```

---

## 8. コンテンツ公開モデル

```rust
// Rust (src-tauri/src/models/publish.rs)
pub struct PublishTarget {
    pub platform: Platform,
    pub status: PublishStatus,
    pub source_path: String,           // 元のマークダウンファイル
    pub published_url: Option<String>,
    pub published_at: Option<String>,
}

pub enum Platform {
    Zenn,
    Note,
    X,
    Threads,
}

pub enum PublishStatus {
    Draft,
    ReadyForReview,
    Reviewed,
    Published,
    Error { message: String },
}

pub struct BlogDraft {
    pub title: String,
    pub content: String,               // 変換済みマークダウン
    pub source_session_logs: Vec<String>, // 元のセッションログパス
    pub status: PublishStatus,
    pub platform_metadata: Option<PlatformMetadata>,
}

pub enum PlatformMetadata {
    Zenn {
        emoji: String,
        article_type: String,          // "tech" or "idea"
        topics: Vec<String>,
    },
    Note {
        // Note 固有メタデータ
    },
}

pub struct SNSPost {
    pub content: String,               // 投稿テキスト
    pub platform: Platform,
    pub source_paths: Vec<String>,     // 元のノート/ログパス
    pub character_count: u32,
    pub status: PublishStatus,
}

pub struct PostTemplate {
    pub platform: Platform,
    pub template: String,              // テンプレートテキスト（変数含む）
    pub variables: Vec<TemplateVariable>,
}

pub struct TemplateVariable {
    pub name: String,                  // 例: "hashtags", "blog_url"
    pub description: String,
    pub default_value: Option<String>,
}
```

```typescript
// TypeScript (src/types/publish.ts)
interface PublishTarget {
  platform: "zenn" | "note" | "x" | "threads";
  status: PublishStatus;
  sourcePath: string;
  publishedUrl: string | null;
  publishedAt: string | null;
}

type PublishStatus =
  | "draft" | "readyForReview" | "reviewed" | "published"
  | { type: "error"; message: string };

interface BlogDraft {
  title: string;
  content: string;
  sourceSessionLogs: string[];
  status: PublishStatus;
  platformMetadata: PlatformMetadata | null;
}

type PlatformMetadata =
  | { platform: "zenn"; emoji: string; articleType: string; topics: string[] }
  | { platform: "note" };

interface SNSPost {
  content: string;
  platform: "x" | "threads";
  sourcePaths: string[];
  characterCount: number;
  status: PublishStatus;
}

interface PostTemplate {
  platform: "zenn" | "note" | "x" | "threads";
  template: string;
  variables: TemplateVariable[];
}

interface TemplateVariable {
  name: string;
  description: string;
  defaultValue: string | null;
}
```

---

## 9. 命名規約対応表

| Rust | TypeScript | 例 |
|------|-----------|-----|
| `snake_case` フィールド | `camelCase` プロパティ | `file_path` → `filePath` |
| `PascalCase` enum variant | リテラル型 union | `SyncStatus::Syncing` → `"syncing"` |
| データ持ち enum | tagged union | `ConflictType::BothModified` → `{ type: "both_modified" }` |
| `Option<T>` | `T \| null` | `Option<String>` → `string \| null` |
| `Vec<T>` | `T[]` | `Vec<String>` → `string[]` |
| `HashMap<K, V>` | `Record<K, V>` | `HashMap<String, Value>` → `Record<string, unknown>` |
| `PathBuf` | `string` | フロントエンドではパスは文字列 |

### serde による自動変換

Rust 側では以下の serde アトリビュートを標準適用する:

```rust
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]    // snake_case → camelCase 自動変換
pub struct Example {
    pub file_path: String,            // JSON では "filePath"
}

#[derive(Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")] // tagged union
pub enum ExampleEnum {
    VariantA { value: String },       // JSON: { "type": "variant_a", "value": "..." }
}
```
