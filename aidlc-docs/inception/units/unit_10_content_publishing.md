# Unit 10: コンテンツ公開パイプライン

> **対応 Epic**: Epic 8 — ブログ公開パイプライン + Epic 9 — SNS連携
> **対応ストーリー**: US-8.1〜US-8.5, US-9.1〜US-9.4

---

## ユーザーストーリーと受け入れ基準

### ブログ公開パイプライン（Epic 8）

#### US-8.1 [Should] セッションログ → ブログ下書きAI変換

個人開発者として、セッションログを選択して技術ブログ記事の下書きをAIに自動生成させたい。なぜなら、機械的なセッションログを人間が読みやすい技術ブログに変換する手間を省きたいからだ。

- [ ] セッションログ（1件または複数）を選択してブログ下書き生成を実行できる
- [ ] AIがセッションログの内容を解釈し、読者向けの文体・構成に変換する
- [ ] タイトル、導入、本文、まとめの記事構成が自動生成される
- [ ] 生成された下書きが新規マークダウンファイルとして保存される

#### US-8.2 [Should] 下書きのレビュー・修正

個人開発者として、生成されたブログ下書きをレビュー・修正したい。なぜなら、公開前に内容の正確性や表現を確認・調整したいからだ。

- [ ] 下書きがLive Previewエディタで開かれ、編集できる
- [ ] 下書きの状態（未レビュー/レビュー済み/公開済み）が管理される

#### US-8.3 [Should] 内部リンク等の記法自動変換

個人開発者として、内部リンク `[[]]` やTechtite固有の記法がブログ公開時に自動変換されてほしい。なぜなら、外部プラットフォームで正しく表示されるようにしたいからだ。

- [ ] 内部リンク `[[ファイル名]]` が標準マークダウンリンクまたはプレーンテキストに変換される
- [ ] Techtite固有の記法が除去または標準形式に変換される
- [ ] 変換は公開時に自動実行され、元のファイルは変更されない

#### US-8.4 [Should] ワンクリックZenn公開

個人開発者として、レビュー済みのブログ記事をワンクリックでZennに公開したい。なぜなら、公開作業を最小限の手間で行いたいからだ。

- [ ] Zenn CLIまたはAPIの認証設定ができる
- [ ] ワンクリック（ボタン1つ）でZennに記事を公開できる
- [ ] Zennのfrontmatter（title, emoji, type, topics, published）が自動生成・付与される
- [ ] 公開成功・失敗のフィードバックが表示される

#### US-8.5 [Could] ワンクリックNote公開

個人開発者として、レビュー済みのブログ記事をワンクリックでNoteに公開したい。なぜなら、Zenn以外のプラットフォームでも発信したいからだ。

- [ ] Note APIの認証設定ができる
- [ ] ワンクリック（ボタン1つ）でNoteに記事を公開できる
- [ ] 公開成功・失敗のフィードバックが表示される

---

### SNS連携（Epic 9）

#### US-9.1 [Should] セッションログ → SNS要約AI変換

個人開発者として、セッションログやナレッジからSNS投稿用のコンパクトな要約をAIに自動生成させたい。なぜなら、日々の作業成果を手間なく高頻度でSNS発信したいからだ。

- [ ] セッションログやノートを選択して要約生成を実行できる
- [ ] AIが内容を解釈し、SNSに適したコンパクトな投稿文に変換する
- [ ] 生成された要約がプラットフォームの文字数制限内に収まる（X: 280文字カウント、全角=2カウントのため日本語実質140文字。Threads: 500文字）
- [ ] 生成された要約をレビュー・編集してから投稿できる

#### US-9.2 [Should] ワンクリックX投稿

個人開発者として、レビュー済みの要約をワンクリックでXに投稿したい。なぜなら、技術的な知見をXのフォロワーに高頻度で発信したいからだ。

- [ ] X APIの認証設定ができる（OAuth）
- [ ] ワンクリック（ボタン1つ）でXに投稿できる
- [ ] 投稿成功・失敗のフィードバックが表示される

#### US-9.3 [Could] ワンクリックThreads投稿

個人開発者として、レビュー済みの要約をワンクリックでThreadsに投稿したい。なぜなら、Xとは別のSNSでも情報を発信したいからだ。

- [ ] Threads APIの認証設定ができる
- [ ] ワンクリック（ボタン1つ）でThreadsに投稿できる
- [ ] 投稿成功・失敗のフィードバックが表示される

