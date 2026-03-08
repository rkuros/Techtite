# Unit 9: ガードレール・セキュリティ

> **対応 Epic**: Epic 6 — AIエージェント管理・ターミナル（ガードレール部分）
> **対応ストーリー**: US-6.13〜US-6.16

---

## ユーザーストーリーと受け入れ基準

### US-6.13 [Should] APIコスト・トークン使用量管理

個人開発者として、AIエージェントのAPIコスト（トークン使用量）をダッシュボードで確認し、上限設定で意図しない高額請求を防ぎたい。なぜなら、複数エージェント並列稼働+RAG+アンビエントエージェントでトークン消費が大きくなるからだ。

- [ ] ダッシュボードにエージェント別・合計のトークン使用量と推定コストが表示される
- [ ] 日次/月次のコスト推移グラフが表示される
- [ ] コスト上限（日次/月次）を設定でき、上限到達時にエージェントが自動停止する
- [ ] 上限接近時に警告通知が表示される（例: 80%到達時）
- [ ] エージェント種別ごと（作業エージェント/アンビエント/RAG）のコスト内訳が確認できる

### US-6.14 [Should] ログローテーション・肥大化対策

個人開発者として、システムレベルの操作ログ（US-6.10）が肥大化しないよう、自動ローテーション・圧縮してほしい。なぜなら、全操作を常時キャプチャし続けるとストレージが逼迫するからだ。

- [ ] ログの保持期間を設定できる（デフォルト: 30日）
- [ ] 保持期間を過ぎた生ログが自動圧縮（gzip等）される
- [ ] 圧縮後一定期間経過した生ログが自動パージされる（構造化セッションログは保持）
- [ ] ビルド出力等の大容量ログに対するフィルタリングルールを設定できる
- [ ] 現在のログストレージ使用量がダッシュボードに表示される

### US-6.15 [Should] エージェント実行環境サンドボックス

個人開発者として、AIエージェントのターミナル実行環境がサンドボックス化されてほしい。なぜなら、エージェントが意図せず破壊的なコマンドや機密情報へのアクセスを行うリスクを防ぎたいからだ。

- [ ] エージェント用ターミナルがプロジェクトディレクトリ（Vault）をルートとした制限された環境で動作する
- [ ] 許可/禁止するコマンドのホワイトリスト/ブラックリストを設定できる
- [ ] Vault外のファイルシステム（`~/.ssh`、`/etc`等）へのアクセスが制限される
- [ ] 破壊的コマンド（`rm -rf /`等）がブロックされ、実行前に確認が求められる
- [ ] （拡張）Dockerコンテナ等の隔離環境でのエージェント実行オプション

### US-6.16 [Should] 認証情報の安全な保管

個人開発者として、外部サービスの認証情報（API Key、Token等）が安全に保管されてほしい。なぜなら、Zenn/Note/X/Threads/GitHub/OpenAI等の認証情報が漏洩するリスクを防ぎたいからだ。

- [ ] 認証情報がOS標準のキーチェーン/資格情報マネージャーに暗号化保存される
- [ ] 認証情報がプロジェクトファイルやGitリポジトリに含まれない
- [ ] 認証情報の一覧管理画面で追加・更新・削除ができる
- [ ] エージェントからの認証情報アクセスは必要最小限のスコープに制限される

---

## 技術仕様

### アーキテクチャ概要

Unit 9 は Techtite のガードレール・セキュリティレイヤーを担当する。API コスト追跡・予算制御、ログローテーション、エージェント実行環境サンドボックス、認証情報管理の 4 つのサブシステムで構成される。

Rust バックエンドに 4 つのサービス（`cost_tracker_service.rs`、`log_rotation_service.rs`、`sandbox_service.rs`、`credential_service.rs`）を配置し、2 つの IPC コマンドハンドラ（`guardrails.rs`、`credentials.rs`）を通じてフロントエンドと通信する。コスト追跡は Claude Code API 呼び出しを Unit 7 のプロセス管理層でインターセプトし、トークン使用量を `metadata.db`（SQLite）に記録する。予算上限到達時は `cost:limit_reached` イベントにより Unit 7 がエージェントを自動停止する。認証情報は `keyring` crate を通じて OS 標準キーチェーンに委任し、アプリケーション内にはシークレットを一切保持しない。

