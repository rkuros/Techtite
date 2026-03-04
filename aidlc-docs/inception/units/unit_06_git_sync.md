# Unit 6: Git統合・透過的同期

> **対応 Epic**: Epic 5 — Git統合・透過的同期
> **対応ストーリー**: US-5.1〜US-5.12

---

## ユーザーストーリーと受け入れ基準

### US-5.1 [Must] Gitリポジトリ自動認識

個人開発者として、プロジェクトフォルダ内のGitリポジトリを自動的に認識してほしい。なぜなら、コードとドキュメントが同じリポジトリにあることを前提に作業したいからだ。

- [ ] Vault内に`.git`ディレクトリがある場合、自動的にGitリポジトリとして認識される
- [ ] ステータスバーに現在のブランチ名が表示される
- [ ] Gitリポジトリが存在しない場合は、Git機能が無効化される

### US-5.2 [Must] 変更差分表示

個人開発者として、ファイルの変更差分をアプリ内で確認したい。なぜなら、コミット前にどのような変更を行ったかを確認したいからだ。

- [ ] 変更のあるファイルの一覧が表示される（staged / unstaged / untracked）
- [ ] ファイルを選択すると追加・削除・変更行が色分け表示される

### US-5.3 [Must] コミット作成

個人開発者として、アプリ内からコミットメッセージを入力してコミットを作成したい。なぜなら、コードとドキュメントの変更を一つのコミットとしてまとめて記録したいからだ。

- [ ] ファイルのステージ（add）操作ができる
- [ ] コミットメッセージを入力してコミットを実行できる
- [ ] コミット成功後、変更ファイル一覧がリセットされる

### US-5.4 [Should] コミット履歴閲覧

個人開発者として、コミット履歴を閲覧したい。なぜなら、プロジェクトの変更履歴を振り返り、いつどのような変更があったかを追跡したいからだ。

- [ ] コミット履歴がリスト形式で表示される（メッセージ、作者、日時）
- [ ] コミットを選択すると、そのコミットの変更ファイル・差分が表示される

### US-5.5 [Should] 自動ブランチ管理・マージ

個人開発者として、ブランチの作成・切り替え・マージがバックグラウンドで自動的に管理されてほしい。なぜなら、Gitの複雑な操作を意識せず、普通のアプリのように使いたいからだ。

- [ ] 必要に応じてブランチが自動作成される（エージェントまたはシステムによる）
- [ ] マージが自動で実行される
- [ ] マージ競合が発生した場合にユーザーに通知され、エージェントが自動解決を試みる
- [ ] 開発者向けオプションとして、手動でのブランチ操作も可能

### US-5.6 [Should] .gitignore表示制御

個人開発者として、.gitignoreに基づいてファイルエクスプローラの表示を制御したい。なぜなら、ビルド成果物やnode_modules等の不要なファイルをプロジェクト表示から除外したいからだ。

- [ ] .gitignoreに記載されたパターンに一致するファイル・フォルダがエクスプローラから非表示になる
- [ ] .gitignoreパターンが全文検索（US-4.7）のインデックス対象から除外される
- [ ] .gitignoreパターンがベクトルインデックス（US-4.12）の対象から除外される
- [ ] .gitignoreパターンがAIエージェントのファイル一覧取得（US-3.5）から除外される
- [ ] 非表示/表示の切り替えオプションがある（システム全体で一括、または機能別に個別設定可能）
- [ ] Techtiteが生成するローカル専用データ（生ログ、操作ログ、ベクトルインデックス）が.gitignoreに自動登録される

### US-5.7 [Must] AIからGit操作

AIエージェントとして、Gitの操作（コミット、差分確認等）をプログラム的に実行したい。なぜなら、コードとドキュメントの変更を自動的にバージョン管理したいからだ。

- [ ] API経由でステージ・コミット・差分取得が実行できる
- [ ] API経由でブランチ一覧・現在のブランチを取得できる

### US-5.8 [Must] リモートリポジトリ設定・接続

個人開発者として、リモートリポジトリ（GitHub等）への接続を簡単に設定したい。なぜなら、一度設定すれば自動同期が始まる仕組みにしたいからだ。

- [ ] 設定画面でリモートリポジトリURL・認証情報を設定できる
- [ ] Personal Access Token（PAT）またはSSHキーによる認証設定ができる
- [ ] 接続テスト（疎通確認）ができる
- [ ] 設定完了後、自動同期が即座に有効になる
- [ ] （拡張）GitHub/GitLab等のOAuth認証でワンクリック設定ができる

