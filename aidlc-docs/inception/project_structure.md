# Techtite プロジェクト構造・ディレクトリ規約

> **ステータス**: 確定
> **最終更新**: 2026-02-28
> **参照**: `techtite_mockup.html`（UI モックアップ）、`tech_stack.md`（技術スタック）

---

## 1. プロジェクトルート構造

```
techtite/
├── src-tauri/                    # Rust バックエンド（Tauri）
│   ├── Cargo.toml
│   ├── Cargo.lock
│   ├── tauri.conf.json           # Tauri 設定
│   ├── capabilities/             # Tauri 2.x ケーパビリティ定義
│   ├── icons/                    # アプリアイコン
│   └── src/
│       ├── main.rs               # エントリーポイント
│       ├── lib.rs                # モジュール宣言
│       ├── commands/             # IPC コマンドハンドラ
│       ├── services/             # バックエンドサービス
│       ├── models/               # データモデル（struct）
│       └── utils/                # ユーティリティ
├── src/                          # フロントエンド（React + TypeScript）
│   ├── main.tsx                  # React エントリーポイント
│   ├── App.tsx                   # アプリルートコンポーネント
│   ├── features/                 # 機能別モジュール（Unit 対応）
│   ├── shared/                   # 共有コンポーネント・ユーティリティ
│   ├── stores/                   # Zustand ストア
│   ├── types/                    # 共有型定義
│   ├── hooks/                    # 共有カスタムフック
│   └── styles/                   # グローバルスタイル・Tailwind 設定
├── tests/                        # E2E テスト（Playwright）
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── eslint.config.js
└── playwright.config.ts
```

---

## 2. Rust バックエンド詳細構造

