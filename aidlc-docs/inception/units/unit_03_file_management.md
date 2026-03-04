# Unit 3: プロジェクト・ファイル管理

> **対応 Epic**: Epic 3 — プロジェクト・ファイル管理
> **対応ストーリー**: US-3.1〜US-3.5

---

## ユーザーストーリーと受け入れ基準

### US-3.1 [Must] ファイルエクスプローラ

個人開発者として、サイドバーにフォルダツリー形式のファイルエクスプローラを表示したい。なぜなら、プロジェクト全体の構造を把握しながらファイルにアクセスしたいからだ。

- [ ] サイドバーにVault内のフォルダ・ファイルがツリー構造で表示される
- [ ] フォルダの展開・折りたたみができる
- [ ] ファイルをクリックするとエディタで開かれる
- [ ] ファイルシステムの変更（外部からの追加・削除含む）がリアルタイムで反映される

### US-3.2 [Must] ファイルCRUD操作

個人開発者として、ファイルやフォルダの作成・移動・削除・リネームをアプリ内で行いたい。なぜなら、プロジェクトの整理をエディタから離れずに行いたいからだ。

- [ ] 右クリックメニューまたはショートカットで新規ファイル・フォルダを作成できる
- [ ] ドラッグ＆ドロップまたは右クリックメニューでファイルを移動できる
- [ ] ファイル・フォルダの削除ができる（確認ダイアログ付き）
- [ ] ファイル・フォルダのリネームができる
- [ ] ファイル移動・リネーム時に内部リンクが自動更新される

### US-3.3 [Should] Quick Switcher

個人開発者として、Quick Switcher（ファジー検索）でファイル名を入力して素早くファイルを開きたい。なぜなら、大量のファイルの中から目的のファイルにキーボード操作だけで瞬時にアクセスしたいからだ。

- [ ] ショートカットキーでQuick Switcherモーダルが開く
- [ ] 入力に応じてファジーマッチでファイル名候補がリアルタイム表示される
- [ ] EnterキーまたはクリックでファイルID選択・遷移できる
- [ ] 候補表示が高速（入力から100ms以内、p95）である（ベースライン: M1 Mac、Vault 10,000ファイル/1GB規模、ウォーム状態。コールドスタート時は初回インデックス構築後に同等性能）

### US-3.4 [Should] コマンドパレット

個人開発者として、コマンドパレットからアプリケーション内のすべてのアクションを検索・実行したい。なぜなら、メニューを探す手間なく、キーボードだけで効率的に操作したいからだ。

- [ ] ショートカットキーでコマンドパレットが開く
- [ ] 登録されたすべてのコマンドがテキスト検索で絞り込める
- [ ] コマンド選択で対応するアクションが実行される
- [ ] 各コマンドにキーボードショートカットが表示される

### US-3.5 [Must] AIからファイル構造取得

AIエージェントとして、プロジェクト内のファイル一覧とフォルダ構造を取得したい。なぜなら、プロジェクトの全体像を把握した上でコードやドキュメントを適切に配置したいからだ。

- [ ] API経由でVault内の.gitignore適用後の全ファイル・フォルダのツリー構造を取得できる
- [ ] 各ファイルのパス、サイズ、更新日時等のメタデータが含まれる

---

## 技術仕様

### アーキテクチャ概要

Unit 3 は Techtite のプロジェクト・ファイル管理レイヤーを構成する。LeftSidebar のファイルエクスプローラ（ツリービュー）、Quick Switcher（ファジー検索モーダル）、Command Palette（コマンドレジストリモーダル）を提供する。ファイル CRUD 操作は Unit 1 の IPC コマンド（`fs:*`）を経由して実行し、ファイルのリネーム・移動時には Unit 4 と連携して内部リンクの自動更新を行う。

```
┌──────────────────────────────────────────────────────────┐
│  フロントエンド (React + TypeScript)                       │
│                                                            │
│  ┌──────────────────┐ ┌─────────────┐ ┌───────────────┐  │
│  │ FileExplorer     │ │QuickSwitcher│ │CommandPalette │  │
│  │  └ FileTreeNode  │ │ (モーダル)  │ │ (モーダル)    │  │
│  │   (LeftSidebar)  │ └─────────────┘ └───────────────┘  │
│  └──────────────────┘                                      │
│  ┌──────────────────────────────────────────────────┐     │
│  │ file-tree-store (Zustand)                         │     │
│  │   ├─ ツリー構造キャッシュ                          │     │
│  │   ├─ 展開状態管理                                  │     │
│  │   ├─ ファジー検索インデックス (fuse.js)            │     │
│  │   └─ コマンドレジストリ                            │     │
│  └──────────────────────────────────────────────────┘     │
├──────────────────── IPC（Unit 1 経由） ───────────────────┤
│  [Rust] commands/file_tree.rs                              │
│  ファイル CRUD は commands/fs.rs（Unit 1）を再利用          │
└──────────────────────────────────────────────────────────┘
```