```
┌─────────────────────────────────────────────────────────┐
│  フロントエンド (React)                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐ │
│  │ CostDisplay  │ │ BudgetBar   │ │ CredentialManager │ │
│  │ (recharts)   │ │             │ │                    │ │
│  └──────┬───────┘ └──────┬──────┘ └─────────┬──────────┘ │
│         │                │                   │            │
│  ┌──────┴────────────────┴───────────────────┴──────────┐ │
│  │              cost-store (Zustand)                     │ │
│  └──────────────────────┬───────────────────────────────┘ │
├─────────────────────────┼───────────────────────────────── │
│  IPC (Tauri invoke/emit)│                                  │
├─────────────────────────┼───────────────────────────────── │
│  Rust バックエンド         │                                  │
│  ┌──────────────────────┴───────────────────────────────┐ │
│  │       commands/guardrails.rs, credentials.rs          │ │
│  └──┬──────────┬──────────┬──────────────┬──────────────┘ │
│     │          │          │              │                 │
│  ┌──┴────┐ ┌──┴────┐ ┌──┴──────┐ ┌─────┴───────┐        │
│  │ cost_ │ │ log_  │ │sandbox_ │ │ credential_ │        │
│  │tracker│ │rotate │ │service  │ │ service     │        │
│  │service│ │service│ │         │ │ (keyring)   │        │
│  └──┬────┘ └──┬────┘ └─────────┘ └─────────────┘        │
│     │         │                                           │
│  ┌──┴─────────┴──────┐                                    │
│  │  metadata.db      │  OS Keychain                       │
│  │  (SQLite)         │  (macOS Keychain /                 │
│  │  cost_records tbl │   Win Credential Mgr)              │
│  └───────────────────┘                                    │
└─────────────────────────────────────────────────────────┘
```

### UI 担当領域

モックアップ（`techtite_mockup.html`）における本ユニットの UI 担当領域は以下の通り。

| UI 要素 | 配置場所 | 概要 |
|---------|---------|------|
| **CostDisplay** | Left Sidebar > Agents Dashboard パネル下部 | エージェント別・合計のトークン使用量と推定コスト表示。日次/月次切り替え可能な推移グラフ（recharts） |
| **BudgetBar** | Left Sidebar > Agents Dashboard パネル下部 | 予算消化率のプログレスバー。モックアップでは「API Cost Today: $0.38 / $5.00 limit」と進捗バーとして表示 |
| **CostStatusBadge** | StatusBar 右側 | 「$0.38 / $5.00」形式で現在のコスト/上限を常時表示。上限接近時に警告色に変化 |
| **CredentialManager** | Settings 画面（Ribbon 下部の歯車アイコンから遷移） | 認証情報の一覧表示・追加・更新・削除 UI |

### 主要ライブラリ・技術

| ライブラリ / 技術 | 用途 | レイヤー |
|------------------|------|---------|
| **rusqlite** | コストレコードの永続化（`metadata.db` 内 `cost_records` テーブル） | Rust |
| **flate2** | 生ログの gzip 圧縮（ログローテーション時） | Rust |
| **keyring** | OS 標準キーチェーンへの認証情報 CRUD（macOS Keychain / Windows Credential Manager / Linux Secret Service） | Rust |
| **tokio** | ログローテーションのスケジュールドタスク、コスト集計のバックグラウンド処理 | Rust |
| **serde** / **serde_json** | コスト・設定データの JSON シリアライズ / デシリアライズ | Rust |
| **regex** | サンドボックスのコマンドパターンマッチング、危険コマンド検出 | Rust |
| **recharts** | コスト推移グラフ（日次/月次の折れ線グラフ、エージェント別積み上げ棒グラフ） | TypeScript |
| **Zustand** | `cost-store` によるコスト・予算状態のフロントエンド管理 | TypeScript |
| **Tailwind CSS** | ガードレール UI コンポーネントのスタイリング | TypeScript |

### Rust バックエンド詳細

#### ファイル構成

