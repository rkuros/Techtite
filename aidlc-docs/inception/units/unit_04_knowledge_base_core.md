# Unit 4: ナレッジベース・コア

> **対応 Epic**: Epic 4 — ナレッジベース機能（コア部分）
> **対応ストーリー**: US-4.1〜US-4.11

---

## ユーザーストーリーと受け入れ基準

### US-4.1 [Must] 内部リンク `[[]]` 作成

個人開発者として、`[[ファイル名]]` 記法で他のノートへの内部リンクを作成したい。なぜなら、関連するノート同士を結びつけてナレッジのネットワークを構築したいからだ。

- [ ] `[[` を入力するとリンク作成モードに入る
- [ ] `[[ファイル名]]` がLive Previewでリンクとして視覚的に区別される
- [ ] 存在しないファイルへのリンクが色やスタイルで区別される

### US-4.2 [Should] 内部リンクのオートコンプリート

個人開発者として、内部リンクを入力する際にオートコンプリートで既存ファイル名の候補が表示されてほしい。なぜなら、正確なファイル名を覚えていなくても素早くリンクを作成したいからだ。

- [ ] `[[` の後にテキストを入力すると候補リストが表示される
- [ ] 候補はファジーマッチで絞り込まれる
- [ ] 候補を選択すると `[[ファイル名]]` が補完される

### US-4.3 [Must] 内部リンクからの遷移

個人開発者として、内部リンクをクリックしてリンク先のノートに直接遷移したい。なぜなら、関連情報にシームレスにアクセスしたいからだ。

- [ ] 内部リンクをクリック（またはCtrl+クリック）するとリンク先ファイルが開く
- [ ] リンク先が存在しない場合、新規ファイル作成の確認が表示される

### US-4.4 [Should] バックリンク表示

個人開発者として、現在のノートに対するバックリンク（他のノートからのリンク）を一覧表示したい。なぜなら、どのノートが現在のノートを参照しているかを把握し、情報の関係性を理解したいからだ。

- [ ] サイドパネルまたはエディタ下部にバックリンク一覧が表示される
- [ ] 各バックリンクにリンク元ファイル名と該当箇所の前後テキストが表示される
- [ ] バックリンクをクリックするとリンク元ファイルの該当箇所に遷移する

### US-4.5 [Could] 未リンク言及の検出

個人開発者として、テキスト上でリンクされていないが、ノート名と一致する言及（未リンク言及）も検出・表示してほしい。なぜなら、明示的にリンクを貼っていない関連ノートを発見したいからだ。

- [ ] バックリンクパネルに「未リンク言及」セクションが表示される
- [ ] ノート名と一致するテキストがVault内から検出・一覧表示される
- [ ] 未リンク言及をクリックして内部リンクに変換できる

### US-4.6 [Should] タグ管理

個人開発者として、`#タグ` 記法でノートにタグを付与し、タグ一覧を閲覧・フィルタリングしたい。なぜなら、フォルダ構造とは別の軸でノートを分類・検索したいからだ。

- [ ] `#タグ名` がエディタ上でタグとして視覚的に区別される
- [ ] Vault内のすべてのタグを一覧表示するパネルがある
- [ ] タグをクリックするとそのタグを持つノートの一覧が表示される
- [ ] ネストされたタグ（`#parent/child`）がサポートされる

### US-4.7 [Must] 全文検索

個人開発者として、プロジェクト内の全ファイルを対象にキーワードで全文検索したい。なぜなら、どのファイルに目的の情報が書かれているかを素早く見つけたいからだ。

- [ ] 検索パネルでキーワードを入力すると.gitignore適用後の全ファイルを対象に検索が実行される
- [ ] 検索結果にファイル名と一致箇所のプレビューが表示される
- [ ] 検索結果をクリックすると該当ファイルの該当箇所に遷移する
- [ ] 検索が高速（1秒以内、p95）に完了する（ベースライン: M1 Mac、Vault 10,000ファイル/1GB規模、ウォーム状態。コールドスタート時は初回インデックス構築後に同等性能）

