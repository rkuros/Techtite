# Techtite ユニット間依存関係マトリクス・並列作業ガイド

> **ステータス**: 確定
> **最終更新**: 2026-02-28
> **参照**: 全ユニット技術仕様（`units/unit_01`〜`unit_10`）、`project_structure.md`、`ipc_event_protocol.md`

---

## 1. ユニット間依存関係マトリクス

### 1.1 依存関係サマリー

**凡例**: `→` は「依存する」を意味する。例えば「Unit 2 → Unit 1」は「Unit 2 が Unit 1 に依存する」。

```
Unit 1 (アプリケーションシェル)     ← 全ユニットが依存（基盤）
  ↑
Unit 2 (マークダウンエディタ)       → Unit 1, Unit 4（リンク装飾協調）
  ↑
Unit 3 (ファイル管理)               → Unit 1, Unit 2, Unit 4（リンク自動更新）
  ↑
Unit 4 (ナレッジベース・コア)       → Unit 1
  ↑
Unit 5 (セマンティック検索・RAG)    → Unit 1, Unit 4（Tantivy ハイブリッド検索連携）
  ↑
Unit 6 (Git統合・透過的同期)        → Unit 1, Unit 7（AI稼働確認）, Unit 9（認証情報）
  ↑
Unit 7 (ターミナル・エージェント)   → Unit 1
  ↑
Unit 8 (システム信頼性・ログ)       → Unit 1, Unit 6（Git イベント）, Unit 7（エージェントイベント）
  ↑
Unit 9 (ガードレール・セキュリティ) → Unit 1, Unit 7（エージェント停止連携）
  ↑
Unit 10 (コンテンツ公開)            → Unit 1, Unit 8（セッションログ取得）, Unit 9（認証情報）
```

### 1.2 依存関係マトリクス（詳細）

行 = 依存する側、列 = 依存される側。`●` = 強依存（開発着手に必須）、`○` = 弱依存（モック可能・後から統合）、`-` = 依存なし

|          | Unit 1 | Unit 2 | Unit 3 | Unit 4 | Unit 5 | Unit 6 | Unit 7 | Unit 8 | Unit 9 | Unit 10 |
|----------|:------:|:------:|:------:|:------:|:------:|:------:|:------:|:------:|:------:|:-------:|
| **Unit 1**  | —      | -      | -      | -      | -      | -      | -      | -      | -      | -       |
| **Unit 2**  | ●      | —      | -      | ○      | -      | -      | -      | -      | -      | -       |
| **Unit 3**  | ●      | ○      | —      | ○      | -      | -      | -      | -      | -      | -       |
| **Unit 4**  | ●      | -      | -      | —      | -      | -      | -      | -      | -      | -       |
| **Unit 5**  | ●      | -      | -      | ○      | —      | -      | -      | -      | -      | -       |
| **Unit 6**  | ●      | -      | -      | -      | -      | —      | ○      | -      | ○      | -       |
| **Unit 7**  | ●      | -      | -      | -      | -      | -      | —      | -      | -      | -       |
| **Unit 8**  | ●      | -      | -      | -      | -      | ○      | ○      | —      | -      | -       |
| **Unit 9**  | ●      | -      | -      | -      | -      | -      | ○      | -      | —      | -       |
| **Unit 10** | ●      | -      | -      | -      | -      | -      | -      | ○      | ○      | —       |

### 1.3 依存関係の詳細内訳

