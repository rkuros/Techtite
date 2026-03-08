# Unit 2: マークダウンエディタ

> **対応 Epic**: Epic 2 — マークダウンエディタ（コアエディタ）
> **対応ストーリー**: US-2.1〜US-2.7

---

## ユーザーストーリーと受け入れ基準

### US-2.1 [Must] Live Previewモード

個人開発者として、マークダウンファイルをLive Previewモードで編集したい。なぜなら、ソースコードを直接編集しながら、整形された表示を同時に確認したいからだ。

- [ ] カーソルがある行はMarkdownソースが表示される
- [ ] カーソルが離れた行はリッチな表示（レンダリング済み）に変換される
- [ ] 元のプレーンテキストが破壊されない（非破壊的レンダリング）
- [ ] ソースモードとLive Previewモードを切り替えられる

### US-2.2 [Must] 基本Markdown記法レンダリング

個人開発者として、見出し・リスト・太字・イタリック・コードブロック・引用・テーブル等の基本的なMarkdown記法が正しくレンダリングされてほしい。なぜなら、構造化されたドキュメントを快適に読み書きしたいからだ。

- [ ] 見出し（h1〜h6）がフォントサイズ・スタイルで区別して表示される
- [ ] 順序付き/順序なしリスト・チェックリストが正しくレンダリングされる
- [ ] 太字・イタリック・取り消し線・インラインコードが視覚的に反映される
- [ ] コードブロックがシンタックスハイライト付きで表示される
- [ ] 引用・テーブル・水平線が正しく表示される

### US-2.3 [Should] YAML Frontmatter GUI

個人開発者として、ファイルのYAML FrontmatterをGUIで視覚的に編集したい。なぜなら、YAMLの構文エラーを気にせずメタデータ（タイトル、タグ、日付等）を安全に管理したいからだ。

- [ ] YAML Frontmatterがエディタ上部にGUIフォームとして表示される
- [ ] 文字列、リスト、日付、チェックボックスの各データ型を視覚的に編集できる
- [ ] GUI編集の結果が正しいYAML形式でファイルに保存される
- [ ] YAML構文が壊れないことが保証される

### US-2.4 [Could] LaTeX数式レンダリング

個人開発者として、数式（LaTeX記法）がエディタ上でレンダリングされてほしい。なぜなら、技術ドキュメントで数式を使用することがあるからだ。

- [ ] インライン数式（`$...$`）がLive Previewで数式としてレンダリングされる
- [ ] ブロック数式（`$$...$$`）がLive Previewで数式としてレンダリングされる

### US-2.5 [Should] 画像埋め込みプレビュー

個人開発者として、画像をマークダウン内に埋め込み、エディタ上でプレビュー表示したい。なぜなら、スクリーンショットや図をドキュメントに含めて確認したいからだ。

- [ ] `![alt](path)` 記法の画像がLive Previewで表示される
- [ ] Vault内の相対パスの画像が正しく解決・表示される
- [ ] 画像が存在しない場合にエラー表示（プレースホルダ）が出る

### US-2.6 [Must] コードファイル閲覧（読み取り専用）

個人開発者として、コードファイル（.ts, .py, .rs等）をシンタックスハイライト付きで閲覧したい。なぜなら、AIエージェントが書いたコードの内容をレビューしたいからだ。

- [ ] コードファイルを開くとシンタックスハイライト付きで表示される
- [ ] 行番号が表示される
- [ ] 読み取り専用モードがデフォルトとなる（編集ロック表示付き）
- [ ] 必要に応じて編集モードに切り替えられる

### US-2.7 [Must] AIによるファイル読み書き

AIエージェントとして、マークダウンファイルおよびコードファイルの内容をプレーンテキストとして読み書きしたい。なぜなら、ドキュメント・コードの生成・編集をプログラム的に行うからだ。

- [ ] ファイルの内容をプレーンテキスト（UTF-8）として読み取れる
- [ ] プレーンテキストを書き込むとファイルとして正しく保存される
- [ ] ファイルの保存後、エディタの表示が自動的に更新される

---

## 技術仕様

### アーキテクチャ概要

Unit 2 は Techtite の **コアエディタレイヤー** を構成する。CodeMirror 6 をベースに、Live Preview（非破壊的レンダリング）、コードファイル閲覧（読み取り専用 + シンタックスハイライト）、YAML Frontmatter GUI、画像埋め込みプレビュー、LaTeX 数式レンダリングを提供する。ファイル I/O は Unit 1 の IPC コマンド経由で行い、Unit 2 自体はエディタ表示・操作に専念する。

