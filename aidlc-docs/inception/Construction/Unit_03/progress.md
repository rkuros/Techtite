# Unit 3: ファイル管理 — 進捗

> **担当領域**: ファイルエクスプローラ、ファイルツリー、Quick Switcher、コマンドパレット
> **ステータス**: 実装完了

---

## 成果物チェックリスト

### Rust バックエンド

- [x] `src-tauri/src/commands/file_tree.rs` — file_tree:get_tree, file_tree:get_metadata
  - `get_tree`: Vault内のファイルツリーを再帰的に取得。.techtite/, .git/ を常に除外。.gitignore パターンによるフィルタリング対応。ディレクトリ優先のアルファベット順ソート。
  - `get_metadata`: 指定ファイルのメタデータ（サイズ、更新日時、作成日時、ファイル種別）を取得。frontmatter, tags, outgoing_links, git_status はTODOコメントで Unit 4/6 連携を明記。
  - `commands/mod.rs` に `pub mod file_tree;` を追記
  - `lib.rs` の `invoke_handler` に `commands::file_tree::get_tree`, `commands::file_tree::get_metadata` を登録

### フロントエンド

- [x] `src/features/file-management/components/FileExplorer.tsx` — ファイルエクスプローラ（ツリー）
  - LeftSidebar の Files パネル最上位コンポーネント
  - ヘッダに「New File」「New Folder」アクションボタン
  - FileTreeNode の再帰レンダリング
  - fs:changed イベント購読によるツリー自動更新
  - 右クリックコンテキストメニュー（ファイル: Open/Rename/Delete/Copy Path、フォルダ: New File/New Folder/Rename/Delete）
  - インライン新規ファイル/フォルダ作成入力
  - Cmd+N/Ctrl+N で新規ファイル、Cmd+Backspace/Delete で削除のキーボードショートカット
- [x] `src/features/file-management/components/FileTreeNode.tsx` — ツリーノード
  - フォルダ: 展開/折りたたみトグル、子ノード再帰レンダリング
  - ファイル: クリックで editor-store.openTab() 呼び出し
  - インライン名前編集（ダブルクリック or F2）
  - ドラッグ&ドロップによるファイル移動
  - アクティブファイルのハイライト（accent カラー + bg-active）
  - 16px インデントの再帰的ネスト
- [x] `src/features/file-management/components/QuickSwitcher.tsx` — Quick Switcher モーダル
  - Cmd+P / Ctrl+P で起動（Shift未押下時のみ、Command Palette と排他制御）
  - fuse.js による file-tree-store.searchFiles() でファジー検索
  - 上下キーで候補選択、Enter でファイルオープン、Esc で閉じる
  - ファイル名とパスを表示、選択中アイテムのハイライト
  - 画面中央上部のモーダル表示（560px幅、14vh上マージン）
- [x] `src/features/file-management/components/CommandPalette.tsx` — コマンドパレットモーダル
  - Cmd+Shift+P / Ctrl+Shift+P で起動
  - fuse.js による file-tree-store.searchCommands() でコマンド検索
  - コマンド名 + カテゴリバッジ + ショートカットキー表示
  - 上下キーで候補選択、Enter で実行、Esc で閉じる
  - リアクティブ設計（コマンド登録後即座にパレットから検索可能）
- [x] `src/features/file-management/index.ts` — バレルエクスポート
- [x] `src/stores/file-tree-store.ts` — ファイルツリー状態（Zustand ストア）
  - ツリー構造キャッシュ（rootEntry）
  - フラット化ファイルリスト（flatFileList）Quick Switcher 用
  - 展開状態管理（expandedDirs: Set<string>）
  - ファジー検索インデックス（fuse.js）— ファイル用・コマンド用の2インスタンス
  - コマンドレジストリ（registerCommand / unregisterCommand / searchCommands / executeCommand）
  - ファイル CRUD 操作（Unit 1 IPC 経由: fs:create_file, fs:create_dir, fs:delete, fs:rename, fs:exists）
  - fs:changed イベント受信時のデバウンス付きリフレッシュ（200ms）

---

## 依存関係

- **強依存**: Unit 1（IPC 基盤）— 実装済み、正常動作
- **弱依存（TODO コメントで対応）**:
  - Unit 2（editor-store.openTab）— 既存ストアメソッドを直接使用
  - Unit 4（リンク自動更新 on rename/move）— renameNode / moveNode 内に TODO コメントで `knowledge:get_backlinks` 連携を明記

## 追加依存パッケージ

- `fuse.js@7.1.0` — クライアントサイドファジー検索（Quick Switcher + Command Palette）

## ブロッカー

なし（Unit 1 の IPC 基盤は実装済み）
