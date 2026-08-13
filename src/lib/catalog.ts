export const APP_CATEGORIES = {
  maps: {
    label: '地図・移動',
    shortLabel: '地図',
    description: '位置情報、ルート、移動データを扱うアプリ',
    icon: 'map',
    accent: 'sky',
  },
  creative: {
    label: 'クリエイティブ',
    shortLabel: '制作',
    description: '画像、動画、音楽などを制作・編集するアプリ',
    icon: 'palette',
    accent: 'fuchsia',
  },
  ai: {
    label: 'AI・自動化',
    shortLabel: 'AI',
    description: '生成AIや自動処理を活用したアプリ',
    icon: 'sparkles',
    accent: 'violet',
  },
  simulation: {
    label: 'シミュレーション',
    shortLabel: '体験',
    description: '体験、学習、現象再現を目的としたアプリ',
    icon: 'orbit',
    accent: 'amber',
  },
  utility: {
    label: 'ライフ・ツール',
    shortLabel: 'ツール',
    description: '日常の記録や計算を便利にするアプリ',
    icon: 'wrench',
    accent: 'emerald',
  },
  dev: {
    label: '開発・管理',
    shortLabel: '開発',
    description: '開発活動やプロジェクトを支えるアプリ',
    icon: 'code',
    accent: 'indigo',
  },
  other: {
    label: 'その他',
    shortLabel: 'その他',
    description: 'まだ分類されていないアプリ',
    icon: 'boxes',
    accent: 'slate',
  },
} as const;

export type AppCategory = keyof typeof APP_CATEGORIES;

export const APP_STATUSES = {
  live: { label: '公開中', description: '現在利用できるアプリ' },
  prototype: { label: '試作中', description: '開発・検証中のアプリ' },
  idea: { label: '構想中', description: 'これから制作するアイデア' },
} as const;

export type AppStatus = keyof typeof APP_STATUSES;

export function isAppCategory(value: unknown): value is AppCategory {
  return typeof value === 'string' && value in APP_CATEGORIES;
}

export function isAppStatus(value: unknown): value is AppStatus {
  return typeof value === 'string' && value in APP_STATUSES;
}

export const TECH_CATEGORY_ROLES: Record<string, { label: string; description: string }> = {
  frontend: { label: '画面・操作', description: 'ユーザーが見る画面と操作体験をつくる' },
  backend: { label: 'サーバー処理', description: 'データ処理やアプリの裏側の動作を担当する' },
  database: { label: 'データ保存', description: 'アプリの情報を保存し、必要なときに取り出す' },
  infrastructure: { label: '公開・運用', description: 'アプリをインターネットへ公開し安定稼働させる' },
  library: { label: '専門機能', description: '地図、3D、グラフなど特定の機能を追加する' },
  other: { label: '開発支援', description: '品質管理や開発作業を効率化する' },
};

export function getTechRole(category: string, usageRole?: string | null): string {
  return usageRole || TECH_CATEGORY_ROLES[category]?.label || TECH_CATEGORY_ROLES.other.label;
}
