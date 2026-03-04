# Unit 5: セマンティック検索・RAG

> **対応 Epic**: Epic 4 — ナレッジベース機能（RAG部分）
> **対応ストーリー**: US-4.12〜US-4.19

---

## ユーザーストーリーと受け入れ基準

### US-4.12 [Should] ベクトルインデックス自動構築（ローカル）

個人開発者として、Vault内のドキュメントが自動的にベクトルインデックス化されてほしい。なぜなら、手動でインデックスを管理せず、常に最新の状態でセマンティック検索を利用したいからだ。

- [ ] .gitignore適用後のVault内ファイル（Git同期対象と同一スコープ）がローカルEmbeddingモデル（ONNX Runtime等）で自動ベクトル化される
- [ ] ファイルの作成・編集・削除時にインデックスが差分更新される
- [ ] マークダウンの構造（見出し・セクション単位）を考慮したチャンキングが行われる
- [ ] インデックス構築はバックグラウンドで実行され、UIをブロックしない
- [ ] 設定でRAG機能のオン/オフを切り替えられる（デフォルト: オン）
- [ ] ローカルVector Store（sqlite-vss等）にインデックスが保存される
- [ ] ベクトルインデックスは各端末で独自に生成される（Git同期対象外。ソースドキュメントから再生成可能な派生データとして扱う）
- [ ] 新しい端末でVaultを開いた際、バックグラウンドでインデックスが自動構築される
- [ ] バックグラウンドインデックス構築のCPU/メモリ使用量に上限が設定される（デフォルト: 論理コア数の75%以下、メモリ2GB以下。設定で調整可能）
- [ ] インデックス構築キューの同時処理数が制限される（デフォルト: 同時4ファイルまで。設定で調整可能）
- [ ] （拡張）中央集約型Vector DBが必要な場合はクラウドデプロイオプションとして提供（US-4.17）

### US-4.13 [Should] セマンティック検索（自然言語クエリ）

個人開発者として、自然言語で質問してセマンティック検索したい。なぜなら、正確なキーワードを覚えていなくても、意味的に関連するドキュメントを見つけたいからだ。

- [ ] 検索パネルでキーワード検索とセマンティック検索を切り替え（または併用）できる
- [ ] 自然言語の質問文（例:「認証周りの設計判断」）で関連ドキュメントが検索される
- [ ] 検索結果に類似度スコアと該当セクションのプレビューが表示される
- [ ] 検索結果をクリックすると該当ファイルの該当箇所に遷移する

### US-4.14 [Should] AIエージェントRAGコンテキスト取得

AIエージェントとして、セマンティック検索を利用してタスクに関連するドキュメント・コードのコンテキストを取得したい。なぜなら、プロジェクト全体のナレッジから最も関連性の高い情報をもとに、質の高いコード・ドキュメントを生成したいからだ。

- [ ] API経由で自然言語クエリによるセマンティック検索が実行できる
- [ ] 検索結果にファイルパス、該当セクション、類似度スコアが含まれる
- [ ] 取得する結果件数（top-k）を指定できる
- [ ] キーワード検索とセマンティック検索を組み合わせたハイブリッド検索が実行できる

### US-4.15 [Could] クロスプロジェクト（Vault横断）検索

個人開発者として、複数のプロジェクト（Vault）を横断してセマンティック検索したい。なぜなら、過去のプロジェクトの知見を現在のプロジェクトに活用したいからだ。

- [ ] 検索対象に他のVault（プロジェクト）を追加できる
- [ ] 検索結果にVault名（プロジェクト名）が表示される
- [ ] 検索対象Vaultのフィルタリング（含める/除外する）ができる

### US-4.16 [Should] ナレッジ検索AIチャット

個人開発者として、ナレッジベースに対してチャット形式で質問したい。なぜなら、検索キーワードを考えるのではなく、会話的にプロジェクトの情報を引き出したいからだ。

- [ ] ナレッジ検索専用のAIチャットパネルが開ける
- [ ] チャットの質問に対し、ローカルのベクトルインデックスから関連ドキュメントを検索（RAG）した上でAIが回答する
- [ ] 回答に参照元ドキュメントへのリンクが含まれる
- [ ] 会話の文脈を保持して連続的に質問できる

### US-4.17 [Could] 外部Embedding/Vector DB連携（拡張）

