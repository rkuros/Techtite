# Techtite 技術仕様策定計画

## 目的

Unit 1-10 が並列作業可能になるよう、共有インターフェース・技術選定・各ユニットの技術仕様を策定する。

> **スコープ**: 技術仕様の文書化のみ。アーキテクチャコンポーネントやコードは生成しない。
> **並列作業の意味**: 各 Unit は別々の AI エージェントが担当する作業単位。プロジェクトは単一の Tauri アプリケーション（GitHub リポジトリ 1 つ）であり、各エージェントが同一コードベース内の担当領域を並行して開発する。
> **UI モックアップ**: `techtite_mockup.html` に画面モックが存在する。各ユニットの技術仕様策定時に参照し、担当する UI 領域を明確化する。

---

## 前提条件: 技術選定に関する質問と回答

### 回答サマリー

| # | 質問 | 回答 | 決定内容 |
|---|------|------|----------|
| Q1 | フロントエンドフレームワーク | お任せ | **React** — CodeMirror 6、xterm.js、d3-force すべてに成熟したバインディングが存在。エコシステム最大 |
| Q2 | 状態管理 | （Unit分割とは無関係。アプリ内部の設計として決定） | **Zustand** — 軽量・シンプル。機能領域ごとに独立した Store スライスを定義可能。React との相性良好 |
| Q3 | CSS / スタイリング | お任せ | **Tailwind CSS** — ユーティリティファーストでデザイン一貫性を維持しやすい。PurgeCSS によるビルド最適化 |
| Q4 | プロジェクト構成 | GitHub でいい（モノレポ不要） | **単一 Tauri プロジェクト**（GitHub リポジトリ 1 つ）。pnpm でパッケージ管理。モノレポツールは使用しない |
| Q5 | Claude Code 統合方式 | C と B 両方使えるように | **B（SDK/API）+ C（CLI + 構造化出力）のデュアル対応**。ターミナル表示は CLI モード、プログラム的制御は SDK モード |
| Q6 | テスト戦略 | お任せ | **Vitest + Testing Library**（フロントエンド）、**Rust 標準テスト**（バックエンド）、**Playwright**（E2E） |
| Q7 | データベース戦略 | セッションログの記述を修正 | 提案通り採用。セッションログは「AIエージェントが読む前提。人間も読む。」 |
| Q8 | アンビエントエージェント実装方式 | C（ハイブリッド） | **Rust サービスで監視・検証 + Claude Code で知的判断**（ログ構造化、品質チェック等） |
| Q9 | 自動コミットメッセージ生成方式 | 普通に Claude Code でいい | **Claude Code によるコミットメッセージ生成**。エージェント非稼働時はテンプレートフォールバック |

---

### 追加確認事項

**[Question 10]** Q9 の回答と US-5.9 の要件の整合性について

US-5.9 には以下の要件が記載されています:
> コミットメッセージはAIがローカルで変更内容から自動生成する。**差分・変更内容は外部LLM/外部サービスに送信しない（オンデバイス生成 or テンプレートフォールバック）**

Q9 の回答「普通に Claude Code でいい」を反映すると、Claude Code（Anthropic API）を使用するため、厳密には「外部サービスへの送信」に該当します。

→ US-5.9 の当該要件を以下のように変更してよいですか？
- 変更前:「差分・変更内容は外部LLM/外部サービスに送信しない」
- 変更後:「コミットメッセージ生成には Claude Code を使用する。Claude Code エージェント非稼働時はテンプレートベースで生成する」

[Answer] 変更していい。

---

### Q1-Q9 の詳細（アーカイブ）

<details>
<summary>Q1: フロントエンドフレームワーク</summary>

| 選択肢 | 特徴 | 考慮事項 |
|--------|------|----------|
| **React** | 最大のエコシステム。CodeMirror 6（@uiw/react-codemirror）、xterm.js（@xterm/xterm + React wrapper）、d3-force すべてに成熟したバインディングが存在 | バンドルサイズがやや大きい。仮想DOM のオーバーヘッド |
| **Solid** | React 風のAPI だが仮想DOM なし。パフォーマンスに優れる | CodeMirror 6 / xterm.js のバインディングが未成熟。コミュニティが小さい |
| **Svelte** | コンパイラベース。ボイラープレートが少ない | CodeMirror 6 統合の実績が限定的。大規模アプリでのモジュール分割の事例が少ない |

