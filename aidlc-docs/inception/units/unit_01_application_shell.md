# Unit 1: アプリケーションシェル・プラットフォーム基盤

> **対応 Epic**: Epic 1 — デスクトップアプリケーション基盤
> **対応ストーリー**: US-1.1〜US-1.5

---

## ユーザーストーリーと受け入れ基準

### US-1.1 [Must] Vault起動・フォルダ選択

個人開発者として、アプリケーションを起動してプロジェクトフォルダ（Vault）を開きたい。なぜなら、ローカルに保存されたプロジェクトのコードとドキュメントにすぐにアクセスしたいからだ。

- [ ] アプリ起動時にフォルダ選択ダイアログ、または前回のVaultを自動で開ける
- [ ] 選択したフォルダ内のファイル・フォルダ構造が正しく読み込まれる
- [ ] 存在しないパスを指定した場合にエラーメッセージが表示される

### US-1.2 [Must] タブで複数ファイルを開く

個人開発者として、複数のファイルをタブで同時に開きたい。なぜなら、コードファイルとドキュメントを並行して参照・編集する必要があるからだ。

- [ ] ファイルをクリックまたはQuick Switcherで開くとタブが追加される
- [ ] タブをクリックして表示を切り替えられる
- [ ] タブの閉じるボタンまたはショートカットでタブを閉じられる
- [ ] 未保存の変更があるタブにインジケータが表示される

### US-1.3 [Should] ペイン分割

個人開発者として、エディタ画面をペイン分割して複数ファイルを同時表示したい。なぜなら、コードを書きながら関連ドキュメントを参照したいからだ。

- [ ] 水平・垂直方向にペインを分割できる
- [ ] 各ペインで独立したタブを管理できる
- [ ] ペインの境界をドラッグしてサイズを調整できる

### US-1.4 [Should] ウィンドウ状態の復元

個人開発者として、前回終了時のウィンドウ状態（開いていたタブ・ペイン配置）が復元されてほしい。なぜなら、毎回作業環境を再構築する手間を省きたいからだ。

- [ ] アプリ終了時にウィンドウサイズ・位置・タブ・ペイン配置が保存される
- [ ] 次回起動時に前回の状態が復元される

### US-1.5 [Must] IPC経由ファイルI/O

AIエージェントとして、IPC経由でローカルファイルシステムの読み書きができるようにしたい。なぜなら、プロジェクト内のコードとドキュメントをプログラム的に操作する必要があるからだ。

- [ ] Vault内のファイルの読み取り・書き込み・作成・削除がIPC経由で実行できる
- [ ] ファイル変更イベントがフロントエンドに通知される
- [ ] Vault外へのアクセスが制限される（セキュリティ）

---

## 技術仕様

### アーキテクチャ概要

Unit 1 は Techtite アプリケーション全体の **基盤レイヤー** を構成する。Tauri 2.x の Builder 設定・プラグイン登録・ケーパビリティ定義を一元管理し、他の全ユニットが依存するファイル I/O パイプライン、Vault ライフサイクル管理、ウィンドウ/ペイン状態管理、および StatusBar 基盤を提供する。

```
┌─────────────────────────────────────────────────────────┐
│  フロントエンド (React + TypeScript)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌─────────┐ │
│  │ Ribbon   │ │ AppLayout│ │ PaneContainer│ │StatusBar│ │
│  │          │ │  TabBar  │ │  (panels)    │ │ (base)  │ │
│  └──────────┘ └──────────┘ └──────────────┘ └─────────┘ │
│  ┌──────────────────────┐ ┌──────────────────────┐      │
│  │ vault-store (Zustand)│ │ editor-store (base)  │      │
│  └──────────────────────┘ └──────────────────────┘      │
├─────────────────── IPC (Tauri Commands / Events) ───────┤
│  バックエンド (Rust)                                      │
│  ┌───────────┐ ┌──────────┐ ┌────────────┐             │
│  │ commands/ │ │ services/│ │ models/    │             │
│  │ fs.rs     │ │fs_service│ │ vault.rs   │             │
│  │ vault.rs  │ │watcher   │ │ file.rs    │             │
│  │ window.rs │ │vault_svc │ │ editor.rs  │             │
│  └───────────┘ └──────────┘ └────────────┘             │
│  ┌────────────────────────────────────────┐             │
│  │ Tauri Builder + Plugins + Capabilities │             │
│  │ (tauri-plugin-fs, dialog, store, shell)│             │
│  └────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────┘
```

