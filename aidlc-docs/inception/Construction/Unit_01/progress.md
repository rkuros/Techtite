# Unit 1: アプリケーションシェル・プラットフォーム基盤 — 進捗

> **担当領域**: Tauri Builder、Vault ライフサイクル、ファイル I/O、AppLayout、Ribbon、TabBar、PaneContainer、StatusBar
> **ステータス**: 完了

---

## 成果物チェックリスト

### Rust バックエンド

- [x] `src-tauri/src/main.rs` — Tauri Builder、プラグイン登録、コマンド登録
- [x] `src-tauri/src/lib.rs` — 全モジュール宣言 + AppState
- [x] `src-tauri/src/commands/mod.rs`
- [x] `src-tauri/src/commands/fs.rs` — fs:read_file, fs:write_file, fs:create_file, fs:create_dir, fs:delete, fs:rename, fs:exists
- [x] `src-tauri/src/commands/vault.rs` — vault:open, vault:get_current, vault:select_folder, vault:get_config, vault:update_config
- [x] `src-tauri/src/commands/window.rs` — window:save_state, window:load_state
- [x] `src-tauri/src/services/mod.rs`
- [x] `src-tauri/src/services/fs_service.rs` — ファイル I/O 実装 (テスト付き)
- [x] `src-tauri/src/services/vault_service.rs` — Vault ライフサイクル (テスト付き)
- [x] `src-tauri/src/services/watcher_service.rs` — notify によるファイル監視
- [x] `src-tauri/src/models/mod.rs`
- [x] `src-tauri/src/models/vault.rs` — Vault, VaultConfig, LogGranularity
- [x] `src-tauri/src/models/file.rs` — FileEntry, FileMetadata, FileType, GitFileStatus
- [x] `src-tauri/src/models/editor.rs` — WindowState, PaneLayout, PaneNode, TabState, ViewMode
- [x] `src-tauri/src/utils/mod.rs`
- [x] `src-tauri/src/utils/path.rs` — パス正規化・検証
- [x] `src-tauri/src/utils/gitignore.rs` — .gitignore パース
- [x] `src-tauri/src/utils/error.rs` — 共通エラー型

### フロントエンド

- [x] `src/App.tsx` — レイアウト構成
- [x] `src/features/shell/components/AppLayout.tsx` — Ribbon + LeftSidebar + CenterArea + RightTerminal + StatusBar
- [x] `src/features/shell/components/Ribbon.tsx` — アイコンナビゲーション（全 9 アイコン）
- [x] `src/features/shell/components/TabBar.tsx` — タブバー
- [x] `src/features/shell/components/PaneContainer.tsx` — ペインコンテナ
- [x] `src/features/shell/components/StatusBar.tsx` — ステータスバー
- [x] `src/features/shell/index.ts`
- [x] `src/stores/vault-store.ts` — currentVault, isLoading, openVault, closeVault
- [x] `src/stores/editor-store.ts` — openTab, closeTab, activeTab, tabs
- [x] `src/styles/globals.css` — Tailwind ディレクティブ + ダークテーマ CSS 変数

### 共有基盤（全 Unit で使用）

- [x] `src/types/*.ts` — 全 11 型定義ファイル（shared_data_models.md 準拠）
- [x] `src/shared/utils/ipc.ts` — IPC ラッパー + モック戦略
- [x] `src/shared/utils/path.ts` — パスユーティリティ
- [x] `src/shared/utils/format.ts` — フォーマットユーティリティ
- [x] `src/shared/constants.ts` — 定数定義
- [x] `src/hooks/use-ipc.ts` — IPC 通信フック
- [x] `src/hooks/use-event-listener.ts` — イベントリスナーフック
- [x] `src/hooks/use-keyboard-shortcut.ts` — キーボードショートカットフック
- [x] `src/styles/theme.ts` — テーマ定数

### テスト

- [x] cargo test — 6/6 テスト全パス
- [x] TypeScript コンパイル — エラーなし

---

## 依存関係

- **依存先**: なし（基盤ユニット）
- **被依存**: 全ユニット

## ブロッカー

なし（完了済み）