| 依存関係 | 依存内容 | モック可能性 |
|---------|---------|------------|
| **全 Unit → Unit 1** | IPC コマンド（`fs:read_file`, `fs:write_file` 等）、AppLayout スロット、Zustand `vault-store`、`fs:changed` イベント | **モック不可**（IPC 基盤がないと何も動かない）。Unit 1 の IPC コマンドスタブが最低限必要 |
| Unit 2 → Unit 4 | `[[]]` リンク装飾・`#tag` ハイライト。CodeMirror 6 拡張が Unit 4 のリンク/タグ情報を参照 | **モック可能**。拡張を無効化した状態で開発可能。リンク情報がなくても基本エディタは動作 |
| Unit 3 → Unit 2 | ファイルクリックでエディタにファイルを開く（`editor-store.openFile()` 呼び出し） | **モック可能**。`editor-store` のスタブで代替 |
| Unit 3 → Unit 4 | ファイル移動・リネーム時の内部リンク自動更新（`knowledge:get_outgoing_links` で影響範囲を特定） | **モック可能**。リンク自動更新を後から統合 |
| Unit 5 → Unit 4 | ハイブリッド検索で Tantivy キーワードスコアを利用 | **モック可能**。セマンティック検索単体でも動作。ハイブリッドは後から統合 |
| Unit 6 → Unit 7 | コミットメッセージ AI 生成時に `agent:list` でエージェント稼働状態を確認 | **モック可能**。テンプレートフォールバックで代替 |
| Unit 6 → Unit 9 | 認証情報（PAT/SSH キー）を `credential_service` 経由で取得 | **モック可能**。環境変数から直接読み取りで代替 |
| Unit 8 → Unit 6 | Git イベント（`git:status_changed`）を購読してキャプチャログに記録 | **モック可能**。Git イベントなしでもファイル/ターミナルキャプチャは独立して動作 |
| Unit 8 → Unit 7 | エージェントイベント（`agent:operation`）を購読してキャプチャログに記録 | **モック可能**。ファイルシステムイベントのみでも基本キャプチャは成立 |
| Unit 9 → Unit 7 | 予算上限到達時にエージェント停止（`agent:stop` コマンド呼び出し） | **モック可能**。通知のみで停止しない仮実装で代替 |
| Unit 10 → Unit 8 | セッションログ取得（`session_log:list`, `session_log:get_content`） | **モック可能**。テスト用のダミーログで代替 |
| Unit 10 → Unit 9 | 認証情報取得（Zenn/X/Threads/Note の API キー） | **モック可能**。環境変数から直接読み取りで代替 |

---

## 2. 開発着手の前提条件

### 2.1 開発フェーズ

| フェーズ | ユニット | 前提条件 | 期間目安 |
|---------|---------|---------|---------|
| **Phase 0** | **Unit 1**（基盤） | なし | 最初に着手 |
| **Phase 1** | **Unit 2, 3, 4, 6, 7** | Unit 1 の IPC スタブ（`fs:*`, `vault:*` コマンド）が動作すること | Phase 0 のスタブ完成後に並列着手 |
| **Phase 2** | **Unit 5, 8, 9** | Unit 1 完成。Unit 4（ハイブリッド検索用）、Unit 7（エージェントイベント用）の基本 IPC 動作 | Phase 1 の基本 IPC 完成後 |
| **Phase 3** | **Unit 10** | Unit 8（セッションログ API）、Unit 9（認証情報 API）の基本動作 | Phase 2 の基本完成後 |

### 2.2 Phase 0: Unit 1 スタブの最小要件

Phase 1 のユニットが並列着手するために、Unit 1 が最低限提供すべきスタブ:

```
[必須スタブ]
✅ Tauri Builder 起動（main.rs の最小構成）
✅ IPC コマンド: fs:read_file, fs:write_file, fs:create_file, fs:delete, fs:rename
✅ IPC コマンド: vault:open, vault:get_current, vault:select_folder
✅ fs:changed イベントの発火（notify による基本的なファイル監視）
✅ AppLayout の基本構造（Ribbon + LeftSidebar + CenterArea + RightTerminal + StatusBar のスロット）
✅ vault-store の基本実装（currentVault, isLoading）
✅ editor-store の基本実装（openFile, closeTab, activeTab）

[後回し可能]
○ ペイン分割（react-resizable-panels 統合）
○ ウィンドウ状態保存/復元
○ StatusBar の各ユニット専用スロット
```

---

## 3. ファイル境界・競合回避ルール

### 3.1 基本ルール

1. **各ユニットは自分の所有ファイルのみを編集する**（`project_structure.md` Section 5 参照）
2. **共有ファイルへの変更は追記のみ**。既存行の変更は禁止:
   - `src-tauri/src/main.rs`: コマンド登録の追記のみ
   - `src-tauri/src/lib.rs`: `pub mod` 宣言の追記のみ