```
src-tauri/src/
├── commands/
│   ├── guardrails.rs          # コスト管理・サンドボックス・ログローテーション IPC コマンド
│   └── credentials.rs         # 認証情報管理 IPC コマンド
├── services/
│   ├── cost_tracker_service.rs    # API コスト・トークン追跡
│   ├── log_rotation_service.rs    # ログローテーション・圧縮・パージ
│   ├── sandbox_service.rs         # サンドボックスポリシー管理
│   └── credential_service.rs      # OS キーチェーン連携
└── models/
    └── cost.rs                # CostRecord, CostSummary, BudgetConfig 等
```

#### cost_tracker_service.rs

- Unit 7（`process_service.rs` / `agent_registry.rs`）が Claude Code API 呼び出し時に取得する `--output-format stream-json` のストリームから `result` メッセージのトークン使用量（`input_tokens`, `output_tokens`）を抽出し、本サービスの `record_usage()` メソッドに渡す
- `record_usage()` は `CostRecord` を `metadata.db` の `cost_records` テーブルに INSERT する
- `estimated_cost_usd` は Anthropic API の公開料金テーブルに基づき算出する（モデル別単価をハードコード + 設定で上書き可能）
- `get_summary()` は指定期間の集計を `GROUP BY agent_id` / `GROUP BY agent_category` で返す
- `get_trend()` は直近 N 日間の日別コストを返す
- `check_budget()` は現在の消費を `BudgetConfig` と比較し、`warning_threshold` 超過時に `cost:warning` イベント、100% 到達時に `cost:limit_reached` イベントを `app.emit()` で発火する
- 予算チェックは `record_usage()` 呼び出しの都度実行される（リアルタイム検知）

```sql
-- metadata.db スキーマ（cost_records テーブル）
CREATE TABLE cost_records (
    id          TEXT PRIMARY KEY,
    agent_id    TEXT NOT NULL,
    agent_name  TEXT NOT NULL,
    agent_category TEXT NOT NULL CHECK(agent_category IN ('worker','ambient','rag')),
    timestamp   TEXT NOT NULL,
    input_tokens  INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    estimated_cost_usd REAL NOT NULL
);

CREATE INDEX idx_cost_timestamp ON cost_records(timestamp);
CREATE INDEX idx_cost_agent ON cost_records(agent_id);
```

#### log_rotation_service.rs

- `tokio::spawn` でバックグラウンドタスクとして起動し、定期的（デフォルト 1 時間ごと）にローテーションチェックを実行
- 保持期間（デフォルト 30 日）を超過した `<vault>/.techtite/raw_logs/` 配下の生ログファイルを `flate2::write::GzEncoder` で gzip 圧縮（`.jsonl` → `.jsonl.gz`）
- 圧縮後さらに一定期間（保持期間 x 2）を超過したファイルを自動パージ（削除）
- 構造化セッションログ（`<vault>/<設定可能パス>/session-logs/`）はローテーション対象外（Git 同期対象のため）
- `FilterRule` に基づき、特定パターン（例: `node_modules/**`, ビルド出力）のイベントをログから除外 or 行数制限
- `LogStorageStatus` を計算してフロントエンドに返却（総サイズ、圧縮済みサイズ、保持日数）

#### sandbox_service.rs

- エージェント起動時に `SandboxConfig` をロードし、ターミナルコマンド実行前にポリシーチェックを行う
- コマンドホワイトリスト / ブラックリストの評価順序: ブラックリスト → ホワイトリスト（ブラックリスト優先）
- パス制限: Vault ルートパスを境界として、それ以外のパスへの `cd`、ファイル操作を検出・ブロック
- 破壊的コマンドのデフォルトブラックリスト: `rm -rf /`, `rm -rf ~`, `mkfs`, `dd if=`, `chmod -R 777 /`, `:(){ :|:& };:` 等
- コマンド実行前のバリデーションとして、Unit 7 の `process_service.rs` がターミナル入力受付時に `sandbox_service.validate_command()` を呼び出す
- ブロック時は実行を中止し、ユーザーに確認ダイアログを表示するためのイベントを発火

#### credential_service.rs

