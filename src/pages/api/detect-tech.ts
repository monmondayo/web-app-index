import type { APIRoute } from 'astro';
import { getCurrentUser, isAdmin } from '../../lib/auth';
import { detectTechFromGitHub } from '../../lib/tech-detector';
import { getTechStacks } from '../../lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const user = await getCurrentUser(request, env.JWT_SECRET);
  if (!isAdmin(user, env.ADMIN_GITHUB_USERNAME)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const { github_url } = await request.json();
  if (!github_url) {
    return new Response(JSON.stringify({ error: 'Missing github_url' }), { status: 400 });
  }

  const detectedTech = await detectTechFromGitHub(github_url);
  const allTech = await getTechStacks(env.DB);

  // Match detected names to tech_stacks entries, preserving role
  const matched = detectedTech
    .map((dt) => {
      const ts = allTech.find((t) => t.name.toLowerCase() === dt.name.toLowerCase());
      return ts ? { ...ts, usage_role: dt.role } : null;
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);

  return new Response(JSON.stringify({ detected: matched }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