#### US-9.4 [Could] 投稿テンプレート

個人開発者として、SNS投稿のテンプレート（ハッシュタグ、定型文等）をカスタマイズしたい。なぜなら、自分のブランディングに合った投稿フォーマットを使いたいからだ。

- [ ] 投稿テンプレートを設定画面で編集できる
- [ ] テンプレートにハッシュタグ、ブログURL等の変数を使用できる
- [ ] プラットフォームごとに異なるテンプレートを設定できる

---

## 技術仕様

### アーキテクチャ概要

Unit 10 はセッションログ・ナレッジから外部プラットフォーム（Zenn / Note / X / Threads）へのコンテンツ公開パイプラインを担当する。ブログ下書き生成（Claude Code SDK による AI 変換）、SNS 投稿文生成、内部記法変換、外部 API 連携の 4 つの処理段階で構成される。

Rust バックエンドに `publish_service.rs` を配置し、`commands/publish.rs` を通じてフロントエンドと通信する。AI によるコンテンツ変換は Claude Code SDK モードを使用し、セッションログのテキストをブログ記事や SNS 投稿文に変換する。内部リンク `[[]]` の解決には `pulldown-cmark` でパース後にカスタムトランスフォーマーを適用する。外部 API への通信は `reqwest` を使用し、認証情報は Unit 9 の `credential_service` から取得する。

```
┌──────────────────────────────────────────────────────────────┐
│  フロントエンド (React)                                        │
│  ┌─────────────┐ ┌────────────┐ ┌─────────────┐              │
│  │ PublishPanel │ │ BlogSection│ │ SNSSection  │              │
│  │ (Left Sidebar)│ │           │ │             │              │
│  └──────┬──────┘ └──────┬─────┘ └──────┬──────┘              │
│         │               │              │                      │
│  ┌──────┴───────────────┴──────────────┴──────┐              │
│  │           PublishModal                      │              │
│  │   (Zenn / X / Threads 公開モーダル)          │              │
│  └──────────────────────┬─────────────────────┘              │
│                         │                                     │
│  ┌──────────────────────┴─────────────────────┐              │
│  │          publish-store (Zustand)            │              │
│  └──────────────────────┬─────────────────────┘              │
├─────────────────────────┼─────────────────────────────────────│
│  IPC (Tauri invoke/emit)│                                     │
├─────────────────────────┼─────────────────────────────────────│
│  Rust バックエンド         │                                     │
│  ┌──────────────────────┴─────────────────────┐              │
│  │          commands/publish.rs                │              │
│  └──┬──────────┬──────────┬───────────────────┘              │
│     │          │          │                                   │
│  ┌──┴──────────┴──────────┴──────────┐                       │
│  │       publish_service.rs           │                       │
│  │  ┌──────────┐ ┌────────────────┐  │                       │
│  │  │ AI 変換   │ │ 記法変換        │  │                       │
│  │  │(SDK mode)│ │(pulldown-cmark)│  │                       │
│  │  └──────────┘ └────────────────┘  │                       │
│  │  ┌──────────┐ ┌────────────────┐  │                       │
│  │  │ Zenn CLI │ │ reqwest        │  │                       │
│  │  │ / API    │ │ (X/Threads API)│  │                       │
│  │  └──────────┘ └────────────────┘  │                       │
│  └──────────────────┬────────────────┘                       │
│                     │                                         │
│            Unit 9: credential_service                         │
│            (認証情報取得)                                       │
└──────────────────────────────────────────────────────────────┘
```

### UI 担当領域

モックアップ（`techtite_mockup.html`）における本ユニットの UI 担当領域は以下の通り。

| UI 要素 | 配置場所 | 概要 |
|---------|---------|------|
| **PublishPanel** | Left Sidebar（Ribbon の Publish アイコンで切り替え） | Blog セクションと SNS セクションに分割。ブログ下書き生成ボタン、SNS 投稿ドラフトボタン、下書き一覧、投稿履歴を表示 |
| **BlogSection** | PublishPanel 上部 | 「Draft Blog from Logs (US-8.1)」ボタン、下書き一覧（ステータスバッジ付き） |
| **SNSSection** | PublishPanel 下部 | 「Draft X Post (US-9.1)」「Draft Threads Post (US-9.3)」ボタン、投稿履歴 |
| **PublishModal** | モーダルオーバーレイ | プラットフォーム選択に応じた公開モーダル。textarea でコンテンツプレビュー・編集、公開ボタン。モックアップの `pub-modal` に対応 |
| **TemplateEditor** | Settings 画面内 | プラットフォーム別の投稿テンプレート編集 UI。変数挿入のヘルプ付き |

