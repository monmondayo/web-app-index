type D1Database = import('@cloudflare/workers-types').D1Database;

export interface App {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  site_url: string | null;
  github_url: string | null;
  thumbnail_url: string | null;
  thumbnail_type: string;
  created_at: string;
  updated_at: string;
}

export interface AppWithTech extends App {
  tech_stacks: TechStack[];
}

export interface TechStack {
  id: number;
  name: string;
  slug: string;
  category: string;
  color: string | null;
}

export interface User {
  id: number;
  github_id: string;
  github_username: string;
  avatar_url: string | null;
  created_at: string;
}

export async function getApps(db: D1Database): Promise<AppWithTech[]> {
  const apps = await db.prepare(
    'SELECT * FROM apps ORDER BY updated_at DESC'
  ).all<App>();

  if (!apps.results.length) return [];

  const appIds = apps.results.map((a) => a.id);
  const placeholders = appIds.map(() => '?').join(',');
  const techRows = await db.prepare(
    `SELECT at.app_id, ts.* FROM app_tech at
     JOIN tech_stacks ts ON at.tech_id = ts.id
     WHERE at.app_id IN (${placeholders})`
  ).bind(...appIds).all<TechStack & { app_id: number }>();

  const techMap = new Map<number, TechStack[]>();
  for (const row of techRows.results) {
    const list = techMap.get(row.app_id) || [];
    list.push({ id: row.id, name: row.name, slug: row.slug, category: row.category, color: row.color });
    techMap.set(row.app_id, list);
  }

  return apps.results.map((app) => ({
    ...app,
    tech_stacks: techMap.get(app.id) || [],
  }));
}

export async function getAppById(db: D1Database, id: number): Promise<AppWithTech | null> {
  const app = await db.prepare('SELECT * FROM apps WHERE id = ?').bind(id).first<App>();
  if (!app) return null;

  const techRows = await db.prepare(
    `SELECT ts.* FROM app_tech at
     JOIN tech_stacks ts ON at.tech_id = ts.id
     WHERE at.app_id = ?`
  ).bind(id).all<TechStack>();

  return { ...app, tech_stacks: techRows.results };
}

export async function createApp(
  db: D1Database,
  data: { user_id: number; title: string; description?: string; site_url?: string; github_url?: string; thumbnail_url?: string; thumbnail_type?: string; tech_ids?: number[] }
): Promise<number> {
  const result = await db.prepare(
    `INSERT INTO apps (user_id, title, description, site_url, github_url, thumbnail_url, thumbnail_type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    data.user_id, data.title, data.description || null, data.site_url || null,
    data.github_url || null, data.thumbnail_url || null, data.thumbnail_type || 'auto'
  ).run();

  const appId = result.meta.last_row_id as number;

  if (data.tech_ids?.length) {
    const stmt = db.prepare('INSERT INTO app_tech (app_id, tech_id) VALUES (?, ?)');
    await db.batch(data.tech_ids.map((tid) => stmt.bind(appId, tid)));
  }

  return appId;
}

export async function updateApp(
  db: D1Database,
  id: number,
  data: { title?: string; description?: string; site_url?: string; github_url?: string; thumbnail_url?: string; thumbnail_type?: string; tech_ids?: number[] }
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  if (data.site_url !== undefined) { fields.push('site_url = ?'); values.push(data.site_url); }
  if (data.github_url !== undefined) { fields.push('github_url = ?'); values.push(data.github_url); }
  if (data.thumbnail_url !== undefined) { fields.push('thumbnail_url = ?'); values.push(data.thumbnail_url); }
  if (data.thumbnail_type !== undefined) { fields.push('thumbnail_type = ?'); values.push(data.thumbnail_type); }

  if (fields.length) {
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.prepare(`UPDATE apps SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  if (data.tech_ids !== undefined) {
    await db.prepare('DELETE FROM app_tech WHERE app_id = ?').bind(id).run();
    if (data.tech_ids.length) {
      const stmt = db.prepare('INSERT INTO app_tech (app_id, tech_id) VALUES (?, ?)');
      await db.batch(data.tech_ids.map((tid) => stmt.bind(id, tid)));
    }
  }
}

export async function deleteApp(db: D1Database, id: number): Promise<void> {
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
  avatarUrl: string | null
): Promise<User> {
  const existing = await db.prepare('SELECT * FROM users WHERE github_id = ?').bind(githubId).first<User>();
  if (existing) {
    await db.prepare('UPDATE users SET github_username = ?, avatar_url = ? WHERE id = ?')
      .bind(username, avatarUrl, existing.id).run();
    return { ...existing, github_username: username, avatar_url: avatarUrl };
  }

  const result = await db.prepare(
    'INSERT INTO users (github_id, github_username, avatar_url) VALUES (?, ?, ?)'
  ).bind(githubId, username, avatarUrl).run();

  return {
    id: result.meta.last_row_id as number,
    github_id: githubId,
    github_username: username,
    avatar_url: avatarUrl,
    created_at: new Date().toISOString(),
  };
}