---

### UI 担当領域

モックアップ `techtite_mockup.html` に基づく Unit 1 の UI 責任範囲。

| 領域 | コンポーネント | 説明 |
|------|--------------|------|
| **Ribbon**（左端 44px） | `Ribbon.tsx` | アイコンナビゲーション。各パネルの表示切り替えを制御。Files / Search / Git / Agents / Logs / Publish / Graph / Backlinks / Tags / Settings |
| **全体レイアウト** | `AppLayout.tsx` | Ribbon + LeftSidebar + CenterArea + RightTerminal + StatusBar の配置。`react-resizable-panels` によるリサイズ可能な 3 ペイン構成 |
| **タブバー** | `TabBar.tsx` | CenterArea 上部のタブ行。アクティブタブのハイライト（accent カラーの 2px 下線）、未保存インジケータ（黄色ドット）、閉じるボタン |
| **ペインコンテナ** | `PaneContainer.tsx` | CenterArea 内の水平/垂直分割。各ペインは独立したタブグループを持つ。再帰的な `PaneLayout` 構造 |
| **ステータスバー** | `StatusBar.tsx` | 下部 24px。左側: ブランチ名・同期状態（Unit 6 が提供）。右側: RAG 状態（Unit 5）、エージェント数（Unit 7）、API コスト（Unit 9）。Unit 1 はスロット基盤を提供 |

---

### 主要ライブラリ・技術

| ライブラリ / 技術 | バージョン方針 | 用途 |
|-----------------|-------------|------|
| **Tauri 2.x** | 最新安定版 | アプリケーションフレームワーク。Builder 設定、IPC コマンドハンドラ登録、ケーパビリティ定義 |
| **tauri-plugin-fs** | Tauri 2.x 対応版 | ファイルシステム操作（read / write / create / delete / rename） |
| **tauri-plugin-dialog** | Tauri 2.x 対応版 | ネイティブフォルダ選択ダイアログ（Vault 選択時） |
| **tauri-plugin-store** | Tauri 2.x 対応版 | アプリ設定・ウィンドウ状態の JSON 永続化。OS 標準アプリデータディレクトリに保存 |
| **notify** (crate) | 最新安定版 | ファイルシステム監視。Vault 内ファイル変更のリアルタイム検出。debounce 付き |
| **tokio** (crate) | 最新安定版 | 非同期ランタイム。Watcher のバックグラウンドタスク、非同期ファイル I/O |
| **serde** / **serde_json** (crate) | 最新安定版 | IPC データのシリアライズ / デシリアライズ |
| **React 18+** | 最新安定版 | UI フレームワーク |
| **Zustand** | 最新安定版 | 状態管理。vault-store、editor-store（基盤スライス） |
| **react-resizable-panels** | 最新安定版 | ペイン分割・リサイズ。LeftSidebar / CenterArea / RightTerminal の 3 列構成 |
| **Tailwind CSS** | 最新安定版 | ダークテーマベースのスタイリング |
| **Vite** | 最新安定版 | フロントエンドビルド。Tauri 2.x 統合 |

---

### Rust バックエンド詳細

#### 所有モジュール一覧

