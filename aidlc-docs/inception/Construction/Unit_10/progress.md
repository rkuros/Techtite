# Unit 10: コンテンツ公開パイプライン — 進捗

> **担当領域**: ブログ/SNS 変換パイプライン、外部 API 連携、記法変換
> **ステータス**: 完了

---

## 成果物チェックリスト

### Rust バックエンド

- [x] `src-tauri/src/models/publish.rs` — PublishTarget, PublishStatus, PlatformMetadata, BlogDraft, SNSPost, PostTemplate, TemplateVariable, PublishResult
- [x] `src-tauri/src/services/publish_service.rs` — PublishServiceState, convert_internal_links, strip_tags, count_chars_x + 22 unit tests
- [x] `src-tauri/src/commands/publish.rs` — 9 IPC commands: publish_generate_blog_draft, publish_generate_sns_post, publish_convert_notation, publish_publish_zenn, publish_publish_note, publish_post_x, publish_post_threads, publish_get_templates, publish_set_template

### モジュール登録

- [x] `src-tauri/src/commands/mod.rs` — `pub mod publish;` 追加
- [x] `src-tauri/src/services/mod.rs` — `pub mod publish_service;` 追加
- [x] `src-tauri/src/models/mod.rs` — `pub mod publish;` 追加
- [x] `src-tauri/src/lib.rs` — `.manage(PublishServiceState::new())` + 9 コマンド登録

### フロントエンド

- [x] `src/stores/publish-store.ts` — Zustand store (blogDrafts, snsPosts, templates, isGenerating, isPublishing, modalPlatform + actions + initPublishEventListeners)
- [x] `src/features/publishing/components/PublishPanel.tsx` — Publish サイドバーパネル（Blog + SNS セクション統合）
- [x] `src/features/publishing/components/BlogSection.tsx` — ブログ公開セクション（ログパス入力、ドラフトカード、ステータスバッジ、公開ボタン）
- [x] `src/features/publishing/components/SNSSection.tsx` — SNS 投稿セクション（X / Threads ボタン、投稿履歴、文字数表示）
- [x] `src/features/publishing/components/PublishModal.tsx` — 公開モーダル（プラットフォーム別フィールド、文字数カウンター、公開ボタン）
- [x] `src/features/publishing/components/TemplateEditor.tsx` — 投稿テンプレート編集（プラットフォームタブ、変数一覧、保存）
- [x] `src/features/publishing/index.ts` — バレルエクスポート

### 検証

- [x] `cargo check` — コンパイル通過
- [x] `cargo test` — 143 テスト全パス（既存 121 + 新規 22）
- [x] `npx tsc --noEmit` — TypeScript 型チェック通過

---

## 依存関係

- **強依存**: Unit 1（IPC 基盤）
- **弱依存**: Unit 8（セッションログ取得 → モック可能）、Unit 9（認証情報 → モック可能）

## ブロッカー

なし（Unit 8, 9 完了済み）

## TODO（将来対応）

- Claude SDK 統合によるブログドラフト / SNS 投稿の AI 生成
- Zenn GitHub リポジトリ連携（frontmatter 生成 + git push）
- Note API 統合（OAuth + 記事投稿）
- X API v2 統合（reqwest + OAuth 2.0）
- Threads API 統合（Meta Graph API）
- URL の t.co ラッピング対応（23 文字カウント）
- テンプレートの永続化（vault ディレクトリ保存）