- `keyring` crate の `Entry::new(service_name, username)` を使用して OS キーチェーンにアクセス
- `service_name` は `"techtite-{service}"` 形式（例: `"techtite-github"`, `"techtite-anthropic"`）
- `list()`: `metadata.db` の `credentials` テーブルからキーの一覧を取得（シークレット値自体は DB に保存しない。キー名・サービス名・更新日時のみ）
- `set()`: キーチェーンに保存 + `metadata.db` のメタデータ更新
- `get()`: キーチェーンから取得（内部的に他のサービスが呼び出す。フロントエンドには値を直接返さない）
- `delete()`: キーチェーンから削除 + `metadata.db` のメタデータ削除
- 対応サービス: `github`, `anthropic`, `zenn`, `note`, `x`, `threads`

```sql
-- metadata.db スキーマ（credentials テーブル）
CREATE TABLE credentials (
    key         TEXT PRIMARY KEY,
    service     TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
```

### フロントエンド詳細

#### ファイル構成

```
src/
├── features/guardrails/
│   ├── components/
│   │   ├── CostDisplay.tsx        # コスト表示・推移グラフ
│   │   ├── BudgetBar.tsx          # 予算プログレスバー
│   │   ├── CredentialManager.tsx  # 認証情報管理画面
│   │   └── CostStatusBadge.tsx    # StatusBar 用コストバッジ
│   ├── hooks/
│   │   ├── use-cost-data.ts       # コストデータ取得・キャッシュ
│   │   └── use-budget-alert.ts    # 予算警告イベントリスナー
│   └── index.ts
├── stores/
│   └── cost-store.ts              # コスト・予算 Zustand ストア
└── types/
    └── cost.ts                    # CostRecord, CostSummary, BudgetConfig 等
```

#### cost-store.ts（Zustand）

```typescript
interface CostStoreState {
  // 状態
  currentSummary: CostSummary | null;
  budgetConfig: BudgetConfig | null;
  trendData: DailyCostPoint[];
  logStorageStatus: LogStorageStatus | null;
  sandboxConfig: SandboxConfig | null;
  isWarning: boolean;
  isLimitReached: boolean;

  // アクション
  fetchSummary: (period: CostPeriod) => Promise<void>;
  fetchBudget: () => Promise<void>;
  updateBudget: (config: BudgetConfig) => Promise<void>;
  fetchTrend: (days: number) => Promise<void>;
  fetchLogStorageStatus: () => Promise<void>;
  fetchSandboxConfig: () => Promise<void>;
  updateSandboxConfig: (config: SandboxConfig) => Promise<void>;
}
```

#### CostDisplay.tsx

- `recharts` の `LineChart` で日次/月次のコスト推移グラフを描画
- `BarChart` でエージェント別・カテゴリ別のコスト内訳を表示
- 表示期間の切り替え（7 日 / 30 日 / 月次）をタブで提供
- `cost:updated` イベントを `listenEvent` で購読し、リアルタイム更新

#### BudgetBar.tsx

- 予算消化率（`currentCost / dailyLimitUsd`）をプログレスバーで表示
- 消化率に応じた色変化: 0-79% → アクセントカラー、80-99% → 黄色、100% → 赤
- 予算上限値のインライン編集機能（クリックで入力フィールドに切り替え）

#### CredentialManager.tsx

- Settings 画面内のセクションとして表示
- 認証情報一覧テーブル（キー名、サービス名、最終更新日時）
- 追加 / 更新: モーダルフォーム（サービス選択ドロップダウン + シークレット入力フィールド）
- 削除: 確認ダイアログ付き
- シークレット値はフロントエンドに返却されない設計（`credential:list` はメタデータのみ返却）

#### CostStatusBadge.tsx

- StatusBar 右側に配置（モックアップの「$0.38 / $5.00」表示に対応）
- `cost:updated` イベントでリアルタイム更新
- `cost:warning` イベントで黄色点滅、`cost:limit_reached` で赤色表示 + ツールチップ

### 公開インターフェース

本ユニットが提供する IPC コマンドとイベント。

#### IPC コマンド（フロントエンド → Rust）