| ファイル | 種別 | 責務 |
|---------|------|------|
| `src-tauri/src/main.rs` | エントリーポイント | Tauri Builder 設定、プラグイン登録（fs, dialog, store, shell）、全ユニットのコマンドハンドラ登録、ケーパビリティ読み込み |
| `src-tauri/src/lib.rs` | モジュール宣言 | `pub mod commands`, `pub mod services`, `pub mod models`, `pub mod utils` |
| `src-tauri/src/commands/fs.rs` | IPC コマンド | ファイル読み取り / 書き込み / 作成 / 削除 / リネーム / 存在確認 |
| `src-tauri/src/commands/vault.rs` | IPC コマンド | Vault のオープン / クローズ / フォルダ選択ダイアログ / 設定取得・更新 |
| `src-tauri/src/commands/window.rs` | IPC コマンド | ウィンドウ状態の保存・復元 |
| `src-tauri/src/services/fs_service.rs` | サービス | ファイルシステム操作のビジネスロジック。Vault パス検証（Vault 外アクセス拒否）、`.gitignore` フィルタリング |
| `src-tauri/src/services/watcher_service.rs` | サービス | `notify` crate によるファイルシステム監視。debounce 処理、イベント分類（created / modified / deleted / renamed）、`app.emit()` によるフロントエンド通知 |
| `src-tauri/src/services/vault_service.rs` | サービス | Vault ライフサイクル管理。`.techtite/` ディレクトリ初期化、`.gitignore` 自動登録、VaultConfig の読み書き、最近使った Vault リストの管理 |
| `src-tauri/src/models/vault.rs` | データモデル | `Vault`, `VaultConfig`, `LogGranularity` |
| `src-tauri/src/models/file.rs` | データモデル | `FileEntry`, `FileMetadata`, `FileType`, `GitFileStatus` |
| `src-tauri/src/models/editor.rs` | データモデル | `WindowState`, `PaneLayout`, `PaneNode`, `SplitDirection`, `TabState`, `ViewMode` |
| `src-tauri/src/utils/path.rs` | ユーティリティ | パス正規化、Vault 相対パスへの変換、パストラバーサル検出 |
| `src-tauri/src/utils/gitignore.rs` | ユーティリティ | `.gitignore` パース、パスのフィルタリング判定 |
| `src-tauri/src/utils/error.rs` | ユーティリティ | 共通エラー型 `TechtiteError`、IPC 用エラーメッセージ変換 |

#### 公開 Tauri コマンド

| コマンド名 | 関数シグネチャ（概要） | 説明 |
|-----------|---------------------|------|
| `fs:read_file` | `(path: String) -> Result<String, String>` | Vault 内ファイルの UTF-8 読み取り |
| `fs:write_file` | `(path: String, content: String) -> Result<(), String>` | ファイル書き込み |
| `fs:create_file` | `(path: String, content: Option<String>) -> Result<(), String>` | 新規ファイル作成 |
| `fs:create_dir` | `(path: String) -> Result<(), String>` | ディレクトリ作成 |
| `fs:delete` | `(path: String) -> Result<(), String>` | ファイル / ディレクトリ削除 |
| `fs:rename` | `(old_path: String, new_path: String) -> Result<(), String>` | リネーム / 移動 |
| `fs:exists` | `(path: String) -> Result<bool, String>` | 存在確認 |
| `vault:open` | `(path: String) -> Result<Vault, String>` | Vault を開く。`.techtite/` 初期化、Watcher 起動 |
| `vault:get_current` | `() -> Result<Option<Vault>, String>` | 現在の Vault 取得 |
| `vault:select_folder` | `() -> Result<Option<String>, String>` | ネイティブフォルダ選択ダイアログ |
| `vault:get_config` | `() -> Result<VaultConfig, String>` | Vault 設定取得 |
| `vault:update_config` | `(config: VaultConfig) -> Result<(), String>` | Vault 設定更新 |
| `window:save_state` | `(state: WindowState) -> Result<(), String>` | ウィンドウ状態を tauri-plugin-store に保存 |
| `window:load_state` | `() -> Result<Option<WindowState>, String>` | ウィンドウ状態を tauri-plugin-store から復元 |

#### Tauri Builder 設定要点