### US-4.8 [Should] Graph View（グラフ表示）

個人開発者として、Graph Viewでノート間のリンク関係をネットワークグラフとして可視化したい。なぜなら、ナレッジ全体の構造や隠れた関連性を直感的に把握したいからだ。

- [ ] ノートがノード、内部リンクがエッジとしてグラフ描画される
- [ ] ノードをドラッグして配置を調整できる
- [ ] ノードをクリックすると対応するノートが開く
- [ ] グラフの表示がUIをブロックしない（バックグラウンド計算）

### US-4.9 [Could] Graph Viewフィルタリング

個人開発者として、Graph Viewをタグやフォルダで絞り込みたい。なぜなら、特定のトピックに関連するノート群だけを集中的に確認したいからだ。

- [ ] タグでノードをフィルタリングできる
- [ ] フォルダでノードをフィルタリングできる
- [ ] フィルタ適用後にグラフが再描画される

### US-4.10 [Could] ローカルグラフ

個人開発者として、特定のノートを起点としたローカルグラフ（2-3ホップ先まで）を表示したい。なぜなら、大量のノートがある中で、今関連しているノート群のみを効率的に確認したいからだ。

- [ ] 現在開いているノートを起点としたローカルグラフを表示できる
- [ ] 表示する深さ（ホップ数）を設定できる（デフォルト: 2）
- [ ] ローカルグラフ内のノードをクリックすると該当ノートが開く

### US-4.11 [Should] AIからリンク構造取得

AIエージェントとして、ノート間のリンク構造（内部リンク・バックリンク・タグ）を参照したい。なぜなら、プロジェクトのナレッジ構造を理解した上で、適切なコンテキストでドキュメントを生成・編集したいからだ。

- [ ] API経由で指定ファイルの内部リンク一覧を取得できる
- [ ] API経由で指定ファイルのバックリンク一覧を取得できる
- [ ] API経由でVault内の全タグとそれに紐づくファイル一覧を取得できる

---

## 技術仕様

### アーキテクチャ概要

Unit 4 はナレッジベースのコア機能を担当し、内部リンク `[[]]`・バックリンク・タグ・全文検索・Graph View の 5 つの柱で構成される。アーキテクチャは Rust バックエンドのインデックスサービス群と、フロントエンドの CodeMirror 6 拡張・d3-force ベースの可視化レイヤーの二層構造をとる。

```
[CodeMirror 6 拡張]          [React コンポーネント]
  internal-link.ts              SearchPanel.tsx
  tag-highlight.ts              BacklinksPage.tsx
  autocomplete (completion)     TagsPage.tsx
       │                        GraphView.tsx / GraphCanvas.tsx
       │                              │
       ▼                              ▼
  [knowledge-store (Zustand)]  ←→  [IPC コマンド]
                                      │
                                      ▼
                              [commands/knowledge.rs]
                              [commands/search.rs]
                                      │
                          ┌───────────┼───────────┐
                          ▼           ▼           ▼
              [link_index_service] [tag_service] [search_service]
                          │           │           │
                          ▼           ▼           ▼
                      [SQLite metadata.db]   [Tantivy search_index/]
```

**設計原則**:
- インデックス（バックリンク、タグ、全文検索）は Vault 内ファイルの変更時に差分更新する。初回 Vault オープン時にフルスキャン・インデックス構築を行う
- `fs:changed` イベントを購読し、ファイル変更をリアルタイムでインデックスに反映する
- Graph View の物理シミュレーション計算は Web Worker で実行し、メインスレッドの UI をブロックしない
- 全文検索は Tantivy のインメモリ + ディスクハイブリッドインデックスで高速性を確保する

---

### UI 担当領域

モックアップ `techtite_mockup.html` において、Unit 4 が担当する UI 領域は以下の通り。