個人開発者として、Embeddingモデルやベクトルデータベースを外部サービスに切り替えたい。なぜなら、より高品質なモデルや大規模なベクトルDBを利用したいケースがあるからだ。

- [ ] 設定画面でEmbeddingモデルを切り替えられる（ローカル/外部API）
- [ ] 外部Embedding API（OpenAI等）のエンドポイント・認証情報を設定できる
- [ ] 外部Vector DB（Qdrant, Pinecone等）への接続設定ができる
- [ ] ローカルモードと外部モードをプロジェクト単位で切り替えられる

### US-4.18 [Could] RAG品質自動モニタリング・自動最適化

個人開発者として、RAGの検索精度が自動的にモニタリングされ、精度低下時にパラメータ調整とインデックス再構築が自動実行されてほしい。なぜなら、RAGの品質管理を手動で行う専門知識がなくても、常に高品質な検索結果を得たいからだ。

- [ ] バックグラウンドエージェントがサンプルクエリで検索品質スコアを定期的に自動測定する
- [ ] インデックスのヘルス指標（カバレッジ率、鮮度、断片化率）がダッシュボードで確認できる
- [ ] 品質スコアが閾値を下回った場合、パラメータ（チャンクサイズ、オーバーラップ率、ハイブリッド検索重み等）の自動チューニングが実行される
- [ ] チューニング後にインデックスの自動再構築がバックグラウンドで実行される
- [ ] 再構築前後の品質スコア比較が記録され、改善を確認できる
- [ ] リランキング（Cross-Encoderによる検索結果の精密再順位付け）が自動適用される

### US-4.19 [Won't] 検索フィードバック自動学習ループ

個人開発者として、日常の検索行動から暗黙的にフィードバックが収集され、検索精度が継続的に改善されてほしい。なぜなら、明示的な評価操作をしなくても、使えば使うほど検索が賢くなってほしいからだ。

- [ ] 検索結果のクリック位置・スキップパターンが暗黙フィードバックとして収集される
- [ ] AIチャット（US-4.16）での質問と参照ドキュメントの関連性がフィードバックとして記録される
- [ ] 収集されたフィードバックがRAG品質スコアの算出に反映される
- [ ] フィードバックデータはローカルに保存され、外部に送信されない（プライバシー保護）

---

## 技術仕様

### アーキテクチャ概要

Unit 5 はセマンティック検索と RAG（Retrieval-Augmented Generation）を担当する。ローカル Embedding モデル（ONNX Runtime）でベクトルを生成し、sqlite-vss で類似検索を行い、Claude Code SDK モードを利用して RAG チャットを提供する。全処理をローカルで完結させ、ドキュメント内容を外部に送信しないプライバシー設計を原則とする。

```
[React コンポーネント]
  SemanticSearchTab.tsx
  AIChat.tsx / ChatMessage.tsx
  RAGStatusIndicator.tsx
       │
       ▼
  [semantic-store (Zustand)]  ←→  [IPC コマンド / イベント]
                                      │
                                      ▼
                              [commands/semantic.rs]
                                      │
                          ┌───────────┴───────────┐
                          ▼                       ▼
              [embedding_service.rs]    [vector_store_service.rs]
                    │                         │
                    ▼                         ▼
              [ONNX Runtime (ort)]      [sqlite-vss (vector_index.db)]
                                              │
                                              ▼
                                    [Unit 4: search_service (Tantivy)]
                                    （ハイブリッド検索時にキーワード検索を併用）
                                              │
                                              ▼
                                    [Claude Code SDK モード]
                                    （RAG チャット：検索結果をコンテキストとして注入）
```

**設計原則**:
- Embedding 生成とベクトルインデックス構築はバックグラウンドで実行し、CPU/メモリ使用量に上限を設ける
- ドキュメントのチャンキングは Markdown の構造（見出し・セクション単位）を考慮し、意味的に一貫したチャンクを生成する
- ハイブリッド検索はキーワード検索（Unit 4 の Tantivy）とセマンティック検索（sqlite-vss）のスコアを重み付き結合する
- RAG チャットは Claude Code SDK モードで実行し、検索結果をコンテキストとしてプロンプトに注入する

---

### UI 担当領域

モックアップ `techtite_mockup.html` において、Unit 5 が担当する UI 領域は以下の通り。