```
┌──────────────────────────────────────────────────────────┐
│  CenterArea（Unit 1 PaneContainer 内）                    │
│  ┌───────────────────────────────────────────────┐       │
│  │ EditorContainer                                │       │
│  │  ├─ FrontmatterGUI（YAML メタデータ GUI）      │       │
│  │  ├─ MarkdownEditor（CodeMirror 6 + Live Preview│）     │
│  │  │   ├─ live-preview.ts      拡張              │       │
│  │  │   ├─ internal-link.ts     拡張（→Unit 4）   │       │
│  │  │   ├─ tag-highlight.ts     拡張（→Unit 4）   │       │
│  │  │   ├─ image-preview.ts     拡張              │       │
│  │  │   └─ latex-preview.ts     拡張（katex）     │       │
│  │  └─ CodeViewer（読み取り専用モード）            │       │
│  └───────────────────────────────────────────────┘       │
│  ┌───────────────────────────────────────────────┐       │
│  │ editor-store（エディタ固有スライス）            │       │
│  └───────────────────────────────────────────────┘       │
├──────────────────── IPC（Unit 1 経由） ──────────────────┤
│  [Rust] commands/editor.rs                                │
│  ファイル I/O は commands/fs.rs を再利用                    │
└──────────────────────────────────────────────────────────┘
```

---

### UI 担当領域

モックアップ `techtite_mockup.html` に基づく Unit 2 の UI 責任範囲。

| 領域 | コンポーネント | 説明 |
|------|--------------|------|
| **エディタ本体** | `MarkdownEditor.tsx` | CenterArea 内のメインエディタ。CodeMirror 6 ベースの Live Preview モード。カーソル行は Markdown ソース表示、それ以外はリッチプレビュー。padding: 32px 60px |
| **コードビューア** | `CodeViewer.tsx` | `.ts`, `.py`, `.rs` 等のコードファイルを読み取り専用で表示。行番号付き、シンタックスハイライト。編集モード切替トグル付き |
| **Frontmatter GUI** | `FrontmatterGUI.tsx` | エディタ上部に表示される YAML Frontmatter の GUI フォーム。`title`（テキスト入力）、`tags`（タグチップ入力）、`date`（日付ピッカー）、`aliases`（リスト入力）、カスタムフィールド（`extra`）のキー・バリュー編集 |
| **エディタコンテナ** | `EditorContainer.tsx` | ファイル種別（Markdown / Code）に基づき `MarkdownEditor` または `CodeViewer` を切り替え。`ViewMode`（LivePreview / Source / ReadOnly）の制御 |

モックアップの各 Markdown 要素のスタイル対応:

| Markdown 要素 | モックアップクラス | 表示仕様 |
|--------------|----------------|---------|
| 見出し h1〜h6 | `.md h1` 〜 `.md h3` | h1: 24px 太字、h2: 18px + 下線、h3: 15px |
| コードブロック | `.md .cb` | 背景 `#111`、等幅フォント 12px、シンタックスハイライト |
| 引用 | `.md blockquote` | 左 3px accent ボーダー、背景 `rgba(124,106,242,0.05)` |
| 内部リンク `[[]]` | `.md .link` | accent カラー（`#8b7ef0`）、ホバーで下線。未存在リンクは `.dead`（半透明） |
| タグ `#tag` | `.md .tag` | accent 背景のピル型バッジ |
| Frontmatter | `.md .fm` | sidebar 背景色のボックス。キーに accent カラー |
| チェックリスト | `.md .chk` | accent カラーのチェックボックス |
| テーブル | `.md table` | ボーダー付き、ヘッダ行は sidebar 背景色 |

---

### 主要ライブラリ・技術