### 主要ライブラリ・技術

| ライブラリ / 技術 | 用途 | レイヤー |
|------------------|------|---------|
| **@anthropic-ai/claude-code SDK** | ブログ下書き生成（セッションログ → 技術ブログ記事）、SNS 投稿文生成（要約 + 文字数制限） | Rust (SDK プロセス呼び出し) |
| **pulldown-cmark** | Markdown パース。`[[]]` 内部リンクの検出・標準 Markdown / プレーンテキストへの変換 | Rust |
| **reqwest** | HTTP クライアント。X API v2、Threads API、Note API への HTTP リクエスト | Rust |
| **serde** / **serde_json** | API リクエスト / レスポンスの JSON シリアライズ / デシリアライズ | Rust |
| **tokio** | 非同期 API 呼び出し、AI 変換処理のバックグラウンド実行 | Rust |
| **Zustand** | `publish-store` による公開パイプライン状態のフロントエンド管理 | TypeScript |
| **Tailwind CSS** | PublishPanel / PublishModal のスタイリング | TypeScript |

### Rust バックエンド詳細

#### ファイル構成

```
src-tauri/src/
├── commands/
│   └── publish.rs                 # コンテンツ公開 IPC コマンドハンドラ
├── services/
│   └── publish_service.rs         # 外部 API 連携・AI 変換・記法変換
└── models/
    └── publish.rs                 # PublishTarget, BlogDraft, SNSPost, PostTemplate 等
```

#### publish_service.rs

本サービスは以下の 5 つの責務を持つ。

**1. ブログ下書き生成（AI 変換）**

- Claude Code SDK モードを使用し、セッションログの Markdown テキストを技術ブログ記事に変換する
- SDK 呼び出し時のシステムプロンプトに記事構成テンプレート（タイトル / 導入 / 本文 / まとめ）を指定
- 入力: 1 件以上のセッションログファイルパス → ファイル内容を読み込み結合 → SDK に送信
- 出力: `BlogDraft` 構造体（タイトル、本文 Markdown、元のログパス、ステータス = `Draft`）
- 生成された下書きは新規 Markdown ファイルとして Vault 内に保存（パス: `<vault>/<設定可能パス>/blog-drafts/`）
- Zenn 向けの場合: `PlatformMetadata::Zenn { emoji, article_type, topics }` を AI に自動生成させ、frontmatter として付与

**2. SNS 投稿文生成（AI 変換）**

- Claude Code SDK モードを使用し、セッションログ / ナレッジからコンパクトな投稿文を生成
- プラットフォーム別の文字数制限をプロンプトに明示:
  - X: 280 文字カウント（全角 = 2 カウント。日本語は実質約 140 文字）
  - Threads: 500 文字
- 出力: `SNSPost` 構造体（投稿テキスト、プラットフォーム、文字カウント、ステータス = `Draft`）
- `PostTemplate` が設定されている場合、テンプレートの変数（`{{hashtags}}`, `{{blog_url}}` 等）を展開した上で AI に渡す

**3. 記法変換**

- `pulldown-cmark` で Markdown をパースし、イベントストリームを走査
- `[[ファイル名]]` 形式の内部リンクを検出（pulldown-cmark のテキストノード内で正規表現 `\[\[([^\]]+)\]\]` でマッチ）
- 変換先プラットフォームに応じた処理:
  - Zenn / Note: `[ファイル名](./ファイル名)` 形式の標準 Markdown リンクに変換（外部公開時はリンク先が存在しないため、プレーンテキストに変換するオプションも提供）
  - X / Threads: プレーンテキスト（リンク記法を除去し表示テキストのみ残す）
- Techtite 固有記法（`#tag` 等）の除去・変換も同時に実行
- 元のファイルは一切変更せず、変換後のテキストを返却

**4. 外部 API 連携（Zenn）**

- Zenn CLI（`npx zenn`）または Zenn API を使用
- Zenn CLI モード: `npx zenn new:article` でスキャフォールド → ファイル書き込み → `npx zenn preview` でプレビュー確認 → Git push で公開
- Zenn API モード（将来対応）: REST API 経由で直接公開
- frontmatter 自動生成:
  ```yaml
  ---
  title: "<AI 生成タイトル>"
  emoji: "<AI 生成 emoji>"
  type: "tech"
  topics: ["<AI 生成トピック>"]
  published: true
  ---
  ```