```
src-tauri/src/
├── main.rs                       # Tauri Builder 設定・プラグイン登録
├── lib.rs                        # pub mod 宣言
│
├── commands/                     # IPC コマンドハンドラ（#[tauri::command]）
│   ├── mod.rs
│   ├── fs.rs                     # ファイル I/O コマンド           [Unit 1]
│   ├── vault.rs                  # Vault 管理コマンド              [Unit 1]
│   ├── window.rs                 # ウィンドウ・ペイン状態管理       [Unit 1]
│   ├── editor.rs                 # エディタ関連コマンド             [Unit 2]
│   ├── file_tree.rs              # ファイルツリー・メタデータ取得   [Unit 3]
│   ├── knowledge.rs              # リンク・バックリンク・タグ操作   [Unit 4]
│   ├── search.rs                 # 全文検索コマンド                 [Unit 4]
│   ├── semantic.rs               # セマンティック検索・RAG コマンド [Unit 5]
│   ├── git.rs                    # Git 操作コマンド                 [Unit 6]
│   ├── sync.rs                   # 同期・競合解決コマンド           [Unit 6]
│   ├── terminal.rs               # ターミナル・プロセス管理コマンド [Unit 7]
│   ├── agent.rs                  # エージェント管理コマンド         [Unit 7]
│   ├── capture.rs                # システムレベルキャプチャコマンド [Unit 8]
│   ├── session_log.rs            # セッションログコマンド           [Unit 8]
│   ├── guardrails.rs             # コスト管理・サンドボックスコマンド[Unit 9]
│   ├── credentials.rs            # 認証情報管理コマンド             [Unit 9]
│   └── publish.rs                # コンテンツ公開コマンド           [Unit 10]
│
├── services/                     # バックエンドサービス（ビジネスロジック）
│   ├── mod.rs
│   ├── fs_service.rs             # ファイルシステム操作             [Unit 1]
│   ├── watcher_service.rs        # ファイルシステム監視（notify）   [Unit 1, 7, 8]
│   ├── vault_service.rs          # Vault ライフサイクル管理         [Unit 1]
│   ├── link_index_service.rs     # リンク・バックリンクインデックス [Unit 4]
│   ├── tag_service.rs            # タグインデックス管理             [Unit 4]
│   ├── search_service.rs         # Tantivy 全文検索                 [Unit 4]
│   ├── embedding_service.rs      # ONNX Runtime Embedding 生成     [Unit 5]
│   ├── vector_store_service.rs   # sqlite-vss ベクトルストア        [Unit 5]
│   ├── git_service.rs            # git2 による Git 操作             [Unit 6]
│   ├── sync_service.rs           # 自動同期スケジューラ             [Unit 6]
│   ├── conflict_service.rs       # 競合検出・解決                   [Unit 6]
│   ├── process_service.rs        # 外部プロセス管理（PTY）          [Unit 7]
│   ├── agent_registry.rs         # エージェント状態管理             [Unit 7]
│   ├── capture_service.rs        # システムレベル操作キャプチャ     [Unit 8]
│   ├── ambient_service.rs        # アンビエントエージェント（Rust 層）[Unit 8]
│   ├── session_log_service.rs    # セッションログ生成・管理         [Unit 8]
│   ├── cost_tracker_service.rs   # API コスト・トークン追跡         [Unit 9]
│   ├── log_rotation_service.rs   # ログローテーション・パージ       [Unit 9]
│   ├── sandbox_service.rs        # サンドボックスポリシー管理       [Unit 9]
│   ├── credential_service.rs     # 認証情報管理（keyring）          [Unit 9]
│   ├── masking_service.rs        # 秘匿情報マスキング              [Unit 8, 9]
│   └── publish_service.rs        # 外部 API 連携（Zenn/X/Threads/Note）[Unit 10]
│
├── models/                       # データモデル（Rust struct）
│   ├── mod.rs
│   ├── vault.rs                  # Vault, VaultConfig
│   ├── file.rs                   # FileEntry, FileMetadata, FileContent
│   ├── editor.rs                 # EditorState, TabState, PaneLayout
│   ├── note.rs                   # Note, Frontmatter, Link, Tag
│   ├── search.rs                 # SearchQuery, SearchResult, SemanticResult
│   ├── git.rs                    # GitStatus, Commit, Diff, Branch, ConflictInfo
│   ├── agent.rs                  # AgentInfo, AgentStatus, AgentConfig
│   ├── session_log.rs            # SessionLog, DailyLog, LogEntry
│   ├── capture.rs                # CaptureEvent, RawLogEntry
│   ├── cost.rs                   # CostRecord, CostSummary, BudgetConfig
│   └── publish.rs                # PublishTarget, PublishResult, Template
│
└── utils/                        # ユーティリティ
    ├── mod.rs
    ├── path.rs                   # パス正規化・検証
    ├── gitignore.rs              # .gitignore パース・フィルタリング
    └── error.rs                  # 共通エラー型
```

---

## 3. フロントエンド詳細構造