| ライブラリ / 技術 | バージョン方針 | 用途 |
|-----------------|-------------|------|
| **@uiw/react-codemirror** | 最新安定版 | CodeMirror 6 の React バインディング。エディタの基盤コンポーネント |
| **@codemirror/lang-markdown** | 最新安定版 | Markdown 言語サポート。パース、シンタックスハイライト、折りたたみ |
| **@codemirror/lang-javascript** | 最新安定版 | TypeScript / JavaScript のシンタックスハイライト（CodeViewer 用） |
| **@codemirror/lang-python** | 最新安定版 | Python のシンタックスハイライト（CodeViewer 用） |
| **@codemirror/lang-rust** | 最新安定版 | Rust のシンタックスハイライト（CodeViewer 用） |
| **@codemirror/lang-***（各言語） | 最新安定版 | その他言語のシンタックスハイライト（必要に応じて追加） |
| **@codemirror/view** | 最新安定版 | EditorView、ViewPlugin、Decoration API。Live Preview 拡張の基盤 |
| **@codemirror/state** | 最新安定版 | EditorState、StateField、StateEffect。エディタ状態管理 |
| **katex** | 最新安定版 | LaTeX 数式レンダリング。インライン `$...$` とブロック `$$...$$` に対応 |
| **yaml** | 最新安定版 | YAML Frontmatter のパース（`yaml.parse()`）とシリアライズ（`yaml.stringify()`） |
| **Tauri convertFileSrc** | Tauri 2.x API | Vault 内の画像ファイルパスを WebView 表示可能な URL に変換 |

---

### Rust バックエンド詳細

#### 所有モジュール

| ファイル | 種別 | 責務 |
|---------|------|------|
| `src-tauri/src/commands/editor.rs` | IPC コマンド | エディタ固有のコマンド。ファイル種別判定、プレーンテキスト読み書きのラッパー |

Unit 2 のバックエンド責務は軽量である。ファイルの読み書き自体は Unit 1 の `fs:read_file` / `fs:write_file` を直接使用し、`commands/editor.rs` はエディタ固有の補助コマンドのみを定義する。

#### 公開 Tauri コマンド

| コマンド名 | 関数シグネチャ（概要） | 説明 |
|-----------|---------------------|------|
| `editor:get_file_type` | `(path: String) -> Result<FileType, String>` | ファイル拡張子から `FileType`（Markdown / Code / Image / Binary / Other）を判定 |
| `editor:get_language` | `(path: String) -> Result<String, String>` | コードファイルの言語名を返却（拡張子マッピング: `.ts` → `"typescript"`, `.py` → `"python"` 等） |

---

### フロントエンド詳細

#### React コンポーネント

| コンポーネント | ファイルパス | 責務 |
|--------------|-----------|------|
| `EditorContainer` | `src/features/editor/components/EditorContainer.tsx` | タブの `filePath` と `viewMode` に基づき、`MarkdownEditor` または `CodeViewer` を切り替え表示。`FileType` に応じたコンポーネントの遅延ロード |
| `MarkdownEditor` | `src/features/editor/components/MarkdownEditor.tsx` | CodeMirror 6 インスタンスを管理。Live Preview 拡張群をセットアップ。`ViewMode` の切り替え（LivePreview / Source）。`fs:changed` イベントによる外部変更時のリロード判定（dirty 状態との衝突処理） |
| `CodeViewer` | `src/features/editor/components/CodeViewer.tsx` | CodeMirror 6 を `readOnly` で初期化。ファイルの言語に応じた `@codemirror/lang-*` を動的ロード。編集モード切替トグル。行番号表示 |
| `FrontmatterGUI` | `src/features/editor/components/FrontmatterGUI.tsx` | Markdown ファイル先頭の YAML Frontmatter を `yaml.parse()` でパースし、GUI フォームとして表示。編集結果を `yaml.stringify()` でシリアライズしてファイル先頭に書き戻す |

#### CodeMirror 6 拡張（`src/features/editor/extensions/`）

| 拡張ファイル | 機能 | 実装方針 |
|------------|------|---------|
| `live-preview.ts` | Live Preview（非破壊的レンダリング） | `ViewPlugin` + `Decoration.replace` / `Decoration.widget` を使用。カーソル行の Decoration を除外し、カーソル外の Markdown 記法をリッチ表示に置換。**元のプレーンテキストは一切変更しない**（CodeMirror の doc は常に Markdown ソースのまま） |
| `internal-link.ts` | `[[]]` 内部リンク装飾 | `ViewPlugin` で `[[target\|display]]` パターンを検出し、リンクスタイルの `Decoration.mark` を適用。クリック時に `editor-store.openTab()` を呼び出してリンク先を開く。リンク先の存在確認は Unit 4 の `knowledge:get_outgoing_links` を参照 |
| `tag-highlight.ts` | `#tag` ハイライト | `ViewPlugin` で `#tagname` パターンを検出し、ピル型バッジの `Decoration.widget` を適用。クリック時に Unit 4 のタグフィルタ画面に遷移 |
| `image-preview.ts` | 画像埋め込みプレビュー | `ViewPlugin` で `![alt](path)` パターンを検出。Vault 相対パスを `convertFileSrc()` で WebView 表示可能 URL に変換し、`Decoration.widget` で `<img>` 要素を挿入。画像が存在しない場合はエラープレースホルダを表示 |
| `latex-preview.ts` | LaTeX 数式レンダリング | `ViewPlugin` で `$...$`（インライン）と `$$...$$`（ブロック）パターンを検出。`katex.renderToString()` で HTML を生成し、`Decoration.widget` で挿入。カーソル行は LaTeX ソースを表示 |