---

### UI 担当領域

モックアップ `techtite_mockup.html` に基づく Unit 3 の UI 責任範囲。

| 領域 | コンポーネント | 説明 |
|------|--------------|------|
| **ファイルエクスプローラ** | `FileExplorer.tsx` + `FileTreeNode.tsx` | LeftSidebar の Files パネル。ヘッダに「New file」「New folder」アクションボタン。ツリー構造でフォルダの展開/折りたたみ。ファイルクリックでエディタオープン。アクティブファイルのハイライト（accent カラー）。右クリックコンテキストメニュー（CRUD 操作） |
| **Quick Switcher** | `QuickSwitcher.tsx` | 画面中央上部に表示されるモーダル。テキスト入力で Vault 内ファイルをファジー検索。候補リストをリアルタイム表示。Enter / クリックでファイル遷移。`Cmd+P`（macOS）/ `Ctrl+P`（Windows / Linux）で起動 |
| **Command Palette** | `CommandPalette.tsx` | 画面中央上部に表示されるモーダル。登録済みコマンドのテキスト検索。各コマンドにショートカットキー表示。選択でアクション実行。`Cmd+Shift+P`（macOS）/ `Ctrl+Shift+P`（Windows / Linux）で起動 |

モックアップのスタイル対応:

| UI 要素 | モックアップクラス | 表示仕様 |
|--------|----------------|---------|
| フォルダノード | `.fd` | 展開アイコン（▶ / ▼）、フォルダ絵文字、フォルダ名。hover 時 `bg-hover` |
| ファイルノード | `.fi` | ファイル絵文字、ファイル名。アクティブ時 `.fi.on`（accent カラー + `bg-active`） |
| 子要素インデント | `.fc` | `padding-left: 16px` の再帰的ネスト |
| モーダル | `.modal-bg` + `.modal` | 固定オーバーレイ（`rgba(0,0,0,.55)`）、幅 560px、上部 14vh マージン |
| モーダル入力 | `.modal-in input` | 16px フォント、プレースホルダ付き。フォーカスで accent ボーダー |
| 候補リスト | `.ml-item` | 13px フォント、hover / 選択時 accent 背景 + 白文字 |

---

### 主要ライブラリ・技術

| ライブラリ / 技術 | バージョン方針 | 用途 |
|-----------------|-------------|------|
| **fuse.js** | 最新安定版 | クライアントサイドのファジーマッチ。Quick Switcher のファイル名検索、Command Palette のコマンド名検索に使用 |
| **React** | 18+ 最新安定版 | コンポーネント実装 |
| **Zustand** | 最新安定版 | `file-tree-store` の状態管理 |
| **Tailwind CSS** | 最新安定版 | スタイリング |

Unit 3 はフロントエンド主体のユニットであり、追加の Rust crate 依存は持たない。

---

### Rust バックエンド詳細

#### 所有モジュール

| ファイル | 種別 | 責務 |
|---------|------|------|
| `src-tauri/src/commands/file_tree.rs` | IPC コマンド | ファイルツリー構造の取得、ファイルメタデータの取得 |

Unit 3 のファイル CRUD 操作は Unit 1 の `commands/fs.rs`（`fs:create_file`, `fs:create_dir`, `fs:delete`, `fs:rename`）を直接呼び出す。`file_tree.rs` はツリー構造取得に特化する。

#### 公開 Tauri コマンド

| コマンド名 | 関数シグネチャ（概要） | 説明 |
|-----------|---------------------|------|
| `file_tree:get_tree` | `(include_ignored: Option<bool>) -> Result<FileEntry, String>` | Vault 内のファイルツリーを再帰的に取得。デフォルトで `.gitignore` / `.techtite/` を除外。`include_ignored: true` で全ファイルを返却 |
| `file_tree:get_metadata` | `(path: String) -> Result<FileMetadata, String>` | 指定ファイルのメタデータ（サイズ、更新日時、ファイル種別、Frontmatter、タグ、リンク、Git 状態）を取得 |

#### ツリー取得の実装方針