### US-5.9 [Must] バックグラウンド自動同期（push/pull）

個人開発者として、ファイルの変更がバックグラウンドでリモートリポジトリに自動同期されてほしい。なぜなら、Gitの操作を意識せず、普通のアプリのクラウド同期のように使いたいからだ。

- [ ] 一定時間窓（デフォルト: 5分）内の変更をバッチで1コミットにまとめ、バックグラウンドでcommit + pushが実行される
- [ ] コミットメッセージは Claude Code を使用して変更内容から自動生成する（例:「docs: セッションログ追加, fix: 認証モジュール修正」）。**Claude Code エージェント非稼働時はテンプレートベースで生成する**
- [ ] アプリ起動時にリモートの変更が自動的にpullされる
- [ ] 同期のタイミング（時間窓の長さ/手動のみ）を設定で選択できる
- [ ] 手動コミット（US-5.3）との併用が可能。手動コミットが行われた場合、その時点で自動バッチはリセットされる
- [ ] 自動コミットと手動コミットが履歴上で区別できる（自動コミットにはラベル/プレフィックス付与）

### US-5.10 [Must] 同期状態表示

個人開発者として、同期の状態をステータスバーで確認したい。なぜなら、データが最新の状態に保たれているか安心して作業したいからだ。

- [ ] ステータスバーに同期状態アイコンが表示される（同期中/完了/エラー）
- [ ] 最終同期日時が表示される
- [ ] エラーが発生した場合にエラー詳細を確認できる
- [ ] 手動で「今すぐ同期」ボタンを押して即座に同期を実行できる

### US-5.11 [Must] 競合の検知・通知・手動解決

個人開発者として、同期の競合が発生した場合に通知を受け、簡単な操作で解決したい。なぜなら、Gitのマージ競合を自分で解決する知識がなくても安心して使いたいからだ。

- [ ] ローカルとリモートの変更が競合した場合に、ユーザーに通知される
- [ ] 「ローカル優先/リモート優先」の選択肢がシンプルなUIで提示される
- [ ] 「AIに相談する」ボタンで、エージェントに競合内容の解説と解決提案を求められる
- [ ] バイナリファイルの競合は自動検出され、選択肢（どちらを採用するか）が提示される
- [ ] 競合解決の履歴がログとして保存される

### US-5.12 [Should] 競合のAI自動解決

個人開発者として、同期の競合がエージェントにより自動解決されてほしい。なぜなら、競合のたびに手動で対応するのは煩雑だからだ。

- [ ] テキストファイルの競合に対し、エージェントがコンテキストを理解した上で自動マージを試みる
- [ ] 自動解決できた場合はユーザーに通知のみ表示される（変更内容の差分確認リンク付き）
- [ ] 自動解決の信頼度が低い場合は、手動確認を促す（US-5.11にフォールバック）
- [ ] 大量の競合が同時発生した場合の処理上限（バッチサイズ）が設定可能

---

## 技術仕様

### アーキテクチャ概要

Unit 6 は Git 操作と透過的な自動同期を担当する。git2（libgit2 バインディング）を使用して全 Git 操作を Rust バックエンド内で完結させ、tokio ベースのバックグラウンドスケジューラで自動コミット・プッシュ・プルを実行する。ユーザーは「普通のクラウド同期アプリ」のように Git を意識せず使える設計を目指す。

```
[React コンポーネント]
  GitPanel.tsx
  DiffView.tsx / CommitHistory.tsx / CommitForm.tsx
  SyncStatus.tsx
  ConflictModal.tsx
       │
       ▼
  [git-store (Zustand)]  ←→  [IPC コマンド / イベント]
                                      │
                                      ▼
                              [commands/git.rs]
                              [commands/sync.rs]
                                      │
                          ┌───────────┼───────────┐
                          ▼           ▼           ▼
               [git_service.rs] [sync_service.rs] [conflict_service.rs]
                    │                │                 │
                    ▼                ▼                 ▼
              [git2 (libgit2)]  [tokio scheduler]  [Claude Code SDK]
                                     │              （競合自動解決 /
                                     │               コミットメッセージ生成）
                                     ▼
                              [自動同期ループ]
                              5分間隔（設定可能）
                              batch commit → push → pull
```