| UI 領域 | コンポーネント | モックアップ上の位置 |
|---------|--------------|-------------------|
| **Left Sidebar — Search パネル（Keyword タブ）** | `SearchPanel.tsx` | Ribbon の Search アイコン（🔍）クリックで表示。検索入力フィールド + Keyword/Semantic タブ切り替え + 検索結果一覧 |
| **Center Editor — Backlinks ページ** | `BacklinksPage.tsx` | Ribbon の Backlinks アイコン（🔗）クリックでセンター領域に表示。バックリンク一覧 + 未リンク言及セクション |
| **Center Editor — Tags ページ** | `TagsPage.tsx` | Ribbon の Tags アイコン（🏷）クリックでセンター領域に表示。タグ一覧グリッド + タグ別ファイル一覧 |
| **Center Editor — Graph View ページ** | `GraphView.tsx`, `GraphCanvas.tsx`, `GraphControls.tsx` | Ribbon の Graph アイコン（🔸）クリックでセンター領域に表示。SVG グラフキャンバス + フィルタコントロール |
| **Center Editor — `[[]]` リンク装飾** | `internal-link.ts`（CodeMirror 6 拡張） | エディタ本文内。`[[ファイル名]]` がリンクスタイルで装飾。存在しないリンク先は `.link.dead` スタイル（薄い色）で区別 |
| **Center Editor — `#tag` ハイライト** | `tag-highlight.ts`（CodeMirror 6 拡張） | エディタ本文内。`#タグ名` がタグチップスタイル（紫背景 `.tag`）で装飾 |
| **StatusBar** | （Unit 1 基盤を利用） | 直接の StatusBar 表示項目なし。検索実行中の場合は Toast 通知で進捗を表示 |

---

### 主要ライブラリ・技術

| ライブラリ / 技術 | 用途 | レイヤー |
|------------------|------|---------|
| **pulldown-cmark** | Markdown パースによる `[[]]` 内部リンク・`#tag` の検出。ファイル保存時にリンク/タグを抽出しインデックスに登録 | Rust バックエンド |
| **Tantivy** | 全文検索エンジン。転置インデックスの構築・クエリ実行。日本語トークナイザ対応（`tantivy-jieba` または `lindera`） | Rust バックエンド |
| **rusqlite** | SQLite 経由でバックリンクインデックス・タグインデックスの永続化。`<vault>/.techtite/metadata.db` に保存 | Rust バックエンド |
| **tokio** | インデックス構築のバックグラウンドタスク実行。ファイル変更イベント受信後の非同期差分更新 | Rust バックエンド |
| **@codemirror/autocomplete** | `[[` 入力時のファイル名オートコンプリート候補表示。CodeMirror 6 の completion extension API を使用 | フロントエンド |
| **@codemirror/view** (DecorationSet) | `[[]]` リンクと `#tag` のインライン装飾（ViewPlugin + Decoration.mark） | フロントエンド |
| **d3-force** | Graph View のノード配置物理シミュレーション（`d3.forceSimulation`, `forceCenter`, `forceManyBody`, `forceLink`） | フロントエンド |
| **d3-selection / d3-zoom** | Graph View の SVG レンダリング、ズーム・パン操作 | フロントエンド |
| **Web Worker** (`graph-layout.worker.ts`) | d3-force の tick 計算をメインスレッド外で実行。計算結果を `postMessage` でメインスレッドに通知 | フロントエンド |

---

### Rust バックエンド詳細

#### ファイル構成

