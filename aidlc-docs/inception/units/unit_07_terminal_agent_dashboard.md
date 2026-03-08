# Unit 7: ターミナル・エージェントダッシュボード

> **対応 Epic**: Epic 6 — AIエージェント管理・ターミナル（UI・操作部分）
> **対応ストーリー**: US-6.1〜US-6.9

---

## ユーザーストーリーと受け入れ基準

### US-6.1 [Must] 組み込みターミナル

個人開発者として、アプリ内に組み込みターミナルを開きたい。なぜなら、AIエージェントの操作やシェルコマンドをエディタから離れずに実行したいからだ。

- [ ] ペイン下部またはタブとしてターミナルを開ける
- [ ] ショートカットキーでターミナルの表示/非表示を切り替えられる
- [ ] 標準的なシェル（zsh/bash）が動作する

### US-6.2 [Must] ターミナル複数タブ（エージェント別）

個人開発者として、ターミナルを複数タブで開き、各AIエージェントの入出力を個別に確認したい。なぜなら、複数のエージェントが並列で作業している内容をそれぞれ追跡したいからだ。

- [ ] 新しいターミナルタブを追加できる
- [ ] 各タブにエージェント名や用途のラベルを付けられる
- [ ] タブ間を切り替えて各ターミナルの出力を確認できる
- [ ] 各ターミナルの出力が独立してスクロール・保持される

### US-6.3 [Should] ターミナル出力スクロールバック・検索

個人開発者として、ターミナルの出力をスクロールバックして過去の実行結果を確認したい。なぜなら、AIエージェントの長い出力の中から特定の情報を探したいからだ。

- [ ] ターミナル出力のスクロールバックが十分な行数保持される
- [ ] ターミナル出力内をテキスト検索できる

### US-6.4 [Must] エージェントダッシュボード（一覧・状態）

個人開発者として、現在稼働中のAIエージェント一覧とその状態を一目で確認したい。なぜなら、複数のエージェントがそれぞれ何をしているか把握したいからだ。

- [ ] ダッシュボードパネルに稼働中エージェントの一覧が表示される
- [ ] 各エージェントの状態（実行中/待機中/完了/エラー）が視覚的に表示される
- [ ] 各エージェントの現在の作業内容（最新の操作やメッセージ）が要約表示される

### US-6.5 [Should] エージェント操作ログ閲覧

個人開発者として、各AIエージェントの操作ログ（作成・編集・削除したファイル）を時系列で閲覧したい。なぜなら、どのエージェントがどのファイルにどのような変更を行ったかを追跡したいからだ。

- [ ] エージェントごとの操作ログを時系列で表示できる
- [ ] ログにはタイムスタンプ、操作種別、対象ファイルパス、変更概要が含まれる
- [ ] ログエントリから該当ファイルに遷移できる
- [ ] 全エージェントの操作を統合した時系列ビューも表示できる

### US-6.6 [Must] エージェント起動・停止

個人開発者として、ダッシュボードからAIエージェントを起動・停止したい。なぜなら、必要に応じてエージェントの数を調整し、リソースを管理したいからだ。

- [ ] ダッシュボードから新しいエージェントを起動できる
- [ ] 稼働中のエージェントを停止できる
- [ ] エージェント起動時に作業内容やコンテキストを指定できる

### US-6.7 [Must] ファイル変更リアルタイム反映

個人開発者として、AIエージェントが編集したファイルの変更をエディタにリアルタイムで反映してほしい。なぜなら、AIの作業結果を即座に確認・レビューしたいからだ。

- [ ] 外部プロセス（Claude Code）によるファイル変更がファイルシステム監視で検出される
- [ ] 検出された変更がエディタの表示に自動反映される
- [ ] 編集中のファイルが外部変更された場合、競合の通知が表示される
- [ ] どのエージェントによる変更かが識別できる

### US-6.8 [Must] AIからプロジェクト構造取得