**設計原則**:
- 全 Git 操作は git2 crate を通じて Rust 内で実行する。外部の `git` CLI は使用しない（依存関係の削減・クロスプラットフォーム互換性の確保）
- 自動同期は tokio のバックグラウンドタスクとして実行し、UI スレッドをブロックしない
- コミットメッセージ生成は Claude Code SDK が利用可能な場合は AI 生成、非稼働時はテンプレートフォールバック
- 競合検出時は即座にユーザーに通知し、手動解決または AI 自動解決を選択させる

---

### UI 担当領域

モックアップ `techtite_mockup.html` において、Unit 6 が担当する UI 領域は以下の通り。

| UI 領域 | コンポーネント | モックアップ上の位置 |
|---------|--------------|-------------------|
| **Left Sidebar -- Git パネル** | `GitPanel.tsx` | Ribbon の Git アイコンクリックで表示。CHANGES セクション（staged/unstaged/untracked ファイル一覧。各ファイルに M/A ステータスバッジ）+ コミットメッセージ入力 + Commit ボタン + HISTORY セクション |
| **Left Sidebar -- CommitForm** | `CommitForm.tsx` | Git パネル内。コミットメッセージ入力欄 + Commit ボタン。自動生成メッセージの場合はプレースホルダーに候補表示 |
| **Left Sidebar -- CommitHistory** | `CommitHistory.tsx` | Git パネル内 HISTORY セクション。コミットハッシュ・メッセージ・相対時刻のリスト表示 |
| **Center Editor -- DiffView** | `DiffView.tsx` | Git パネルでファイルクリック時にセンター領域に表示。追加行（`.diff-add` 緑）・削除行（`.diff-del` 赤）の色分け差分表示。右端ターミナルの Git Diff タブとも連携 |
| **StatusBar -- ブランチ名** | `SyncStatus.tsx`（一部） | StatusBar 左側。「🌿 main」のようにブランチ名表示 |
| **StatusBar -- 同期状態** | `SyncStatus.tsx` | StatusBar 左側。「Synced」「Syncing...」「Error」アイコン + テキスト。クリックで同期詳細ポップオーバー（最終同期日時・エラー詳細・「今すぐ同期」ボタン） |
| **ConflictModal** | `ConflictModal.tsx` | 競合検出時にモーダルで表示。ファイル名 + 競合種別 + 「Keep Local」「Keep Remote」「Ask AI」ボタン |

---

### 主要ライブラリ・技術

| ライブラリ / 技術 | 用途 | レイヤー |
|------------------|------|---------|
| **git2** (libgit2 バインディング) | 全 Git 操作。リポジトリ操作、ステージング、コミット、差分計算、ブランチ管理、リモート操作（push/pull/fetch） | Rust バックエンド |
| **tokio** | 自動同期スケジューラ。`tokio::time::interval` による定期実行タスク。非同期 Git 操作の並行制御 | Rust バックエンド |
| **@anthropic-ai/claude-code SDK** | コミットメッセージ自動生成（SDK モード）、競合自動解決（テキスト理解ベースのマージ提案） | Rust バックエンド / フロントエンド連携 |
| **serde / serde_json** | Git ステータス・差分・コミット情報の IPC シリアライズ | Rust バックエンド |

---

### Rust バックエンド詳細

#### ファイル構成

| ファイル | 役割 |
|---------|------|
| `src-tauri/src/commands/git.rs` | Git 操作 IPC コマンドハンドラ。`git:get_status`, `git:stage`, `git:unstage`, `git:commit`, `git:get_diff`, `git:get_log`, `git:get_commit_diff`, `git:get_branches`, `git:create_branch`, `git:checkout_branch` |
| `src-tauri/src/commands/sync.rs` | 同期操作 IPC コマンドハンドラ。`sync:get_state`, `sync:trigger_now`, `sync:set_remote`, `sync:test_connection`, `sync:get_conflicts`, `sync:resolve_conflict` |
| `src-tauri/src/services/git_service.rs` | git2 ラッパー。低レベル Git 操作の抽象化。リポジトリ認識、ステータス取得、ステージング、コミット作成、差分計算、ブランチ管理 |
| `src-tauri/src/services/sync_service.rs` | 自動同期スケジューラ。定期的な commit + push + pull ループの管理。認証情報の取得・適用 |
| `src-tauri/src/services/conflict_service.rs` | 競合検出・解決ロジック。3-way マージの解析、ローカル/リモート優先解決、AI 自動解決の判断 |

#### git2 による主要操作

