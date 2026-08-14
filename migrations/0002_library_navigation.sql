-- Add purpose-based navigation and lifecycle status to existing app records.
ALTER TABLE apps ADD COLUMN category TEXT NOT NULL DEFAULT 'other';
ALTER TABLE apps ADD COLUMN status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'prototype', 'idea'));

CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category);
CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);

UPDATE apps SET category = 'maps'
WHERE title IN (
  'RouteLoop',
  '訪問地マッパー (Google Timeline Location Mapper)',
  'GPX Viewer',
  '名古屋マップ',
  '愛知県犯罪統計データ',
  '特異地点マップDB検索Viewer'
);

UPDATE apps SET category = 'creative'
WHERE title IN ('サムネイル画像編集アプリ', '画像タイリングツール', 'Local Masking Tool', 'FlexiFocusCAM');

UPDATE apps SET category = 'ai'
WHERE title IN (
  '名古屋ばえスカウター (NAGOYA VIBE CHECK)',
  'ACE-Step 1.5 — Music Generator',
  '自動BGM作成（３モデル）',
  'Youtubeショート動画作成',
  'Chapter Craft',
  'AutoBGM Cloud'
);

UPDATE apps SET category = 'simulation'
WHERE title IN ('【未作成】自動運転シミュレータ', '花火制作シミュレーター', '花火師体験シミュレータ', 'traffic-flow-sim');

UPDATE apps SET category = 'utility'
WHERE title IN ('腕時計トラッキング', '実質タダ電卓（Nagoya Vibe Edition）', 'ライフログ管理');

UPDATE apps SET category = 'dev'
WHERE title = 'Web App Catalog';

UPDATE apps SET status = 'idea'
WHERE title LIKE '%未作成%' OR (site_url IS NULL AND github_url IS NULL);

UPDATE apps SET status = 'prototype'
WHERE status = 'live' AND site_url IS NULL AND github_url IS NOT NULL;
