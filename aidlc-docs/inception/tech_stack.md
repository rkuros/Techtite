# Techtite 技術スタック確定ドキュメント

> **ステータス**: 確定（technical_spec_plan.md Q1-Q10 回答反映済み）
> **最終更新**: 2026-02-28

---

## 1. アプリケーションフレームワーク

| 項目 | 選定技術 | バージョン方針 | 選定理由 |
|------|---------|--------------|---------|
| デスクトップフレームワーク | **Tauri 2.x** | 最新安定版 | Rust バックエンド + WebView フロントエンド。軽量バイナリ、ネイティブ API アクセス、IPC 基盤 |
| バックエンド言語 | **Rust** | stable toolchain | Tauri のバックエンド。パフォーマンス、メモリ安全性、Tantivy/git2 等のネイティブライブラリ活用 |
| フロントエンド言語 | **TypeScript** | 5.x | 型安全なフロントエンド開発。React/CodeMirror/xterm.js すべてで TypeScript サポートが成熟 |

---

## 2. フロントエンド

| 項目 | 選定技術 | 選定理由 |
|------|---------|---------|
| UI フレームワーク | **React 18+** | CodeMirror 6（@uiw/react-codemirror）、xterm.js（@xterm/xterm + React wrapper）、d3-force すべてに成熟したバインディング。最大のエコシステム |
| 状態管理 | **Zustand** | 軽量・シンプル。機能領域ごとに独立した Store スライスを定義可能。ボイラープレートが少なく React との相性良好 |
| CSS / スタイリング | **Tailwind CSS** | ユーティリティファーストでデザイン一貫性を維持しやすい。PurgeCSS によるビルド最適化。ダークテーマベースの UI に適合 |
| ビルドツール | **Vite** | Tauri 2.x の標準フロントエンドビルドツール。高速な HMR、TypeScript/React/Tailwind の統合 |

### フロントエンド主要ライブラリ

| ライブラリ | 用途 | 対応ユニット |
|-----------|------|------------|
| **@uiw/react-codemirror** | CodeMirror 6 の React バインディング。Live Preview エディタ基盤 | Unit 2 |
| **@codemirror/lang-markdown** | Markdown 言語サポート（パース、ハイライト） | Unit 2 |
| **@codemirror/lang-*（各言語）** | コードファイルのシンタックスハイライト（TypeScript, Python, Rust 等） | Unit 2 |
| **@xterm/xterm** | ターミナルエミュレータ。エージェント別タブの組み込みターミナル | Unit 7 |
| **@xterm/addon-fit** | ターミナルの自動リサイズ | Unit 7 |
| **@xterm/addon-search** | ターミナル出力内テキスト検索 | Unit 7 |
| **d3-force** | Graph View のノード配置物理シミュレーション（center/repel/link force） | Unit 4 |
| **d3-selection / d3-zoom** | Graph View の SVG レンダリング・ズーム・パン操作 | Unit 4 |
| **react-resizable-panels** | ペイン分割・リサイズ（Left Sidebar / Center / Right Terminal） | Unit 1 |
| **katex** | LaTeX 数式レンダリング（CodeMirror 6 拡張として統合） | Unit 2 |
| **yaml** | YAML Frontmatter のパース・シリアライズ | Unit 2 |
| **fuse.js** | クライアントサイドのファジーマッチ（Quick Switcher、コマンドパレット） | Unit 3 |
| **recharts** または **@nivo/line** | コスト推移グラフ、RAG ヘルス指標の可視化 | Unit 9, Unit 5 |

---

## 3. バックエンド（Rust）