```
src/
├── main.tsx                      # ReactDOM.createRoot
├── App.tsx                       # レイアウト組み立て（Ribbon + Sidebar + Center + Terminal + StatusBar）
│
├── features/                     # 機能別モジュール（Unit 対応）
│   ├── shell/                    # [Unit 1] アプリケーションシェル
│   │   ├── components/
│   │   │   ├── AppLayout.tsx     # 全体レイアウト（リサイズ可能パネル構成）
│   │   │   ├── Ribbon.tsx        # 左端リボン（アイコンナビゲーション）
│   │   │   ├── TabBar.tsx        # エディタタブバー
│   │   │   ├── PaneContainer.tsx # ペイン分割コンテナ
│   │   │   └── StatusBar.tsx     # 下部ステータスバー（基盤部分）
│   │   ├── hooks/
│   │   └── index.ts
│   │
│   ├── editor/                   # [Unit 2] マークダウンエディタ
│   │   ├── components/
│   │   │   ├── MarkdownEditor.tsx    # Live Preview エディタ本体
│   │   │   ├── CodeViewer.tsx        # コードファイル閲覧（読み取り専用）
│   │   │   ├── FrontmatterGUI.tsx    # YAML Frontmatter GUI
│   │   │   └── EditorContainer.tsx   # エディタ種別の切り替え（MD/Code）
│   │   ├── extensions/               # CodeMirror 6 拡張
│   │   │   ├── live-preview.ts       # Live Preview 拡張
│   │   │   ├── internal-link.ts      # [[]] リンク装飾（Unit 4 と協調）
│   │   │   ├── tag-highlight.ts      # #tag ハイライト（Unit 4 と協調）
│   │   │   └── image-preview.ts      # 画像埋め込みプレビュー
│   │   ├── hooks/
│   │   └── index.ts
│   │
│   ├── file-management/          # [Unit 3] ファイル管理
│   │   ├── components/
│   │   │   ├── FileExplorer.tsx      # ファイルエクスプローラ（ツリー）
│   │   │   ├── FileTreeNode.tsx      # ツリーノード
│   │   │   ├── QuickSwitcher.tsx     # Quick Switcher モーダル
│   │   │   └── CommandPalette.tsx    # コマンドパレットモーダル
│   │   ├── hooks/
│   │   └── index.ts
│   │
│   ├── knowledge/                # [Unit 4] ナレッジベース・コア
│   │   ├── components/
│   │   │   ├── SearchPanel.tsx       # 検索パネル（Keyword タブ）
│   │   │   ├── BacklinksPage.tsx     # バックリンクページ
│   │   │   ├── TagsPage.tsx          # タグ一覧ページ
│   │   │   ├── GraphView.tsx         # Graph View メインコンポーネント
│   │   │   ├── GraphCanvas.tsx       # SVG/Canvas グラフ描画
│   │   │   └── GraphControls.tsx     # フィルタ・ズームコントロール
│   │   ├── workers/
│   │   │   └── graph-layout.worker.ts # Web Worker: d3-force 計算
│   │   ├── hooks/
│   │   └── index.ts
│   │
│   ├── semantic-search/          # [Unit 5] セマンティック検索・RAG
│   │   ├── components/
│   │   │   ├── SemanticSearchTab.tsx  # 検索パネル（Semantic タブ）
│   │   │   ├── AIChat.tsx             # AI チャットパネル
│   │   │   ├── ChatMessage.tsx        # チャットメッセージ
│   │   │   └── RAGStatusIndicator.tsx # ステータスバー RAG 状態
│   │   ├── hooks/
│   │   └── index.ts
│   │
│   ├── git/                      # [Unit 6] Git 統合・透過的同期
│   │   ├── components/
│   │   │   ├── GitPanel.tsx           # Git サイドバーパネル
│   │   │   ├── DiffView.tsx           # 差分表示
│   │   │   ├── CommitHistory.tsx      # コミット履歴
│   │   │   ├── CommitForm.tsx         # コミットメッセージ入力
│   │   │   ├── SyncStatus.tsx         # ステータスバー同期状態
│   │   │   └── ConflictModal.tsx      # 競合解決モーダル
│   │   ├── hooks/
│   │   └── index.ts
│   │
│   ├── terminal/                 # [Unit 7] ターミナル・エージェントダッシュボード
│   │   ├── components/
│   │   │   ├── TerminalPanel.tsx      # ターミナルパネル（右側）
│   │   │   ├── TerminalTab.tsx        # ターミナルタブ
│   │   │   ├── TerminalInstance.tsx   # xterm.js インスタンス
│   │   │   ├── AgentsDashboard.tsx    # エージェントダッシュボードパネル
│   │   │   ├── AgentCard.tsx          # エージェントカード
│   │   │   └── AgentCountBadge.tsx    # ステータスバーエージェント数
│   │   ├── hooks/
│   │   └── index.ts
│   │
│   ├── reliability/              # [Unit 8] システム信頼性・セッションログ
│   │   ├── components/
│   │   │   ├── LogsPanel.tsx          # セッションログ一覧パネル
│   │   │   ├── LogEntry.tsx           # ログエントリ
│   │   │   ├── AmbientManagerCard.tsx # Ambient Manager ダッシュボードカード
│   │   │   └── DailyLogView.tsx       # デイリーログ表示
│   │   ├── hooks/
│   │   └── index.ts
│   │
│   ├── guardrails/               # [Unit 9] ガードレール・セキュリティ
│   │   ├── components/
│   │   │   ├── CostDisplay.tsx        # コスト表示・グラフ
│   │   │   ├── BudgetBar.tsx          # 予算バー
│   │   │   ├── CredentialManager.tsx  # 認証情報管理画面
│   │   │   └── CostStatusBadge.tsx    # ステータスバー API コスト
│   │   ├── hooks/
│   │   └── index.ts
│   │
│   └── publishing/               # [Unit 10] コンテンツ公開パイプライン
│       ├── components/
│       │   ├── PublishPanel.tsx        # Publish サイドバーパネル
│       │   ├── BlogSection.tsx        # ブログ公開セクション
│       │   ├── SNSSection.tsx         # SNS 投稿セクション
│       │   ├── PublishModal.tsx        # 公開モーダル（Zenn/X/Threads）
│       │   └── TemplateEditor.tsx     # 投稿テンプレート編集
│       ├── hooks/
│       └── index.ts
│
├── shared/                       # 共有コンポーネント・ユーティリティ
│   ├── components/
│   │   ├── Modal.tsx                  # 汎用モーダル
│   │   ├── ContextMenu.tsx            # 右クリックメニュー
│   │   ├── Toast.tsx                  # 通知トースト
│   │   ├── Tooltip.tsx                # ツールチップ
│   │   └── LoadingSpinner.tsx         # ローディング表示
│   ├── utils/
│   │   ├── ipc.ts                     # Tauri IPC ラッパー
│   │   ├── path.ts                    # パスユーティリティ
│   │   └── format.ts                  # フォーマットユーティリティ
│   └── constants.ts                   # 定数定義
│
├── stores/                       # Zustand ストア
│   ├── vault-store.ts            # Vault 状態                      [Unit 1]
│   ├── editor-store.ts           # タブ・ペイン・エディタ状態      [Unit 1, 2]
│   ├── file-tree-store.ts        # ファイルツリー状態              [Unit 3]
│   ├── knowledge-store.ts        # リンク・タグ・検索状態          [Unit 4]
│   ├── semantic-store.ts         # セマンティック検索・RAG 状態    [Unit 5]
│   ├── git-store.ts              # Git・同期状態                    [Unit 6]
│   ├── terminal-store.ts         # ターミナル・エージェント状態    [Unit 7]
│   ├── log-store.ts              # セッションログ状態              [Unit 8]
│   ├── cost-store.ts             # コスト・予算状態                [Unit 9]
│   └── publish-store.ts          # 公開パイプライン状態            [Unit 10]
│
├── types/                        # 共有型定義
│   ├── vault.ts                  # Vault 関連型
│   ├── file.ts                   # ファイル・メタデータ型
│   ├── editor.ts                 # エディタ・タブ・ペイン型
│   ├── note.ts                   # ノート・リンク・タグ型
│   ├── search.ts                 # 検索関連型
│   ├── git.ts                    # Git 関連型
│   ├── agent.ts                  # エージェント関連型
│   ├── log.ts                    # ログ関連型
│   ├── cost.ts                   # コスト関連型
│   ├── publish.ts                # 公開関連型
│   └── ipc.ts                    # IPC コマンド・イベント型
│
├── hooks/                        # 共有カスタムフック
│   ├── use-ipc.ts                # IPC 通信フック
│   ├── use-event-listener.ts     # Tauri イベントリスナーフック
│   └── use-keyboard-shortcut.ts  # キーボードショートカットフック
│
└── styles/
    ├── globals.css               # グローバルスタイル + Tailwind ディレクティブ
    └── theme.ts                  # テーマ定数（CSS 変数の TS 参照）
```