AIエージェントとして、プロジェクトの構造情報（フォルダ構成、ファイル一覧、リンク関係、タグ情報）を取得したい。なぜなら、プロジェクト全体のコンテキストを理解した上で適切な編集を行いたいからだ。

- [ ] ファイル構造をJSON等の構造化データとして出力・取得できる
- [ ] 各ファイルのメタデータ（frontmatter、タグ、リンク）を取得できる

### US-6.9 [Should] AI操作ログ自動記録

AIエージェントとして、自身が行った操作（ファイルの作成・編集・削除）のログを自動的に記録したい。なぜなら、個人開発者が後からAIの作業内容を確認・追跡できるようにしたいからだ。

- [ ] AIエージェントによるファイル操作が操作ログに自動記録される
- [ ] ログにはエージェント識別子、タイムスタンプ、操作種別、対象ファイルパスが含まれる
- [ ] 操作ログはローカル専用ストレージに保存され、Git同期対象から除外される

---

## 技術仕様

### アーキテクチャ概要

Unit 7 は、組み込みターミナルと AI エージェントのライフサイクル管理を担う。アーキテクチャは以下の 3 層で構成される。

1. **PTY プロセス層**（Rust）: `tauri-plugin-shell` を用いた擬似端末（PTY）プロセスの生成・管理。各ターミナルタブに対して独立した PTY セッションを割り当て、stdin/stdout/stderr を非同期でブリッジする。
2. **エージェント管理層**（Rust）: `agent_registry.rs` によるエージェントの状態管理。Claude Code の CLI モード（`--output-format stream-json`）と SDK モード（`@anthropic-ai/claude-code`）のデュアル統合を実現する。エージェントの起動・停止・状態遷移を一元管理し、`process_service.rs` と連携してプロセスライフサイクルを制御する。
3. **UI 層**（React + xterm.js）: xterm.js によるターミナルレンダリング、エージェントダッシュボードのカード UI、ステータスバーのエージェントカウント表示。`terminal-store` を介してバックエンドの状態と同期する。

エージェント起動時、CLI モードでは PTY プロセスとして Claude Code を起動し、`stream-json` 出力をパースしてターミナルに表示する。SDK モードではプログラム的にエージェントを制御し、結果を `agent:operation` イベント経由で通知する。ファイル変更のリアルタイム反映は Unit 1 の `watcher_service.rs` が発火する `fs:changed` / `fs:external_change` イベントを購読して実現する。

---

### UI 担当領域

モックアップ `techtite_mockup.html` に基づく担当領域は以下の通り。

| UI 領域 | コンポーネント | 説明 |
|---------|-------------|------|
| **Right Terminal パネル** | `TerminalPanel.tsx` | Center エリアの右側に配置されるリサイズ可能なターミナルパネル。複数タブ（エージェント別・Shell・Git Diff 等）を持つ |
| Right Terminal > タブバー | `TerminalTab.tsx` | `Claude #1` / `Shell` 等のタブ切り替え。アクティブタブのハイライト、閉じるボタン |
| Right Terminal > ターミナル本体 | `TerminalInstance.tsx` | xterm.js インスタンスのラッパー。PTY 出力のレンダリング、キー入力の送信 |
| **Left Sidebar > Agents Dashboard** | `AgentsDashboard.tsx` | Ribbon の Agents アイコンで表示。稼働中エージェントの一覧カード |
| Agents Dashboard > エージェントカード | `AgentCard.tsx` | 各エージェントの状態ドット（Running=緑 / Idle=黄 / Error=赤）、現在タスク、トークン数/コスト、Terminal/Log/Stop ボタン |
| **StatusBar** > エージェント数 | `AgentCountBadge.tsx` | ステータスバー左側に表示される `"🤖 2 agents"` のようなバッジ |

モックアップでは Right Terminal パネルが Center エリアの右側に垂直分割で配置され、`react-resizable-panels` でリサイズ可能となっている。Agents Dashboard は Left Sidebar のパネルの 1 つとして、Ribbon の Agents アイコン（`data-panel="agents"`）で切り替え表示される。

