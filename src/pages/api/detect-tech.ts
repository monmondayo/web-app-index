import type { APIRoute } from 'astro';
import { getCurrentUser } from '../../lib/auth';
import { detectTechFromGitHub } from '../../lib/tech-detector';
import { getTechStacks } from '../../lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const user = await getCurrentUser(request, env.JWT_SECRET);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { github_url } = await request.json();
  if (!github_url) {
    return new Response(JSON.stringify({ error: 'Missing github_url' }), { status: 400 });
  }

  const detectedNames = await detectTechFromGitHub(github_url);
  const allTech = await getTechStacks(env.DB);

  // Match detected names to tech_stacks entries
  const matched = allTech.filter((t) =>
    detectedNames.some((name) => name.toLowerCase() === t.name.toLowerCase())
  );

  return new Response(JSON.stringify({ detected: matched }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