---

## 4. UI コンポーネント階層（モックアップ準拠）

モックアップ `techtite_mockup.html` の UI 構成に対応する React コンポーネント階層。

```
App.tsx
├── AppLayout.tsx                              [Unit 1]
│   ├── Ribbon                                 [Unit 1]
│   │   ├── rb-icon: Files                     → FileExplorer 表示
│   │   ├── rb-icon: Search                    → SearchPanel 表示
│   │   ├── rb-icon: Backlinks                 → BacklinksPage 表示
│   │   ├── rb-icon: Tags                      → TagsPage 表示
│   │   ├── rb-icon: Graph                     → GraphView 表示
│   │   ├── rb-icon: Git                       → GitPanel 表示
│   │   ├── rb-icon: Agents                    → AgentsDashboard 表示
│   │   ├── rb-icon: Logs                      → LogsPanel 表示
│   │   ├── rb-icon: Publish                   → PublishPanel 表示
│   │   └── rb-icon: Settings                  → 設定画面
│   │
│   ├── LeftSidebar（リサイズ可能）
│   │   ├── FileExplorer                       [Unit 3]
│   │   ├── SearchPanel (Keyword / Semantic)   [Unit 4, 5]
│   │   ├── BacklinksPage                      [Unit 4]
│   │   ├── TagsPage                           [Unit 4]
│   │   ├── GraphView                          [Unit 4]
│   │   ├── GitPanel                           [Unit 6]
│   │   ├── AgentsDashboard                    [Unit 7]
│   │   │   ├── AgentCard（各エージェント）    [Unit 7]
│   │   │   └── AmbientManagerCard             [Unit 8]
│   │   ├── LogsPanel                          [Unit 8]
│   │   └── PublishPanel                       [Unit 10]
│   │
│   ├── CenterArea（リサイズ可能）
│   │   ├── TabBar                             [Unit 1]
│   │   └── PaneContainer                      [Unit 1]
│   │       ├── MarkdownEditor (Live Preview)  [Unit 2]
│   │       ├── CodeViewer (Read-only)         [Unit 2]
│   │       ├── FrontmatterGUI                 [Unit 2]
│   │       ├── DiffView                       [Unit 6]
│   │       └── DailyLogView                   [Unit 8]
│   │
│   ├── RightTerminal（リサイズ可能）
│   │   └── TerminalPanel                      [Unit 7]
│   │       └── TerminalTab（複数）            [Unit 7]
│   │           └── TerminalInstance (xterm.js) [Unit 7]
│   │
│   └── StatusBar                              [Unit 1 基盤]
│       ├── ブランチ名                         [Unit 6]
│       ├── 同期状態アイコン                   [Unit 6]
│       ├── RAG 状態                           [Unit 5]
│       ├── エージェント数                     [Unit 7]
│       └── API コスト                         [Unit 9]
│
├── QuickSwitcher (モーダル)                   [Unit 3]
├── CommandPalette (モーダル)                   [Unit 3]
├── ConflictModal (モーダル)                    [Unit 6]
├── PublishModal (モーダル)                     [Unit 10]
└── AIChat (フローティングパネル)               [Unit 5]
```