| ライブラリ（crate） | 用途 | 対応ユニット |
|-------------------|------|------------|
| **tauri 2.x** | アプリケーションシェル、IPC コマンド、ウィンドウ管理、ファイルダイアログ | Unit 1 |
| **tauri-plugin-fs** | ファイルシステム操作（読み取り、書き込み、監視） | Unit 1 |
| **tauri-plugin-dialog** | ネイティブダイアログ（フォルダ選択、確認等） | Unit 1 |
| **tauri-plugin-shell** | 外部プロセス（Claude Code CLI）の起動・管理 | Unit 7 |
| **tauri-plugin-store** | アプリ設定・ウィンドウ状態の永続化（JSON ストア） | Unit 1 |
| **notify** | ファイルシステム監視（Watcher）。ファイル変更のリアルタイム検出 | Unit 1, Unit 7, Unit 8 |
| **tantivy** | 全文検索エンジン。キーワード検索インデックスの構築・クエリ | Unit 4 |
| **rusqlite** (+ **sqlite-vss**) | SQLite データベース。メタデータストア + ベクトル検索 | Unit 4, Unit 5 |
| **ort** (ONNX Runtime) | ローカル Embedding モデル推論。ベクトル生成 | Unit 5 |
| **git2** (libgit2 バインディング) | Git 操作（リポジトリ認識、コミット、差分、ブランチ、リモート操作） | Unit 6 |
| **tokio** | 非同期ランタイム。バックグラウンドタスク（同期、インデックス構築等） | 全ユニット |
| **serde** / **serde_json** | JSON シリアライズ・デシリアライズ。IPC データ交換、ログ構造化 | 全ユニット |
| **regex** | 正規表現。秘匿情報マスキング、パターンマッチ | Unit 8, Unit 9 |
| **flate2** | gzip 圧縮。ログローテーション時の圧縮 | Unit 9 |
| **keyring** | OS 標準キーチェーンへの認証情報保管（macOS Keychain, Windows Credential Manager） | Unit 9 |
| **reqwest** | HTTP クライアント。外部 API（Zenn, X, Threads, Note）への通信 | Unit 10 |
| **pulldown-cmark** | Markdown パース。内部リンク `[[]]` の解析、記法変換 | Unit 4, Unit 10 |

---

## 4. データストレージ

| ストレージ | 技術 | 保存場所 | Git 同期 | 用途 |
|-----------|------|---------|---------|------|
| メタデータ DB | **SQLite**（rusqlite） | `<vault>/.techtite/metadata.db` | 対象外 | ファイルメタデータ、タグインデックス、バックリンクインデックス、設定 |
| 全文検索インデックス | **Tantivy** | `<vault>/.techtite/search_index/` | 対象外 | キーワード全文検索用の転置インデックス |
| ベクトルインデックス | **sqlite-vss**（SQLite 拡張） | `<vault>/.techtite/vector_index.db` | 対象外 | Embedding ベクトル、セマンティック検索用 ANN インデックス |
| 生操作ログ | **JSON / SQLite** | `<vault>/.techtite/raw_logs/` | 対象外 | システムレベルキャプチャの生データ（ファイル操作、Git 操作、コマンド実行） |
| セッションログ | **Markdown ファイル** | `<vault>/<設定可能パス>/` | **対象** | 構造化セッションログ（人間・AI が読む） |
| アプリ設定 | **JSON**（tauri-plugin-store） | OS 標準アプリデータ | 対象外 | ウィンドウ状態、Vault パス、各種設定 |
| 認証情報 | **OS キーチェーン**（keyring） | OS 標準キーチェーン | 対象外 | API Key、Token、SSH キー参照 |

### .techtite ディレクトリの自動 .gitignore 登録

`<vault>/.techtite/` 配下のすべてのファイルは自動的に `.gitignore` に追加される。セッションログのみ `.techtite/` の外に配置し、Git 同期対象とする。

---

## 5. AI エージェント統合

| 項目 | 選定技術 | 選定理由 |
|------|---------|---------|
| AI エージェント | **Claude Code** | ユーザー指定。コードとドキュメントの編集を担うメインエージェント |
| SDK/API モード | **@anthropic-ai/claude-code SDK** | プログラム的なエージェント制御。起動・停止・コンテキスト指定。バックグラウンドでのコミットメッセージ生成、RAG チャット等 |
| CLI モード | **Claude Code CLI + --output-format stream-json** | ターミナル表示用。構造化 JSON ストリーム出力でエージェントの操作ログをリアルタイムパース |
| デュアル対応 | SDK + CLI を使い分け | ターミナル表示は CLI モード（人間向けリアルタイム出力）、プログラム的制御は SDK モード（自動コミットメッセージ、RAG チャット、ブログ/SNS 変換等） |