| UI 領域 | コンポーネント | モックアップ上の位置 |
|---------|--------------|-------------------|
| **Left Sidebar — Search パネル（Semantic タブ）** | `SemanticSearchTab.tsx` | Ribbon の Search アイコンクリック → Search パネル内の Semantic タブ。自然言語クエリ入力 + セマンティック検索結果（類似度スコア付き） |
| **AI Chat フローティングパネル** | `AIChat.tsx`, `ChatMessage.tsx` | 画面右下のフローティングパネル。チャット入力 + メッセージ一覧 + 参照元ドキュメントリンク |
| **StatusBar — RAG 状態** | `RAGStatusIndicator.tsx` | StatusBar 右側。「🧠 RAG On」表示。インデックス構築中は進捗率を表示 |

---

### 主要ライブラリ・技術

| ライブラリ / 技術 | 用途 | レイヤー |
|------------------|------|---------|
| **ort** (ONNX Runtime crate) | ローカル Embedding モデル推論。`all-MiniLM-L6-v2` 等の ONNX エクスポートモデルをロードしてベクトル生成 | Rust バックエンド |
| **sqlite-vss** | SQLite 拡張による近似最近傍検索（ANN）。ベクトルインデックスの構築・類似度クエリ | Rust バックエンド |
| **rusqlite** | sqlite-vss 拡張をロードした SQLite 接続管理。`<vault>/.techtite/vector_index.db` への読み書き | Rust バックエンド |
| **pulldown-cmark** | Markdown 構造解析によるチャンキング。見出しレベルに基づくセクション分割 | Rust バックエンド |
| **tokio** | バックグラウンドインデックス構築タスク。リソース制限付きセマフォによる同時処理数制御 | Rust バックエンド |
| **@anthropic-ai/claude-code SDK** | RAG チャット実行。検索結果をコンテキストとして注入し、Claude Code に回答を生成させる | フロントエンド/バックエンド連携 |

---

### Rust バックエンド詳細

#### ファイル構成

| ファイル | 役割 |
|---------|------|
| `src-tauri/src/commands/semantic.rs` | IPC コマンドハンドラ。`semantic:search`, `semantic:hybrid_search`, `semantic:get_index_status`, `semantic:rebuild_index`, `semantic:chat` |
| `src-tauri/src/services/embedding_service.rs` | ONNX Runtime ラッパー。モデルロード、テキスト → ベクトル変換、バッチ推論 |
| `src-tauri/src/services/vector_store_service.rs` | sqlite-vss ラッパー。ベクトルインデックスの CRUD、類似検索クエリ、インデックス再構築 |

#### Embedding モデル

| 項目 | 値 |
|------|-----|
| **デフォルトモデル** | `all-MiniLM-L6-v2`（ONNX 形式） |
| **ベクトル次元数** | 384 |
| **モデルサイズ** | 約 80MB |
| **配置場所** | アプリバンドル内 `resources/models/` またはユーザーデータディレクトリ（初回起動時ダウンロード） |
| **推論デバイス** | CPU（ONNX Runtime CPU ExecutionProvider）。将来的に CoreML / DirectML 対応を検討 |

#### チャンキング戦略

```rust
// embedding_service.rs 内
/// Markdown 構造を考慮したチャンキング
/// 1. pulldown-cmark でパースし、見出し (H1-H6) ごとにセクション分割
/// 2. 各セクションが最大チャンクサイズ（デフォルト 512 トークン）を超える場合、
///    段落境界で追加分割
/// 3. 各チャンクに親セクションの見出しをメタデータとして付与
/// 4. 隣接チャンク間でオーバーラップ（デフォルト 50 トークン）を設定

pub struct Chunk {
    pub file_path: String,
    pub section_heading: Option<String>,  // 所属セクションの見出し
    pub text: String,                      // チャンクテキスト
    pub start_line: u32,                   // 元ファイルでの開始行
    pub end_line: u32,                     // 元ファイルでの終了行
}

pub struct ChunkingConfig {
    pub max_chunk_tokens: usize,           // デフォルト: 512
    pub overlap_tokens: usize,             // デフォルト: 50
    pub min_chunk_tokens: usize,           // デフォルト: 50（これ以下のチャンクは前チャンクに統合）
}
```

#### sqlite-vss スキーマ（`vector_index.db`）