---

### 主要ライブラリ・技術

| ライブラリ | バージョン方針 | 用途 |
|-----------|-------------|------|
| **@xterm/xterm** | 最新安定版 | ターミナルエミュレータコア。ANSI エスケープシーケンス、256 色、Unicode 対応 |
| **@xterm/addon-fit** | @xterm/xterm 対応版 | ターミナルのコンテナサイズに合わせた自動リサイズ（cols/rows 計算） |
| **@xterm/addon-search** | @xterm/xterm 対応版 | ターミナル出力バッファ内のテキスト検索（US-6.3） |
| **tauri-plugin-shell** | Tauri 2.x 対応版 | 外部プロセス（シェル、Claude Code CLI）の起動・stdin/stdout ブリッジ・終了管理 |
| **@anthropic-ai/claude-code** | 最新安定版 | SDK モードでのプログラム的エージェント制御（バックグラウンドタスク用） |
| **tokio** | stable | 非同期ランタイム。PTY 出力の非同期読み取り、エージェント状態の定期ポーリング |
| **serde** / **serde_json** | stable | `stream-json` 出力のパース、IPC ペイロードのシリアライズ |

---

### Rust バックエンド詳細

#### commands/terminal.rs

`#[tauri::command]` で公開するターミナル関連コマンド。

```rust
// ターミナルセッション作成
// PTY プロセスを起動し、一意の ID を返却
#[tauri::command]
async fn terminal_create(
    label: Option<String>,
    state: State<'_, ProcessServiceState>,
) -> Result<String, String>;

// ターミナルへの入力送信
// フロントエンドからのキー入力を PTY の stdin に書き込む
#[tauri::command]
async fn terminal_write(
    id: String,
    data: String,
    state: State<'_, ProcessServiceState>,
) -> Result<(), String>;

// ターミナルリサイズ
// xterm.js の FitAddon が計算した cols/rows を PTY に反映
#[tauri::command]
async fn terminal_resize(
    id: String,
    cols: u32,
    rows: u32,
    state: State<'_, ProcessServiceState>,
) -> Result<(), String>;

// ターミナル終了
// PTY プロセスに SIGTERM を送信し、セッションをクリーンアップ
#[tauri::command]
async fn terminal_close(
    id: String,
    state: State<'_, ProcessServiceState>,
) -> Result<(), String>;
```

#### commands/agent.rs

エージェントライフサイクル管理コマンド。

```rust
// エージェント一覧取得
#[tauri::command]
async fn agent_list(
    state: State<'_, AgentRegistryState>,
) -> Result<Vec<AgentInfo>, String>;

// エージェント起動
// CLI モード: PTY プロセスとして Claude Code を起動、stream-json パース開始
// SDK モード: @anthropic-ai/claude-code SDK 経由でプログラム的に起動
#[tauri::command]
async fn agent_start(
    config: AgentConfig,
    state: State<'_, AgentRegistryState>,
    process_state: State<'_, ProcessServiceState>,
    app: AppHandle,
) -> Result<AgentInfo, String>;

// エージェント停止
// プロセスへの SIGTERM 送信 → タイムアウト後 SIGKILL
#[tauri::command]
async fn agent_stop(
    id: String,
    state: State<'_, AgentRegistryState>,
    process_state: State<'_, ProcessServiceState>,
) -> Result<(), String>;

// 操作ログ取得
// agent_id 指定で特定エージェント、未指定で全エージェント統合
#[tauri::command]
async fn agent_get_operation_log(
    agent_id: Option<String>,
    limit: Option<u32>,
    state: State<'_, AgentRegistryState>,
) -> Result<Vec<OperationLogEntry>, String>;
```

#### services/process_service.rs

PTY プロセスのライフサイクル管理サービス。