```rust
// commands/file_tree.rs（概要）
#[tauri::command]
async fn get_tree(include_ignored: Option<bool>) -> Result<FileEntry, String> {
    let vault = get_current_vault()?;
    let root = vault.path.clone();

    // .gitignore パーサーでフィルタリング
    let gitignore = parse_gitignore(&root);

    // 再帰的にディレクトリを走査
    // .techtite/ は常に除外
    // include_ignored が false（デフォルト）の場合、.gitignore マッチも除外
    build_file_tree(&root, &root, &gitignore, include_ignored.unwrap_or(false))
}
```

---

### フロントエンド詳細

#### React コンポーネント

| コンポーネント | ファイルパス | 責務 |
|--------------|-----------|------|
| `FileExplorer` | `src/features/file-management/components/FileExplorer.tsx` | LeftSidebar の Files パネル最上位コンポーネント。ヘッダ（「FILES」タイトル + 新規ファイル / フォルダボタン）、`FileTreeNode` の再帰レンダリング。`fs:changed` イベントでツリー自動更新。コンテキストメニュー（`shared/ContextMenu.tsx`）の統合 |
| `FileTreeNode` | `src/features/file-management/components/FileTreeNode.tsx` | ツリーの個別ノード。フォルダ: 展開/折りたたみトグル、子ノードの遅延レンダリング。ファイル: クリックで `editor-store.openTab()` 呼び出し。インライン名前編集（ダブルクリック or F2）。ドラッグ&ドロップ（ファイル移動） |
| `QuickSwitcher` | `src/features/file-management/components/QuickSwitcher.tsx` | モーダルコンポーネント。`Cmd+P` / `Ctrl+P` で表示。入力フィールドとファジー検索結果リスト。`fuse.js` インスタンスで `file-tree-store.flatFileList` を検索。上下キーで候補選択、Enter でファイルオープン、Esc で閉じる |
| `CommandPalette` | `src/features/file-management/components/CommandPalette.tsx` | モーダルコンポーネント。`Cmd+Shift+P` / `Ctrl+Shift+P` で表示。`file-tree-store.commandRegistry` から登録済みコマンドを `fuse.js` で検索。コマンド名 + ショートカットキーを表示。選択で `command.execute()` を呼び出す |

#### Zustand ストア

**file-tree-store** (`src/stores/file-tree-store.ts`)

```typescript
interface FileTreeStoreState {
  // ツリー状態
  rootEntry: FileEntry | null;
  flatFileList: { path: string; name: string }[];  // Quick Switcher 用フラット化リスト
  expandedDirs: Set<string>;                        // 展開中ディレクトリパスの Set
  selectedPath: string | null;                      // 現在選択中のファイル/フォルダ
  isLoading: boolean;

  // コマンドレジストリ
  commandRegistry: CommandEntry[];

  // fuse.js インスタンス（内部管理）
  _fuseFiles: Fuse<{ path: string; name: string }> | null;
  _fuseCommands: Fuse<CommandEntry> | null;

  // Actions
  loadTree: () => Promise<void>;
  refreshTree: () => Promise<void>;
  toggleDir: (dirPath: string) => void;
  selectNode: (path: string) => void;

  // ファイル CRUD（Unit 1 IPC 経由）
  createFile: (dirPath: string, fileName: string, content?: string) => Promise<void>;
  createDir: (dirPath: string, dirName: string) => Promise<void>;
  deleteNode: (path: string) => Promise<void>;
  renameNode: (oldPath: string, newName: string) => Promise<void>;
  moveNode: (sourcePath: string, targetDirPath: string) => Promise<void>;

  // Quick Switcher
  searchFiles: (query: string) => { path: string; name: string }[];

  // Command Palette
  registerCommand: (command: CommandEntry) => void;
  unregisterCommand: (commandId: string) => void;
  searchCommands: (query: string) => CommandEntry[];
  executeCommand: (commandId: string) => void;
}

interface CommandEntry {
  id: string;
  label: string;                  // 表示名
  shortcut?: string;              // ショートカットキー表示用（例: "Cmd+P"）
  category?: string;              // カテゴリ（例: "File", "Edit", "View"）
  execute: () => void;            // 実行関数
}
```

#### fuse.js 設定

```typescript
// Quick Switcher 用
const fuseFileOptions: Fuse.IFuseOptions<{ path: string; name: string }> = {
  keys: ["name", "path"],
  threshold: 0.4,          // ファジー度合い（0.0 = 完全一致、1.0 = 何でもマッチ）
  distance: 100,
  includeScore: true,
  shouldSort: true,
  minMatchCharLength: 1,
};

// Command Palette 用
const fuseCommandOptions: Fuse.IFuseOptions<CommandEntry> = {
  keys: ["label", "category"],
  threshold: 0.3,
  includeScore: true,
  shouldSort: true,
};
```

#### コマンドレジストリ設計

