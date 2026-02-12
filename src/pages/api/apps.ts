import type { APIRoute } from 'astro';
import { getApps, createApp, updateApp, deleteApp, getTechStacks } from '../../lib/db';
import { getCurrentUser, isAdmin } from '../../lib/auth';
import { detectTechFromGitHub } from '../../lib/tech-detector';

async function mergeUsageRoles(
  db: import('@cloudflare/workers-types').D1Database,
  githubUrl: string | undefined,
  techEntries: Array<{ id: number; usage_role?: string }> | undefined,
  githubCredentials?: { clientId: string; clientSecret: string },
): Promise<Array<{ id: number; usage_role?: string }> | undefined> {
  if (!techEntries?.length || !githubUrl) return techEntries;

  // Only detect if some entries are missing usage_role
  const needsRole = techEntries.some((e) => !e.usage_role);
  if (!needsRole) return techEntries;

  const detected = await detectTechFromGitHub(githubUrl, githubCredentials);
  if (!detected.length) return techEntries;

  const allTech = await getTechStacks(db);
  // Build map: tech_stack id -> detected role
  const roleMap = new Map<number, string>();
  for (const dt of detected) {
    const ts = allTech.find((t) => t.name.toLowerCase() === dt.name.toLowerCase());
    if (ts && dt.role) {
      roleMap.set(ts.id, dt.role);
    }
  }

  return techEntries.map((e) => ({
    ...e,
    usage_role: e.usage_role || roleMap.get(e.id) || undefined,
  }));
}

export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime.env;
  const apps = await getApps(env.DB);
  return new Response(JSON.stringify(apps), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const user = await getCurrentUser(request, env.JWT_SECRET);
  if (!isAdmin(user, env.ADMIN_GITHUB_USERNAME)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const data = await request.json();
  const ghCreds = { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET };
  const techEntries = await mergeUsageRoles(env.DB, data.github_url, data.tech_entries, ghCreds);
  const appId = await createApp(env.DB, {
    user_id: user.userId,
    title: data.title,
    description: data.description,
    site_url: data.site_url,
    github_url: data.github_url,
    thumbnail_url: data.thumbnail_url,
    thumbnail_type: data.thumbnail_type,
    tech_ids: techEntries ? undefined : data.tech_ids,
    tech_entries: techEntries || data.tech_entries,
  });

  return new Response(JSON.stringify({ id: appId }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const user = await getCurrentUser(request, env.JWT_SECRET);
  if (!isAdmin(user, env.ADMIN_GITHUB_USERNAME)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const data = await request.json();
  if (!data.id) {
    return new Response(JSON.stringify({ error: 'Missing app id' }), { status: 400 });
  }

  const ghCreds = { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET };
  const techEntries = await mergeUsageRoles(env.DB, data.github_url, data.tech_entries, ghCreds);
  await updateApp(env.DB, data.id, {
    title: data.title,
    description: data.description,
    site_url: data.site_url,
    github_url: data.github_url,
    thumbnail_url: data.thumbnail_url,
    thumbnail_type: data.thumbnail_type,
    tech_ids: techEntries ? undefined : data.tech_ids,
    tech_entries: techEntries || data.tech_entries,
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const user = await getCurrentUser(request, env.JWT_SECRET);
  if (!isAdmin(user, env.ADMIN_GITHUB_USERNAME)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing app id' }), { status: 400 });
  }

  await deleteApp(env.DB, id);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