```rust
// src-tauri/src/main.rs（概要）
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // Unit 1
            commands::fs::read_file,
            commands::fs::write_file,
            commands::fs::create_file,
            commands::fs::create_dir,
            commands::fs::delete,
            commands::fs::rename,
            commands::fs::exists,
            commands::vault::open,
            commands::vault::get_current,
            commands::vault::select_folder,
            commands::vault::get_config,
            commands::vault::update_config,
            commands::window::save_state,
            commands::window::load_state,
            // Unit 2〜10 のコマンドは各ユニットが追記
        ])
        .setup(|app| {
            // Vault 自動オープン（前回の Vault パスがあれば）
            // Watcher サービス初期化
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error running Techtite");
}
```

#### ケーパビリティ定義（`src-tauri/capabilities/`）

Tauri 2.x のケーパビリティモデルにより、フロントエンドからアクセス可能な API を明示的に宣言する。

```json
{
  "identifier": "main-capability",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "fs:default",
    "fs:allow-read",
    "fs:allow-write",
    "dialog:default",
    "dialog:allow-open",
    "store:default",
    "shell:default"
  ]
}
```

---

### フロントエンド詳細

#### React コンポーネント

| コンポーネント | ファイルパス | 責務 |
|--------------|-----------|------|
| `AppLayout` | `src/features/shell/components/AppLayout.tsx` | アプリ全体のレイアウト構成。`PanelGroup` / `Panel` / `PanelResizeHandle`（react-resizable-panels）で 3 列レイアウトを構築。LeftSidebar 幅デフォルト 240px、RightTerminal 幅デフォルト 0px（非表示）/ 420px（展開時） |
| `Ribbon` | `src/features/shell/components/Ribbon.tsx` | 左端 44px のアイコンナビゲーション。`activeSidebarPanel` 状態に基づきアクティブアイコンをハイライト。各アイコンクリックで LeftSidebar のパネル切り替え |
| `TabBar` | `src/features/shell/components/TabBar.tsx` | CenterArea 上部 36px のタブバー。タブの追加・選択・クローズ・ドラッグ並べ替え。未保存状態の黄色ドット表示。`editor-store` の `openTabs` / `activeTabId` と同期 |
| `PaneContainer` | `src/features/shell/components/PaneContainer.tsx` | CenterArea 内のペイン分割コンテナ。再帰的な `PaneLayout` に基づき `PanelGroup` をネスト。各 Leaf ノードに対応するタブグループの内容をレンダリング |
| `StatusBar` | `src/features/shell/components/StatusBar.tsx` | 下部 24px のステータスバー。左右にスロット領域を持ち、他ユニットのステータスウィジェットを配置するための `children` props またはコンテキストベースのスロットシステムを提供 |

#### Zustand ストア

**vault-store** (`src/stores/vault-store.ts`)

```typescript
interface VaultStoreState {
  currentVault: Vault | null;
  recentVaults: { path: string; name: string; lastOpenedAt: string }[];
  isLoading: boolean;
  error: string | null;

  // Actions
  openVault: (path: string) => Promise<void>;
  closeVault: () => void;
  selectFolder: () => Promise<string | null>;
  updateConfig: (config: VaultConfig) => Promise<void>;
}
```

**editor-store（基盤スライス）** (`src/stores/editor-store.ts`)

Unit 1 が管理する基盤スライス。Unit 2 がエディタ固有のスライスを追加する。

```typescript
interface EditorStoreState {
  // Unit 1 基盤スライス
  openTabs: TabState[];
  activeTabId: string | null;
  paneLayout: PaneLayout;
  sidebarWidth: number;
  terminalHeight: number;
  activeSidebarPanel: string;

  // Actions (Unit 1)
  openTab: (filePath: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  splitPane: (direction: "horizontal" | "vertical") => void;
  updatePaneLayout: (layout: PaneLayout) => void;
  setSidebarPanel: (panel: string) => void;
  saveWindowState: () => Promise<void>;
  restoreWindowState: () => Promise<void>;

  // Unit 2 エディタ固有スライスはここに追加される
}
```