- 認証情報: `credential_service.get("zenn", "api_token")` で取得

**5. 外部 API 連携（X / Threads / Note）**

- **X API v2**: `reqwest` で `POST https://api.twitter.com/2/tweets` を呼び出し
  - 認証: OAuth 2.0（`credential_service` から `access_token` / `refresh_token` を取得）
  - リクエストボディ: `{ "text": "<投稿文>" }`
  - レスポンスから `tweet_id` を取得し、公開 URL を構築
- **Threads API**（Could 優先度）: Meta Threads API 使用
  - 認証: Threads API 認証フロー
  - 投稿エンドポイントへの POST リクエスト
- **Note API**（Could 優先度）: Note API 使用
  - 認証: Note API 認証
  - 記事投稿エンドポイントへの POST リクエスト

#### X API v2 呼び出し詳細

```rust
// publish_service.rs 内の X 投稿処理（概要）
async fn post_to_x(&self, post: &SNSPost) -> Result<PublishResult, String> {
    let token = self.credential_service
        .get("x", "access_token")
        .map_err(|e| format!("X API 認証情報未設定: {}", e))?;

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.twitter.com/2/tweets")
        .bearer_auth(&token)
        .json(&serde_json::json!({ "text": post.content }))
        .send()
        .await
        .map_err(|e| format!("X API 通信エラー: {}", e))?;

    if response.status().is_success() {
        let body: serde_json::Value = response.json().await?;
        let tweet_id = body["data"]["id"].as_str().unwrap_or("");
        Ok(PublishResult {
            success: true,
            url: Some(format!("https://x.com/i/web/status/{}", tweet_id)),
            error_message: None,
        })
    } else {
        let error_body = response.text().await.unwrap_or_default();
        Ok(PublishResult {
            success: false,
            url: None,
            error_message: Some(format!("X API エラー ({}): {}", response.status(), error_body)),
        })
    }
}
```

### フロントエンド詳細

#### ファイル構成

```
src/
├── features/publishing/
│   ├── components/
│   │   ├── PublishPanel.tsx        # Publish サイドバーパネル
│   │   ├── BlogSection.tsx        # ブログ公開セクション
│   │   ├── SNSSection.tsx         # SNS 投稿セクション
│   │   ├── PublishModal.tsx        # 公開モーダル（Zenn/X/Threads/Note）
│   │   └── TemplateEditor.tsx     # 投稿テンプレート編集
│   ├── hooks/
│   │   ├── use-publish.ts         # 公開処理フック
│   │   └── use-templates.ts       # テンプレート管理フック
│   └── index.ts
├── stores/
│   └── publish-store.ts           # 公開パイプライン Zustand ストア
└── types/
    └── publish.ts                 # PublishTarget, BlogDraft, SNSPost 等
```

#### publish-store.ts（Zustand）

```typescript
interface PublishStoreState {
  // 状態
  blogDrafts: BlogDraft[];
  snsPosts: SNSPost[];
  publishHistory: PublishTarget[];
  templates: PostTemplate[];
  currentDraft: BlogDraft | null;
  currentPost: SNSPost | null;
  isGenerating: boolean;
  isPublishing: boolean;
  modalPlatform: "zenn" | "note" | "x" | "threads" | null;

  // アクション
  generateBlogDraft: (sessionLogPaths: string[]) => Promise<void>;
  generateSNSPost: (sourcePaths: string[], platform: "x" | "threads") => Promise<void>;
  publishToZenn: (draft: BlogDraft) => Promise<PublishResult>;
  publishToNote: (draft: BlogDraft) => Promise<PublishResult>;
  postToX: (post: SNSPost) => Promise<PublishResult>;
  postToThreads: (post: SNSPost) => Promise<PublishResult>;
  fetchTemplates: () => Promise<void>;
  saveTemplate: (template: PostTemplate) => Promise<void>;
  openModal: (platform: "zenn" | "note" | "x" | "threads") => void;
  closeModal: () => void;
}
```

#### PublishPanel.tsx

