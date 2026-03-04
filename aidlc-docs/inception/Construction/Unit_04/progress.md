# Unit 4: ナレッジベース・コア — 進捗

> **担当領域**: 内部リンク、バックリンク、タグ管理、全文検索（Tantivy）、Graph View
> **ステータス**: 初期実装完了

---

## 成果物チェックリスト

### Rust バックエンド

- [x] `src-tauri/src/commands/knowledge.rs` — リンク・バックリンク・タグ操作 (7 commands)
- [x] `src-tauri/src/commands/search.rs` — 全文検索コマンド (search_keyword)
- [x] `src-tauri/src/services/link_index_service.rs` — リンク・バックリンクインデックス (in-memory, 6 tests)
- [x] `src-tauri/src/services/tag_service.rs` — タグインデックス管理 (in-memory, 5 tests)
- [x] `src-tauri/src/services/search_service.rs` — Tantivy 全文検索スタブ (grep-like fallback, 4 tests)
- [x] `src-tauri/src/models/note.rs` — Frontmatter, InternalLink, BacklinkEntry, TagInfo, GraphFilter, GraphNode, GraphEdge, GraphData
- [x] `src-tauri/src/models/search.rs` — KeywordSearchQuery, KeywordSearchResult

### フロントエンド

- [x] `src/features/knowledge/components/SearchPanel.tsx` — 検索パネル（Keyword タブ）、Semantic タブは Unit 5 プレースホルダ
- [x] `src/features/knowledge/components/BacklinksPage.tsx` — バックリンクページ + 未リンク言及セクション
- [x] `src/features/knowledge/components/TagsPage.tsx` — タグ一覧ページ（チップグリッド + ファイル一覧）
- [x] `src/features/knowledge/components/GraphView.tsx` — Graph View メインコンポーネント
- [x] `src/features/knowledge/components/GraphCanvas.tsx` — SVG グラフ描画（円形レイアウト、d3 placeholder）
- [x] `src/features/knowledge/components/GraphControls.tsx` — フィルタ・深さ・モード切替コントロール
- [ ] `src/features/knowledge/workers/graph-layout.worker.ts` — Web Worker: d3-force 計算（d3 未インストールのため保留）
- [x] `src/features/knowledge/index.ts` — バレルエクスポート
- [x] `src/stores/knowledge-store.ts` — リンク・タグ・検索状態（Zustand）

### モジュール登録

- [x] `src-tauri/src/commands/mod.rs` — knowledge, search モジュール追加
- [x] `src-tauri/src/services/mod.rs` — link_index_service, tag_service, search_service 追加
- [x] `src-tauri/src/models/mod.rs` — note, search モジュール追加
- [x] `src-tauri/src/lib.rs` — 8 コマンド登録 + LinkIndexState, TagIndexState managed state 追加

---

## テスト結果

- Rust: 18 tests passed (link_index_service: 6, tag_service: 5, search_service: 4, shared: 3)
- TypeScript: `tsc --noEmit` 成功（型エラーなし）
- `cargo check`: コンパイル成功

---

## 実装メモ

### スタブ・プレースホルダ

1. **Tantivy 全文検索**: `search_service.rs` は直接ファイルスキャンによる grep-like 検索をスタブとして実装。Tantivy が Cargo.toml に追加された後、インデックスベースの高速検索に置き換え予定
2. **d3-force Graph View**: `GraphCanvas.tsx` は SVG ベースの円形レイアウトをプレースホルダとして実装。d3-force インストール後、物理シミュレーション + Web Worker 計算に置き換え予定
3. **SQLite 永続化**: link_index_service, tag_service は現在 in-memory HashMap で実装。将来的に `metadata.db` (SQLite) バックエンドに移行予定

### 残タスク

- [ ] d3-force をインストールし、GraphCanvas を物理シミュレーションレイアウトに更新
- [ ] graph-layout.worker.ts を実装（d3-force の tick 計算を Web Worker で実行）
- [ ] Tantivy + lindera を Cargo.toml に追加し、search_service を本実装に更新
- [ ] SQLite (rusqlite) を使用した永続化インデックスに移行
- [ ] `fs:changed` イベント購読による差分インデックス更新の実装
- [ ] CodeMirror 6 拡張（internal-link.ts, tag-highlight.ts）は Unit 2 のエディタ統合として別途実装

---

## 依存関係

- **強依存**: Unit 1（IPC 基盤） — 解決済み
- **弱依存**: なし

## ブロッカー

なし（初期実装完了）