- **ProcessServiceState**: `HashMap<String, ProcessHandle>` でアクティブなターミナルセッションを管理
- **ProcessHandle**: PTY プロセスの stdin writer、stdout reader、PID、ステータスを保持
- **spawn_pty()**: `tauri-plugin-shell` の `Command::new()` で PTY プロセスを生成。`TERM=xterm-256color` 環境変数を設定
- **stdout ブリッジ**: `tokio::spawn` で非同期タスクを起動し、PTY stdout を読み取って `terminal:output` イベントを `app.emit()` で発火
- **プロセス終了検出**: PTY プロセスの終了を監視し、`terminal:exit` イベントを発火。exit code を含むペイロード
- **Claude Code CLI 起動**: `claude --output-format stream-json` オプションで起動。stdout から NDJSON（改行区切り JSON）をストリームパースし、構造化された操作情報を抽出して `agent:operation` イベントに変換

```rust
pub struct ProcessHandle {
    pub id: String,
    pub pid: u32,
    pub stdin: ChildStdin,          // PTY stdin への書き込みハンドル
    pub label: String,
    pub agent_id: Option<String>,   // エージェントに紐づく場合
    pub created_at: String,
}
```

#### services/agent_registry.rs

エージェントの状態管理レジストリ。

- **AgentRegistryState**: `HashMap<String, AgentInfo>` で全エージェントの状態を管理
- **register()**: 新規エージェントを登録し、`agent:status_changed` イベントを発火
- **update_status()**: エージェントの状態遷移（Running → Idle → Completed / Error → Stopped）を管理
- **update_current_task()**: CLI モードの `stream-json` 出力からエージェントの現在タスクを更新
- **record_operation()**: エージェントのファイル操作を `OperationLogEntry` としてインメモリバッファ + `<vault>/.techtite/agent_logs/` に永続化
- **stream-json パーサー**: Claude Code の `--output-format stream-json` 出力を解析し、以下の情報を抽出する
  - `type: "assistant"` メッセージ → 現在タスクの更新
  - `type: "tool_use"` → ファイル操作（create/modify/delete）を検出して `agent:operation` イベントに変換
  - `type: "result"` → セッション完了の検出

---

### フロントエンド詳細

#### features/terminal/components/TerminalPanel.tsx

ターミナルパネル全体のコンテナ。

