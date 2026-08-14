import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getCurrentUser, isAdmin } from '../../lib/auth';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const decoder = new TextDecoder();

const IMAGE_TYPES = {
  'image/png': { ext: 'png', matches: (b: Uint8Array) =>
    b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v) },
  'image/jpeg': { ext: 'jpg', matches: (b: Uint8Array) =>
    b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/gif': { ext: 'gif', matches: (b: Uint8Array) => {
    const signature = decoder.decode(b.slice(0, 6));
    return b.length >= 6 && (signature === 'GIF87a' || signature === 'GIF89a');
  } },
  'image/webp': { ext: 'webp', matches: (b: Uint8Array) =>
    b.length >= 12 && decoder.decode(b.slice(0, 4)) === 'RIFF' && decoder.decode(b.slice(8, 12)) === 'WEBP' },
} as const;

function jsonError(error: string, status: number) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const user = await getCurrentUser(request, env.JWT_SECRET);
  if (!isAdmin(user, env.ADMIN_GITHUB_USERNAME)) {
    return jsonError('Forbidden', 403);
  }

  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES + 64 * 1024) {
    return jsonError('Request is too large', 413);
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return jsonError('No file provided', 400);
  }

  const imageType = IMAGE_TYPES[file.type as keyof typeof IMAGE_TYPES];
  if (!imageType) {
    return jsonError('PNG、JPEG、GIF、WebPのみアップロードできます', 400);
  }

  // Validate file size (max 10MB)
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    return jsonError('画像は10MB以下のものを選択してください', 400);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!imageType.matches(bytes)) {
    return jsonError('ファイルの内容と画像形式が一致しません', 400);
  }

  const key = `thumbnails/${crypto.randomUUID()}.${imageType.ext}`;

  await env.R2.put(key, bytes, {
    httpMetadata: { contentType: file.type },
  });

  // R2 public URL (requires public access enabled on the bucket)
  const url = `/r2/${key}`;

  return new Response(JSON.stringify({ url, key }), {
    status: 201,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