---

### 公開インターフェース

Unit 1 が他ユニットに対して公開するインターフェース。

#### IPC コマンド（他ユニットが呼び出し可能）

| コマンド | 主な利用ユニット | 説明 |
|---------|---------------|------|
| `fs:read_file` | Unit 2, 3, 4, 5, 8 | ファイル内容読み取り |
| `fs:write_file` | Unit 2, 7, 8 | ファイル書き込み |
| `fs:create_file` | Unit 3, 7 | 新規ファイル作成 |
| `fs:create_dir` | Unit 3, 7 | ディレクトリ作成 |
| `fs:delete` | Unit 3, 7 | ファイル / ディレクトリ削除 |
| `fs:rename` | Unit 3 | リネーム / 移動 |
| `fs:exists` | Unit 3, 4 | 存在確認 |
| `vault:get_current` | Unit 2, 3, 4, 5, 6, 7, 8, 9, 10 | 現在の Vault 情報 |

#### イベント（Unit 1 が発火）

| イベント | ペイロード | 購読ユニット | 説明 |
|---------|----------|------------|------|
| `fs:changed` | `{ path: string, changeType: "created" \| "modified" \| "deleted" \| "renamed" }` | Unit 2, 3, 4, 7 | ファイルシステム変更検出 |
| `fs:external_change` | `{ path: string, agentId?: string }` | Unit 2 | 外部プロセス（エージェント等）によるファイル変更 |

#### Zustand ストア（他ユニットが参照）

| ストア | 参照ユニット | 参照する状態 |
|-------|------------|------------|
| `vault-store` | 全ユニット | `currentVault`（Vault パス、設定情報） |
| `editor-store`（基盤） | Unit 2, 3 | `openTabs`, `activeTabId`, `openTab()`, `closeTab()` |

#### UI スロット

| スロット | 利用ユニット | 説明 |
|---------|------------|------|
| `StatusBar` 左スロット | Unit 6 | ブランチ名、同期状態アイコン |
| `StatusBar` 右スロット | Unit 5, 7, 9 | RAG 状態、エージェント数、API コスト |
| `LeftSidebar` パネルスロット | Unit 3, 4, 5, 6, 7, 8, 10 | Ribbon 切り替えで表示されるサイドバーパネル |
| `PaneContainer` コンテンツスロット | Unit 2, 6, 8 | エディタ、DiffView、DailyLogView 等 |

---

### 消費インターフェース

Unit 1 が他ユニットから消費するインターフェース。

| 提供元 | インターフェース | 用途 |
|-------|---------------|------|
| Unit 6 | `sync:state_changed` イベント | StatusBar の同期状態表示更新 |
| Unit 7 | `agent:status_changed` イベント | StatusBar のエージェント数バッジ更新 |
| Unit 8 | `ambient:alert` イベント | Toast 通知の表示 |
| Unit 9 | `cost:updated` イベント | StatusBar の API コスト表示更新 |
| Unit 9 | `cost:warning` イベント | Toast 通知で予算警告表示 |
| Unit 9 | `cost:limit_reached` イベント | Toast 通知で予算上限到達表示 |
| Unit 5 | `semantic:index_progress` イベント | StatusBar の RAG 状態表示更新 |
| Unit 10 | `publish:completed` イベント | Toast 通知で公開完了表示 |

---

### データフロー

#### Vault オープンフロー

```
ユーザー操作（フォルダ選択）
  ↓
vault-store.openVault(path)
  ↓
IPC: vault:open { path }
  ↓
[Rust] vault_service::open_vault()
  ├─ パス検証
  ├─ .techtite/ ディレクトリ存在確認・初期化
  ├─ .gitignore に .techtite/ を自動追加
  ├─ VaultConfig 読み込み（.techtite/config.json）
  ├─ Git リポジトリ判定（.git/ 存在確認）
  ├─ Watcher 起動（watcher_service）
  └─ 最近使った Vault リスト更新（tauri-plugin-store）
  ↓
Vault 構造体を返却
  ↓
vault-store.currentVault にセット
  ↓
editor-store.restoreWindowState()（前回の状態復元）
```

