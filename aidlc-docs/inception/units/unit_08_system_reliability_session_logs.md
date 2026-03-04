# Unit 8: システム信頼性・アンビエントエージェント・セッションログ

> **対応 Epic**: Epic 6 — AIエージェント管理・ターミナル（システム信頼性部分）+ Epic 7 — エージェントセッションログ
> **対応ストーリー**: US-6.10〜US-6.12, US-7.1〜US-7.5

---

## ユーザーストーリーと受け入れ基準

### システム信頼性・アンビエントエージェント（Epic 6）

#### US-6.10 [Must] システムレベル操作キャプチャ（エージェント非依存）

個人開発者として、すべてのファイル操作・Git操作・コマンド実行がエージェントに依存せずシステムレベルで自動記録されてほしい。なぜなら、エージェントが記録を忘れてもデータが失われないことを保証したいからだ。

- [ ] ファイルシステムWatcherにより、Vault内のすべてのファイル操作（作成・編集・削除・移動）がリアルタイムで自動記録される
- [ ] Git操作（commit, push, pull, merge, branch）がフック経由で自動記録される
- [ ] ターミナルで実行されたコマンドとその出力が自動記録される
- [ ] 記録はエージェントの動作に一切依存しない（システムプロセスとして常時稼働）
- [ ] 記録データは構造化フォーマット（JSON/SQLite）で保存され、後続処理の素材となる
- [ ] 生ログはローカル専用ストレージに保存され、Git同期対象から除外される（自動で.gitignoreに追加）
- [ ] ログ内の秘匿情報（APIキー、パスワード、トークン等）がパターンマッチで自動マスキングされる（正規表現ベース、既知のAPIキー形式・URL埋め込みトークン等を即座に検出）
- [ ] （Phase 2）ローカルLLMによるコンテキスト解析で未知の秘匿情報を検出・マスキングする。**生ログは外部LLM/外部サービスに一切送信しない（オンデバイス限定）**
- [ ] マスキング対象パターンをカスタム定義できる（正規表現ルール）
- [ ] 生ログの閲覧には明示的な確認操作が必要（ワンクリックで秘匿情報が見えない設計）

#### US-6.11 [Must] アンビエントエージェント（監視・検証・是正）

個人開発者として、アンビエントエージェント（マネージャー）が全作業エージェントを監視し、必須タスクの実行漏れを検出・通知してほしい。なぜなら、エージェントがセッションログの記録やGit同期を忘れた場合に気づけるようにしたいからだ。

- [ ] アンビエントエージェントがバックグラウンドで常時稼働する
- [ ] 各作業エージェントの必須タスク（ログ記録、コミット、同期等）の完了を定期チェックする
- [ ] 必須タスクが未完了の場合、人間にアラート通知する
- [ ] エージェントの稼働状態・タスク完了率がダッシュボードに表示される
- [ ] チェック項目（何を必須タスクとするか）を設定で定義できる
- [ ] リトライ上限を設定可能（無限ループ防止）
- [ ] （Phase 2）未完了タスクの自動再実行指示（自動是正）

#### US-6.12 [Should] アンビエントエージェント（ログ粒度管理・コンテンツ統括）

個人開発者として、アンビエントエージェントがセッションログの粒度を管理し、適切な記録と人間向けコンテンツへの変換を統括してほしい。なぜなら、エージェントの生の操作ログは膨大すぎるので、目的に応じた適切な粒度で整理・公開してほしいからだ。

- [ ] ログ粒度を設定で選択できる（詳細: 全操作記録 / 標準: 主要操作+判断 / コンパクト: マイルストーンのみ）
- [ ] システムレベルの生ログ（US-6.10）からアンビエントエージェントが構造化セッションログ（Epic 7）を自動生成する
- [ ] 日単位のデイリーサマリーを自動生成し、各エージェントの成果を統合する
- [ ] セッションログの品質（記載漏れ、不整合）を自動検証する
- [ ] ブログ/SNSへの変換パイプライン（Epic 8, 9）の実行スケジュールを管理し、未変換のログがあれば自動でパイプラインを起動する
- [ ] コンテンツ変換の品質（読みやすさ、情報の網羅性）を公開前に自動チェックする

---

### エージェントセッションログ（Epic 7）

