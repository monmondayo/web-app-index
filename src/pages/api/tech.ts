import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getTechStacks } from '../../lib/db';

export const GET: APIRoute = async () => {
  const stacks = await getTechStacks(env.DB);
  return new Response(JSON.stringify(stacks), {
    headers: { 'Content-Type': 'application/json' },
  });
};