- Left Sidebar に配置。Ribbon の Publish アイコン（ロケットアイコン）で表示切り替え
- 上部: **BLOG (Epic 8)** セクション
  - 「Draft Blog from Logs」ボタン → セッションログ選択ダイアログ → `generateBlogDraft()` 呼び出し
  - 下書き一覧（ステータスバッジ: Draft / Reviewed / Published）
  - 下書きクリック → エディタで開く（Unit 2 の `MarkdownEditor` で編集可能）
- 下部: **SNS (Epic 9)** セクション
  - 「Draft X Post」ボタン（青色）→ ソース選択 → `generateSNSPost()` → PublishModal
  - 「Draft Threads Post」ボタン（ゴースト）→ 同上
  - 投稿履歴（成功/失敗バッジ、日付、プラットフォームアイコン）

#### PublishModal.tsx

- モーダルオーバーレイとして表示（モックアップの `pub-modal` に対応）
- プラットフォームに応じた UI 切り替え:
  - **Zenn**: タイトル入力、emoji 選択、topics 入力、本文プレビュー textarea、「Publish to Zenn」ボタン
  - **Note**: タイトル入力、本文プレビュー textarea、「Publish to Note」ボタン
  - **X**: 投稿文 textarea（文字カウンター付き、280 文字上限表示）、「Post to X」ボタン
  - **Threads**: 投稿文 textarea（文字カウンター付き、500 文字上限表示）、「Post to Threads」ボタン
- textarea は編集可能（AI 生成後にユーザーがレビュー・修正可能）
- 公開実行中はローディングスピナー表示、完了後に成功/失敗のフィードバック

#### BlogSection.tsx

- セッションログからのブログ下書き生成ワークフロー:
  1. 「Draft Blog from Logs」ボタンクリック
  2. セッションログ選択 UI（チェックボックス付き一覧。Unit 8 の `session_log:list` から取得）
  3. 生成中ローディング表示（AI 変換に数十秒かかる場合がある）
  4. 生成完了 → 下書き一覧に追加、エディタで自動オープン
- 下書きの状態管理: `Draft` → `ReadyForReview`（手動マーク） → `Reviewed`（手動マーク） → `Published`（公開後自動）

#### SNSSection.tsx

- SNS 投稿文生成ワークフロー:
  1. プラットフォーム選択ボタンクリック
  2. ソース選択 UI（セッションログ / ナレッジノートのチェックボックス付き一覧）
  3. 生成中ローディング表示
  4. 生成完了 → PublishModal 表示（編集可能 textarea）
- 文字カウンターの実装: X の場合は Unicode 文字種に応じたカウント（半角 = 1、全角 = 2）を実装

#### TemplateEditor.tsx

- Settings 画面内のセクションとして配置
- プラットフォーム別タブ切り替え（Zenn / Note / X / Threads）
- テンプレート textarea（変数はハイライト表示）
- 利用可能変数のヘルプ表示: `{{title}}`, `{{summary}}`, `{{hashtags}}`, `{{blog_url}}`, `{{date}}` 等
- プレビュー表示（変数をサンプル値で展開した結果を表示）

### 公開インターフェース

本ユニットが提供する IPC コマンドとイベント。

#### IPC コマンド（フロントエンド → Rust）

| コマンド名 | 入力 | 出力 | 説明 |
|-----------|------|------|------|
| `publish:generate_blog_draft` | `{ sessionLogPaths: string[] }` | `BlogDraft` | セッションログからブログ下書きを AI 生成 |
| `publish:generate_sns_post` | `{ sourcePaths: string[], platform: string }` | `SNSPost` | ソースから SNS 投稿文を AI 生成 |
| `publish:convert_notation` | `{ content: string, platform: string }` | `string` | `[[]]` 内部リンク等の記法を指定プラットフォーム向けに変換 |
| `publish:publish_zenn` | `{ draft: BlogDraft }` | `PublishResult` | Zenn にブログ記事を公開 |
| `publish:publish_note` | `{ draft: BlogDraft }` | `PublishResult` | Note にブログ記事を公開 |
| `publish:post_x` | `{ post: SNSPost }` | `PublishResult` | X に投稿 |
| `publish:post_threads` | `{ post: SNSPost }` | `PublishResult` | Threads に投稿 |
| `publish:get_templates` | -- | `PostTemplate[]` | 投稿テンプレート一覧取得 |
| `publish:set_template` | `PostTemplate` | `void` | 投稿テンプレート保存 |

#### イベント（Rust → フロントエンド）