---

## 5. ユニット別ファイル所有権マトリクス

各ユニットの担当エージェントが **主に編集する** ファイル・ディレクトリの境界。

| Unit | Rust commands/ | Rust services/ | Rust models/ | Frontend features/ | Stores | Types |
|------|---------------|----------------|--------------|-------------------|--------|-------|
| **1** | `fs.rs`, `vault.rs`, `window.rs` | `fs_service.rs`, `watcher_service.rs`, `vault_service.rs` | `vault.rs`, `file.rs`, `editor.rs` | `shell/` | `vault-store`, `editor-store` | `vault.ts`, `file.ts`, `editor.ts` |
| **2** | `editor.rs` | — | — | `editor/` | `editor-store`（エディタ固有部分） | — |
| **3** | `file_tree.rs` | — | — | `file-management/` | `file-tree-store` | — |
| **4** | `knowledge.rs`, `search.rs` | `link_index_service.rs`, `tag_service.rs`, `search_service.rs` | `note.rs`, `search.rs` | `knowledge/` | `knowledge-store` | `note.ts`, `search.ts` |
| **5** | `semantic.rs` | `embedding_service.rs`, `vector_store_service.rs` | `search.rs`（セマンティック部分） | `semantic-search/` | `semantic-store` | `search.ts`（セマンティック部分） |
| **6** | `git.rs`, `sync.rs` | `git_service.rs`, `sync_service.rs`, `conflict_service.rs` | `git.rs` | `git/` | `git-store` | `git.ts` |
| **7** | `terminal.rs`, `agent.rs` | `process_service.rs`, `agent_registry.rs` | `agent.rs` | `terminal/` | `terminal-store` | `agent.ts` |
| **8** | `capture.rs`, `session_log.rs` | `capture_service.rs`, `ambient_service.rs`, `session_log_service.rs`, `masking_service.rs` | `session_log.rs`, `capture.rs` | `reliability/` | `log-store` | `log.ts` |
| **9** | `guardrails.rs`, `credentials.rs` | `cost_tracker_service.rs`, `log_rotation_service.rs`, `sandbox_service.rs`, `credential_service.rs` | `cost.rs` | `guardrails/` | `cost-store` | `cost.ts` |
| **10** | `publish.rs` | `publish_service.rs` | `publish.rs` | `publishing/` | `publish-store` | `publish.ts` |