#### Zustand ストア

**editor-store（エディタ固有スライス）**

Unit 1 の基盤スライスに追加するエディタ固有の状態。

```typescript
interface EditorStoreEditorSlice {
  // エディタ固有状態
  editorInstances: Map<string, EditorView>; // tabId → EditorView
  dirtyFiles: Set<string>;                  // 未保存ファイルの filePath

  // Actions (Unit 2)
  registerEditor: (tabId: string, view: EditorView) => void;
  unregisterEditor: (tabId: string) => void;
  markDirty: (filePath: string) => void;
  markClean: (filePath: string) => void;
  saveFile: (filePath: string) => Promise<void>;
  saveAllDirty: () => Promise<void>;
  reloadFile: (filePath: string) => Promise<void>;
  setViewMode: (tabId: string, mode: "livePreview" | "source" | "readOnly") => void;
}
```

---

### 公開インターフェース

Unit 2 が他ユニットに対して公開するインターフェース。

#### IPC コマンド

| コマンド | 主な利用ユニット | 説明 |
|---------|---------------|------|
| `editor:get_file_type` | Unit 3 | ファイル種別判定（ファイル一覧でアイコン表示に利用） |
| `editor:get_language` | Unit 3 | コードファイルの言語名取得 |

#### Zustand ストア

| ストア・メソッド | 利用ユニット | 説明 |
|---------------|------------|------|
| `editor-store.dirtyFiles` | Unit 1 (TabBar) | 未保存インジケータ表示 |
| `editor-store.saveFile()` | Unit 3 | ファイルリネーム前の自動保存 |
| `editor-store.reloadFile()` | Unit 7 | エージェントによるファイル変更後のリロード |

#### CodeMirror 拡張の協調ポイント

| 拡張 | 協調先ユニット | 協調内容 |
|------|-------------|---------|
| `internal-link.ts` | Unit 4 | リンク先存在確認、バックリンクインデックス更新トリガー |
| `tag-highlight.ts` | Unit 4 | タグクリック時のタグフィルタ画面遷移 |

---

### 消費インターフェース

Unit 2 が他ユニットから消費するインターフェース。

| 提供元 | インターフェース | 用途 |
|-------|---------------|------|
| Unit 1 | `fs:read_file` コマンド | ファイル内容読み取り。エディタへの初回ロード |
| Unit 1 | `fs:write_file` コマンド | ファイル保存 |
| Unit 1 | `fs:changed` イベント | 外部変更検出。エディタリロード判定 |
| Unit 1 | `fs:external_change` イベント | エージェントによるファイル変更の検出。リロードプロンプト or 自動リロード |
| Unit 1 | `vault:get_current` コマンド | Vault パス取得。画像の相対パス解決に使用 |
| Unit 1 | `editor-store`（基盤スライス） | `openTabs`, `activeTabId`, `paneLayout` 参照 |
| Unit 4 | `knowledge:get_outgoing_links` コマンド | `internal-link.ts` 拡張でリンク先存在確認 |

---

### データフロー

#### Live Preview レンダリングフロー

```
ユーザーがキー入力
  ↓
CodeMirror EditorView.dispatch（Transaction）
  ↓
doc 更新（Markdown ソーステキスト）
  ↓
ViewPlugin.update() が発火
  ├─ live-preview.ts: カーソル位置を取得
  │   ├─ カーソル行: Decoration なし（ソース表示）
  │   └─ カーソル外: Markdown パターン検出 → Decoration.replace / widget
  ├─ internal-link.ts: [[]] パターン検出 → Decoration.mark
  ├─ tag-highlight.ts: #tag パターン検出 → Decoration.widget
  ├─ image-preview.ts: ![alt](path) → convertFileSrc() → img widget
  └─ latex-preview.ts: $...$ / $$...$$ → katex.renderToString() → widget
  ↓
DecorationSet 更新 → EditorView 再描画
  ↓
DOM 更新（非破壊: doc のプレーンテキストは不変）
```