#### US-7.1 [Must] セッション操作の自動記録

AIエージェントとして、セッション（作業期間）の操作内容を構造化ログとして自動記録したい。なぜなら、個人開発者が後から作業内容を参照・レビューできるようにしたいからだ。

- [ ] エージェントのセッション開始時にログファイルが自動作成される
- [ ] 編集ファイル、コミット内容、実行コマンド、作業の意図・判断がログに含まれる
- [ ] ログはマークダウン形式で保存される（人間が読みやすい）
- [ ] セッション終了時にログが自動的にクローズされる

#### US-7.2 [Must] デイリーログ（日単位サマリー）自動生成

AIエージェントとして、日単位でその日の全セッションの作業サマリーを自動生成したい。なぜなら、１日の作業全体を俯瞰できるデイリーログを提供したいからだ。

- [ ] 日付ベースのデイリーログファイルが自動生成される
- [ ] その日に稼働した全エージェントのセッションが統合される
- [ ] 主要な変更内容・作成ファイル・コミット等のサマリーが含まれる

#### US-7.3 [Must] セッションログ一覧・閲覧

個人開発者として、セッションログを日付・エージェント別に一覧表示して閲覧したい。なぜなら、過去にどのエージェントがいつ何をしたかを振り返りたいからだ。

- [ ] セッションログの一覧が日付順で表示される
- [ ] エージェント名でフィルタリングできる
- [ ] ログを選択するとマークダウンとしてエディタで閲覧できる

#### US-7.4 [Should] ログ内リンクからファイル・コミット遷移

個人開発者として、セッションログ内から参照されるファイルやコミットに直接遷移したい。なぜなら、ログに記載された変更内容の詳細を確認したいからだ。

- [ ] ログ内のファイルパスがクリック可能なリンクとして表示される
- [ ] リンクをクリックすると該当ファイルがエディタで開かれる
- [ ] コミットハッシュからGit差分表示に遷移できる

#### US-7.5 [Should] ログ保存先・フォーマットカスタマイズ

個人開発者として、セッションログの保存先フォルダとファイル名フォーマットをカスタマイズしたい。なぜなら、プロジェクトの管理方法に合わせて整理したいからだ。

- [ ] 設定画面でログの保存先フォルダを指定できる
- [ ] ファイル名フォーマット（日付・エージェント名等）を設定できる

---

## 技術仕様

### アーキテクチャ概要

Unit 8 は、エージェントに依存しないシステムレベルの操作キャプチャ、秘匿情報マスキング、アンビエントエージェント、セッションログ生成の 4 つの機能領域を担う。アーキテクチャは以下の層で構成される。

1. **システムキャプチャ層**（Rust）: 3 つの独立したキャプチャソースからイベントを収集する。
   - **ファイルシステムキャプチャ**: Unit 1 の `watcher_service.rs`（notify crate）が発火する `fs:changed` イベントを購読し、`CaptureEvent` に変換して永続化する。Watcher 本体は Unit 1 が管理し、本ユニットは購読者として動作する。
   - **Git 操作キャプチャ**: `<vault>/.git/hooks/` に post-commit、post-merge、pre-push フックスクリプトを配置し、Git 操作を検出する。フックは Techtite のバックエンドプロセスに IPC でイベントを通知する。
   - **ターミナル出力キャプチャ**: Unit 7 の `agent:operation` イベントおよび `terminal:output` イベントを購読し、コマンド実行と出力を記録する。
2. **マスキング層**（Rust）: `masking_service.rs` が `regex` crate を用いて全キャプチャイベントに対し秘匿情報のパターンマッチ・マスキングを適用する。生ログへの書き込み前に必ずマスキングパイプラインを通過させる。
3. **アンビエントエージェント層**（Rust + Claude Code SDK ハイブリッド）: 決定的な監視・検証タスクは Rust サービス（tokio ベース）が担当し、知的判断を要するタスク（ログ構造化、品質チェック）は Claude Code SDK モードに委譲する。
4. **セッションログ層**（Rust + Claude Code SDK）: 生キャプチャデータからアンビエントエージェントが構造化マークダウンのセッションログを生成する。デイリーサマリーの自動集約も行う。