| ファイル | 役割 |
|---------|------|
| `src-tauri/src/commands/knowledge.rs` | IPC コマンドハンドラ。`knowledge:get_outgoing_links`, `knowledge:get_backlinks`, `knowledge:get_all_tags`, `knowledge:get_files_by_tag`, `knowledge:get_graph_data`, `knowledge:get_local_graph`, `knowledge:get_unlinked_mentions` |
| `src-tauri/src/commands/search.rs` | 全文検索 IPC コマンドハンドラ。`knowledge:search_keyword` |
| `src-tauri/src/services/link_index_service.rs` | 内部リンク解析・バックリンクインデックス管理。pulldown-cmark で `[[]]` をパースし、SQLite の `links` テーブルに正引き・逆引きインデックスを構築 |
| `src-tauri/src/services/tag_service.rs` | タグ抽出・タグインデックス管理。`#tag` パターンを正規表現 + pulldown-cmark で検出し、SQLite の `tags` テーブルに保存 |
| `src-tauri/src/services/search_service.rs` | Tantivy ラッパー。インデックスの構築（初回フルスキャン + 差分更新）、クエリ実行、結果のハイライト範囲計算 |

#### SQLite スキーマ（`metadata.db` 内）

```sql
-- 内部リンクテーブル
CREATE TABLE links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_path TEXT NOT NULL,        -- リンク元ファイル（Vault 相対パス）
    target_path TEXT NOT NULL,        -- リンク先ファイル（Vault 相対パス）
    display_text TEXT,                -- 表示テキスト（[[target|display]] の display 部分）
    line_number INTEGER NOT NULL,     -- リンクが存在する行番号
    target_exists INTEGER NOT NULL DEFAULT 1  -- リンク先ファイルの存在フラグ
);
CREATE INDEX idx_links_source ON links(source_path);
CREATE INDEX idx_links_target ON links(target_path);

-- タグテーブル
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL,          -- タグを含むファイル
    tag_name TEXT NOT NULL,           -- タグ名（"#" なし。ネストは "parent/child" 形式）
    line_number INTEGER NOT NULL      -- タグが存在する行番号
);
CREATE INDEX idx_tags_file ON tags(file_path);
CREATE INDEX idx_tags_name ON tags(tag_name);
```

#### Tantivy インデックススキーマ

```rust
// search_service.rs 内
let mut schema_builder = Schema::builder();
schema_builder.add_text_field("path", STRING | STORED);       // ファイルパス
schema_builder.add_text_field("title", TEXT | STORED);         // タイトル（Frontmatter or H1）
schema_builder.add_text_field("body", TEXT | STORED);          // 本文テキスト
schema_builder.add_text_field("tags", TEXT | STORED);          // タグ（スペース区切り）
schema_builder.add_u64_field("modified_at", INDEXED | STORED); // 更新日時（UNIX timestamp）
```

#### リンク解析ロジック（link_index_service.rs）

```rust
/// pulldown-cmark パース後のテキストから [[]] パターンを抽出
/// 対応形式: [[target]], [[target|display_text]], [[target#section]]
fn extract_internal_links(content: &str) -> Vec<InternalLink> {
    let re = Regex::new(r"\[\[([^\]|#]+)(?:#[^\]|]*)?\|?([^\]]*)\]\]").unwrap();
    // 行番号を追跡しながらマッチを収集
    // target_path は Vault 内のファイル名に正規化（拡張子 .md の自動補完含む）
}
```

#### インデックス更新フロー

1. **初回構築**: Vault オープン時に `tokio::spawn` でバックグラウンドタスクを起動。全 Markdown ファイルをスキャンし、リンク/タグ/全文検索インデックスを一括構築
2. **差分更新**: `fs:changed` イベント受信時に該当ファイルのみ再解析。旧エントリ削除 → 新エントリ挿入のトランザクション処理
3. **ファイル削除時**: 該当ファイルの全リンク/タグエントリを削除。バックリンクの `target_exists` フラグを更新
4. **ファイルリネーム時**: 旧パス → 新パスへの一括更新。リンクの `target_path` も整合性を維持

---

### フロントエンド詳細

#### ファイル構成