| コマンド名 | 入力 | 出力 | 説明 |
|-----------|------|------|------|
| `cost:get_summary` | `{ period: CostPeriod }` | `CostSummary` | 指定期間のコストサマリー取得 |
| `cost:get_budget` | -- | `BudgetConfig` | 予算設定取得 |
| `cost:set_budget` | `BudgetConfig` | `void` | 予算設定更新 |
| `cost:get_trend` | `{ days: number }` | `DailyCostPoint[]` | コスト推移データ取得 |
| `log_rotation:get_status` | -- | `LogStorageStatus` | ログストレージ状態取得 |
| `log_rotation:set_config` | `LogRotationConfig` | `void` | ローテーション設定更新 |
| `credential:list` | -- | `CredentialEntry[]` | 認証情報一覧取得（メタデータのみ） |
| `credential:set` | `{ key: string, value: string, service: string }` | `void` | 認証情報追加/更新 |
| `credential:delete` | `{ key: string }` | `void` | 認証情報削除 |
| `sandbox:get_config` | -- | `SandboxConfig` | サンドボックス設定取得 |
| `sandbox:set_config` | `SandboxConfig` | `void` | サンドボックス設定更新 |

#### イベント（Rust → フロントエンド）

| イベント名 | ペイロード | 購読先 | 説明 |
|-----------|----------|--------|------|
| `cost:updated` | `{ totalCostUsd: number, periodUsage: number }` | Unit 9 (CostDisplay, CostStatusBadge), Unit 1 (StatusBar) | API コール後のコスト更新通知 |
| `cost:warning` | `{ message: string, usage: number, limit: number }` | Unit 9 (CostStatusBadge), Unit 1 (Toast) | 予算警告閾値（デフォルト 80%）超過時 |
| `cost:limit_reached` | `{ period: string }` | Unit 7 (エージェント自動停止), Unit 9 (UI), Unit 1 (Toast) | 予算上限到達。Unit 7 は全稼働エージェントを停止 |

#### 内部 API（Rust サービス間）

| メソッド | 提供元 | 呼び出し元 | 説明 |
|---------|--------|-----------|------|
| `cost_tracker_service.record_usage(agent_id, tokens)` | Unit 9 | Unit 7 (process_service) | トークン使用量の記録 |
| `sandbox_service.validate_command(command, agent_id)` | Unit 9 | Unit 7 (process_service) | コマンド実行前のサンドボックス検証 |
| `credential_service.get(service, key)` | Unit 9 | Unit 10 (publish_service) | 認証情報の取得（内部サービス用） |

### 消費インターフェース

本ユニットが他ユニットから消費する IPC コマンドとイベント。

#### 消費する IPC コマンド

| コマンド名 | 提供元 | 用途 |
|-----------|--------|------|
| `agent:list` | Unit 7 | コスト表示時のエージェント一覧取得（エージェント名の解決） |
| `agent:stop` | Unit 7 | 予算上限到達時のエージェント自動停止（`cost:limit_reached` イベント経由で Unit 7 が自身を停止する設計だが、直接呼び出しも可能） |

#### 購読するイベント

| イベント名 | 発火元 | 用途 |
|-----------|--------|------|
| `agent:status_changed` | Unit 7 | エージェント起動/停止の検知（コスト追跡の開始/終了） |
| `cost:updated` | 自ユニット | CostDisplay / CostStatusBadge のリアルタイム更新 |
| `cost:warning` | 自ユニット | CostStatusBadge の警告表示 |
| `cost:limit_reached` | 自ユニット | UI 上の上限到達表示 |

### データフロー

#### API コスト追跡フロー

```
1. Unit 7: Claude Code API 呼び出し実行
   └─ stream-json 出力からトークン使用量を抽出

2. Unit 7 → Unit 9: cost_tracker_service.record_usage() 呼び出し
   ├─ CostRecord を metadata.db に INSERT
   ├─ estimated_cost_usd を算出（モデル別単価 x トークン数）
   └─ check_budget() を実行

3. check_budget() の結果分岐
   ├─ usage < warning_threshold → (何もしない)
   ├─ warning_threshold <= usage < 1.0 → cost:warning イベント発火
   └─ usage >= 1.0 → cost:limit_reached イベント発火

4. cost:updated イベント発火（毎回）
   ├─ → Unit 9 フロントエンド: CostDisplay / CostStatusBadge 更新
   └─ → Unit 1: StatusBar のコスト表示更新

5. cost:limit_reached の場合
   ├─ → Unit 7: 全稼働エージェントを自動停止
   └─ → Unit 1: Toast で上限到達通知
```

#### ログローテーションフロー