```sql
-- チャンクメタデータテーブル
CREATE TABLE chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL,
    section_heading TEXT,
    chunk_text TEXT NOT NULL,
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    file_modified_at TEXT NOT NULL       -- 元ファイルの更新日時（差分検出用）
);
CREATE INDEX idx_chunks_file ON chunks(file_path);

-- sqlite-vss 仮想テーブル（ベクトルインデックス）
CREATE VIRTUAL TABLE vss_chunks USING vss0(
    embedding(384)                       -- all-MiniLM-L6-v2 の次元数
);
-- vss_chunks の rowid は chunks.id と対応
```

#### バックグラウンドインデックス構築

```rust
// vector_store_service.rs 内
/// リソース制限付きバックグラウンドインデックス構築
pub async fn build_index(vault_path: &Path, config: &IndexConfig) -> Result<()> {
    // 同時処理数制限（デフォルト: 4 ファイル）
    let semaphore = Arc::new(Semaphore::new(config.max_concurrent_files));

    // CPU 使用率制限: tokio::task::spawn_blocking + nice 値調整
    // メモリ使用量制限: バッチサイズ調整で間接的に制御

    for file in markdown_files {
        let permit = semaphore.clone().acquire_owned().await?;
        tokio::spawn(async move {
            // 1. ファイル読み取り
            // 2. チャンキング
            // 3. Embedding 生成（バッチ推論）
            // 4. sqlite-vss への登録
            // 5. 進捗イベント発火: semantic:index_progress
            drop(permit);
        });
    }
}
```

#### ハイブリッド検索アルゴリズム

```rust
// commands/semantic.rs 内
/// キーワード検索（Tantivy）とセマンティック検索（sqlite-vss）を重み付き結合
pub async fn hybrid_search(query: HybridSearchQuery) -> Result<Vec<HybridSearchResult>> {
    // 1. 並行実行: キーワード検索 + セマンティック検索
    let (keyword_results, semantic_results) = tokio::join!(
        search_service.keyword_search(&query.query, query.top_k * 2),
        vector_store_service.semantic_search(&query.query, query.top_k * 2),
    );

    // 2. Reciprocal Rank Fusion (RRF) でスコア統合
    //    combined_score = keyword_weight * (1 / (k + rank_keyword))
    //                   + semantic_weight * (1 / (k + rank_semantic))
    //    k = 60 (定数)

    // 3. combined_score でソートし、top_k 件を返却
}
```

---

### フロントエンド詳細

#### ファイル構成

| ファイル | 役割 |
|---------|------|
| `src/features/semantic-search/components/SemanticSearchTab.tsx` | Search パネルの Semantic タブ。自然言語クエリ入力 + 類似度スコア付き結果一覧。ハイブリッド検索の重みスライダー |
| `src/features/semantic-search/components/AIChat.tsx` | AI チャットパネル本体。フローティングパネル UI。メッセージ履歴 + 入力欄 + 参照ドキュメントリンク |
| `src/features/semantic-search/components/ChatMessage.tsx` | チャットメッセージ単体。ユーザーメッセージ / AI 回答 / 参照元リンクの表示 |
| `src/features/semantic-search/components/RAGStatusIndicator.tsx` | StatusBar 用コンポーネント。RAG 有効/無効表示、インデックス構築進捗バー |
| `src/stores/semantic-store.ts` | Zustand ストア。セマンティック検索結果・チャット履歴・インデックス状態の管理 |
| `src/types/search.ts`（セマンティック部分） | `SemanticSearchQuery`, `SemanticSearchResult`, `HybridSearchQuery`, `HybridSearchResult`, `IndexStatus`, `ChatResponse` 型定義 |

#### semantic-store 設計

```typescript
// src/stores/semantic-store.ts
interface SemanticStore {
  // セマンティック検索
  semanticResults: SemanticSearchResult[];
  hybridResults: HybridSearchResult[];
  isSearching: boolean;
  keywordWeight: number;   // デフォルト: 0.3
  semanticWeight: number;  // デフォルト: 0.7

  // インデックス状態
  indexStatus: IndexStatus | null;

  // AI チャット
  chatSessions: Map<string, ChatMessage[]>;  // sessionId → メッセージ履歴
  activeChatSessionId: string | null;
  isChatLoading: boolean;

  // アクション
  searchSemantic: (query: string) => Promise<void>;
  searchHybrid: (query: string) => Promise<void>;
  setSearchWeights: (keyword: number, semantic: number) => void;
  fetchIndexStatus: () => Promise<void>;
  rebuildIndex: () => Promise<void>;
  sendChatMessage: (message: string) => Promise<void>;
  createChatSession: () => string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  references?: { filePath: string; sectionHeading: string | null; score: number }[];
  timestamp: string;
}
```

