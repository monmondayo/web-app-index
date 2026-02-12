import type { APIRoute } from 'astro';
import { getApps, createApp, updateApp, deleteApp } from '../../lib/db';
import { getCurrentUser, isAdmin } from '../../lib/auth';

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
  const appId = await createApp(env.DB, {
    user_id: user.userId,
    title: data.title,
    description: data.description,
    site_url: data.site_url,
    github_url: data.github_url,
    thumbnail_url: data.thumbnail_url,
    thumbnail_type: data.thumbnail_type,
    tech_ids: data.tech_ids,
    tech_entries: data.tech_entries,
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

  await updateApp(env.DB, data.id, {
    title: data.title,
    description: data.description,
    site_url: data.site_url,
    github_url: data.github_url,
    thumbnail_url: data.thumbnail_url,
    thumbnail_type: data.thumbnail_type,
    tech_ids: data.tech_ids,
    tech_entries: data.tech_entries,
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