各ユニットはアプリ起動時に `file-tree-store.registerCommand()` を呼び出して自身のコマンドを登録する。

```typescript
// 登録例（各ユニットの初期化時に呼び出し）
fileTreeStore.registerCommand({
  id: "file.newFile",
  label: "New File",
  shortcut: "Cmd+N",
  category: "File",
  execute: () => { /* 新規ファイル作成ダイアログ */ },
});

fileTreeStore.registerCommand({
  id: "editor.togglePreview",
  label: "Toggle Live Preview",
  shortcut: "Cmd+E",
  category: "Editor",
  execute: () => { /* プレビューモード切替 */ },
});
```

---

### 公開インターフェース

Unit 3 が他ユニットに対して公開するインターフェース。

#### IPC コマンド

| コマンド | 主な利用ユニット | 説明 |
|---------|---------------|------|
| `file_tree:get_tree` | Unit 7（エージェントのプロジェクト構造取得） | ファイルツリー構造の取得 |
| `file_tree:get_metadata` | Unit 4（メタデータからリンク・タグ情報取得） | ファイルメタデータ取得 |

#### Zustand ストア

| ストア・メソッド | 利用ユニット | 説明 |
|---------------|------------|------|
| `file-tree-store.registerCommand()` | 全ユニット | コマンドパレットへのコマンド登録 |
| `file-tree-store.unregisterCommand()` | 全ユニット | コマンドの登録解除 |
| `file-tree-store.flatFileList` | Unit 4, 5 | 検索対象ファイルリストの参照 |

#### キーボードショートカット

| ショートカット | macOS | Windows / Linux | アクション |
|--------------|-------|----------------|----------|
| Quick Switcher 起動 | `Cmd+P` | `Ctrl+P` | Quick Switcher モーダルを開く |
| Command Palette 起動 | `Cmd+Shift+P` | `Ctrl+Shift+P` | Command Palette モーダルを開く |
| 新規ファイル | `Cmd+N` | `Ctrl+N` | 新規ファイル作成ダイアログ |
| 削除 | `Cmd+Backspace` | `Delete` | 選択中ノードの削除（確認ダイアログ付き） |
| リネーム | `F2` | `F2` | 選択中ノードのインライン名前編集 |

---

### 消費インターフェース

Unit 3 が他ユニットから消費するインターフェース。

| 提供元 | インターフェース | 用途 |
|-------|---------------|------|
| Unit 1 | `fs:create_file` コマンド | 新規ファイル作成 |
| Unit 1 | `fs:create_dir` コマンド | 新規ディレクトリ作成 |
| Unit 1 | `fs:delete` コマンド | ファイル / ディレクトリ削除 |
| Unit 1 | `fs:rename` コマンド | リネーム / 移動 |
| Unit 1 | `fs:exists` コマンド | 存在確認（リネーム時の重複チェック） |
| Unit 1 | `fs:changed` イベント | ファイルシステム変更通知。ツリー自動更新 |
| Unit 1 | `vault:get_current` コマンド | Vault パス取得。ツリーのルート決定 |
| Unit 1 | `editor-store.openTab()` | ファイルクリック / Quick Switcher でのファイルオープン |
| Unit 2 | `editor-store.saveFile()` | リネーム前の未保存ファイル自動保存 |
| Unit 4 | `knowledge:get_outgoing_links` コマンド | リネーム・移動時の内部リンク自動更新対象の特定 |

---

### データフロー

#### ファイルツリー初期ロードフロー

```
vault-store.currentVault 変更（Vault オープン）
  ↓
file-tree-store.loadTree()
  ↓
IPC: file_tree:get_tree { includeIgnored: false }
  ↓
[Rust] file_tree.rs
  ├─ Vault ルートから再帰的走査
  ├─ .techtite/ を除外
  ├─ .gitignore マッチを除外
  └─ FileEntry ツリー構造を返却
  ↓
file-tree-store.rootEntry にセット
  ↓
flatFileList を構築（ツリーのフラット化）
  ↓
fuse.js インデックスを再構築
```

#### ファイルリネーム + 内部リンク自動更新フロー

```
ユーザーが F2 / ダブルクリックでリネーム開始
  ↓
新しい名前を入力 → Enter
  ↓
file-tree-store.renameNode(oldPath, newName)
  ├─ 対象ファイルが openTabs にあり dirty の場合:
  │   editor-store.saveFile(oldPath)（先に保存）
  ├─ IPC: fs:exists { path: newPath }（重複チェック）
  ├─ IPC: fs:rename { oldPath, newPath }
  └─ 内部リンク自動更新:
      ├─ IPC: knowledge:get_backlinks { path: oldPath }
      │   → oldPath を参照している全ファイルのリストを取得
      ├─ 各ファイルの内容を fs:read_file で読み取り
      ├─ [[oldName]] / [[oldPath]] を [[newName]] / [[newPath]] に置換
      └─ fs:write_file で書き戻し
  ↓
file-tree-store.refreshTree()
  ↓
editor-store の対象タブの filePath を更新
```

