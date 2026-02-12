# Web App Catalog

自作Webアプリのカタログ一覧サイト。GitHub リポジトリから技術スタックを自動検出し、アイコン付きで視覚的に表示するダッシュボード。

## Tech Stack

- **Framework**: Astro 5 (SSR)
- **UI**: Preact Islands + Tailwind CSS
- **Hosting**: Cloudflare Pages
- **Database**: Cloudflare D1 (SQLite)
- **画像保存**: Cloudflare R2
- **認証**: GitHub OAuth + JWT Cookie
- **Tech Icons**: [Simple Icons](https://simpleicons.org/) CDN
- **サムネイル**: [thum.io](https://www.thum.io/) (自動取得)

## 機能

- GitHub OAuth ログイン
- アプリの CRUD (追加・編集・削除)
- GitHub URL から技術スタックを自動検出 (package.json, requirements.txt, go.mod, Cargo.toml, README.md, Dockerfile)
- 登録・更新時に技術スタックの利用用途 (usage_role) を自動付与
- サムネイル自動取得 (thum.io) または手動アップロード (R2)
- 技術スタックのカテゴリ別フィルター・検索付きセレクター
- レスポンシブ 3 列グリッドレイアウト

## セットアップ

### 前提条件

- Node.js 18+
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

本番デプロイ後は Homepage URL と callback URL を `https://your-app.pages.dev` に変更する。

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
`SITE_URL` はシークレットではないので `wrangler.toml` の `[vars]` に記載済み。

`.dev.vars` を作成:

```
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
JWT_SECRET=your_random_secret_string
```

`JWT_SECRET` は以下のコマンドでランダム生成できる:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

GitHub OAuth App の callback URL は `http://localhost:4321/api/auth/callback` に設定する。

### 4. データベース初期化

```bash
npm run db:init   # スキーマ適用
npm run db:seed   # 技術スタック初期データ投入 (60+件)
```

### 5. 開発サーバー起動

```bash
npm run dev
```

http://localhost:4321 で開く。

## デプロイ

```bash
npm run build
npx wrangler pages deploy
```

`wrangler.toml` の `pages_build_output_dir = "dist"` により、出力ディレクトリの指定は不要です。

### 本番環境の初期設定

初回デプロイ後、以下の設定が必要です。

#### 1. シークレット環境変数

```bash
npx wrangler pages secret put GITHUB_CLIENT_ID
npx wrangler pages secret put GITHUB_CLIENT_SECRET
npx wrangler pages secret put JWT_SECRET
```

#### 2. SITE_URL の設定

Cloudflare Dashboard → Pages → `web-app-index` → Settings → Environment variables で:

- `SITE_URL` = `https://web-app-index.pages.dev`（本番のURL）

#### 3. D1・R2 バインディング

Dashboard → Pages → `web-app-index` → Settings → Functions → Bindings で:

| 種類 | 変数名 | リソース |
|------|--------|----------|
| D1 database | `DB` | `web-app-index-db` |
| R2 bucket | `R2` | `web-app-index-thumbnails` |

#### 4. 本番 D1 にスキーマ・データ投入

```bash
npx wrangler d1 execute web-app-index-db --remote --file=schema.sql
npx wrangler d1 execute web-app-index-db --remote --file=seed.sql
```

`--remote` を付けることで本番の D1 に対して実行されます。

#### 5. GitHub OAuth の callback URL 追加

GitHub の OAuth App 設定で本番用の callback URL を追加:

- `https://web-app-index.pages.dev/api/auth/callback`

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
│   └── icons.ts           # Simple Icons マッピング
├── pages/
│   ├── index.astro        # カタログ一覧
│   ├── app/[id].astro     # アプリ詳細
│   ├── r2/[...path].ts   # R2 画像配信プロキシ
│   └── api/
│       ├── apps.ts        # CRUD API (登録時 usage_role 自動検出)
│       ├── tech.ts        # 技術一覧
│       ├── detect-tech.ts # 技術自動検出
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
| `npm run db:init` | D1 にスキーマ適用 |
| `npm run db:seed` | 技術スタック初期データ投入 |
