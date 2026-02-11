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
npx wrangler deploy
```

`wrangler.toml` に `pages_build_output_dir = "dist"` が設定されているため、`npx wrangler deploy` だけでPages にデプロイされます。

本番環境の環境変数は Cloudflare Dashboard または `wrangler secret put` で設定する。

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
│   └── api/
│       ├── apps.ts        # CRUD API
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