- `react-resizable-panels` の `Panel` として Center エリアの右側に配置
- タブバー（`TerminalTab` のリスト）+ アクティブなターミナル本体を表示
- 「+」ボタンで新規ターミナルタブ作成（`terminal:create` コマンド呼び出し）
- 「x」ボタンでパネル全体を非表示（ショートカット: `Ctrl+` `` ` `` でトグル）
- パネルの最小幅は 250px、デフォルト幅はウィンドウの 30%

#### features/terminal/components/TerminalInstance.tsx

xterm.js インスタンスの React ラッパー。

- `useEffect` で xterm.js `Terminal` インスタンスを生成、`FitAddon` と `SearchAddon` をロード
- `terminal:output` イベントを `listenEvent` で購読し、`terminal.write()` でデータを書き込み
- `terminal.onData()` コールバックでキー入力を `terminal:write` コマンド経由で PTY に送信
- `ResizeObserver` でコンテナサイズ変更を検出し、`fitAddon.fit()` → `terminal:resize` コマンドで PTY に通知
- スクロールバック行数: デフォルト 10,000 行（`scrollback` オプション）
- テーマ設定: CSS 変数（`--bg-base`, `--text` 等）から xterm.js の `ITheme` にマッピング
- 検索機能: `Ctrl+F` でターミナル内検索バーを表示、`SearchAddon` の `findNext()` / `findPrevious()` を使用

```typescript
// xterm.js 初期化の概要
const terminal = new Terminal({
  scrollback: 10000,
  fontFamily: 'var(--mono)',
  fontSize: 13,
  theme: {
    background: '#1e1e1e',   // --bg-base
    foreground: '#dcddde',   // --text
    cursor: '#7c6af2',       // --accent
  },
});
const fitAddon = new FitAddon();
const searchAddon = new SearchAddon();
terminal.loadAddon(fitAddon);
terminal.loadAddon(searchAddon);
terminal.open(containerRef.current);
fitAddon.fit();
```

#### features/terminal/components/AgentsDashboard.tsx

Left Sidebar のエージェントダッシュボードパネル。

- `terminal-store` の `agents` 配列を購読してエージェントカードを描画
- 「+ Launch Agent」ボタンでエージェント起動ダイアログを表示（名前、初期プロンプト、モード選択）
- エージェント一覧の下部に API コスト概要を表示（Unit 9 の `cost:updated` イベントを購読）
- Ambient Manager カードは Unit 8 の `AmbientManagerCard.tsx` コンポーネントをインポートして配置

#### features/terminal/components/AgentCard.tsx

個別エージェントのカード UI。

- 状態ドット: `Running`=緑（`--green`）、`Idle`=黄（`--yellow`）、`Error`=赤（`--red`）、`Completed`/`Stopped`=グレー
- 現在タスク表示: `AgentInfo.currentTask` を 1 行で表示（テキスト省略あり）
- トークン数/コスト表示: Unit 9 の `cost:updated` イベントからエージェント別コストを取得
- アクションボタン: 「Terminal」（該当ターミナルタブへ切り替え）、「Log」（操作ログ表示）、「Stop」（`agent:stop` 呼び出し）

#### features/terminal/components/AgentCountBadge.tsx

ステータスバーに配置するエージェント数バッジ。

- `terminal-store` の `agents` 配列から `status === "running"` のカウントを算出
- `"🤖 N agents"` の形式で表示（N=0 の場合は非表示）
- クリックで Left Sidebar を Agents Dashboard に切り替え

#### stores/terminal-store.ts

Zustand ストアの定義。

```typescript
interface TerminalStoreState {
  // ターミナル管理
  terminals: TerminalSession[];
  activeTerminalId: string | null;

  // エージェント管理
  agents: AgentInfo[];
  operationLog: OperationLogEntry[];

  // アクション
  addTerminal: (session: TerminalSession) => void;
  removeTerminal: (id: string) => void;
  setActiveTerminal: (id: string) => void;
  updateAgent: (agent: AgentInfo) => void;
  removeAgent: (id: string) => void;
  addOperationLog: (entry: OperationLogEntry) => void;
  setTerminalPanelVisible: (visible: boolean) => void;

  // UI 状態
  isTerminalPanelVisible: boolean;
}

