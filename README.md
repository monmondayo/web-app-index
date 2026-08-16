# Web App Catalog

自作Webアプリのカタログ一覧サイト。GitHub リポジトリから技術スタックを自動検出し、アイコン付きで視覚的に表示するダッシュボード。

## Tech Stack

- **Framework**: Astro 7 (SSR)
- **UI**: Preact Islands + Tailwind CSS
- **Hosting**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **画像保存**: Cloudflare R2
- **認証**: GitHub OAuth + JWT Cookie
- **Tech Icons**: [Simple Icons](https://simpleicons.org/) CDN
- **サムネイル**: [thum.io](https://www.thum.io/) (自動取得)

## 機能

- GitHub OAuth ログイン
- 公開／Privateアプリの登録（Privateでも概要・サムネイル・紹介動画・技術構成は公開し、サイト／リポジトリリンクは所有者のログイン中のみ表示）
- 公開 GitHub リポジトリからの技術スタック検出（非公開リポジトリ対応は明示的な設定時のみ）
- 目的別カテゴリーと公開状態によるライブラリ型ナビゲーション
- リスト表示、横断検索、技術構成の展開表示
- 技術の役割・説明・採用アプリを確認できる技術カタログ
- アプリの CRUD (追加・編集・削除)
- リポジトリURLは GitHub と Hugging Face (Spaces / Models / Datasets) に対応
- GitHub URL から技術スタックを自動検出 (package.json, requirements.txt, go.mod, Cargo.toml, README.md, Dockerfile)
- 登録・更新時に技術スタックの利用用途 (usage_role) を自動付与
- サムネイル自動取得 (thum.io) または手動アップロード (R2)
- YouTube公開・限定公開URLによる紹介動画（詳細ページでサムネイルと切り替えて再生・停止・シーク）
- 技術スタックのカテゴリ別フィルター・検索付きセレクター
- レスポンシブ 3 列グリッドレイアウト

## セットアップ

### 前提条件

- Node.js 22.19+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- GitHub OAuth App ([作成手順](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app))

### GitHub OAuth App の登録

[GitHub OAuth App 作成ページ](https://github.com/settings/applications/new) で以下を入力:

| フィールド | 値 |
|-----------|-----|
| Application name | `Web App Catalog` (任意) |
| Homepage URL | `http://localhost:4321` |
| Authorization callback URL | `http://localhost:4321/api/auth/callback` |
| Enable Device Flow | チェック不要 (ブラウザリダイレクト方式を使うため) |

既定では GitHub の `read:user` スコープだけを要求し、公開リポジトリを対象にします。非公開リポジトリも検出する場合だけ `GITHUB_ENABLE_PRIVATE_REPOS=true` を設定してください。この場合は広範な `repo` スコープを要求し、アクセストークンを `JWT_SECRET` から導出した鍵で暗号化して D1 に保存します。可能なら将来は、対象リポジトリを限定できる GitHub App へ移行してください。

以前のバージョンで `repo` を許可済みの場合、設定を `false` にしただけではGitHub側の許可は縮小されません。GitHubの Settings → Applications → Authorized OAuth Apps で本アプリの許可を一度取り消し、再ログインしてください。再ログイン時にD1上の旧アクセストークンも削除されます。

本番デプロイ後は Homepage URL と callback URL を実際の `workers.dev` またはカスタムドメインに変更する。

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Cloudflare リソース作成

`wrangler` コマンドはグローバルインストールしていない場合、`npx` を付けて実行できます。

```bash
# D1 データベース
npx wrangler d1 create web-app-index-db

# R2 バケット
npx wrangler r2 bucket create web-app-index-thumbnails
```

`wrangler.toml` の `database_id` を実際の ID に置き換える。

### 3. 環境変数の設定

シークレット情報は `.dev.vars` に記載する（`.gitignore` 対象のため git にコミットされない）。
`SITE_URL` はシークレットではないので `wrangler.toml` の `[vars]` に記載します。初回デプロイ後、実際の `workers.dev` またはカスタムドメインに置き換えてください。

`.dev.vars` を作成:

```
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
JWT_SECRET=your_random_secret_string
GITHUB_ENABLE_PRIVATE_REPOS=false
```

`JWT_SECRET` は以下のコマンドでランダム生成できる:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

GitHub OAuth App の callback URL は `http://localhost:4321/api/auth/callback` に設定する。

### セキュリティ上の既定値

- セッションCookieとOAuth state Cookieは本番HTTPS環境で `Secure`、常に `HttpOnly` / `SameSite=Lax` です。
- 手動アップロードは管理者限定で、PNG/JPEG/GIF/WebPの実ファイル署名を検証します。SVGや拡張子偽装は拒否します。
- 非公開リポジトリへのアクセスは既定で無効です。

### 4. データベース初期化

```bash
npm run db:init   # スキーマ適用
npm run db:seed   # 技術スタック初期データ投入 (60+件)
```

すでにデータベースを作成済みの場合は、代わりに一度だけマイグレーションを適用する:

```bash
npm run db:migrate:private
```

ライブラリ型ナビゲーション導入前の既存DBには、続けて次のマイグレーションも適用する:

```bash
npm run db:migrate:library
```

紹介動画対応前の既存DBには、続けて次のマイグレーションも適用する:

```bash
npm run db:migrate:video
```

### 5. 開発サーバー起動

```bash
npm run dev
```

http://localhost:4321 で開く。

## デプロイ

```bash
npm run deploy
```

Astro 7のCloudflare adapterはCloudflare Pagesをサポートしないため、Cloudflare Workersへデプロイします。`astro build` が生成するWorkers設定をWranglerが自動的に使用し、Astroセッション用KVも初回デプロイ時に作成します。

Git連携では、Cloudflare Dashboardの **Workers & Pages → Create application → Import a repository** からこのリポジトリをWorkersとして接続し、次を設定します。

| 設定 | 値 |
|------|----|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Node.js | `.node-version`により`22.19.0` |

Workers側のデプロイ成功を確認してから、旧Pagesプロジェクトの自動デプロイを無効化してください。

### 本番環境の初期設定

初回デプロイ後、以下の設定が必要です。

#### 1. シークレット環境変数

```bash
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put JWT_SECRET
```

#### 2. SITE_URL の設定

Cloudflare Dashboard → Workers & Pages → `web-app-index` → Settings → Variables and Secrets で:

- `SITE_URL` = 実際の `https://web-app-index.<subdomain>.workers.dev` またはカスタムドメイン

#### 3. D1・R2 バインディング

`wrangler.toml` に以下のWorkers bindingsを定義済みです。Workersへ初回デプロイすると適用されます。

| 種類 | 変数名 | リソース |
|------|--------|----------|
| D1 database | `DB` | `web-app-index-db` |
| R2 bucket | `R2` | `web-app-index-thumbnails` |

#### 4. 本番 D1 にスキーマ・データ投入

```bash
npx wrangler d1 execute web-app-index-db --remote --file=schema.sql
npx wrangler d1 execute web-app-index-db --remote --file=seed.sql
```

既存の本番データベースには、デプロイ前に次のマイグレーションを一度だけ適用する:

```bash
npx wrangler d1 execute web-app-index-db --remote --file=migrations/0001_private_apps.sql
```

ライブラリ型ナビゲーション用のカテゴリーとステータスを追加する:

```bash
npx wrangler d1 execute web-app-index-db --remote --file=migrations/0002_library_navigation.sql
```

紹介動画URLを保存するカラムを追加する:

```bash
npx wrangler d1 execute web-app-index-db --remote --file=migrations/0004_app_video.sql
```

`--remote` を付けることで本番の D1 に対して実行されます。

#### 5. GitHub OAuth の callback URL 追加

GitHub の OAuth App 設定で本番用の callback URL を追加:

- `<SITE_URL>/api/auth/callback`

設定完了後、再デプロイしてください。

## プロジェクト構成

```
src/
├── components/
│   ├── AddAppDialog.tsx   # アプリ追加/編集ダイアログ (Preact)
│   ├── TechSelector.tsx   # 技術選択UI (Preact)
│   ├── AppCard.astro      # アプリカード
│   ├── TechBadge.astro    # 技術アイコンバッジ
│   └── Header.astro       # ヘッダー
├── layouts/
│   └── Layout.astro
├── lib/
│   ├── db.ts              # D1 ヘルパー
│   ├── auth.ts            # JWT 認証
│   ├── tech-detector.ts   # GitHub からの技術検出
│   ├── repository.ts      # リポジトリURL(GitHub/Hugging Face)の検証・表示ラベル
│   ├── video.ts           # YouTube URLの検証・埋め込みURL生成
│   └── icons.ts           # Simple Icons マッピング
├── pages/
│   ├── index.astro        # カタログ一覧
│   ├── app/[id].astro     # アプリ詳細
│   ├── r2/[...path].ts   # R2 画像配信プロキシ
│   └── api/
│       ├── apps.ts        # CRUD API (登録時 usage_role 自動検出)
│       ├── tech.ts        # 技術一覧
│       ├── detect-tech.ts # 技術自動検出 (GitHub のみ)
│       ├── upload.ts      # サムネイルアップロード → R2
│       └── auth/          # GitHub OAuth
└── styles/
    └── global.css
```

## npm scripts

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー |
| `npm run build` | ビルド |
| `npm run preview` | Wrangler でローカルプレビュー |
| `npm run deploy` | Workersへビルド・デプロイ |
| `npm run db:init` | D1 にスキーマ適用 |
| `npm run db:migrate:private` | 既存のローカル D1 に非公開アプリ対応のマイグレーションを適用 |
| `npm run db:migrate:library` | 既存のローカル D1 にカテゴリー・ステータスを追加 |
| `npm run db:migrate:tech` | 技術未登録アプリへ検出済みの技術構成を補完 |
| `npm run db:migrate:video` | 既存DBに紹介動画URLカラムを追加 |
| `npm run db:seed` | 技術スタック初期データ投入 |