全キャプチャイベントは `<vault>/.techtite/raw_logs/` に JSONL（改行区切り JSON）形式で永続化される。セッションログは `<vault>/<設定可能パス>/session-logs/` にマークダウンファイルとして保存され、Git 同期対象となる。

---

### UI 担当領域

モックアップ `techtite_mockup.html` に基づく担当領域は以下の通り。

| UI 領域 | コンポーネント | 説明 |
|---------|-------------|------|
| **Left Sidebar > Logs パネル** | `LogsPanel.tsx` | Ribbon の Logs アイコン（`data-panel="logs"`）で表示。日付別にセッションログを一覧表示 |
| Logs パネル > ログエントリ | `LogEntry.tsx` | 各セッションログの 1 行表示。アイコン（デイリー=クリップボード、セッション=ロボット）+ タイトル + 日付 |
| **Left Sidebar > Agents Dashboard 内** | `AmbientManagerCard.tsx` | Unit 7 の AgentsDashboard 内に配置される Ambient Manager カード。状態ドット（常時=青紫）、監視ステータス、タスク完了率を表示 |
| **Center Area** > デイリーログ表示 | `DailyLogView.tsx` | Logs パネルからデイリーログを選択した際に、Center エリアのエディタペインでマークダウンとして表示 |

モックアップでは Logs パネルは Left Sidebar の 1 パネルとして、`TODAY` / `YESTERDAY` 等の日付セクションで区切られたセッションログ一覧を表示する。ログエントリをクリックすると、Center Area のエディタでマークダウン内容を閲覧できる。Ambient Manager は Agents Dashboard パネル内の特殊なカードとして表示される（状態ドット=青紫、`Resident Process` 表示）。

---

### 主要ライブラリ・技術

| ライブラリ | バージョン方針 | 用途 |
|-----------|-------------|------|
| **notify** | 最新安定版 | ファイルシステム監視（Unit 1 が管理する Watcher のイベントを購読） |
| **regex** | stable | 秘匿情報マスキングの正規表現パターンマッチ |
| **tokio** | stable | アンビエントエージェントの非同期タスクスケジューラ、定期チェックタイマー |
| **serde** / **serde_json** | stable | CaptureEvent の JSONL シリアライズ、セッションログメタデータの管理 |
| **rusqlite** | stable | 生ログのインデックス管理（オプション: JSONL と併用してクエリ性能を向上） |
| **chrono** | stable | タイムスタンプ生成、日付ベースのログファイル名生成 |
| **@anthropic-ai/claude-code** | 最新安定版 | SDK モードでのログ構造化、品質チェック（アンビエントエージェントの知的判断層） |
| **pulldown-cmark** | stable | セッションログ内のマークダウンパース（リンク抽出、バリデーション） |

---

### Rust バックエンド詳細

#### commands/capture.rs

システムレベルキャプチャの IPC コマンド。

```rust
// キャプチャイベント取得
// since: ISO 8601 タイムスタンプ以降のイベントを取得
// agentId: 特定エージェントに帰属するイベントのみフィルタ
#[tauri::command]
async fn capture_get_events(
    since: Option<String>,
    limit: Option<u32>,
    agent_id: Option<String>,
    state: State<'_, CaptureServiceState>,
) -> Result<Vec<CaptureEvent>, String>;
```

#### commands/session_log.rs

セッションログ管理の IPC コマンド。

```rust
// セッションログ一覧取得
// date: 特定日付のログのみ取得（YYYY-MM-DD）
// agentName: エージェント名でフィルタ
#[tauri::command]
async fn session_log_list(
    date: Option<String>,
    agent_name: Option<String>,
    state: State<'_, SessionLogServiceState>,
) -> Result<Vec<SessionLog>, String>;

// デイリーログ取得
#[tauri::command]
async fn session_log_get_daily(
    date: String,
    state: State<'_, SessionLogServiceState>,
) -> Result<Option<DailyLog>, String>;

// セッションログの内容取得（マークダウン本文）
#[tauri::command]
async fn session_log_get_content(
    path: String,
    state: State<'_, SessionLogServiceState>,
) -> Result<String, String>;

// アンビエントエージェント状態取得
#[tauri::command]
async fn ambient_get_status(
    state: State<'_, AmbientServiceState>,
) -> Result<AmbientStatus, String>;

// タスクチェック結果取得
#[tauri::command]
async fn ambient_get_check_results(
    state: State<'_, AmbientServiceState>,
) -> Result<Vec<TaskCheckResult>, String>;
```