| ファイル | 役割 |
|---------|------|
| `src/features/knowledge/components/SearchPanel.tsx` | 検索パネル。キーワード入力フィールド + 結果一覧。Keyword タブの UI を担当（Semantic タブは Unit 5 が担当） |
| `src/features/knowledge/components/BacklinksPage.tsx` | バックリンクページ。センター領域に表示。バックリンク一覧 + 未リンク言及セクション |
| `src/features/knowledge/components/TagsPage.tsx` | タグ一覧ページ。タグチップグリッド表示 + タグ選択時のファイル一覧 |
| `src/features/knowledge/components/GraphView.tsx` | Graph View メインコンポーネント。GraphCanvas + GraphControls を統合 |
| `src/features/knowledge/components/GraphCanvas.tsx` | SVG ベースのグラフ描画。d3-selection でノード/エッジをレンダリング。d3-zoom でズーム・パン |
| `src/features/knowledge/components/GraphControls.tsx` | フィルタ（タグ / フォルダ）・ズームコントロール・深さ設定（ローカルグラフ） |
| `src/features/knowledge/workers/graph-layout.worker.ts` | Web Worker。d3-force の `forceSimulation` を Worker 内で tick 実行し、計算済みノード座標を `postMessage` で返却 |
| `src/features/editor/extensions/internal-link.ts` | CodeMirror 6 ViewPlugin。`[[]]` パターンにマッチするテキスト範囲に `Decoration.mark` でリンク装飾を適用。クリック時にファイル遷移。存在しないリンク先は `.link.dead` クラス |
| `src/features/editor/extensions/tag-highlight.ts` | CodeMirror 6 ViewPlugin。`#tag` パターンに `Decoration.mark` でタグチップ装飾を適用。クリック時にタグページ遷移 |
| `src/stores/knowledge-store.ts` | Zustand ストア。検索クエリ・検索結果・バックリンク・タグ一覧・グラフデータの状態管理 |
| `src/types/note.ts` | `InternalLink`, `BacklinkEntry`, `TagInfo` 型定義 |
| `src/types/search.ts` | `KeywordSearchQuery`, `KeywordSearchResult` 型定義 |

#### knowledge-store 設計

```typescript
// src/stores/knowledge-store.ts
interface KnowledgeStore {
  // 検索
  searchQuery: string;
  searchMode: "keyword" | "semantic";  // Semantic タブは Unit 5 が状態管理
  keywordResults: KeywordSearchResult[];
  isSearching: boolean;

  // バックリンク（現在開いているファイル対象）
  currentFileBacklinks: BacklinkEntry[];
  unlinkedMentions: BacklinkEntry[];

  // タグ
  allTags: TagInfo[];

  // グラフ
  graphData: GraphData | null;
  graphFilter: GraphFilter;

  // アクション
  searchKeyword: (query: string) => Promise<void>;
  fetchBacklinks: (path: string) => Promise<void>;
  fetchUnlinkedMentions: (path: string) => Promise<void>;
  fetchAllTags: () => Promise<void>;
  fetchGraphData: (filter?: GraphFilter) => Promise<void>;
  fetchLocalGraph: (path: string, depth?: number) => Promise<void>;
}
```

#### CodeMirror 6 オートコンプリート拡張

```typescript
// internal-link.ts 内のオートコンプリート設定
const internalLinkCompletion: CompletionSource = async (context) => {
  // "[[" の直後にカーソルがある場合にのみ発火
  const before = context.matchBefore(/\[\[([^\]]*)/);
  if (!before) return null;

  const query = before.text.slice(2); // "[[" を除いた入力テキスト
  // IPC 経由で全ファイルリストを取得（file-tree-store からキャッシュ利用）
  // ファジーマッチで候補をフィルタリング
  return {
    from: before.from + 2,
    options: candidates.map(f => ({
      label: f.name,
      detail: f.path,
      apply: `${f.name}]]`,
    })),
  };
};
```

#### Graph View Web Worker 連携