interface TerminalSession {
  id: string;
  label: string;
  agentId: string | null;    // エージェントに紐づく場合
}
```

---

### 公開インターフェース

本ユニットが他ユニットに公開する IPC コマンドとイベント。

#### IPC コマンド（フロントエンド → Rust）

| コマンド名 | 入力 | 出力 | 説明 |
|-----------|------|------|------|
| `terminal:create` | `{ label?: string }` | `string` | ターミナルセッション作成。ID を返却 |
| `terminal:write` | `{ id: string, data: string }` | `void` | ターミナルへ入力データ送信 |
| `terminal:resize` | `{ id: string, cols: number, rows: number }` | `void` | ターミナルの列・行数をリサイズ |
| `terminal:close` | `{ id: string }` | `void` | ターミナルセッション終了 |
| `agent:list` | — | `AgentInfo[]` | 全エージェント一覧取得 |
| `agent:start` | `AgentConfig` | `AgentInfo` | エージェント起動（CLI/SDK モード） |
| `agent:stop` | `{ id: string }` | `void` | エージェント停止 |
| `agent:get_operation_log` | `{ agentId?: string, limit?: number }` | `OperationLogEntry[]` | 操作ログ取得 |

#### イベント（Rust → フロントエンド）

| イベント名 | ペイロード | 購読先 | 説明 |
|-----------|----------|--------|------|
| `terminal:output` | `{ id: string, data: string }` | Unit 7（TerminalInstance） | PTY からのターミナル出力データ |
| `terminal:exit` | `{ id: string, exitCode: number }` | Unit 7（UI） | ターミナルプロセス終了 |
| `agent:status_changed` | `AgentInfo` | Unit 7（UI）, Unit 1（StatusBar） | エージェント状態変更通知 |
| `agent:output` | `{ agentId: string, data: string }` | Unit 7（TerminalInstance） | エージェント出力データ |
| `agent:operation` | `OperationLogEntry` | Unit 7（UI）, Unit 8（capture） | エージェントによるファイル操作発生 |

---

### 消費インターフェース

本ユニットが他ユニットから消費する IPC コマンドとイベント。

#### 消費するイベント（他ユニットが発火）

| イベント名 | 発火元 | 用途 |
|-----------|--------|------|
| `fs:changed` | Unit 1（watcher_service） | エージェントによるファイル変更を検出し、どのエージェントの操作かを特定する |
| `fs:external_change` | Unit 1（watcher_service） | 外部プロセス（Claude Code）によるファイル変更を検出し、エディタへの反映トリガーとする |
| `ambient:alert` | Unit 8（ambient_service） | アンビエントエージェントからのアラートをダッシュボードに表示 |
| `cost:updated` | Unit 9（cost_tracker_service） | エージェントカードにトークン数・コストを表示 |
| `cost:limit_reached` | Unit 9（cost_tracker_service） | 予算上限到達時にエージェントの自動停止を検討 |

#### 消費するコマンド（他ユニットが提供）

| コマンド名 | 提供元 | 用途 |
|-----------|--------|------|
| `file_tree:get_tree` | Unit 3 | US-6.8: プロジェクト構造の JSON 取得（エージェントへのコンテキスト提供） |
| `file_tree:get_metadata` | Unit 3 | US-6.8: ファイルメタデータ取得 |
| `knowledge:get_outgoing_links` | Unit 4 | US-6.8: リンク関係の取得 |
| `knowledge:get_all_tags` | Unit 4 | US-6.8: タグ情報の取得 |

---

### データフロー

#### ターミナル入出力フロー

```
[ユーザーキー入力]
  → TerminalInstance.tsx (xterm.js onData)
  → invokeCommand("terminal:write", { id, data })
  → commands/terminal.rs → process_service.rs
  → PTY stdin 書き込み

[PTY stdout 出力]
  → process_service.rs (tokio::spawn 非同期読み取り)
  → app.emit("terminal:output", { id, data })
  → TerminalInstance.tsx (listenEvent)
  → xterm.js terminal.write(data)
```

#### エージェント起動フロー（CLI モード）

```
[ユーザー: "Launch Agent" クリック]
  → AgentsDashboard.tsx
  → invokeCommand("agent:start", { name, mode: "cli", initialPrompt })
  → commands/agent.rs
    → agent_registry.rs: エージェント登録 (status: Running)
    → process_service.rs: Claude Code CLI を PTY で起動
      "claude --output-format stream-json"
    → terminal_create(): ターミナルタブ作成
    → app.emit("agent:status_changed", agentInfo)

[Claude Code stream-json 出力]
  → process_service.rs: stdout 非同期読み取り
  → agent_registry.rs: NDJSON パース
    → type: "assistant" → update_current_task()
    → type: "tool_use" (file edit) → record_operation()
      → app.emit("agent:operation", logEntry)
    → type: "result" → update_status(Completed)
      → app.emit("agent:status_changed", agentInfo)
  → app.emit("terminal:output", { id, data })  // 生出力もターミナルに表示
```

#### ファイル変更リアルタイム反映フロー

```
[Claude Code がファイルを編集]
  → ファイルシステム変更
  → Unit 1 watcher_service.rs: notify でイベント検出
  → app.emit("fs:changed", { path, changeType: "modified" })
  → app.emit("fs:external_change", { path, agentId })