#### services/capture_service.rs

システムレベル操作キャプチャのコアサービス。

- **CaptureServiceState**: `Vec<CaptureEvent>` のインメモリバッファ + JSONL ファイルへの永続化ハンドルを保持
- **init()**: Vault オープン時に呼び出され、3 つのキャプチャソースを初期化する
  - `fs:changed` イベントリスナー登録（Unit 1 watcher_service 購読）
  - Git hooks のインストール（`<vault>/.git/hooks/` にスクリプト配置）
  - `agent:operation` / `terminal:output` イベントリスナー登録（Unit 7 購読）
- **record_event()**: `CaptureEvent` を生成し、以下のパイプラインを通過させる
  1. `masking_service.mask()` で秘匿情報マスキング適用
  2. インメモリバッファに追加
  3. 対応する JSONL ファイルに追記（`fs_events.jsonl` / `git_events.jsonl` / `terminal_events.jsonl`）
  4. `app.emit("capture:event", event)` でイベント通知
- **query_events()**: `since` / `limit` / `agent_id` パラメータで JSONL ファイルからイベントを検索

```rust
// JSONL ファイルへの追記（append モード）
pub async fn append_to_log(
    log_path: &Path,
    event: &CaptureEvent,
) -> Result<(), std::io::Error> {
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
        .await?;
    let json = serde_json::to_string(event)?;
    file.write_all(format!("{}\n", json).as_bytes()).await?;
    Ok(())
}
```

**Git hooks のインストール**:

Vault オープン時に `.git/hooks/` 配下に以下のフックスクリプトを配置する。既存のフックがある場合はバックアップを取り、Techtite のフック処理を先頭に挿入する。

- `post-commit`: コミットハッシュとメッセージを Techtite バックエンドに通知
- `post-merge`: マージ完了を通知
- `pre-push`: プッシュ対象ブランチを通知

フックスクリプトは Techtite のバックエンドプロセスにローカル HTTP リクエスト（localhost 上の一時ポート）またはファイルベースの IPC で通知する。

#### services/masking_service.rs

秘匿情報マスキングサービス。

- **デフォルトパターン**: 以下の正規表現パターンをビルトインで提供
  - API Key: `(sk-[a-zA-Z0-9]{20,})` → `sk-****`
  - Bearer Token: `(Bearer\s+[a-zA-Z0-9\-._~+/]+=*)` → `Bearer ****`
  - GitHub PAT: `(ghp_[a-zA-Z0-9]{36})` → `ghp_****`
  - AWS Key: `(AKIA[0-9A-Z]{16})` → `AKIA****`
  - パスワード: `(password|passwd|pwd)\s*[:=]\s*\S+` → `$1=****`
  - URL 埋め込みトークン: `(https?://[^:]+:)[^@]+(@)` → `$1****$2`
  - `.env` 形式: `^([A-Z_]+_KEY|[A-Z_]+_SECRET|[A-Z_]+_TOKEN)\s*=\s*(.+)$` → `$1=****`
- **カスタムパターン**: ユーザーが追加の正規表現ルールを設定可能（`VaultConfig` で管理）
- **mask()**: 入力文字列に対して全パターンを順次適用し、マッチした部分を `****` に置換
- **MaskingPipeline**: `Vec<MaskingRule>` を保持し、優先順位に従って適用。高優先度のルールが先に適用される

```rust
pub struct MaskingRule {
    pub name: String,
    pub pattern: Regex,          // コンパイル済み正規表現
    pub replacement: String,     // 置換テンプレート（$1 等のキャプチャグループ参照可能）
    pub priority: u32,           // 優先順位（小さいほど高優先）
    pub is_builtin: bool,        // ビルトインパターンかユーザー定義か
}

impl MaskingService {
    pub fn mask(&self, input: &str) -> String {
        let mut result = input.to_string();
        for rule in &self.rules {
            result = rule.pattern.replace_all(&result, &rule.replacement).to_string();
        }
        result
    }
}
```

#### services/ambient_service.rs

