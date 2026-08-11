import type { APIRoute } from 'astro';
import { getCurrentUser } from '../../lib/auth';

export const GET: APIRoute = async ({ params, request, locals }) => {
  const env = locals.runtime.env;
  const key = params.path;

  if (!key) {
    return new Response('Not found', { status: 404 });
  }

  const thumbnailUrl = `/r2/${key}`;
  const privateOwner = await env.DB.prepare(
    'SELECT user_id FROM apps WHERE thumbnail_url = ? AND is_private = 1 LIMIT 1'
  ).bind(thumbnailUrl).first<{ user_id: number }>();
  if (privateOwner) {
    const user = await getCurrentUser(request, env.JWT_SECRET);
    if (!user || user.userId !== privateOwner.user_id) {
      return new Response('Not found', { status: 404 });
    }
  }

  const object = await env.R2.get(key);
  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('Cache-Control', privateOwner ? 'private, no-store' : 'public, max-age=31536000, immutable');

  return new Response(object.body as unknown as BodyInit, { headers });
};