[Unit 7 での処理]
  → terminal-store: fs:changed イベント受信
  → agent_registry.rs: 変更パスと稼働中エージェントの working_directory を照合
    → agentId を特定
  → agent:operation イベント発火 (operation: "modify")

[Unit 2 での処理]
  → editor-store: fs:external_change イベント受信
  → エディタ内容を再読み込み or 競合通知表示
```

---

### パフォーマンス要件

| 項目 | 要件 | 根拠 |
|------|------|------|
| ターミナル出力レイテンシ | PTY stdout → xterm.js 表示まで **50ms 以下** | インタラクティブなシェル操作に対するユーザー体感を損なわない |
| エージェント起動時間 | `agent:start` コマンドから PTY 起動 + 初期出力まで **3 秒以内** | Claude Code CLI の初期化時間を含む |
| ターミナルリサイズ | FitAddon.fit() → PTY resize まで **100ms 以内** | パネルリサイズ操作中のちらつきを防止 |
| 同時エージェント数 | 最大 **5 エージェント** を同時稼働可能 | メモリ・CPU リソースの制約。各エージェントが独立した PTY プロセスを持つ |
| スクロールバック | 1 ターミナルあたり **10,000 行** | xterm.js のデフォルトバッファサイズ。メモリ消費とのバランス |
| 操作ログ保持 | インメモリ: 直近 **1,000 エントリ** / 永続化: 無制限 | UI 表示のパフォーマンスとストレージのバランス |
| stream-json パース | 1 JSON 行あたり **5ms 以下** | エージェント出力のリアルタイム性を維持 |

---

### 制約・注意事項

1. **PTY と tauri-plugin-shell の制限**: `tauri-plugin-shell` は `Command::new()` で外部プロセスを起動するが、完全な PTY エミュレーション（pty-process crate 等）が必要になる場合がある。`tauri.conf.json` の `shell.scope` で許可するコマンドを明示的に定義する必要がある。
2. **Claude Code CLI のパス解決**: `claude` コマンドが `$PATH` に存在することを前提とする。存在しない場合は設定画面でパスを手動指定可能とし、エージェント起動時に明確なエラーメッセージを表示する。
3. **stream-json フォーマットの互換性**: Claude Code の `--output-format stream-json` の出力フォーマットはバージョンによって変更される可能性がある。パーサーはスキーマバージョンを検出し、未知のフィールドは無視する設計（`serde(deny_unknown_fields)` を使用しない）とする。
4. **プロセスのクリーンアップ**: アプリケーション終了時に全 PTY プロセスに SIGTERM を送信し、タイムアウト（5 秒）後に SIGKILL でクリーンアップする。ゾンビプロセスの発生を防止する。
5. **エージェント ID とファイル変更の帰属**: Unit 1 の `watcher_service` が検出するファイル変更は、デフォルトではどのエージェントによる変更かが不明。エージェントの `working_directory` とファイルパスの照合、およびタイムスタンプベースのヒューリスティックで帰属を推定する。同一ファイルを複数エージェントが編集する場合の帰属は、直近に `tool_use`（file edit）を実行したエージェントに割り当てる。
6. **SDK モードの制約**: SDK モードは Node.js ランタイムを必要とする。Tauri のフロントエンド（WebView）内で `@anthropic-ai/claude-code` パッケージを実行し、結果を IPC 経由で Rust バックエンドに通知する。SDK モードのエージェントにはターミナルタブは割り当てられず、操作ログのみがダッシュボードに表示される。
7. **watcher_service との協調**: Unit 7 は `watcher_service.rs` のイベント購読者であり、Watcher 本体は Unit 1 が管理する。Unit 7 は Watcher の設定変更や起動・停止を行わない。
8. **Tauri 2.x ケーパビリティ**: `capabilities/` に `shell:allow-execute`、`shell:allow-stdin-write` 等のケーパビリティを定義する必要がある。過度な権限付与を避け、必要最小限のスコープで設定する。