アンビエントエージェントの Rust 層サービス。

- **AmbientServiceState**: アンビエントエージェントの状態（稼働中/停止中）、チェック結果履歴、設定を保持
- **start()**: Vault オープン時に自動起動。`tokio::spawn` で定期チェックタスクを開始
- **定期チェックタスク**（Rust 層 - 決定的処理）:
  - **チェック間隔**: デフォルト 60 秒（設定可能）
  - **チェック項目**:
    1. 各エージェントの最終操作ログタイムスタンプを確認し、一定時間操作がないエージェントを検出
    2. 未コミットの変更が一定時間放置されていないかを確認
    3. セッションログが生成されているかを確認（最終キャプチャイベントとの整合性）
    4. 生ログファイルのサイズを監視し、異常増大を検出
  - チェック結果を `TaskCheckResult` として記録し、未完了タスクがあれば `ambient:alert` イベントを発火
- **知的判断タスクの委譲**（Claude Code SDK 層）:
  - 生ログ → セッションログの構造化変換（`session_log_service` と連携）
  - セッションログの品質チェック（記載漏れ、不整合の検出）
  - コンテンツ変換品質の評価
  - SDK 呼び出しは `@anthropic-ai/claude-code` を WebView 側で実行し、結果を IPC で受け取る

```rust
pub struct AmbientCheckConfig {
    pub check_interval_sec: u64,          // チェック間隔（デフォルト: 60）
    pub idle_threshold_sec: u64,          // エージェント無操作閾値（デフォルト: 300）
    pub uncommitted_threshold_sec: u64,   // 未コミット放置閾値（デフォルト: 600）
    pub required_tasks: Vec<RequiredTask>,
    pub max_retries: u32,                 // リトライ上限（デフォルト: 3）
}

pub enum RequiredTask {
    SessionLogGenerated,        // セッションログが生成されているか
    ChangesCommitted,           // 変更がコミットされているか
    ChangesSynced,              // 変更がリモートに同期されているか
}
```

#### services/session_log_service.rs

セッションログの生成・管理サービス。

- **SessionLogServiceState**: 生成済みセッションログのインデックス、保存先設定を保持
- **create_session_log()**: エージェントのセッション開始時に呼び出される
  1. セッションログファイルパスを生成（`<session_log_dir>/YYYY-MM-DD-<agent_name>-session-NNN.md`）
  2. フロントマター + ヘッダーテンプレートを書き込み
  3. `SessionLog` メタデータを登録
- **update_session_log()**: アンビエントエージェントが生キャプチャデータから構造化マークダウンを生成し、セッションログに追記する
  - Claude Code SDK を使用して、生の `CaptureEvent` 列をまとまりのある作業セクションに整理
  - `LogGranularity` 設定（Detailed / Standard / Compact）に基づいて詳細度を調整
- **close_session_log()**: エージェントのセッション終了時に呼び出される
  - セッションサマリーを生成（Claude Code SDK）
  - `ended_at` を記録
  - `session_log:updated` イベントを発火
- **generate_daily_log()**: 日次自動実行
  1. その日の全セッションログを収集
  2. 各セッションのサマリーを統合
  3. デイリーサマリーマークダウンを生成（`YYYY-MM-DD-daily.md`）
  4. 変更ファイル数、コミット数等の統計情報を集計

**セッションログのマークダウンテンプレート**:

```markdown
---
type: session-log
agent: <agent_name>
date: YYYY-MM-DD
session: NNN
started_at: ISO8601
ended_at: ISO8601
---

# Session Log: <agent_name> - YYYY-MM-DD #NNN

## Summary
<セッション全体のサマリー>

## Timeline

### HH:MM - <作業セクションタイトル>
- 編集: `path/to/file.ts`
- コミット: `abc1234` - "feat: ..."
- 判断: <エージェントの意思決定の記録>

## Changed Files
- `path/to/file1.ts` (created)
- `path/to/file2.rs` (modified)

## Commits
- `abc1234` - "feat: ..."
- `def5678` - "fix: ..."
```

---

### フロントエンド詳細

#### features/reliability/components/LogsPanel.tsx

Left Sidebar のセッションログ一覧パネル。

