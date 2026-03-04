# Unit 2: マークダウンエディタ — 進捗

> **担当領域**: CodeMirror 6 統合、Live Preview、Frontmatter GUI、コードビューア
> **ステータス**: 初期実装完了（textarea プレースホルダ）

---

## 成果物チェックリスト

### Rust バックエンド

- [x] `src-tauri/src/commands/editor.rs` — エディタ関連コマンド（`get_file_type`, `get_language`）
  - commands/mod.rs にモジュール登録済み
  - lib.rs の invoke_handler に登録済み

### フロントエンド

- [x] `src/features/editor/components/MarkdownEditor.tsx` — Live Preview エディタ本体（textarea プレースホルダ）
  - EditorViewRef の登録/解除
  - ダーティ状態管理
  - Ctrl/Cmd+S ショートカット
  - ViewMode 切り替え（livePreview / source）
  - CodeMirror 6 統合箇所にコメント付き
- [x] `src/features/editor/components/CodeViewer.tsx` — コードファイル閲覧（読み取り専用）
  - 行番号表示
  - 読み取り専用/編集モード切り替えトグル
  - 言語ラベル表示
  - CodeMirror 6 統合箇所にコメント付き
- [x] `src/features/editor/components/FrontmatterGUI.tsx` — YAML Frontmatter GUI
  - title テキスト入力
  - date 日付ピッカー
  - tags チップ入力（追加/削除/Enter/カンマ区切り）
  - aliases チップ入力
  - extra フィールド（キー・バリュー）表示/編集
  - 折りたたみ/展開
  - パースエラー時の raw 表示フォールバック
  - NOTE: yaml ライブラリ統合時の置換箇所にコメント付き
- [x] `src/features/editor/components/EditorContainer.tsx` — エディタ種別切り替え
  - FileType 判定（editor:get_file_type IPC）
  - Markdown / Code / Image / Binary / Other 分岐
  - ファイル内容の初回ロード（fs:read_file IPC）
  - FrontmatterGUI と MarkdownEditor の連携
  - EmptyState（タブ未選択時）
- [x] `src/features/editor/extensions/live-preview.ts` — Live Preview 拡張（プレースホルダ + 実装設計コメント）
- [x] `src/features/editor/extensions/internal-link.ts` — [[]] リンク装飾（プレースホルダ + 実装設計コメント）
  - TODO [Unit 4]: リンク先存在確認の統合
- [x] `src/features/editor/extensions/tag-highlight.ts` — #tag ハイライト（プレースホルダ + 実装設計コメント）
  - TODO [Unit 4]: タグナビゲーション統合
- [x] `src/features/editor/extensions/image-preview.ts` — 画像埋め込みプレビュー（プレースホルダ + 実装設計コメント）
- [x] `src/features/editor/index.ts` — バレルエクスポート
- [x] `src/stores/editor-store.ts` — エディタ固有スライス追加
  - EditorViewRef 型定義
  - editorInstances Map（tabId → EditorViewRef）
  - dirtyFiles Set
  - registerEditor / unregisterEditor
  - markDirty / markClean
  - saveFile（fs:write_file IPC 呼び出し + 保存直後フラグ）
  - saveAllDirty
  - reloadFile（fs:read_file IPC 呼び出し）
  - setViewMode
  - initEditorEventListeners（fs:changed / fs:external_change 購読）
  - Unit 1 の既存コード（openTabs, closeTab 等）は保持・拡張のみ

---

## 依存関係

- **強依存**: Unit 1（IPC 基盤、editor-store 基盤） — 解消済み
- **弱依存**: Unit 4（リンク/タグ情報 → TODO コメントでマーク済み）

## ブロッカー

なし（Unit 1 の IPC スタブ完成済み）

## 次のステップ

1. `@uiw/react-codemirror` と `@codemirror/*` パッケージをインストール
2. textarea プレースホルダを CodeMirror 6 インスタンスに置換
3. Live Preview 拡張（live-preview.ts）を実装
4. Internal Link 拡張（internal-link.ts）を実装
5. Tag Highlight 拡張（tag-highlight.ts）を実装
6. Image Preview 拡張（image-preview.ts）を実装
7. `yaml` パッケージをインストールし FrontmatterGUI のパーサーを置換
8. LaTeX 数式レンダリング（katex）の追加（US-2.4 Could）
9. Unit 4 統合（リンク存在確認、タグナビゲーション）
