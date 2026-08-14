-- ユーザー
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github_id TEXT UNIQUE NOT NULL,
  github_username TEXT NOT NULL,
  avatar_url TEXT,
  github_access_token TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Webアプリ
CREATE TABLE IF NOT EXISTS apps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  site_url TEXT,
  github_url TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  thumbnail_type TEXT DEFAULT 'auto',
  is_private INTEGER NOT NULL DEFAULT 0 CHECK (is_private IN (0, 1)),
  category TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'prototype', 'idea')),
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 技術スタック
CREATE TABLE IF NOT EXISTS tech_stacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  color TEXT
);

-- アプリと技術の関連
CREATE TABLE IF NOT EXISTS app_tech (
  app_id INTEGER NOT NULL,
  tech_id INTEGER NOT NULL,
  usage_role TEXT,
  PRIMARY KEY (app_id, tech_id),
  FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE,
  FOREIGN KEY (tech_id) REFERENCES tech_stacks(id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_apps_user_id ON apps(user_id);
CREATE INDEX IF NOT EXISTS idx_apps_visibility ON apps(is_private, user_id);
CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category);
CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);
CREATE INDEX IF NOT EXISTS idx_app_tech_app_id ON app_tech(app_id);
CREATE INDEX IF NOT EXISTS idx_app_tech_tech_id ON app_tech(tech_id);