- `log-store` の `sessionLogs` / `dailyLogs` を購読
- 日付セクション（`TODAY` / `YESTERDAY` / 過去の日付）で区切ったログ一覧を表示
- フィルタ機能: エージェント名でのフィルタリング（ドロップダウン選択）
- ログエントリクリック時: `session_log:get_content` コマンドで内容を取得し、Unit 2 のエディタで ReadOnly マークダウンとして表示
- `session_log:updated` イベントを購読し、リアルタイムでリスト更新

#### features/reliability/components/LogEntry.tsx

セッションログの 1 行表示コンポーネント。

- アイコン: デイリーログ=クリップボードアイコン、セッションログ=ロボットアイコン
- タイトル: デイリーログ=`"YYYY-MM-DD Daily Summary"`、セッションログ=`"<agent_name> Session"`
- アクティブ状態のハイライト（現在閲覧中のログ）
- クリックイベントで `log-store.setActiveLog()` を呼び出し

#### features/reliability/components/AmbientManagerCard.tsx

Agents Dashboard 内のアンビエントマネージャーカード。

- Unit 7 の `AgentsDashboard.tsx` からインポートされて配置
- 状態ドット: 常時稼働=青紫（`--accent`）
- 表示項目: 監視ステータスメッセージ（例: `"Monitoring all agents. Session log up to date."`）、`Resident Process` ラベル
- タスク完了率バー: `ambient:get_status` の `taskCompletionRate` を視覚化
- `ambient:alert` イベント受信時に警告バッジを表示

#### features/reliability/components/DailyLogView.tsx

デイリーログの表示コンポーネント。

- Center Area のエディタペインで表示される（Unit 2 の `EditorContainer` から呼び出し）
- マークダウン内容を ReadOnly モードで表示
- ファイルパスリンク（`path/to/file.ts`）をクリック可能なリンクに変換（クリックでエディタで該当ファイルを開く）
- コミットハッシュリンク（`abc1234`）をクリック可能に変換（クリックで Unit 6 の DiffView を表示）

#### stores/log-store.ts

Zustand ストアの定義。

```typescript
interface LogStoreState {
  // セッションログ
  sessionLogs: SessionLog[];
  dailyLogs: DailyLog[];
  activeLogId: string | null;
  activeLogContent: string | null;

  // フィルタ
  filterDate: string | null;
  filterAgentName: string | null;

  // アンビエントエージェント
  ambientStatus: AmbientStatus | null;
  checkResults: TaskCheckResult[];

  // アクション
  setSessionLogs: (logs: SessionLog[]) => void;
  setDailyLogs: (logs: DailyLog[]) => void;
  setActiveLog: (id: string, content: string) => void;
  setFilterDate: (date: string | null) => void;
  setFilterAgentName: (name: string | null) => void;
  updateAmbientStatus: (status: AmbientStatus) => void;
  addCheckResult: (result: TaskCheckResult) => void;
}
```

---

### 公開インターフェース

本ユニットが他ユニットに公開する IPC コマンドとイベント。

#### IPC コマンド（フロントエンド → Rust）

| コマンド名 | 入力 | 出力 | 説明 |
|-----------|------|------|------|
| `capture:get_events` | `{ since?: string, limit?: number, agentId?: string }` | `CaptureEvent[]` | キャプチャイベント取得 |
| `session_log:list` | `{ date?: string, agentName?: string }` | `SessionLog[]` | セッションログ一覧 |
| `session_log:get_daily` | `{ date: string }` | `DailyLog \| null` | デイリーログ取得 |
| `session_log:get_content` | `{ path: string }` | `string` | セッションログ内容取得（マークダウン） |
| `ambient:get_status` | — | `AmbientStatus` | アンビエントエージェント状態取得 |
| `ambient:get_check_results` | — | `TaskCheckResult[]` | タスクチェック結果取得 |

#### イベント（Rust → フロントエンド）

| イベント名 | ペイロード | 購読先 | 説明 |
|-----------|----------|--------|------|
| `capture:event` | `CaptureEvent` | Unit 8（ambient_service） | キャプチャイベント発生通知 |
| `session_log:updated` | `{ logId: string }` | Unit 8（LogsPanel UI） | セッションログ更新通知 |
| `ambient:alert` | `{ message: string, severity: string }` | Unit 7（Dashboard）, Unit 1（Toast） | アンビエントエージェントアラート通知 |