#### AI Chat パネル UI

```typescript
// AIChat.tsx
// フローティングパネルとして画面右下に配置
// - 展開/折りたたみトグル
// - チャット履歴のスクロール表示
// - 参照元ドキュメントはリンクとしてクリック可能（editor-store 経由でファイルを開く）
// - セッション切り替えタブ（複数の会話スレッドをサポート）
// - チャット入力欄（Enter で送信、Shift+Enter で改行）
```

---

### 公開インターフェース

#### IPC コマンド（Unit 5 が公開）

| コマンド名 | 入力 | 出力 | 説明 |
|-----------|------|------|------|
| `semantic:search` | `SemanticSearchQuery` | `SemanticSearchResult[]` | ベクトル類似度によるセマンティック検索 |
| `semantic:hybrid_search` | `HybridSearchQuery` | `HybridSearchResult[]` | キーワード + セマンティックのハイブリッド検索 |
| `semantic:get_index_status` | -- | `IndexStatus` | ベクトルインデックスの構築状態取得 |
| `semantic:rebuild_index` | -- | `void` | ベクトルインデックスの完全再構築を開始（バックグラウンド） |
| `semantic:chat` | `{ message: string, sessionId?: string }` | `ChatResponse` | RAG チャット。検索結果をコンテキストとして Claude Code に送信し、回答を生成 |

#### イベント（Unit 5 が発火）

| イベント名 | ペイロード | 購読先 | 説明 |
|-----------|----------|--------|------|
| `semantic:index_progress` | `IndexStatus` | Unit 5 (UI), Unit 1 (StatusBar) | インデックス構築進捗の更新通知 |
| `semantic:index_completed` | `IndexStatus` | Unit 5 (UI) | インデックス構築完了通知 |

---

### 消費インターフェース

#### IPC コマンド（他ユニットから消費）

| コマンド名 | 提供元 | 用途 |
|-----------|--------|------|
| `fs:read_file` | Unit 1 | チャンキング対象ファイルの内容読み取り |
| `file_tree:get_tree` | Unit 3 | インデックス対象ファイル一覧の取得 |
| `knowledge:search_keyword` | Unit 4 | ハイブリッド検索時のキーワード検索結果取得 |
| `vault:get_config` | Unit 1 | RAG 有効/無効設定の確認、自動インデックス設定の読み取り |

#### イベント（他ユニットから購読）

| イベント名 | 発火元 | 用途 |
|-----------|--------|------|
| `fs:changed` | Unit 1 (watcher_service) | ファイル変更検出 → 該当ファイルのベクトルインデックス差分更新。ただし即座には実行せず、デバウンス（5秒）後にバッチ更新 |

---

### データフロー

#### 1. ベクトルインデックス構築フロー

```
[Vault オープン] または [semantic:rebuild_index コマンド]
    ↓
[vector_store_service] インデックス構築タスクを tokio::spawn
    ↓
[embedding_service] 対象 Markdown ファイル一覧を取得（file_tree:get_tree）
    ↓
[embedding_service] 各ファイルを読み取り → pulldown-cmark でチャンキング
    ↓
[embedding_service] チャンクテキストをバッチで ONNX Runtime に入力 → ベクトル生成
    ↓
[vector_store_service] チャンクメタデータ + ベクトルを sqlite-vss に登録
    ↓
[commands/semantic.rs] semantic:index_progress イベント発火（進捗率更新）
    ↓
（全ファイル完了後）
[commands/semantic.rs] semantic:index_completed イベント発火
    ↓
[RAGStatusIndicator.tsx] StatusBar の表示を「構築中 X%」→「RAG On」に更新
```

#### 2. セマンティック検索フロー

```
[ユーザー] SemanticSearchTab でクエリ入力
    ↓
[semantic-store] searchSemantic() → IPC: semantic:search
    ↓
[commands/semantic.rs] → embedding_service.rs でクエリをベクトル化
    ↓
[commands/semantic.rs] → vector_store_service.rs で sqlite-vss 類似検索
    ↓
[vector_store_service] vss_search(query_vector, top_k) → chunk ID + スコア
    ↓
[vector_store_service] chunk ID からメタデータ（file_path, section_heading, chunk_text）を取得
    ↓
[commands/semantic.rs] SemanticSearchResult[] を返却
    ↓
[semantic-store] semanticResults を更新 → SemanticSearchTab が結果を描画
```