```rust
// git_service.rs 内

/// リポジトリ認識
pub fn open_repo(vault_path: &Path) -> Result<Repository> {
    Repository::discover(vault_path)
        .map_err(|e| format!("Git リポジトリが見つかりません: {}", e))
}

/// ステータス取得
pub fn get_status(repo: &Repository) -> Result<GitStatus> {
    let statuses = repo.statuses(Some(
        StatusOptions::new()
            .include_untracked(true)
            .recurse_untracked_dirs(true)
    ))?;
    // staged / unstaged / untracked に分類
}

/// コミット作成
pub fn create_commit(repo: &Repository, message: &str) -> Result<String> {
    let sig = repo.signature()?;
    let tree_id = repo.index()?.write_tree()?;
    let tree = repo.find_tree(tree_id)?;
    let parent = repo.head()?.peel_to_commit()?;
    let oid = repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &[&parent])?;
    Ok(oid.to_string())
}

/// 差分取得
pub fn get_diff(repo: &Repository, path: Option<&str>, staged: bool) -> Result<Vec<DiffHunk>> {
    let diff = if staged {
        let head_tree = repo.head()?.peel_to_tree()?;
        repo.diff_tree_to_index(Some(&head_tree), None, None)?
    } else {
        repo.diff_index_to_workdir(None, None)?
    };
    // DiffHunk に変換
}

/// リモート push
pub fn push(repo: &Repository, branch: &str, callbacks: RemoteCallbacks) -> Result<()> {
    let mut remote = repo.find_remote("origin")?;
    let refspec = format!("refs/heads/{}:refs/heads/{}", branch, branch);
    remote.push(&[&refspec], Some(PushOptions::new().remote_callbacks(callbacks)))?;
    Ok(())
}

/// リモート pull (fetch + merge)
pub fn pull(repo: &Repository, branch: &str, callbacks: RemoteCallbacks) -> Result<PullResult> {
    // 1. fetch
    let mut remote = repo.find_remote("origin")?;
    remote.fetch(
        &[branch],
        Some(FetchOptions::new().remote_callbacks(callbacks)),
        None,
    )?;

    // 2. merge (fast-forward 可能な場合は fast-forward)
    let fetch_head = repo.find_reference("FETCH_HEAD")?;
    let fetch_commit = repo.reference_to_annotated_commit(&fetch_head)?;
    let (analysis, _) = repo.merge_analysis(&[&fetch_commit])?;

    if analysis.is_fast_forward() {
        // fast-forward merge
    } else if analysis.is_normal() {
        // 通常 merge → 競合の可能性
        // conflict_service に委譲
    }
}
```

#### 自動同期スケジューラ（sync_service.rs）

```rust
/// 自動同期ループ
/// VaultConfig.auto_sync_interval_sec（デフォルト 300 秒 = 5 分）間隔で実行
pub struct SyncScheduler {
    interval: Duration,
    is_running: Arc<AtomicBool>,
    state: Arc<Mutex<SyncState>>,
}

impl SyncScheduler {
    pub async fn start(&self, app_handle: AppHandle) {
        let mut interval = tokio::time::interval(self.interval);
        loop {
            interval.tick().await;
            if !self.is_running.load(Ordering::Relaxed) {
                break;
            }
            self.sync_cycle(&app_handle).await;
        }
    }

    /// 1 回の同期サイクル
    async fn sync_cycle(&self, app_handle: &AppHandle) {
        // 1. 状態を Syncing に更新 → sync:state_changed イベント発火
        self.update_state(SyncStatus::Syncing, app_handle);

        // 2. 変更があればバッチコミット
        let status = git_service::get_status(&self.repo)?;
        if !status.is_clean {
            // ステージング（全変更ファイル）
            git_service::stage_all(&self.repo)?;

            // コミットメッセージ生成
            let message = self.generate_commit_message(&status).await;

            // コミット作成（自動コミットフラグ付き）
            let hash = git_service::create_commit(&self.repo, &message)?;
        }

        // 3. push
        git_service::push(&self.repo, &branch, callbacks)?;

        // 4. pull
        let pull_result = git_service::pull(&self.repo, &branch, callbacks)?;

        // 5. 競合チェック
        if pull_result.has_conflicts {
            // sync:conflict_detected イベント発火
            app_handle.emit("sync:conflict_detected", &conflicts)?;
        }

        // 6. 状態を Completed に更新
        self.update_state(SyncStatus::Completed, app_handle);
    }
}
```