| イベント名 | ペイロード | 購読先 | 説明 |
|-----------|----------|--------|------|
| `publish:progress` | `{ platform: string, step: string }` | Unit 10 (PublishModal) | 公開処理の進捗通知（「記法変換中」「API 送信中」等） |
| `publish:completed` | `PublishResult` | Unit 10 (PublishModal, PublishPanel), Unit 1 (Toast) | 公開処理完了通知 |

### 消費インターフェース

本ユニットが他ユニットから消費する IPC コマンドとイベント。

#### 消費する IPC コマンド

| コマンド名 | 提供元 | 用途 |
|-----------|--------|------|
| `session_log:list` | Unit 8 | ブログ下書き生成時のセッションログ選択用一覧取得 |
| `session_log:get_content` | Unit 8 | セッションログの本文取得（AI 変換の入力） |
| `fs:read_file` | Unit 1 | ナレッジノートの内容読み取り（SNS 投稿生成の入力） |
| `fs:write_file` | Unit 1 | 生成したブログ下書きのファイル保存 |
| `fs:create_file` | Unit 1 | ブログ下書きの新規ファイル作成 |

#### 消費する内部 API（Rust サービス間）

| メソッド | 提供元 | 用途 |
|---------|--------|------|
| `credential_service.get(service, key)` | Unit 9 | Zenn / Note / X / Threads の認証情報取得 |

#### 購読するイベント

| イベント名 | 発火元 | 用途 |
|-----------|--------|------|
| `publish:progress` | 自ユニット | PublishModal の進捗表示更新 |
| `publish:completed` | 自ユニット | PublishModal / PublishPanel の完了表示更新 |

### データフロー

#### ブログ下書き生成フロー

```
1. ユーザー: PublishPanel > 「Draft Blog from Logs」クリック

2. フロントエンド: セッションログ選択 UI 表示
   └─ session_log:list コマンドで一覧取得

3. ユーザー: セッションログ選択 → 生成開始

4. フロントエンド → Rust: publish:generate_blog_draft コマンド
   ├─ sessionLogPaths: ["path/to/log1.md", "path/to/log2.md"]
   └─ publish-store: isGenerating = true

5. Rust: publish_service.generate_blog_draft()
   ├─ 各セッションログファイルの内容を読み込み
   ├─ Claude Code SDK モードで AI 変換実行
   │   ├─ システムプロンプト: 記事構成テンプレート
   │   └─ ユーザーメッセージ: 結合したセッションログ本文
   ├─ AI 出力から BlogDraft を構築
   ├─ publish:progress イベント発火（「AI 変換中...」）
   └─ 下書きファイルを Vault 内に保存

6. Rust → フロントエンド: BlogDraft 返却
   ├─ publish-store: blogDrafts に追加, isGenerating = false
   └─ エディタで自動オープン（Unit 2 の MarkdownEditor）
```

#### SNS 投稿フロー（X の例）

```
1. ユーザー: PublishPanel > 「Draft X Post」クリック

2. フロントエンド: ソース選択 UI 表示

3. ユーザー: ソース選択 → 生成開始

4. フロントエンド → Rust: publish:generate_sns_post コマンド
   ├─ sourcePaths: ["path/to/note.md"]
   ├─ platform: "x"
   └─ publish-store: isGenerating = true

5. Rust: publish_service.generate_sns_post()
   ├─ ソースファイル内容読み込み
   ├─ PostTemplate がある場合はテンプレート変数を展開
   ├─ Claude Code SDK で要約生成（280 文字制限をプロンプトに明示）
   └─ 文字カウントを検証（超過時は再生成）

6. Rust → フロントエンド: SNSPost 返却
   └─ PublishModal 表示（プラットフォーム = "x"）

7. ユーザー: PublishModal でレビュー・編集 → 「Post to X」クリック

8. フロントエンド → Rust: publish:post_x コマンド
   ├─ publish:progress イベント発火（「記法変換中...」「API 送信中...」）
   └─ publish_service.post_to_x()
       ├─ publish:convert_notation で内部リンク除去
       ├─ credential_service.get("x", "access_token") で認証情報取得
       └─ reqwest で X API v2 に POST

9. Rust → フロントエンド: PublishResult 返却
   ├─ publish:completed イベント発火
   ├─ 成功 → Toast 通知 + PublishPanel の投稿履歴に追加
   └─ 失敗 → PublishModal にエラーメッセージ表示
```