```
1. tokio バックグラウンドタスク: 1 時間ごとにチェック

2. <vault>/.techtite/raw_logs/ 配下をスキャン
   ├─ 保持期間超過ファイル → flate2 で gzip 圧縮
   ├─ 圧縮後保持期間超過ファイル → 削除（パージ）
   └─ FilterRule に基づくフィルタリング

3. LogStorageStatus を再計算
   └─ フロントエンド要求時に返却
```

#### サンドボックス検証フロー

```
1. Unit 7: ターミナルへのコマンド入力を検出

2. Unit 7 → Unit 9: sandbox_service.validate_command() 呼び出し
   ├─ ブラックリスト照合 → マッチ → ブロック
   ├─ ホワイトリスト照合 → 不一致 → ブロック
   └─ パス制限チェック → Vault 外パス → ブロック

3. 結果
   ├─ 許可 → Unit 7 がコマンド実行
   └─ ブロック → ユーザーに確認ダイアログ表示
       └─ ユーザーが明示的に許可した場合のみ実行
```

### パフォーマンス要件

| 項目 | 要件 | 備考 |
|------|------|------|
| コスト記録の書き込み | < 5ms | API 呼び出しのクリティカルパスに影響しないこと |
| 予算チェック | < 1ms | `record_usage()` の都度実行されるため高速である必要がある |
| コストサマリー集計 | < 100ms | SQLite の集計クエリ。インデックスにより高速化 |
| コスト推移データ取得 | < 200ms | 最大 90 日分のデータポイント |
| サンドボックス検証 | < 2ms | ターミナル入力のレイテンシに影響しないこと |
| ログローテーション処理 | バックグラウンド | メインスレッドをブロックしない。gzip 圧縮は tokio::task::spawn_blocking で実行 |
| キーチェーンアクセス | < 100ms | OS キーチェーン API の応答時間に依存 |
| recharts グラフレンダリング | < 300ms | 90 日分のデータポイントで滑らかに描画 |

### 制約・注意事項

1. **コスト算出の精度**: 推定コストは Anthropic API の公開料金テーブルに基づくが、料金改定に追従する必要がある。料金テーブルは設定ファイルで上書き可能にする。実際の請求額とは差異が生じる可能性があるため、UI 上に「推定値」である旨を明記する。

2. **キーチェーン互換性**: `keyring` crate はプラットフォームごとに異なるバックエンドを使用する（macOS: Keychain Services、Windows: Credential Manager、Linux: Secret Service API / libsecret）。Linux 環境では `gnome-keyring` や `kwallet` が必要な場合がある。環境依存の制約を起動時にチェックし、利用不可の場合はフォールバック（暗号化ファイルストア）を検討する。

3. **サンドボックスの限界**: 本サンドボックスはアプリケーションレベルのコマンドフィルタリングであり、OS レベルの隔離ではない。パイプやシェル展開を利用した回避手段が存在し得るため、完全なセキュリティ境界としては機能しない。Phase 2 で Docker コンテナによる隔離環境を検討する。

4. **認証情報のスコープ制限**: エージェントプロセスへの認証情報受け渡しは環境変数経由で行い、必要なサービスのキーのみを渡す。エージェント起動時に `credential_service.get()` で取得し、プロセスの環境変数に設定する。ターミナル出力への認証情報漏洩は Unit 8 の `masking_service.rs` でマスキングする。

5. **ログローテーションと他ユニットの関係**: ローテーション対象は `<vault>/.techtite/raw_logs/` 配下の生ログのみ。Unit 8 が管理する構造化セッションログ（Git 同期対象）はローテーション対象外。ローテーション実行中にログ書き込みが競合しないよう、ファイルロック（`flock`）を使用する。

6. **`cost:limit_reached` のエージェント停止**: 上限到達時はイベント駆動で Unit 7 がエージェントを停止する設計とし、Unit 9 が直接 Unit 7 のサービスを呼び出さない。これによりユニット間の結合度を低く保つ。ただし、ユーザーが明示的にオーバーライドして上限を超えて継続実行するオプションも提供する。

7. **SQLite 同時アクセス**: `cost_records` テーブルへの書き込みは複数エージェントの並列稼働時に同時発生する。`rusqlite` の WAL モードを有効にし、書き込み競合を最小化する。