#### ファイル変更検出フロー

```
ファイルシステム変更（外部 or 内部）
  ↓
[Rust] watcher_service（notify crate）
  ├─ debounce（100ms）
  ├─ .techtite/ 配下は無視
  └─ changeType 分類（created / modified / deleted / renamed）
  ↓
app.emit("fs:changed", { path, changeType })
  ↓
[Frontend] 各ユニットが購読
  ├─ Unit 2: エディタ内容のリロード判定
  ├─ Unit 3: ファイルツリーの更新
  ├─ Unit 4: インデックス再構築トリガー
  └─ Unit 7: エージェント操作ログとの突合
```

#### ウィンドウ状態保存・復元フロー

```
アプリ終了 or 状態変更時
  ↓
editor-store.saveWindowState()
  ↓
WindowState を構築（openTabs, paneLayout, sidebarWidth 等）
  ↓
IPC: window:save_state { state }
  ↓
[Rust] tauri-plugin-store に JSON 保存
  ↓
（次回起動時）
  ↓
IPC: window:load_state
  ↓
WindowState を返却
  ↓
editor-store に反映（タブ再オープン、ペイン再構築）
```

---

### パフォーマンス要件

| 項目 | 目標値 | ベースライン条件 |
|------|--------|----------------|
| Vault オープン | 1 秒以内 | 10,000 ファイル / 1GB 規模、M1 Mac |
| ファイル読み取り（IPC 往復） | 50ms 以内（p95） | 1MB 以下のファイル |
| ファイル変更検出→イベント発火 | 200ms 以内 | debounce 含む |
| ウィンドウ状態保存 | 100ms 以内 | 非同期実行、UI ブロック無し |
| ウィンドウ状態復元 | 500ms 以内 | タブ 20 個、ペイン 4 分割 |
| タブ切り替え | 16ms 以内（1 フレーム） | React レンダリング |
| ペインリサイズ | 60fps 維持 | react-resizable-panels のネイティブ CSS リサイズ |

---

### 制約・注意事項

1. **Vault パスセキュリティ**: すべてのファイル I/O コマンドは `fs_service` 内でパス検証を行い、Vault ルート外へのアクセスを拒否する。パストラバーサル攻撃（`../` 等）を防止すること。
2. **共有ファイルの編集ルール**: `main.rs` と `lib.rs` は Unit 1 が主担当。他ユニットはコマンド登録の追記のみ行い、既存行を変更しない。
3. **editor-store のスライス分離**: Unit 1 は基盤スライス（タブ、ペイン、レイアウト）を管理し、Unit 2 がエディタ固有スライス（カーソル位置、編集モード等）を追加する。互いのスライスを直接変更しないこと。
4. **Watcher の debounce**: `notify` crate のイベントは高頻度で発火するため、100ms の debounce を適用する。同一ファイルへの連続変更は 1 つのイベントにまとめる。
5. **`.techtite/` ディレクトリ**: Vault オープン時に自動作成し、`.gitignore` への自動登録を行う。既に登録済みの場合は重複追加しない。
6. **tauri-plugin-store の保存タイミング**: ウィンドウ状態は変更の都度ではなく、一定間隔（5 秒）の throttle を適用し、アプリ終了時に最終保存を行う。
7. **プラットフォーム差異**: macOS（P0）、Windows（P1）、Linux（P2）で `notify` crate のバックエンドが異なる（FSEvents / ReadDirectoryChanges / inotify）。各プラットフォームでの Watcher 動作をテストすること。
8. **大規模 Vault 対応**: 10,000 ファイル以上の Vault で起動速度とメモリ使用量が許容範囲内であることを確認する。ファイルツリー取得は遅延読み込み（ディレクトリ展開時に子要素をフェッチ）を検討する。