3. **型定義ファイル（`src/types/*.ts`）**: 自分のドメインの型のみ編集。共有型（`ipc.ts`）の変更は事前相談が必要
4. **Zustand ストア**: 各ユニットは自分のストアのみ編集。`editor-store` は Unit 1（基盤スライス）と Unit 2（エディタ固有スライス）で分離管理

### 3.2 共有サービスの利用ルール

| 共有サービス | 提供元 | 利用側の制約 |
|------------|--------|------------|
| `watcher_service.rs` | Unit 1 | Unit 7, 8 はイベント**購読のみ**。Watcher の設定・起動/停止は Unit 1 のみ |
| `masking_service.rs` | Unit 8 | Unit 9 はマスキング API を**利用するのみ**。パターン定義は Unit 8 が管理 |
| `credential_service.rs` | Unit 9 | Unit 6, 10 は `get` API を**利用するのみ**。保管・削除は Unit 9 経由 |
| 共有コンポーネント（`src/shared/`） | Unit 1 | 他ユニットは**利用のみ**。変更が必要な場合は Unit 1 に依頼 |

### 3.3 ファイル競合が発生しやすい箇所と対策

| ファイル | 競合リスク | 対策 |
|---------|-----------|------|
| `src-tauri/src/main.rs` | 全ユニットがコマンド登録を追記 | 各ユニットのコマンドをブロック単位でコメントで区切る。追記位置を末尾固定 |
| `src/App.tsx` | 複数ユニットが自コンポーネントの配置を追加 | Unit 1 がスロット（プレースホルダー）を事前定義。各ユニットは指定スロットに配置 |
| `package.json` | 複数ユニットがライブラリを追加 | 依存追加は pnpm add のみ（手動編集禁止）。lock ファイルの競合は `pnpm install` で自動解消 |
| `Cargo.toml` | 複数ユニットが crate を追加 | `[dependencies]` セクションはアルファベット順。追加のみ・既存行の変更禁止 |

---

## 4. モック戦略

弱依存（○）の箇所は以下のモック戦略で開発を並行して進める。

### 4.1 IPC コマンドのモック

Unit 1 の IPC 基盤が未完成の段階で開発を始める場合:

```typescript
// src/shared/utils/ipc-mock.ts
// 開発時にモック IPC を注入するヘルパー
const mockHandlers: Record<string, Function> = {};

export function registerMockHandler(cmd: string, handler: Function) {
  mockHandlers[cmd] = handler;
}

export async function invokeCommand<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (import.meta.env.DEV && mockHandlers[cmd]) {
    return mockHandlers[cmd](args) as T;
  }
  return invoke<T>(cmd, args);
}
```

### 4.2 イベントのモック