#### コミットメッセージ生成

```rust
// sync_service.rs 内

/// コミットメッセージ生成（US-5.9 準拠）
/// Claude Code 稼働中 → AI 生成、非稼働時 → テンプレートフォールバック
async fn generate_commit_message(&self, status: &GitStatus) -> String {
    // 1. Claude Code SDK が利用可能か確認（agent_registry 経由）
    if let Some(agent) = agent_registry::get_available_sdk_agent().await {
        // Claude Code SDK モードでコミットメッセージ生成
        // 入力: 変更ファイル一覧 + 変更種別サマリー
        // 注意: 差分の全文は送信しない。ファイル名 + 変更種別のみ
        let prompt = format!(
            "以下の変更に対する簡潔な Git コミットメッセージを生成してください。\n\
             Conventional Commits 形式で、日本語の説明を含めてください。\n\
             変更ファイル:\n{}",
            status.format_changes_summary()
        );
        match agent.generate(prompt).await {
            Ok(message) => return message,
            Err(_) => { /* フォールバック */ }
        }
    }

    // 2. テンプレートフォールバック
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M");
    let file_count = status.staged.len() + status.unstaged.len() + status.untracked.len();
    format!("auto: {} {}files changed", now, file_count)
}
```

#### 競合検出・解決（conflict_service.rs）

```rust
// conflict_service.rs 内

/// 競合検出
pub fn detect_conflicts(repo: &Repository) -> Result<Vec<ConflictInfo>> {
    let index = repo.index()?;
    let conflicts = index.conflicts()?;
    conflicts.map(|conflict| {
        let ancestor = conflict.ancestor;   // base (共通祖先)
        let our = conflict.our;             // local
        let their = conflict.their;         // remote
        // 3-way の内容を取得して ConflictInfo を構築
    }).collect()
}

/// 競合解決
pub fn resolve_conflict(
    repo: &Repository,
    path: &str,
    resolution: ConflictResolution,
) -> Result<()> {
    match resolution {
        ConflictResolution::Local => {
            // ローカル版で上書き → ステージ
        }
        ConflictResolution::Remote => {
            // リモート版で上書き → ステージ
        }
        ConflictResolution::Merged { content } => {
            // マージ済みコンテンツで上書き → ステージ
        }
    }
    // コンフリクトマーカーをクリアし、インデックスを更新
}

/// AI 自動解決（US-5.12）
pub async fn ai_resolve_conflict(
    repo: &Repository,
    conflict: &ConflictInfo,
) -> Result<ConflictResolution> {
    // Claude Code SDK モードで 3-way マージを実行
    // 入力: local_content + remote_content + base_content
    // 出力: マージ済みコンテンツ + 信頼度スコア
    // 信頼度が閾値（0.8）未満の場合は手動確認にフォールバック
}
```

#### 認証情報の取得

```rust
// sync_service.rs 内
/// git2 RemoteCallbacks に認証情報を設定
fn build_callbacks(vault_config: &VaultConfig) -> RemoteCallbacks {
    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(|_url, username_from_url, allowed_types| {
        if allowed_types.contains(CredentialType::SSH_KEY) {
            // Unit 9: credential_service 経由で SSH キーパスを取得
            Cred::ssh_key(username, None, key_path, passphrase)
        } else if allowed_types.contains(CredentialType::USER_PASS_PLAINTEXT) {
            // Unit 9: credential_service 経由で PAT を取得
            Cred::userpass_plaintext(username, &pat)
        } else {
            Cred::default()
        }
    });
    callbacks
}
```

---

### フロントエンド詳細

#### ファイル構成

| ファイル | 役割 |
|---------|------|
| `src/features/git/components/GitPanel.tsx` | Git サイドバーパネル。CHANGES セクション（ファイル一覧 + ステージ/アンステージ操作）+ CommitForm + CommitHistory を統合 |
| `src/features/git/components/DiffView.tsx` | 差分表示。追加行（`.diff-add` 緑）、削除行（`.diff-del` 赤）、コンテキスト行の色分け表示。ファイル選択でセンター領域に表示 |
| `src/features/git/components/CommitHistory.tsx` | コミット履歴リスト。ハッシュ・メッセージ・作者・相対時刻。自動コミットにはラベル表示 |
| `src/features/git/components/CommitForm.tsx` | コミットメッセージ入力 + Commit ボタン。AI 生成メッセージの候補をプレースホルダーに表示 |
| `src/features/git/components/SyncStatus.tsx` | StatusBar 用コンポーネント。ブランチ名 + 同期状態アイコン。クリックで詳細ポップオーバー（最終同期日時、エラー詳細、「今すぐ同期」ボタン） |
| `src/features/git/components/ConflictModal.tsx` | 競合解決モーダル。ファイル名 + 競合種別表示 + 「Keep Local」「Keep Remote」「Ask AI」ボタン。AI 解決時は進捗インジケータ表示 |
| `src/stores/git-store.ts` | Zustand ストア。Git ステータス・同期状態・競合情報・コミット履歴の管理 |
| `src/types/git.ts` | `GitStatus`, `FileChange`, `CommitInfo`, `DiffHunk`, `BranchInfo`, `ConflictInfo`, `SyncState` 型定義 |