#### 記法変換フロー

```
1. publish_service.convert_notation(content, platform) 呼び出し

2. pulldown-cmark でソース Markdown をパース
   └─ Event ストリームを取得

3. Event ストリームを走査
   ├─ Text ノード内で正規表現 \[\[([^\]]+)\]\] を検索
   ├─ マッチ発見時:
   │   ├─ Zenn/Note: [表示テキスト](./ファイル名) に変換
   │   │   └─ リンク先不存在時はプレーンテキストに変換（設定可能）
   │   └─ X/Threads: 表示テキストのみ残す（リンク記法除去）
   └─ #tag 記法: プラットフォームに応じて除去またはハッシュタグとして保持

4. 変換後の Markdown / プレーンテキストを返却
   └─ 元ファイルは一切変更しない
```

### パフォーマンス要件

| 項目 | 要件 | 備考 |
|------|------|------|
| ブログ下書き AI 生成 | 完了まで 10-60 秒を許容 | Claude Code SDK の応答時間に依存。`publish:progress` イベントで進捗を通知し、ユーザーに待機時間を伝える |
| SNS 投稿文 AI 生成 | 完了まで 5-30 秒を許容 | ブログ生成より入力テキストが少ないため短時間 |
| 記法変換処理 | < 100ms | pulldown-cmark のパースは高速。10,000 行程度の Markdown でも問題なし |
| X API 投稿 | < 5 秒 | ネットワーク遅延に依存。タイムアウト 30 秒設定 |
| Zenn 公開（CLI モード） | < 30 秒 | Git push を含むため比較的長い |
| テンプレート保存・取得 | < 50ms | tauri-plugin-store 経由のローカルファイル I/O |
| PublishModal レンダリング | < 100ms | textarea とボタンのシンプルな UI |

### 制約・注意事項

1. **AI 変換の品質と制御**: Claude Code SDK による変換結果はプロンプトに依存し、常に期待通りの品質とは限らない。必ずユーザーのレビュー・編集ステップを挟む設計とする。自動公開（レビューなしの直接公開）は実装しない。

2. **文字数カウントの正確性**: X の文字カウントは公式の仕様（https://developer.x.com/en/docs/counting-characters）に準拠する必要がある。URL は一律 23 文字、絵文字は 2 文字としてカウントされる等の特殊ルールがある。フロントエンドの文字カウンターも同一ロジックで実装する。

3. **外部 API の認証フロー**: X API v2 は OAuth 2.0 PKCE フローを使用する。初回認証時はブラウザを開いて認可コードを取得する必要がある。Tauri のウィンドウ API でミニブラウザを表示するか、システムブラウザにリダイレクトするかを設計時に決定する。取得したトークンは Unit 9 の `credential_service` を通じてキーチェーンに保存する。

4. **Zenn CLI の依存**: Zenn CLI モードは Node.js と `zenn-cli` パッケージのインストールを前提とする。ユーザーの環境に未インストールの場合は、Settings 画面で設定ガイドを表示する。将来的に Zenn が公式 API を提供した場合は API モードに移行する。

5. **Note / Threads の Could 優先度**: US-8.5（Note 公開）と US-9.3（Threads 投稿）は Could 優先度であり、MVP には含めない。ただし、`publish_service.rs` のインターフェースは最初からこれらのプラットフォームに対応した抽象化で実装し、後から追加しやすくする。

6. **認証情報の依存関係**: 公開処理は Unit 9 の `credential_service` に依存する。認証情報が未設定の場合はコマンド実行時にわかりやすいエラーメッセージを返し、Settings 画面の CredentialManager への導線を提示する。

7. **レート制限への対応**: X API v2 はレート制限（ユーザー単位で 1500 投稿 / 15 分）がある。連続投稿時はレート制限エラーをハンドリングし、残りクォータと再試行可能時刻をユーザーに表示する。

8. **元ファイルの不変性**: 記法変換（`publish:convert_notation`）は常に変換後のテキストを新しい文字列として返し、元のファイルを一切変更しない。これにより、公開後もナレッジベース内のノートは内部リンクを保持し続ける。

9. **セッションログの公開時の秘匿情報**: セッションログには Unit 8 の `masking_service` でマスキング済みの情報が含まれるが、AI 変換後のブログ / SNS テキストにも秘匿情報が残っていないか、公開前に再度チェックする仕組みを設ける（Unit 8 のマスキングパターンを再適用）。