**回答**: お任せ → **React** を選定

</details>

<details>
<summary>Q2: 状態管理</summary>

**回答**: Unit分割とは無関係だが、アプリ内部の設計として **Zustand** を選定

</details>

<details>
<summary>Q3: CSS / スタイリング</summary>

**回答**: お任せ → **Tailwind CSS** を選定

</details>

<details>
<summary>Q4: プロジェクト構成</summary>

**回答**: GitHub でいい。モノレポ不要。単一 Tauri プロジェクト

</details>

<details>
<summary>Q5: Claude Code 統合方式</summary>

**回答**: C（CLI + 構造化出力）と B（SDK/API）の両方を使えるようにする

</details>

<details>
<summary>Q6: テスト戦略</summary>

**回答**: お任せ → 提案構成を採用

</details>

<details>
<summary>Q7: データベース戦略</summary>

**回答**: セッションログの記述を「AIエージェントが読む前提。人間も読む。」に修正。他は提案通り

</details>

<details>
<summary>Q8: アンビエントエージェント実装方式</summary>

**回答**: C（ハイブリッド）— Rust サービス + Claude Code

</details>

<details>
<summary>Q9: 自動コミットメッセージ生成</summary>

**回答**: 普通に Claude Code でいい

</details>

---

## 計画ステップ

### Step 1: 技術スタック確定ドキュメント作成
- [x] 質問への回答を反映し、確定した技術スタック一覧を文書化する
- [x] フロントエンド・バックエンド・インフラ・ツールチェーンの全レイヤーを網羅
- [x] 出力: `aidlc-docs/inception/tech_stack.md`

### Step 2: プロジェクト構造・ディレクトリ規約・UI コンポーネント階層の定義
- [x] 単一 Tauri プロジェクトのディレクトリレイアウトを定義する
- [x] Rust バックエンドのモジュール構造（ユニットごとの責任範囲）を定義する
- [x] フロントエンドのディレクトリ構造（features ベースの分割）を定義する
- [x] `techtite_mockup.html` を参照し、UI コンポーネント階層（Ribbon / Sidebar / Center / Terminal / StatusBar）と各ユニットの担当領域をマッピングする
- [x] 各ユニット担当エージェントが編集するファイル・ディレクトリの境界を明確化する
- [x] 出力: `aidlc-docs/inception/project_structure.md`

### Step 3: 共有データモデル・型定義の設計
- [x] 全ユニットが共有するコアデータモデル（Vault, File, Note, Tag, Link 等）を定義する
- [x] IPC 経由で送受信するデータ構造を定義する
- [x] TypeScript 型と Rust struct の対応を定義する
- [x] 出力: `aidlc-docs/inception/shared_data_models.md`

### Step 4: IPC コマンドレジストリ・イベントプロトコルの設計
- [x] Tauri IPC コマンドの命名規約・登録パターンを定義する
- [x] フロントエンド → Rust / Rust → フロントエンドのイベントプロトコルを定義する
- [x] ユニット間で使用するイベント一覧を定義する
- [x] 出力: `aidlc-docs/inception/ipc_event_protocol.md`

### Step 5: Unit 1（アプリケーションシェル）技術仕様
- [x] Tauri 設定、ウィンドウ管理、Vault ライフサイクル、IPC ファイルI/O の詳細仕様
- [x] UI 担当領域: Ribbon、アプリ全体レイアウト、タブバー、ステータスバー（基盤部分）
- [x] 他ユニットに公開するインターフェース定義
- [x] 出力: `aidlc-docs/inception/units/unit_01_application_shell.md` に追記

### Step 6: Unit 2（マークダウンエディタ）技術仕様
- [x] CodeMirror 6 拡張設計、Live Preview 実装方式、記法サポート範囲の仕様
- [x] UI 担当領域: Center Editor エリア（マークダウン表示 / コードビュー / Frontmatter GUI）
- [x] 他ユニットに公開するインターフェース定義
- [x] 出力: `aidlc-docs/inception/units/unit_02_markdown_editor.md` に追記