#### ファイル保存フロー

```
Ctrl+S or 自動保存トリガー
  ↓
editor-store.saveFile(filePath)
  ↓
EditorView.state.doc.toString()（プレーンテキスト取得）
  ↓
（FrontmatterGUI の変更がある場合）
  ├─ yaml.stringify(frontmatter) で YAML ブロック再生成
  └─ ファイル先頭の --- ... --- を置換
  ↓
IPC: fs:write_file { path, content }
  ↓
editor-store.markClean(filePath)
  ↓
（Watcher が変更検出 → fs:changed イベント）
  └─ Unit 2 は自身のファイル保存による fs:changed を無視（保存直後フラグで判定）
```

#### 外部変更リロードフロー

```
fs:changed or fs:external_change イベント受信
  ↓
対象ファイルが openTabs に存在するか確認
  ├─ 無い場合: 無視
  └─ ある場合:
      ├─ dirtyFiles に含まれる（未保存変更あり）:
      │   → ユーザーにリロード確認ダイアログ表示
      │     ├─ 「リロード」: fs:read_file で再読み込み、dirtyFiles から除外
      │     └─ 「無視」: 何もしない
      └─ dirtyFiles に含まれない（未保存変更なし）:
          → 自動リロード（fs:read_file で再読み込み）
```

---

### パフォーマンス要件

| 項目 | 目標値 | ベースライン条件 |
|------|--------|----------------|
| Live Preview レンダリング遅延 | 16ms 以内（60fps） | 1,000 行の Markdown ファイル、M1 Mac |
| エディタ初回ロード（ファイルオープン） | 200ms 以内 | 1MB 以下の Markdown ファイル |
| Frontmatter GUI 表示 | 100ms 以内 | Frontmatter フィールド 10 個以下 |
| 画像プレビュー表示 | 300ms 以内 | ローカル画像、5MB 以下 |
| LaTeX 数式レンダリング | 50ms 以内（数式単位） | katex.renderToString() 単体 |
| キーストロークレイテンシ | 8ms 以内 | CodeMirror 標準性能 |
| コードファイルの言語拡張動的ロード | 500ms 以内 | 初回ロード時。キャッシュ後は即座 |

---

### 制約・注意事項

1. **非破壊的レンダリングの厳守**: Live Preview モードにおいて、`EditorState.doc` のプレーンテキストは **一切変更しない**。すべての視覚的装飾は `Decoration`（replace / widget / mark）で行い、ユーザーが Source モードに切り替えた際に元の Markdown ソースがそのまま表示されることを保証する。
2. **CodeMirror 6 拡張の独立性**: 各拡張（live-preview, internal-link, tag-highlight, image-preview, latex-preview）は独立した `ViewPlugin` として実装し、相互依存を持たない。拡張の追加・削除が他の拡張に影響しないこと。
3. **YAML Frontmatter の安全性**: `FrontmatterGUI` での編集は `yaml` ライブラリ経由でシリアライズし、手動での文字列操作を避ける。YAML パースエラー時はフォールバックとして raw テキスト表示に切り替える。
4. **画像パス解決**: `![alt](path)` の `path` は Vault ルートからの相対パスとして解決する。絶対パスや URL（`http://`）は直接使用する。Vault 外のローカルパスへのアクセスはセキュリティ上拒否する。
5. **editor-store のスライス境界**: Unit 2 は Unit 1 が定義した基盤スライス（`openTabs`, `activeTabId` 等）を **読み取り・呼び出し** するが、直接変更しない。タブのオープン・クローズは `editor-store.openTab()` / `closeTab()`（Unit 1 のアクション）を呼び出す。
6. **大規模ファイル対応**: 10,000 行を超える Markdown ファイルでは Live Preview の Decoration 計算が重くなる可能性がある。可視領域（viewport）のみ Decoration を計算する最適化を検討すること。
7. **CodeViewer の編集モード切替**: デフォルトは読み取り専用。編集モード切替時は明示的な UI インジケータ（ロック/アンロックアイコン）を表示し、誤編集を防止する。
8. **フォントとテーマ**: エディタのフォントはモックアップの `--mono`（SF Mono, Monaco, Menlo, Consolas）に準拠。テーマカラーは CSS 変数（`--bg-base`, `--text`, `--accent` 等）を参照し、CodeMirror テーマとして統合する。
