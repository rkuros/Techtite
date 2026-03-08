# Unit 5: セマンティック検索・RAG — 進捗

> **担当領域**: Embedding パイプライン、ベクトルストア、ハイブリッド検索、AI チャット
> **ステータス**: Phase 2 スタブ実装完了

---

## 成果物チェックリスト

### Rust バックエンド

- [x] `src-tauri/src/models/semantic.rs` — SemanticSearchResult, HybridSearchResult, IndexStatus, ChatResponse, ChatReference, IndexConfig 型定義 (serde rename_all camelCase, Default impl, unit tests)
- [x] `src-tauri/src/commands/semantic.rs` — 5 IPC コマンド (semantic_search, semantic_hybrid_search, semantic_get_index_status, semantic_rebuild_index, semantic_chat) スタブ実装
- [x] `src-tauri/src/services/embedding_service.rs` — EmbeddingServiceState, ChunkingConfig, Chunk 型; chunk_markdown() 実装 (Markdown 見出し分割、小チャンク結合、大チャンク分割); generate_embedding() スタブ (384 次元ゼロベクトル); ONNX Runtime TODO 詳細コメント; 10 unit tests
- [x] `src-tauri/src/services/vector_store_service.rs` — VectorStoreState, ChunkWithVector, VectorSearchResult 型; search_by_vector(), get_index_status(), upsert_file_chunks(), delete_file_chunks(), rebuild_index() スタブ; sqlite-vss TODO 詳細コメント; 7 unit tests

### モジュール統合

- [x] `src-tauri/src/models/mod.rs` — `pub mod semantic;` 追加
- [x] `src-tauri/src/services/mod.rs` — `pub mod embedding_service;` + `pub mod vector_store_service;` 追加
- [x] `src-tauri/src/commands/mod.rs` — `pub mod semantic;` 追加
- [x] `src-tauri/src/lib.rs` — EmbeddingServiceState / VectorStoreState の .manage() 追加 + 5 コマンド登録

### フロントエンド

- [x] `src/types/search.ts` — SemanticSearchResult に startLine/endLine 追加; HybridSearchResult を Rust 側と整合 (chunkText, startLine, endLine)
- [x] `src/stores/semantic-store.ts` — Zustand ストア (semanticResults, hybridResults, isSearching, keywordWeight/semanticWeight, indexStatus, chatMessages, isChatLoading; 全 Action 実装; initSemanticEventListeners)
- [x] `src/features/semantic-search/components/SemanticSearchTab.tsx` — セマンティック/ハイブリッド検索タブ (クエリ入力、モード切替、重みスライダー、結果リスト、スコアバー、ファイルオープン連携)
- [x] `src/features/semantic-search/components/AIChat.tsx` — フローティング AI チャットパネル (展開/折り畳み、メッセージ履歴、Enter 送信 / Shift+Enter 改行、自動スクロール、会話クリア)
- [x] `src/features/semantic-search/components/ChatMessage.tsx` — 単一チャットメッセージ (ユーザー右寄せ/AI左寄せ、参照ドキュメントリンク、ローディングアニメーション)
- [x] `src/features/semantic-search/components/RAGStatusIndicator.tsx` — ステータスバーインジケータ (RAG On/Off/Building X% 表示)
- [x] `src/features/semantic-search/index.ts` — バレルエクスポート

---

## コンパイル・テスト結果

- `cargo check`: 成功 (警告なし)
- `cargo test`: 121 テスト全パス (Unit 5 関連: models/semantic 5 tests, embedding_service 10 tests, vector_store_service 7 tests, commands/semantic 2 tests = 合計 24 新規テスト)
- `npx tsc --noEmit`: 成功 (エラーなし)

---

## 依存関係

- **強依存**: Unit 1（IPC 基盤）-- 完了
- **弱依存**: Unit 4（Tantivy ハイブリッド検索連携 → スタブで対応済み）

## 次のステップ (Phase 3 以降)

- [ ] ort crate 統合 (ONNX Runtime) で実際の embedding 生成
- [ ] rusqlite + sqlite-vss 統合でベクトルストア実装
- [ ] Tantivy 統合でハイブリッド検索の keyword 側を実装
- [ ] LLM API (ローカル or リモート) 統合で RAG チャット実装
- [ ] インデックスビルドのバックグラウンドタスク化 + 進捗イベント発火
- [ ] SearchPanel.tsx のセマンティックタブと SemanticSearchTab の連携