### 共有ファイルの編集ルール

以下のファイルは **複数ユニットが参照** するため、編集には注意が必要。

| ファイル | 主担当 | 備考 |
|---------|--------|------|
| `src-tauri/src/main.rs` | Unit 1 | コマンド登録は各ユニットが追記（追記のみ・既存行を変更しない） |
| `src-tauri/src/lib.rs` | Unit 1 | モジュール宣言の追記のみ |
| `src/App.tsx` | Unit 1 | レイアウト構成の基盤。各ユニットはスロットに自コンポーネントを配置 |
| `src/shared/` | Unit 1 | 共有コンポーネント。変更は PR レビュー必須 |
| `src/types/` | 各 Unit | 自分のドメインの型のみ編集。共有型（`ipc.ts`）の変更は PR レビュー必須 |
| `src/stores/editor-store.ts` | Unit 1（基盤）, Unit 2（エディタ固有） | スライスで分離。互いのスライスを変更しない |
| `src-tauri/src/utils/` | Unit 1 | 共有ユーティリティ。変更は PR レビュー必須 |
| `src-tauri/src/services/watcher_service.rs` | Unit 1（基盤） | Unit 7, 8 はイベント購読のみ。Watcher 本体は Unit 1 が管理 |
| `src-tauri/src/services/masking_service.rs` | Unit 8（主担当） | Unit 9 はマスキング API を利用するのみ |

---

## 6. Vault 内ディレクトリ構造（ユーザーのプロジェクト）

```
<vault>/
├── .git/                         # Git リポジトリ
├── .gitignore                    # Techtite が .techtite/ を自動登録
├── .techtite/                    # Techtite ローカルデータ（Git 対象外）
│   ├── metadata.db               # SQLite メタデータ DB
│   ├── search_index/             # Tantivy 全文検索インデックス
│   ├── vector_index.db           # sqlite-vss ベクトルインデックス
│   ├── raw_logs/                 # システムレベル生操作ログ
│   │   ├── fs_events.jsonl       # ファイルシステムイベント
│   │   ├── git_events.jsonl      # Git 操作イベント
│   │   └── terminal_events.jsonl # ターミナルコマンド・出力
│   ├── config.json               # Vault 固有設定
│   └── agent_logs/               # エージェント操作ログ
├── <ユーザーのファイル>/          # マークダウン、コード等
└── <セッションログ保存先>/        # Git 同期対象のセッションログ（設定可能）
    └── session-logs/
        ├── 2026-02-28-daily.md
        └── 2026-02-28-agent-01-session-001.md
```
