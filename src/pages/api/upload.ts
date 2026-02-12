import type { APIRoute } from 'astro';
import { getCurrentUser, isAdmin } from '../../lib/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const user = await getCurrentUser(request, env.JWT_SECRET);
  if (!isAdmin(user, env.ADMIN_GITHUB_USERNAME)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    return new Response(JSON.stringify({ error: 'Only image files are allowed' }), { status: 400 });
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return new Response(JSON.stringify({ error: 'File too large (max 5MB)' }), { status: 400 });
  }

  const ext = file.name.split('.').pop() || 'png';
  const key = `thumbnails/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  await env.R2.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  // R2 public URL (requires public access enabled on the bucket)
  const url = `/r2/${key}`;

  return new Response(JSON.stringify({ url, key }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