```typescript
// GraphView.tsx
const worker = useRef(new Worker(
  new URL('../workers/graph-layout.worker.ts', import.meta.url),
  { type: 'module' }
));

// Worker にグラフデータを送信
useEffect(() => {
  if (graphData) {
    worker.current.postMessage({
      type: 'start',
      nodes: graphData.nodes,
      edges: graphData.edges,
    });
  }
}, [graphData]);

// Worker から tick 結果を受信し、SVG を更新
worker.current.onmessage = (e) => {
  if (e.data.type === 'tick') {
    updateNodePositions(e.data.nodes);
  }
};
```

---

### 公開インターフェース

#### IPC コマンド（Unit 4 が公開）

| コマンド名 | 入力 | 出力 | 説明 |
|-----------|------|------|------|
| `knowledge:get_outgoing_links` | `{ path: string }` | `InternalLink[]` | 指定ファイルからの内部リンク一覧 |
| `knowledge:get_backlinks` | `{ path: string }` | `BacklinkEntry[]` | 指定ファイルへのバックリンク一覧 |
| `knowledge:get_all_tags` | -- | `TagInfo[]` | Vault 内全タグ一覧（ファイル数付き） |
| `knowledge:get_files_by_tag` | `{ tag: string }` | `string[]` | 指定タグを持つファイルパス一覧 |
| `knowledge:get_graph_data` | `{ filter?: GraphFilter }` | `GraphData` | グラフ表示用の全ノード・エッジデータ |
| `knowledge:get_local_graph` | `{ path: string, depth?: number }` | `GraphData` | 指定ファイル起点のローカルグラフ（デフォルト depth=2） |
| `knowledge:search_keyword` | `KeywordSearchQuery` | `KeywordSearchResult[]` | Tantivy による全文検索 |
| `knowledge:get_unlinked_mentions` | `{ path: string }` | `BacklinkEntry[]` | 指定ファイル名の未リンク言及を Vault 全体から検出 |

#### イベント（Unit 4 が発火）

Unit 4 は独自イベントを発火しない。インデックスの更新完了は IPC コマンドのレスポンスとして同期的に返却する。

---

### 消費インターフェース

#### IPC コマンド（他ユニットから消費）

| コマンド名 | 提供元 | 用途 |
|-----------|--------|------|
| `fs:read_file` | Unit 1 | リンク解析・タグ抽出のためのファイル内容読み取り |
| `file_tree:get_tree` | Unit 3 | オートコンプリート候補のファイル一覧取得 |
| `file_tree:get_metadata` | Unit 3 | リンク先ファイルの存在確認・メタデータ取得 |

#### イベント（他ユニットから購読）

| イベント名 | 発火元 | 用途 |
|-----------|--------|------|
| `fs:changed` | Unit 1 (watcher_service) | ファイル変更検出 → リンク/タグ/全文検索インデックスの差分更新トリガー |

---

### データフロー

#### 1. 内部リンク作成 → バックリンクインデックス更新

```
[ユーザー] エディタで [[target]] を入力
    ↓
[CodeMirror 6] internal-link.ts がパターン検出 → 装飾適用
    ↓
[ユーザー] Cmd+S で保存
    ↓
[Unit 1] fs:write_file → ファイルシステム書き込み
    ↓
[Unit 1] watcher_service が変更検出 → fs:changed イベント発火
    ↓
[Unit 4] link_index_service が fs:changed を受信
    ↓
[link_index_service] ファイル再パース → 旧リンクエントリ削除 → 新リンクエントリ挿入（SQLite トランザクション）
    ↓
[link_index_service] target_exists フラグの整合性チェック
```

#### 2. 全文検索フロー

```
[ユーザー] SearchPanel で検索クエリ入力
    ↓
[knowledge-store] searchKeyword() → IPC: knowledge:search_keyword
    ↓
[commands/search.rs] → search_service.rs
    ↓
[search_service] Tantivy クエリパース → インデックス検索 → ハイライト範囲計算
    ↓
[commands/search.rs] KeywordSearchResult[] を返却
    ↓
[knowledge-store] keywordResults を更新 → SearchPanel が結果一覧を描画
    ↓
[ユーザー] 結果クリック → editor-store 経由で該当ファイル・該当行を開く
```