#### git-store 設計

```typescript
// src/stores/git-store.ts
interface GitStore {
  // Git ステータス
  gitStatus: GitStatus | null;
  isLoading: boolean;

  // 同期状態
  syncState: SyncState;

  // 差分
  currentDiff: DiffHunk[];

  // コミット履歴
  commitHistory: CommitInfo[];

  // ブランチ
  branches: BranchInfo[];
  currentBranch: string;

  // 競合
  conflicts: ConflictInfo[];
  isConflictModalOpen: boolean;

  // アクション
  fetchStatus: () => Promise<void>;
  stageFiles: (paths: string[]) => Promise<void>;
  unstageFiles: (paths: string[]) => Promise<void>;
  commit: (message: string) => Promise<string>;
  fetchDiff: (path?: string, staged?: boolean) => Promise<void>;
  fetchCommitDiff: (hash: string) => Promise<void>;
  fetchLog: (limit?: number) => Promise<void>;
  fetchBranches: () => Promise<void>;
  createBranch: (name: string) => Promise<void>;
  checkoutBranch: (name: string) => Promise<void>;
  triggerSync: () => Promise<void>;
  resolveConflict: (
    path: string, resolution: string, mergedContent?: string
  ) => Promise<void>;
}
```

#### イベント購読

```typescript
// src/features/git/hooks/useGitEvents.ts
export function useGitEvents() {
  const gitStore = useGitStore();

  useEffect(() => {
    // Git ステータス変更
    const unlistenStatus = listenEvent<GitStatus>(
      "git:status_changed",
      (status) => {
        useGitStore.setState({ gitStatus: status });
      },
    );

    // 同期状態変更
    const unlistenSync = listenEvent<SyncState>(
      "sync:state_changed",
      (state) => {
        useGitStore.setState({ syncState: state });
      },
    );

    // 競合検出
    const unlistenConflict = listenEvent<ConflictInfo[]>(
      "sync:conflict_detected",
      (conflicts) => {
        useGitStore.setState({
          conflicts,
          isConflictModalOpen: true,
        });
      },
    );

    return () => {
      unlistenStatus();
      unlistenSync();
      unlistenConflict();
    };
  }, []);
}
```

---

### 公開インターフェース

#### IPC コマンド（Unit 6 が公開）

| コマンド名 | 入力 | 出力 | 説明 |
|-----------|------|------|------|
| `git:get_status` | -- | `GitStatus` | Git ステータス取得（staged/unstaged/untracked） |
| `git:stage` | `{ paths: string[] }` | `void` | 指定ファイルをステージ |
| `git:unstage` | `{ paths: string[] }` | `void` | 指定ファイルのステージ解除 |
| `git:commit` | `{ message: string }` | `string` | コミット作成。ハッシュを返却 |
| `git:get_diff` | `{ path?: string, staged?: boolean }` | `DiffHunk[]` | 差分取得。path 省略で全ファイル、staged で staged/unstaged 切り替え |
| `git:get_log` | `{ limit?: number, offset?: number }` | `CommitInfo[]` | コミット履歴取得 |
| `git:get_commit_diff` | `{ hash: string }` | `DiffHunk[]` | 特定コミットの差分取得 |
| `git:get_branches` | -- | `BranchInfo[]` | ブランチ一覧取得（ahead/behind 含む） |
| `git:create_branch` | `{ name: string }` | `void` | 現在の HEAD からブランチ作成 |
| `git:checkout_branch` | `{ name: string }` | `void` | ブランチ切り替え |
| `sync:get_state` | -- | `SyncState` | 同期状態取得（status, lastSyncAt, errorMessage） |
| `sync:trigger_now` | -- | `void` | 即時同期実行（スケジューラの次回実行を待たず） |
| `sync:set_remote` | `{ url: string, authType: string, credential: string }` | `void` | リモートリポジトリ設定 |
| `sync:test_connection` | -- | `boolean` | リモート接続テスト |
| `sync:get_conflicts` | -- | `ConflictInfo[]` | 未解決の競合一覧取得 |
| `sync:resolve_conflict` | `{ path: string, resolution: string }` | `void` | 競合解決（"local" / "remote" / "merged" + mergedContent） |