---

### 消費インターフェース

本ユニットが他ユニットから消費する IPC コマンドとイベント。

#### 消費するイベント（他ユニットが発火）

| イベント名 | 発火元 | 用途 |
|-----------|--------|------|
| `fs:changed` | Unit 1（watcher_service） | ファイル操作キャプチャ。ファイルの作成・変更・削除・移動を CaptureEvent に変換 |
| `agent:operation` | Unit 7（agent_registry） | エージェントのファイル操作を CaptureEvent に変換。エージェント帰属情報を含む |
| `terminal:output` | Unit 7（process_service） | ターミナルコマンド実行と出力をキャプチャ |
| `agent:status_changed` | Unit 7（agent_registry） | エージェントの起動・停止を検出し、セッションログの作成・クローズをトリガー |
| `git:status_changed` | Unit 6（git_service） | Git ステータス変更をキャプチャ（未コミット変更の監視用） |
| `sync:state_changed` | Unit 6（sync_service） | 同期状態変更をキャプチャ（同期完了の確認用） |

#### 消費するコマンド（他ユニットが提供）

| コマンド名 | 提供元 | 用途 |
|-----------|--------|------|
| `git:get_log` | Unit 6 | セッションログにコミット情報を含める際に使用 |
| `git:get_commit_diff` | Unit 6 | セッションログにコミット差分の概要を含める際に使用 |
| `agent:list` | Unit 7 | アンビエントエージェントが全エージェントの状態を取得するために使用 |
| `fs:read_file` | Unit 1 | セッションログファイルの読み取り |
| `fs:write_file` | Unit 1 | セッションログファイルの書き込み |

---

### データフロー

#### システムキャプチャ → 生ログ保存フロー

```
[ファイル操作発生]
  → Unit 1 watcher_service.rs: notify イベント検出
  → app.emit("fs:changed", { path, changeType })
  → Unit 8 capture_service.rs: イベントリスナー受信
    → CaptureEvent 生成 (event_type: FileModified)
    → masking_service.mask(): 秘匿情報マスキング適用
    → インメモリバッファ追加
    → fs_events.jsonl に追記
    → app.emit("capture:event", event)

[Git 操作発生]
  → .git/hooks/post-commit 実行
  → Techtite バックエンドに通知
  → capture_service.rs: CaptureEvent 生成 (event_type: GitCommit)
    → masking_service.mask()
    → git_events.jsonl に追記
    → app.emit("capture:event", event)

[ターミナルコマンド実行]
  → Unit 7 agent:operation イベント発火
  → capture_service.rs: CaptureEvent 生成 (event_type: TerminalCommand)
    → masking_service.mask()
    → terminal_events.jsonl に追記
    → app.emit("capture:event", event)
```

#### 生ログ → セッションログ生成フロー

```
[エージェントセッション開始]
  → Unit 7: agent:status_changed (status: Running) イベント
  → session_log_service.rs: create_session_log()
    → マークダウンファイル作成
    → SessionLog メタデータ登録

[セッション中: 定期的な構造化]
  → ambient_service.rs: 定期チェックタスク（60 秒間隔）
    → capture_service から最新の CaptureEvent を取得
    → 未処理イベントを Claude Code SDK で構造化
      (SDK呼び出し: WebView側 → IPC → Rust)
    → session_log_service.update_session_log()
    → マークダウンに追記
    → app.emit("session_log:updated", { logId })

[エージェントセッション終了]
  → Unit 7: agent:status_changed (status: Completed/Stopped) イベント
  → session_log_service.close_session_log()
    → セッションサマリー生成 (Claude Code SDK)
    → ended_at 記録
    → app.emit("session_log:updated", { logId })
```

#### デイリーログ自動生成フロー

```
[日次トリガー]
  → ambient_service.rs: 日付変更検出 or 最初のエージェント起動時
  → session_log_service.generate_daily_log()
    → その日の全 SessionLog を取得
    → 各セッションの summary を統合
    → 変更ファイル・コミットの統計集計
    → Claude Code SDK でデイリーサマリー文を生成
    → YYYY-MM-DD-daily.md を作成/更新
    → app.emit("session_log:updated", { logId: dailyLogId })
```