#### Quick Switcher フロー

```
Cmd+P / Ctrl+P
  ↓
QuickSwitcher モーダル表示
  ↓
ユーザーがテキスト入力
  ↓
file-tree-store.searchFiles(query)
  ├─ fuse.js.search(query)
  └─ スコア順にソートされた候補を返却
  ↓
候補リストをリアルタイムレンダリング
  ↓
Enter / クリック
  ↓
editor-store.openTab(selectedFilePath)
  ↓
QuickSwitcher モーダルを閉じる
```

#### Command Palette フロー

```
Cmd+Shift+P / Ctrl+Shift+P
  ↓
CommandPalette モーダル表示
  ↓
ユーザーがテキスト入力
  ↓
file-tree-store.searchCommands(query)
  ├─ fuse.js.search(query)
  └─ スコア順にソートされた候補を返却
  ↓
候補リスト表示（コマンド名 + ショートカットキー）
  ↓
Enter / クリック
  ↓
file-tree-store.executeCommand(commandId)
  ↓
command.execute() を実行
  ↓
CommandPalette モーダルを閉じる
```

---

### パフォーマンス要件

| 項目 | 目標値 | ベースライン条件 |
|------|--------|----------------|
| ファイルツリー初期ロード | 500ms 以内 | 10,000 ファイル / 1GB Vault、M1 Mac |
| ツリー差分更新（fs:changed 後） | 100ms 以内 | 変更ファイル 1〜10 個 |
| Quick Switcher 候補表示 | 100ms 以内（p95） | 10,000 ファイル、ウォーム状態。コールドスタート時は初回インデックス構築後に同等性能 |
| Command Palette 候補表示 | 50ms 以内 | 登録コマンド 200 個以下 |
| ファイル CRUD 操作 | 200ms 以内 | IPC 往復含む |
| 内部リンク自動更新 | 2 秒以内 | 100 ファイルからバックリンクされているファイルのリネーム |
| ドラッグ&ドロップ移動 | 60fps 維持 | ドラッグ中のビジュアルフィードバック |

---

### 制約・注意事項

1. **ファイルツリーの遅延読み込み**: 大規模 Vault（10,000 ファイル以上）では初期ロードで全ツリーを取得するとパフォーマンスが低下する可能性がある。初回はルート直下のみ取得し、フォルダ展開時に子要素をオンデマンドでフェッチする遅延読み込みを実装すること。
2. **`.gitignore` の適用**: ファイルツリーはデフォルトで `.gitignore` に記載されたファイルを除外する。ただしユーザーが明示的に「隠しファイルを表示」を選択した場合は除外しない（`include_ignored: true`）。
3. **内部リンク自動更新の範囲**: リネーム・移動時の内部リンク自動更新は `[[]]` 記法のみを対象とする。Markdown 標準リンク `[text](path)` は対象外（意図しない URL の書き換えを防止するため）。
4. **コマンドレジストリの初期化順序**: 各ユニットのコマンド登録は React コンポーネントのマウント時に行う。Unit 3 の `CommandPalette` は登録タイミングに依存しないリアクティブな設計とし、登録後即座にパレットから検索可能であること。
5. **Quick Switcher のインデックス更新**: `fs:changed` イベント受信時に `flatFileList` と fuse.js インデックスを更新する。更新はバッチ処理（debounce 200ms）で行い、高頻度のファイル変更でもパフォーマンスが劣化しないこと。
6. **右クリックメニューの実装**: ContextMenu は `src/shared/components/ContextMenu.tsx`（Unit 1 提供の共有コンポーネント）を使用する。メニュー項目はファイル/フォルダで異なる内容を表示する（ファイル: Open / Rename / Delete / Copy Path、フォルダ: New File / New Folder / Rename / Delete）。
7. **ドラッグ&ドロップの制約**: フォルダ内へのファイル移動のみ対応する。フォルダの並べ替えや、ファイルエクスプローラ外（デスクトップ等）からのドロップは MVP では対象外とする。
8. **削除操作の安全性**: ファイル / フォルダの削除は必ず確認ダイアログを表示する。ディレクトリの削除は再帰的に実行されるため、含まれるファイル数を確認ダイアログに表示すること。
