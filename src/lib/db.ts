type D1Database = import('@cloudflare/workers-types').D1Database;
import type { AppCategory, AppStatus } from './catalog';

export interface App {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  site_url: string | null;
  github_url: string | null;
  thumbnail_url: string | null;
  thumbnail_type: string;
  is_private: number;
  category: AppCategory;
  status: AppStatus;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface AppWithTech extends App {
  tech_stacks: TechStack[];
  /** True when private links are hidden from the current viewer. */
  is_locked: boolean;
}

export interface TechStack {
  id: number;
  name: string;
  slug: string;
  category: string;
  color: string | null;
  usage_role?: string | null;
}

export interface User {
  id: number;
  github_id: string;
  github_username: string;
  avatar_url: string | null;
  github_access_token: string | null;
  created_at: string;
}

export async function getApps(db: D1Database, viewerUserId?: number): Promise<AppWithTech[]> {
  // Private apps keep their catalog summary public. Sensitive links are
  // redacted below unless the viewer owns the app.
  const apps = await db.prepare(
    'SELECT * FROM apps ORDER BY display_order ASC, updated_at DESC'
  ).all<App>();

  if (!apps.results.length) return [];

  const appIds = apps.results.map((a) => a.id);
  const placeholders = appIds.map(() => '?').join(',');
  const techRows = await db.prepare(
    `SELECT at.app_id, at.usage_role, ts.* FROM app_tech at
     JOIN tech_stacks ts ON at.tech_id = ts.id
     WHERE at.app_id IN (${placeholders})`
  ).bind(...appIds).all<TechStack & { app_id: number; usage_role: string | null }>();

  const techMap = new Map<number, TechStack[]>();
  for (const row of techRows.results) {
    const list = techMap.get(row.app_id) || [];
    list.push({ id: row.id, name: row.name, slug: row.slug, category: row.category, color: row.color, usage_role: row.usage_role });
    techMap.set(row.app_id, list);
  }

  return apps.results.map((app) => redactPrivateLinks(app, techMap.get(app.id) || [], viewerUserId));
}

export async function getAppById(db: D1Database, id: number, viewerUserId?: number): Promise<AppWithTech | null> {
  const app = await db.prepare('SELECT * FROM apps WHERE id = ?').bind(id).first<App>();
  if (!app) return null;

  const techRows = await db.prepare(
    `SELECT ts.*, at.usage_role FROM app_tech at
     JOIN tech_stacks ts ON at.tech_id = ts.id
     WHERE at.app_id = ?`
  ).bind(id).all<TechStack>();

  return redactPrivateLinks(app, techRows.results, viewerUserId);
}

function redactPrivateLinks(app: App, techStacks: TechStack[], viewerUserId?: number): AppWithTech {
  const isLocked = !!app.is_private && app.user_id !== viewerUserId;
  return {
    ...app,
    site_url: isLocked ? null : app.site_url,
    github_url: isLocked ? null : app.github_url,
    tech_stacks: techStacks,
    is_locked: isLocked,
  };
}

export async function createApp(
  db: D1Database,
  data: { user_id: number; title: string; description?: string; site_url?: string; github_url?: string; thumbnail_url?: string; thumbnail_type?: string; is_private?: boolean; category?: AppCategory; status?: AppStatus; tech_ids?: number[]; tech_entries?: Array<{ id: number; usage_role?: string }> }
): Promise<number> {
  const maxOrder = await db.prepare('SELECT COALESCE(MAX(display_order), 0) as max_order FROM apps').first<{ max_order: number }>();
  const nextOrder = (maxOrder?.max_order ?? 0) + 1;

  const result = await db.prepare(
    `INSERT INTO apps (user_id, title, description, site_url, github_url, thumbnail_url, thumbnail_type, is_private, category, status, display_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    data.user_id, data.title, data.description || null, data.site_url || null,
    data.github_url || null, data.thumbnail_url || null, data.thumbnail_type || 'auto', data.is_private ? 1 : 0,
    data.category || 'other', data.status || 'live', nextOrder
  ).run();

  const appId = result.meta.last_row_id as number;

  if (data.tech_entries?.length) {
    const stmt = db.prepare('INSERT INTO app_tech (app_id, tech_id, usage_role) VALUES (?, ?, ?)');
    await db.batch(data.tech_entries.map((e) => stmt.bind(appId, e.id, e.usage_role || null)));
  } else if (data.tech_ids?.length) {
    const stmt = db.prepare('INSERT INTO app_tech (app_id, tech_id) VALUES (?, ?)');
    await db.batch(data.tech_ids.map((tid) => stmt.bind(appId, tid)));
  }

  return appId;
}

export async function updateApp(
  db: D1Database,
  id: number,
  data: { title?: string; description?: string; site_url?: string; github_url?: string; thumbnail_url?: string; thumbnail_type?: string; is_private?: boolean; category?: AppCategory; status?: AppStatus; tech_ids?: number[]; tech_entries?: Array<{ id: number; usage_role?: string }> },
  ownerUserId?: number,
): Promise<void> {
  if (ownerUserId !== undefined) {
    const ownedApp = await db.prepare('SELECT id FROM apps WHERE id = ? AND user_id = ?')
      .bind(id, ownerUserId).first<{ id: number }>();
    if (!ownedApp) return;
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  if (data.site_url !== undefined) { fields.push('site_url = ?'); values.push(data.site_url); }
  if (data.github_url !== undefined) { fields.push('github_url = ?'); values.push(data.github_url); }
  if (data.thumbnail_url !== undefined) { fields.push('thumbnail_url = ?'); values.push(data.thumbnail_url); }
  if (data.thumbnail_type !== undefined) { fields.push('thumbnail_type = ?'); values.push(data.thumbnail_type); }
  if (data.is_private !== undefined) { fields.push('is_private = ?'); values.push(data.is_private ? 1 : 0); }
  if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

  if (fields.length) {
    fields.push("updated_at = datetime('now')");
    values.push(id);
    if (ownerUserId !== undefined) values.push(ownerUserId);
    const ownershipClause = ownerUserId !== undefined ? ' AND user_id = ?' : '';
    await db.prepare(`UPDATE apps SET ${fields.join(', ')} WHERE id = ?${ownershipClause}`).bind(...values).run();
  }

  if (data.tech_entries !== undefined) {
    await db.prepare('DELETE FROM app_tech WHERE app_id = ?').bind(id).run();
    if (data.tech_entries.length) {
      const stmt = db.prepare('INSERT INTO app_tech (app_id, tech_id, usage_role) VALUES (?, ?, ?)');
      await db.batch(data.tech_entries.map((e) => stmt.bind(id, e.id, e.usage_role || null)));
    }
  } else if (data.tech_ids !== undefined) {
    await db.prepare('DELETE FROM app_tech WHERE app_id = ?').bind(id).run();
    if (data.tech_ids.length) {
      const stmt = db.prepare('INSERT INTO app_tech (app_id, tech_id) VALUES (?, ?)');
      await db.batch(data.tech_ids.map((tid) => stmt.bind(id, tid)));
    }
  }
}

export async function deleteApp(db: D1Database, id: number, ownerUserId?: number): Promise<void> {
  const app = ownerUserId === undefined
    ? await db.prepare('SELECT id FROM apps WHERE id = ?').bind(id).first<{ id: number }>()
    : await db.prepare('SELECT id FROM apps WHERE id = ? AND user_id = ?').bind(id, ownerUserId).first<{ id: number }>();
  if (!app) return;
  await db.batch([
    db.prepare('DELETE FROM app_tech WHERE app_id = ?').bind(id),
    db.prepare('DELETE FROM apps WHERE id = ?').bind(id),
  ]);
}

export async function getTechStacks(db: D1Database): Promise<TechStack[]> {
  const result = await db.prepare('SELECT * FROM tech_stacks ORDER BY category, name').all<TechStack>();
  return result.results;
}

export async function findOrCreateUser(
  db: D1Database,
  githubId: string,
  username: string,
  avatarUrl: string | null,
  githubAccessToken?: string,
): Promise<User> {
  const existing = await db.prepare('SELECT * FROM users WHERE github_id = ?').bind(githubId).first<User>();
  if (existing) {
    await db.prepare('UPDATE users SET github_username = ?, avatar_url = ?, github_access_token = COALESCE(?, github_access_token) WHERE id = ?')
      .bind(username, avatarUrl, githubAccessToken || null, existing.id).run();
    return { ...existing, github_username: username, avatar_url: avatarUrl, github_access_token: githubAccessToken || existing.github_access_token };
  }

  const result = await db.prepare(
    'INSERT INTO users (github_id, github_username, avatar_url, github_access_token) VALUES (?, ?, ?, ?)'
  ).bind(githubId, username, avatarUrl, githubAccessToken || null).run();

  return {
    id: result.meta.last_row_id as number,
    github_id: githubId,
    github_username: username,
    avatar_url: avatarUrl,
    github_access_token: githubAccessToken || null,
    created_at: new Date().toISOString(),
  };
}

export async function getEncryptedGithubAccessToken(db: D1Database, userId: number): Promise<string | null> {
  const user = await db.prepare('SELECT github_access_token FROM users WHERE id = ?')
    .bind(userId).first<{ github_access_token: string | null }>();
  return user?.github_access_token || null;
}
