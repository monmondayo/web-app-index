import type { APIRoute } from 'astro';
import { getTechStacks } from '../../lib/db';

export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime.env;
  const stacks = await getTechStacks(env.DB);
  return new Response(JSON.stringify(stacks), {
    headers: { 'Content-Type': 'application/json' },
  });
};