### Step 7: Unit 3（ファイル管理）技術仕様
- [x] ファイルエクスプローラ、Quick Switcher、コマンドパレットの詳細仕様
- [x] UI 担当領域: Left Sidebar の Files パネル、Quick Switcher モーダル、コマンドパレットモーダル
- [x] 他ユニットに公開するインターフェース定義
- [x] 出力: `aidlc-docs/inception/units/unit_03_file_management.md` に追記

### Step 8: Unit 4（ナレッジベース・コア）技術仕様
- [x] 内部リンク解析、バックリンクインデックス、タグ管理、全文検索エンジン、Graph View の詳細仕様
- [x] UI 担当領域: Left Sidebar の Search パネル（Keyword）、Backlinks ページ、Tags ページ、Graph View ページ、エディタ内 `[[]]` リンク装飾
- [x] 他ユニットに公開するインターフェース定義
- [x] 出力: `aidlc-docs/inception/units/unit_04_knowledge_base_core.md` に追記

### Step 9: Unit 5（セマンティック検索・RAG）技術仕様
- [x] Embedding パイプライン、チャンキング戦略、Vector Store、ハイブリッド検索、AI チャットの詳細仕様
- [x] UI 担当領域: Left Sidebar の Search パネル（Semantic タブ）、ステータスバーの RAG 状態表示、AI チャットパネル
- [x] 他ユニットに公開するインターフェース定義
- [x] 出力: `aidlc-docs/inception/units/unit_05_semantic_search_rag.md` に追記

### Step 10: Unit 6（Git統合・透過的同期）技術仕様
- [x] Git 操作ラッパー、自動同期スケジューラ、競合検出・解決フローの詳細仕様
- [x] UI 担当領域: Left Sidebar の Git パネル、ステータスバーのブランチ・同期状態、競合解決モーダル、Diff ビュー
- [x] 他ユニットに公開するインターフェース定義
- [x] 出力: `aidlc-docs/inception/units/unit_06_git_sync.md` に追記

### Step 11: Unit 7（ターミナル・エージェントダッシュボード）技術仕様
- [x] ターミナルエミュレータ、エージェントプロセス管理、ダッシュボード UI の詳細仕様
- [x] UI 担当領域: Right Terminal パネル（エージェント別タブ）、Left Sidebar の Agents Dashboard パネル（エージェントカード・起動/停止）、ステータスバーのエージェント数表示
- [x] 他ユニットに公開するインターフェース定義
- [x] 出力: `aidlc-docs/inception/units/unit_07_terminal_agent_dashboard.md` に追記

### Step 12: Unit 8（システム信頼性・セッションログ）技術仕様
- [x] システムレベルキャプチャ、アンビエントエージェント、セッションログ生成の詳細仕様
- [x] UI 担当領域: Left Sidebar の Logs パネル（セッションログ一覧）、Agents Dashboard 内の Ambient Manager カード、セッションログ表示（エディタ内マークダウン）
- [x] 他ユニットに公開するインターフェース定義
- [x] 出力: `aidlc-docs/inception/units/unit_08_system_reliability_session_logs.md` に追記

### Step 13: Unit 9（ガードレール・セキュリティ）技術仕様
- [x] コスト管理、ログローテーション、サンドボックス、認証情報管理の詳細仕様
- [x] UI 担当領域: Agents Dashboard 内のコスト表示・予算バー、ステータスバーの API コスト表示、設定画面（認証情報管理）
- [x] 他ユニットに公開するインターフェース定義
- [x] 出力: `aidlc-docs/inception/units/unit_09_guardrails_security.md` に追記

### Step 14: Unit 10（コンテンツ公開パイプライン）技術仕様
- [x] ブログ/SNS 変換パイプライン、外部API 連携、記法変換エンジンの詳細仕様
- [x] UI 担当領域: Left Sidebar の Publish パネル（Blog/SNS セクション）、公開モーダル（Zenn/X/Threads）、セッションログ内の公開ボタン
- [x] 他ユニットに公開するインターフェース定義
- [x] 出力: `aidlc-docs/inception/units/unit_10_content_publishing.md` に追記

### Step 15: ユニット間依存関係マトリクス・並列作業ガイド
- [x] 全ユニット間の依存関係マトリクスを作成する
- [x] 並列作業時のファイル境界・競合回避ルールを定義する
- [x] 各ユニットの開発着手に必要な前提条件を明確化する
- [x] 出力: `aidlc-docs/inception/parallel_work_guide.md`