#### イベント（Unit 6 が発火）

| イベント名 | ペイロード | 購読先 | 説明 |
|-----------|----------|--------|------|
| `git:status_changed` | `GitStatus` | Unit 6 (UI) | Git ステータス変更通知。コミット後・pull 後・ファイル変更後に発火 |
| `sync:state_changed` | `SyncState` | Unit 6 (UI), Unit 1 (StatusBar) | 同期状態の変更通知。Idle → Syncing → Completed/Error |
| `sync:conflict_detected` | `ConflictInfo[]` | Unit 6 (UI) | 競合検出通知。ConflictModal を表示するトリガー |
| `sync:conflict_resolved` | `{ path: string, resolution: string }` | Unit 6 (UI) | 競合解決完了通知 |

---

### 消費インターフェース

#### IPC コマンド（他ユニットから消費）

| コマンド名 | 提供元 | 用途 |
|-----------|--------|------|
| `vault:get_config` | Unit 1 | 自動同期設定（`auto_sync_enabled`, `auto_sync_interval_sec`）の読み取り |
| `vault:get_current` | Unit 1 | 現在の Vault パス取得（Git リポジトリの探索起点） |
| `credential:list` | Unit 9 | 認証情報（PAT / SSH キー）の取得。git2 の RemoteCallbacks で使用 |
| `agent:list` | Unit 7 | Claude Code エージェントの稼働状態確認（コミットメッセージ AI 生成の判断） |

#### イベント（他ユニットから購読）

| イベント名 | 発火元 | 用途 |
|-----------|--------|------|
| `fs:changed` | Unit 1 (watcher_service) | ファイル変更検出 → Git ステータスの再計算トリガー。`git:status_changed` イベントの再発火 |
| `agent:status_changed` | Unit 7 | エージェント稼働状態の変更 → コミットメッセージ生成方式（AI / テンプレート）の切り替え判断 |

---

### データフロー

#### 1. 手動コミットフロー

```
[ユーザー] GitPanel で変更ファイルを選択 → Stage ボタンクリック
    ↓
[git-store] stageFiles() → IPC: git:stage
    ↓
[commands/git.rs] → git_service.rs → repo.index().add_path()
    ↓
[git_service] git:status_changed イベント発火
    ↓
[ユーザー] CommitForm にメッセージ入力 → Commit ボタンクリック
    ↓
[git-store] commit() → IPC: git:commit
    ↓
[commands/git.rs] → git_service.rs → repo.commit()
    ↓
[git_service] git:status_changed イベント発火（ステータスリセット）
    ↓
[sync_service] 手動コミット検出 → 自動同期バッチをリセット
```

#### 2. 自動同期フロー

```
[sync_service] tokio::time::interval が tick
    ↓
[sync_service] sync:state_changed (status: "syncing") イベント発火
    ↓
[SyncStatus.tsx] StatusBar 表示を「Syncing...」に更新
    ↓
[sync_service] git_service::get_status() で変更チェック
    ↓
（変更あり）
[sync_service] git_service::stage_all() → 全変更をステージ
    ↓
[sync_service] generate_commit_message() → AI 生成 or テンプレート
    ↓
[sync_service] git_service::create_commit() → 自動コミット作成（is_auto_commit: true）
    ↓
[sync_service] git_service::push() → リモートに push
    ↓
[sync_service] git_service::pull() → リモートから pull
    ↓
（競合なし）
[sync_service] sync:state_changed (status: "completed", lastSyncAt: now) イベント発火
    ↓
[SyncStatus.tsx] StatusBar 表示を「Synced」に更新
```

#### 3. 競合検出・解決フロー

