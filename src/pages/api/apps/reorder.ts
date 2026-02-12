import type { APIRoute } from 'astro';
import { getCurrentUser, isAdmin } from '../../../lib/auth';

export const PUT: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const user = await getCurrentUser(request, env.JWT_SECRET);
  if (!isAdmin(user, env.ADMIN_GITHUB_USERNAME)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const { orders } = await request.json() as { orders: { id: number; display_order: number }[] };
  if (!Array.isArray(orders) || orders.length === 0) {
    return new Response(JSON.stringify({ error: 'Invalid orders' }), { status: 400 });
  }

  const stmt = env.DB.prepare('UPDATE apps SET display_order = ? WHERE id = ?');
  await env.DB.batch(orders.map((o) => stmt.bind(o.display_order, o.id)));

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