---

### パフォーマンス要件

| 項目 | 要件 | 根拠 |
|------|------|------|
| キャプチャイベント記録レイテンシ | イベント発生 → JSONL 書き込み完了まで **100ms 以下** | ファイル操作の記録がシステムのパフォーマンスを阻害しない |
| マスキング処理時間 | 1 イベントあたり **10ms 以下** | 全イベントに対してインラインで適用されるため、高速である必要がある |
| セッションログ更新間隔 | **60 秒** ごとの定期バッチ処理 | リアルタイム性と SDK 呼び出しコストのバランス |
| デイリーログ生成 | **30 秒以内** に完了 | 1 日分のセッション統合処理。Claude Code SDK 呼び出しを含む |
| アンビエントチェック間隔 | デフォルト **60 秒**（設定可能: 30〜300 秒） | エージェントの異常検出の迅速性と CPU 負荷のバランス |
| 生ログファイルサイズ | 1 ファイルあたり最大 **100MB**（ローテーション閾値） | ディスク容量と読み取り性能の制約。超過時は Unit 9 の log_rotation_service が処理 |
| セッションログ一覧取得 | **200ms 以下** で直近 30 日分を返却 | UI の一覧表示が遅延しない |
| キャプチャイベントクエリ | 直近 1,000 件を **500ms 以下** で返却 | フィルタリング・ページング付きの検索性能 |

---

### 制約・注意事項

1. **生ログの外部送信禁止**: `<vault>/.techtite/raw_logs/` 配下の生ログデータは外部 LLM / 外部サービスに一切送信しない。マスキング適用後であっても、生ログの外部転送は行わない。Claude Code SDK による構造化処理は、マスキング適用済みのデータに対してのみ行う。
2. **生ログ閲覧のアクセス制御**: 生ログの閲覧にはフロントエンドで明示的な確認操作（ダイアログ承認）を要求する。ワンクリックで秘匿情報が表示されない設計とする。マスキング済みの生ログのみをデフォルト表示し、マスキング前のオリジナルデータは Phase 2 でローカル LLM による追加マスキング後にのみ閲覧可能とする。
3. **Git hooks の共存**: Techtite が配置する Git hooks は、既存のユーザー定義 hooks を破壊しない。既存 hooks がある場合はバックアップを作成し、Techtite のフック処理を追加する形で共存させる。Techtite をアンインストールした場合にオリジナルの hooks を復元する機構を提供する。
4. **watcher_service との役割分離**: Unit 8 はファイルシステム Watcher の購読者であり、Watcher 本体の管理（起動・停止・設定変更）は Unit 1 の責務。Unit 8 は `fs:changed` イベントの消費のみを行う。
5. **masking_service の共有**: `masking_service.rs` は Unit 8 が主担当だが、Unit 9（ガードレール）もマスキング API を利用する。Unit 9 は `masking_service.mask()` を呼び出すのみで、パターン定義の変更は Unit 8 の管理下で行う。
6. **Claude Code SDK 呼び出しのコスト管理**: アンビエントエージェントの SDK 呼び出し（ログ構造化、品質チェック）は API コストが発生する。Unit 9 の `cost_tracker_service` にコストを報告し、予算上限に達した場合は SDK 呼び出しを停止して Rust 層のみで動作するフォールバックモードに移行する。
7. **セッションログの Git 同期**: セッションログ（マークダウン）は `<vault>/<設定可能パス>/session-logs/` に保存され、Git 同期対象となる。ログ生成が Git の自動コミットタイミングと競合しないよう、ログ書き込み完了を待ってからコミット対象に含める。
8. **JSONL ファイルのローテーション**: 生ログの JSONL ファイルは無制限に増大する可能性がある。ファイルサイズが 100MB を超えた場合のローテーション処理は Unit 9 の `log_rotation_service` が担当する。Unit 8 は常に最新のアクティブファイルに追記する。
9. **日付変更時の処理**: デイリーログの自動生成は、日付変更（0:00 JST / ユーザーのローカルタイムゾーン）を検出してトリガーする。アプリケーションが日付変更時に起動していない場合は、次回起動時に前日分のデイリーログを遡及生成する。
