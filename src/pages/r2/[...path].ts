import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ params }) => {
  const key = params.path;

  if (!key) {
    return new Response('Not found', { status: 404 });
  }

  const object = await env.R2.get(key);
  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  const headers = new Headers();
  const safeImageTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
  const storedType = object.httpMetadata?.contentType || '';
  headers.set('Content-Type', safeImageTypes.has(storedType) ? storedType : 'application/octet-stream');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Content-Security-Policy', "default-src 'none'; sandbox");
  if (!safeImageTypes.has(storedType)) {
    headers.set('Content-Disposition', 'attachment');
  }
  // Thumbnails are part of the public catalog summary, including Private apps.
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(object.body as unknown as BodyInit, { headers });
};