#### 3. Graph View 表示フロー

```
[ユーザー] Ribbon の Graph アイコンクリック
    ↓
[GraphView.tsx] fetchGraphData() → IPC: knowledge:get_graph_data
    ↓
[commands/knowledge.rs] → link_index_service.rs
    ↓
[link_index_service] SQLite から全リンク関係を取得 → GraphData 構築
    ↓
[GraphView.tsx] graphData 受信 → Web Worker に送信
    ↓
[graph-layout.worker.ts] d3.forceSimulation 実行 → tick ごとにノード座標を postMessage
    ↓
[GraphCanvas.tsx] 受信した座標で SVG ノード/エッジを更新（requestAnimationFrame）
    ↓
[ユーザー] ノードクリック → editor-store 経由で該当ファイルを開く
```

---

### パフォーマンス要件

| 指標 | 目標値 | ベースライン条件 |
|------|--------|----------------|
| **全文検索レスポンス** | **< 1秒**（p95） | M1 Mac、Vault 10,000 ファイル / 1GB、ウォーム状態（インデックス構築済み） |
| **初回インデックス構築** | **< 60秒** | 同上。バックグラウンド実行、UI ブロックなし |
| **差分インデックス更新** | **< 500ms** | 単一ファイル変更時 |
| **バックリンク取得** | **< 200ms** | SQLite インデックスクエリ |
| **タグ一覧取得** | **< 200ms** | SQLite 集約クエリ |
| **Graph View 初期描画** | **< 3秒** | 1,000 ノード規模。Web Worker による非同期計算 |
| **Graph View tick レート** | **> 30fps** | Web Worker 内の d3-force tick。メインスレッド描画は requestAnimationFrame 同期 |
| **オートコンプリート表示** | **< 100ms** | `[[` 入力後の候補表示。ファイル一覧はメモリキャッシュから取得 |

---

### 制約・注意事項

1. **Tantivy の日本語対応**: Tantivy のデフォルトトークナイザは英語向け。日本語全文検索には `lindera`（MeCab 辞書ベース）または `tantivy-jieba` の導入を検討する。MVP では `lindera-tantivy` を使用し、形態素解析ベースのトークナイズを行う
2. **`[[]]` リンク解析とパフォーマンス**: pulldown-cmark は `[[]]` を標準 Markdown 記法として認識しない。カスタムパーサー（正規表現ベース）で前処理し、pulldown-cmark のパース結果と組み合わせる設計とする
3. **Graph View のスケーラビリティ**: ノード数が 5,000 を超える場合、d3-force のシミュレーションが重くなる。大規模 Vault ではフィルタリング（タグ/フォルダ）またはローカルグラフの使用を推奨する。ノード数上限（デフォルト 3,000）を設定で調整可能にする
4. **CodeMirror 6 拡張の配置**: `internal-link.ts` と `tag-highlight.ts` は Unit 2（エディタ）の `src/features/editor/extensions/` に配置するが、ロジックは Unit 4 が所有する。Unit 2 はこれらを CodeMirror の extensions 配列に登録するのみ
5. **未リンク言及検出のコスト**: Vault 全体のテキストをスキャンする処理であるため、ファイル数が多い場合はレスポンスが遅延する。Tantivy のフレーズ検索を活用して高速化する。結果はキャッシュし、ファイル変更時に無効化する
6. **SQLite 同時アクセス**: link_index_service、tag_service、search_service が同一の `metadata.db` にアクセスする。WAL モードを有効にし、読み取りの並行性を確保する。書き込みは Mutex で直列化する
7. **`.techtite/` の Git 除外**: `search_index/` と `metadata.db` は `.techtite/` 配下に配置され、自動的に `.gitignore` に登録される。他端末での Vault オープン時は初回フルスキャンでインデックスを再構築する