```
[sync_service] git_service::pull() 実行中に競合検出
    ↓
[conflict_service] detect_conflicts() → ConflictInfo[] 構築
    ↓
[sync_service] sync:conflict_detected イベント発火
    ↓
[ConflictModal.tsx] 競合モーダル表示（ファイル名 + 選択肢）
    ↓
[ユーザー] 「Keep Local」選択
    ↓
[git-store] resolveConflict(path, "local") → IPC: sync:resolve_conflict
    ↓
[conflict_service] resolve_conflict(Local) → ローカル版で上書き + ステージ
    ↓
[sync_service] sync:conflict_resolved イベント発火
    ↓
[ConflictModal.tsx] モーダルクローズ

--- または AI 自動解決の場合 ---

[ユーザー] 「Ask AI」選択
    ↓
[git-store] → IPC: sync:resolve_conflict (resolution: "ai")
    ↓
[conflict_service] ai_resolve_conflict()
    → Claude Code SDK で 3-way マージ実行
    ↓
（信頼度 >= 0.8）
[conflict_service] resolve_conflict(Merged { content })
    → マージ済みコンテンツで上書き
    ↓
[sync_service] sync:conflict_resolved イベント発火 + Toast 通知
    ↓
（信頼度 < 0.8）
[conflict_service] → 手動確認フォールバック。マージ提案を DiffView で表示
```

---

### パフォーマンス要件

| 指標 | 目標値 | ベースライン条件 |
|------|--------|----------------|
| **Git ステータス取得** | **< 500ms** | 10,000 ファイル規模の Vault |
| **差分計算** | **< 1秒** | 単一ファイルの差分表示 |
| **コミット作成** | **< 1秒** | 50 ファイル以下のステージ済み変更 |
| **push/pull** | **ネットワーク依存** | ネットワークオーバーヘッド除く処理自体は < 2秒 |
| **自動同期サイクル全体** | **< 10秒** | 通常の変更量（1-20 ファイル）の場合 |
| **コミットメッセージ AI 生成** | **< 5秒** | Claude Code SDK 応答時間。タイムアウト 10秒でテンプレートフォールバック |
| **競合検出** | **< 500ms** | pull 後の競合チェック |
| **AI 自動解決** | **< 15秒** | 単一ファイルの 3-way マージ。タイムアウト 30秒で手動フォールバック |

---

### 制約・注意事項

1. **git2 と外部 `git` CLI の非互換**: git2 は libgit2 ベースであり、外部の `git` CLI とは内部実装が異なる。特に SSH 認証（`ssh-agent` 連携）やカスタムフック（`.git/hooks/`）の挙動に差異がある可能性がある。MVP では PAT 認証を優先し、SSH 認証はベストエフォートとする
2. **自動コミットと手動コミットの共存**: 手動コミット（US-5.3）が行われた場合、自動同期のバッチコミットタイマーをリセットする。手動コミットは `is_auto_commit: false` フラグで区別し、コミット履歴上で視覚的に区別可能にする（自動コミットには `[auto]` プレフィックス）
3. **コミットメッセージのプライバシー**: US-5.9 の要件に基づき、差分・変更内容の全文は外部 LLM / 外部サービスに送信しない。Claude Code SDK にはファイル名 + 変更種別（追加/変更/削除）のサマリーのみを送信する。テンプレートフォールバック時は完全にオフラインで生成する
4. **大規模リポジトリの制約**: git2 の `statuses()` は大規模リポジトリで遅延する可能性がある。`.gitignore` の適用を徹底し、`node_modules/` 等の大量ファイルを含むディレクトリを除外する。必要に応じてステータスキャッシュ機構を実装する
5. **競合解決の処理上限**: US-5.12 に基づき、大量の競合が同時発生した場合のバッチサイズ上限を設定する（デフォルト: 10 ファイル）。上限を超えた場合は最初の N ファイルのみ AI 解決を試み、残りは手動解決を促す
6. **認証情報管理**: Git リモートの認証情報は Unit 9 の `credential_service`（OS キーチェーン経由）から取得する。Unit 6 は認証情報を直接保管しない。認証失敗時はユーザーに再設定を促す通知を表示する
7. **`.techtite/` の .gitignore 自動登録**: Vault オープン時に `.gitignore` に `.techtite/` が含まれているか確認し、なければ自動追加する。これにより、メタデータ DB・検索インデックス・ベクトルインデックス・生ログが Git 同期対象外となる
8. **ブランチ操作の安全性**: `git:checkout_branch` は未コミットの変更がある場合にエラーを返す。ユーザーにコミットまたはスタッシュを促す。自動同期中のブランチ切り替えは排他制御（Mutex）で競合を防ぐ
