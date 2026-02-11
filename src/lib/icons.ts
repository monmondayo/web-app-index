// Dynamic import of simple-icons to get SVG paths
// Simple Icons provides brand SVGs with slug-based lookup

export function getTechIconSvg(slug: string, color: string | null): string {
  // Use Simple Icons CDN for SVG
  // Format: https://cdn.simpleicons.org/{slug}/{color}
  const hexColor = color || '000000';
  return `https://cdn.simpleicons.org/${slug}/${hexColor}`;
}

export function getTechIconUrl(slug: string): string {
  return `https://cdn.simpleicons.org/${slug}`;
}

// Category labels in Japanese
export const CATEGORY_LABELS: Record<string, string> = {
  frontend: 'フロントエンド',
  backend: 'バックエンド',
  database: 'データベース',
  infrastructure: 'インフラ',
  library: 'ライブラリ',
  other: 'その他',
};

// Category colors for badge backgrounds
export const CATEGORY_COLORS: Record<string, string> = {
  frontend: 'bg-blue-100 text-blue-800',
  backend: 'bg-green-100 text-green-800',
  database: 'bg-purple-100 text-purple-800',
  infrastructure: 'bg-orange-100 text-orange-800',
  library: 'bg-pink-100 text-pink-800',
  other: 'bg-gray-100 text-gray-800',
};

// Category dot colors for legend
export const CATEGORY_DOT_COLORS: Record<string, string> = {
  frontend: 'bg-blue-400',
  backend: 'bg-green-400',
  database: 'bg-purple-400',
  infrastructure: 'bg-orange-400',
  library: 'bg-pink-400',
  other: 'bg-gray-400',
};

// Short descriptions for each tech
export const TECH_DESCRIPTIONS: Record<string, string> = {
  'React': 'Meta製のUIライブラリ。コンポーネントベースで宣言的なUI構築が可能',
  'Vue.js': 'プログレッシブJSフレームワーク。段階的に採用でき学習コストが低い',
  'Svelte': 'コンパイル時にフレームワークコードを除去する軽量UIフレームワーク',
  'Astro': 'コンテンツ重視の静的サイトフレームワーク。アイランドアーキテクチャ採用',
  'Angular': 'Google製のフルスタックフレームワーク。大規模アプリ向け',
  'Next.js': 'React用フルスタックフレームワーク。SSR/SSG/ISRをサポート',
  'Nuxt.js': 'Vue.js用フルスタックフレームワーク。SSR/SSGをサポート',
  'SvelteKit': 'Svelte用フルスタックフレームワーク。ファイルベースルーティング',
  'Preact': 'React互換の軽量代替ライブラリ。わずか3kBのサイズ',
  'Solid': '仮想DOMを使わないリアクティブUIライブラリ。高パフォーマンス',
  'HTML5': 'Webページの構造を定義するマークアップ言語の最新規格',
  'CSS3': 'Webページのスタイルを定義するスタイルシート言語',
  'Tailwind CSS': 'ユーティリティファーストのCSSフレームワーク',
  'Bootstrap': '最も普及したCSSフレームワーク。レスポンシブデザイン対応',
  'TypeScript': 'JavaScriptに静的型付けを追加した言語。型安全性を提供',
  'JavaScript': 'Webブラウザで動作するプログラミング言語。Web開発の基盤',
  'Vite': '高速な開発サーバーとビルドツール。ESモジュールベース',
  'Webpack': '広く使われているモジュールバンドラー',
  'Node.js': 'サーバーサイドJavaScript実行環境',
  'Python': '汎用プログラミング言語。AI/ML・Web・スクリプトに幅広く利用',
  'Go': 'Google製の静的型付け言語。並行処理とシンプルさが特徴',
  'Rust': 'メモリ安全性を保証するシステムプログラミング言語',
  'Ruby': '生産性を重視した動的プログラミング言語',
  'PHP': 'Web開発に広く使われるサーバーサイド言語',
  'Java': 'エンタープライズで広く使われるオブジェクト指向言語',
  'Express': 'Node.js用の軽量Webフレームワーク',
  'FastAPI': 'Python用の高速Web APIフレームワーク。型ヒントベース',
  'Django': 'Python用フルスタックWebフレームワーク。バッテリー同梱',
  'Flask': 'Python用の軽量Webフレームワーク',
  'Rails': 'Ruby用フルスタックWebフレームワーク。CoC原則',
  'Hono': '軽量・高速なEdge向けWebフレームワーク',
  'Deno': 'Node.jsの後継を目指すJavaScript/TypeScript実行環境',
  'Bun': '高速なJavaScript実行環境・パッケージマネージャー・バンドラー',
  'PostgreSQL': '高機能なオープンソースRDBMS',
  'MySQL': '世界で最も普及したオープンソースRDBMS',
  'SQLite': '軽量な組み込み型RDBMS。サーバー不要',
  'MongoDB': 'ドキュメント指向のNoSQLデータベース',
  'Redis': 'インメモリKVS。キャッシュやセッション管理に利用',
  'Supabase': 'Firebase代替のオープンソースBaaS。PostgreSQLベース',
  'Firebase': 'Google製のBaaS。認証・DB・ホスティングを統合提供',
  'Prisma': 'TypeScript向けの型安全なORM',
  'Drizzle': '軽量でTypeScriptファーストなORM',
  'Docker': 'コンテナ型仮想化プラットフォーム',
  'AWS': 'Amazon提供の包括的クラウドサービス',
  'Cloudflare': 'CDN・DNS・エッジコンピューティングプラットフォーム',
  'Vercel': 'フロントエンド向けデプロイプラットフォーム',
  'Netlify': '静的サイト・サーバーレス向けホスティング',
  'GitHub Actions': 'GitHub統合のCI/CDプラットフォーム',
  'Terraform': 'IaCツール。インフラをコードで宣言的に管理',
  'Nginx': '高性能なWebサーバー・リバースプロキシ',
  'Three.js': 'WebGLベースの3Dグラフィックスライブラリ',
  'D3.js': 'データ駆動のドキュメント操作・可視化ライブラリ',
  'Leaflet': '軽量なインタラクティブ地図ライブラリ',
  'MapLibre': 'MapboxGL互換のオープンソース地図ライブラリ',
  'OpenLayers': '高機能なWeb地図ライブラリ',
  'Chart.js': 'シンプルなHTML5チャートライブラリ',
  'Puppeteer': 'Chromeを操作するNode.js用ブラウザ自動化ライブラリ',
  'Playwright': 'クロスブラウザ対応のE2Eテスト・自動化ライブラリ',
  'GraphQL': 'API用クエリ言語。必要なデータだけ取得可能',
  'OpenAPI': 'REST APIの仕様を記述する標準フォーマット',
  'WebSocket': 'リアルタイム双方向通信プロトコル',
  'Markdown': '軽量マークアップ言語。テキストを構造化して記述',
  'ESLint': 'JavaScript/TypeScript用の静的解析・リントツール',
  'Prettier': 'コードフォーマッター。統一されたコードスタイルを自動適用',
};