### アンビエントエージェント（ハイブリッド実装）

| レイヤー | 技術 | 役割 |
|---------|------|------|
| 監視・検証 | **Rust サービス**（tokio ベース） | 定期的なタスク完了チェック、ログ整合性検証、リソース監視。決定的・低コスト |
| 知的判断 | **Claude Code**（SDK モード） | ログ構造化、品質チェック、コンテンツ変換品質評価。LLM の知的処理が必要な部分 |

### コミットメッセージ生成（US-5.9 更新反映）

| 状態 | 方式 |
|------|------|
| Claude Code エージェント稼働中 | **Claude Code で変更内容からコミットメッセージを自動生成** |
| Claude Code エージェント非稼働時 | **テンプレートベースで生成**（例: `auto: <日時> <変更ファイル数>files changed`） |

---

## 6. テスト

| レイヤー | 選定技術 | 対象 |
|---------|---------|------|
| フロントエンド単体テスト | **Vitest** + **@testing-library/react** | React コンポーネント、Zustand ストア、ユーティリティ関数 |
| バックエンド単体テスト | **Rust 標準テスト**（`#[cfg(test)]` + `cargo test`） | Tauri コマンド、Rust モジュール、データ処理ロジック |
| E2E テスト | **Playwright** | ユーザーシナリオ全体（Tauri アプリの起動〜操作〜検証） |
| テストランナー | **Vitest**（フロントエンド） / **cargo test**（バックエンド） | CI/CD パイプラインでの自動実行 |

---

## 7. 開発ツールチェーン

| 項目 | 選定技術 |
|------|---------|
| パッケージマネージャー | **pnpm** |
| リポジトリ | **GitHub**（単一リポジトリ） |
| Rust ツールチェーン | **rustup** + **stable** toolchain |
| リンター（フロントエンド） | **ESLint** + **Prettier** |
| リンター（Rust） | **clippy** + **rustfmt** |
| CI/CD | **GitHub Actions** |

---

## 8. 対応プラットフォーム

| プラットフォーム | 優先度 | 備考 |
|----------------|--------|------|
| **macOS** (arm64 / x86_64) | **P0**（MVP） | 主要開発・テスト環境 |
| **Windows** (x86_64) | **P1** | Tauri のクロスプラットフォームサポート。キーチェーン → Windows Credential Manager |
| **Linux** (x86_64) | **P2** | Tauri のクロスプラットフォームサポート。キーチェーン → Secret Service API |

---

## 9. 外部サービス連携

| サービス | 用途 | 認証方式 | 対応ユニット |
|---------|------|---------|------------|
| **GitHub** | Git リモートリポジトリ | PAT / SSH キー / OAuth（拡張） | Unit 6 |
| **Anthropic API** | Claude Code エージェント | API Key | Unit 7, Unit 8 |
| **Zenn** | ブログ公開 | Zenn CLI / API 認証 | Unit 10 |
| **Note** | ブログ公開（Could） | Note API 認証 | Unit 10 |
| **X (Twitter)** | SNS 投稿 | OAuth 2.0 | Unit 10 |
| **Threads** | SNS 投稿（Could） | Threads API 認証 | Unit 10 |

---

## 10. バージョン管理方針

| 項目 | 方針 |
|------|------|
| フロントエンド依存関係 | `pnpm-lock.yaml` でロック。パッチバージョンのみ自動更新 |
| Rust 依存関係 | `Cargo.lock` でロック。セマンティックバージョニング準拠 |
| Node.js | LTS 最新版（20.x 以降） |
| Rust | stable 最新版 |
| Tauri | 2.x 系最新安定版 |