#### 3. RAG チャットフロー

```
[ユーザー] AIChat パネルで質問入力
    ↓
[semantic-store] sendChatMessage() → IPC: semantic:chat
    ↓
[commands/semantic.rs]
    1. クエリをベクトル化（embedding_service）
    2. ベクトル類似検索（vector_store_service）→ top-k チャンク取得
    3. コンテキストプロンプト構築:
       「以下のドキュメントを参考に回答してください:
        [チャンク 1: {file_path} - {section_heading}]
        {chunk_text}
        ...
        質問: {user_message}」
    4. Claude Code SDK モードで実行（agent:start + mode: sdk）
    ↓
[Claude Code SDK] コンテキスト付きプロンプトに基づき回答生成
    ↓
[commands/semantic.rs] ChatResponse を構築（回答テキスト + 参照元リンク + sessionId）
    ↓
[semantic-store] チャット履歴に追加 → AIChat パネルが回答を表示
```

---

### パフォーマンス要件

| 指標 | 目標値 | ベースライン条件 |
|------|--------|----------------|
| **セマンティック検索レスポンス** | **< 2秒**（p95） | M1 Mac、10,000 チャンク規模、ウォーム状態 |
| **ハイブリッド検索レスポンス** | **< 3秒**（p95） | 同上。キーワード検索 + セマンティック検索の並行実行 |
| **単一ファイル Embedding 生成** | **< 1秒** | 平均的な Markdown ファイル（約 500 行）のチャンキング + ベクトル化 |
| **初回フルインデックス構築** | **< 10分** | 10,000 ファイル / 1GB。バックグラウンド実行。CPU 使用率 75% 以下 |
| **差分インデックス更新** | **< 3秒** | 単一ファイル変更時（デバウンス後） |
| **メモリ使用量（インデックス構築中）** | **< 2GB** | ONNX Runtime + バッチ処理のメモリ消費合計 |
| **RAG チャットレスポンス** | **< 10秒**（初回応答開始） | Claude Code SDK による生成。ストリーミングレスポンス |
| **モデルロード時間** | **< 5秒** | ONNX Runtime へのモデル初回ロード |

---

### 制約・注意事項

1. **プライバシー保護**: ローカル Embedding モデルによるベクトル生成は完全にオンデバイスで実行する。ドキュメント内容は外部 API に送信しない。ただし RAG チャットでは Claude Code SDK 経由で検索結果のチャンクテキストが Anthropic API に送信される点をユーザーに明示する
2. **ONNX Runtime のバイナリサイズ**: `ort` crate はネイティブバイナリを含むため、アプリサイズが約 30-50MB 増加する。プラットフォームごとに適切な ExecutionProvider（CPU）をバンドルする
3. **sqlite-vss の制約**: sqlite-vss は SQLite 拡張として動的ロードが必要。Tauri のバンドルに `.dylib` / `.so` / `.dll` を含める必要がある。クロスプラットフォームビルドでプラットフォーム別のバイナリ管理が必要
4. **チャンキングの品質**: セクション単位のチャンキングは見出しの構造が整っていないドキュメントでは品質が低下する。フォールバックとして固定長チャンキング（オーバーラップ付き）も実装する
5. **RAG 有効/無効の切り替え**: `VaultConfig.rag_enabled` で RAG 機能全体のオン/オフを制御する。オフ時はインデックス構築を停止し、セマンティック検索・チャット機能を無効化する。Search パネルの Semantic タブは非表示になる
6. **Unit 4 との協調**: ハイブリッド検索は Unit 4 の `knowledge:search_keyword` コマンドを内部的に呼び出す。Unit 4 の Tantivy インデックスが構築済みであることを前提とする。インデックス構築順序は Unit 4（全文検索）→ Unit 5（ベクトル）とする
7. **外部 Embedding/Vector DB（US-4.17）**: MVP では対象外。将来的に `embedding_service.rs` と `vector_store_service.rs` のインターフェースを抽象化し、外部サービスへの差し替えを可能にする設計とする。現時点ではローカル ONNX + sqlite-vss のみ実装する
8. **同時処理数制限**: バックグラウンドインデックス構築の同時ファイル処理数はデフォルト 4。`tokio::sync::Semaphore` で制御する。CPU コア数に応じて自動調整する機構を備える（`num_cpus` crate で論理コア数の 75% を上限）