```typescript
// イベントモック: 開発時にダミーイベントを発火
export function emitMockEvent(event: string, payload: unknown) {
  if (import.meta.env.DEV) {
    window.dispatchEvent(new CustomEvent(`tauri://${event}`, { detail: payload }));
  }
}
```

### 4.3 ユニット別モック対象

| ユニット | モックする対象 | モック実装 |
|---------|-------------|-----------|
| **Unit 2** | Unit 4 のリンク/タグ情報 | `[[]]` 装飾を無効化。基本エディタのみで開発 |
| **Unit 3** | Unit 2 の `editor-store.openFile()` | `console.log` でファイルパスを出力するスタブ |
| **Unit 3** | Unit 4 のリンク情報 | リンク自動更新をスキップ。ファイル操作のみ先行開発 |
| **Unit 5** | Unit 4 の Tantivy スコア | セマンティック検索単体で開発。ハイブリッドの keyword_weight を 0 に設定 |
| **Unit 6** | Unit 7 のエージェント稼働状態 | `agent:list` が空リストを返すモック → 常にテンプレートフォールバック |
| **Unit 6** | Unit 9 の認証情報 | 環境変数 `GITHUB_TOKEN` から直接読み取り |
| **Unit 8** | Unit 6/7 のイベント | ダミーイベントを手動発火するテストユーティリティ |
| **Unit 9** | Unit 7 のエージェント停止 | `agent:stop` を `console.warn` に置き換え |
| **Unit 10** | Unit 8 のセッションログ | テスト用マークダウンファイルをダミーログとして配置 |
| **Unit 10** | Unit 9 の認証情報 | 環境変数から直接読み取り |

---

## 5. 推奨開発着手順序

### 5.1 最短クリティカルパス

```
Week 1:  Unit 1（Phase 0 スタブ完成）
Week 2+: Unit 2, 3, 4, 6, 7（Phase 1 並列開発）
Week 3+: Unit 5, 8, 9（Phase 2 並列開発。Phase 1 の基本 IPC 完成次第着手）
Week 4+: Unit 10（Phase 3。Phase 2 の基本完成次第着手）
```

### 5.2 Phase 1 内の推奨順序（5ユニット並列）

Phase 1 の5ユニットはすべて並列着手可能だが、統合テスト時の効率を考慮した推奨順:

1. **Unit 4**（ナレッジベース・コア）: 他ユニット（2, 3, 5）の弱依存先。早期完成で統合が容易になる
2. **Unit 7**（ターミナル・エージェント）: Unit 6, 8, 9 の弱依存先。早期完成で統合が容易
3. **Unit 2**（マークダウンエディタ）: Unit 3 の弱依存先
4. **Unit 3**（ファイル管理）: Unit 2 と Unit 4 に弱依存
5. **Unit 6**（Git統合）: Unit 7 と Unit 9 に弱依存（モック可能）

### 5.3 統合テストポイント

| 統合ポイント | 関連ユニット | テスト内容 |
|------------|------------|-----------|
| **エディタ + リンク装飾** | Unit 2 + Unit 4 | `[[]]` リンクの CodeMirror 6 拡張が正しく動作するか |
| **ファイル管理 + リンク自動更新** | Unit 3 + Unit 4 | ファイル移動・リネーム時に `[[]]` リンクが更新されるか |
| **ハイブリッド検索** | Unit 4 + Unit 5 | Tantivy スコアと sqlite-vss スコアの RRF 統合が正しいか |
| **Git 自動同期 + コミットメッセージ** | Unit 6 + Unit 7 | Claude Code 稼働時の AI 生成とテンプレートフォールバックの切り替え |
| **Git 認証** | Unit 6 + Unit 9 | OS キーチェーンからの認証情報取得 → git2 RemoteCallbacks への注入 |
| **システムキャプチャ全ソース** | Unit 8 + Unit 1 + Unit 6 + Unit 7 | ファイルイベント + Git イベント + ターミナルイベントの統合キャプチャ |
| **コスト管理 + エージェント停止** | Unit 9 + Unit 7 | 予算上限到達時の `cost:limit_reached` → `agent:stop` フロー |
| **コンテンツ公開パイプライン全体** | Unit 10 + Unit 8 + Unit 9 | セッションログ取得 → AI 変換 → 記法変換 → 外部 API 公開 |

---

## 6. ブランチ戦略

### 6.1 ブランチ命名規約

```
main                              # 安定版（マージ済み）
├── develop                       # 統合ブランチ
│   ├── unit-01/feature-name      # Unit 1 の作業ブランチ
│   ├── unit-02/feature-name      # Unit 2 の作業ブランチ
│   ├── ...
│   └── unit-10/feature-name
```

### 6.2 マージルール

1. 各ユニットは `unit-XX/feature-name` ブランチで作業
2. `develop` へのマージは PR 経由。自動テスト（Vitest + cargo test）が通ること
3. 共有ファイル（`main.rs`, `App.tsx`, `package.json`, `Cargo.toml`）を変更する PR は他ユニットのレビュー必須
4. `main` へのマージはフェーズ完了時にまとめて実施

---

## 7. コミュニケーションルール

### 7.1 インターフェース変更時

IPC コマンド/イベントの仕様変更が必要になった場合:
1. `ipc_event_protocol.md` を先に更新（PR を作成）
2. 影響を受けるユニットの担当エージェントに通知
3. 承認後に実装を変更

### 7.2 共有型の変更時

`shared_data_models.md` の型定義変更が必要になった場合:
1. 変更理由と影響範囲を明記した PR を作成
2. Rust struct と TypeScript 型の**両方**を同時に更新
3. 影響を受けるユニットのテストが通ることを確認
