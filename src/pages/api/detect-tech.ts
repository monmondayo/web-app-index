import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { decryptSecret, getCurrentUser, isAdmin } from '../../lib/auth';
import { detectTechFromGitHub } from '../../lib/tech-detector';
import { getEncryptedGithubAccessToken, getTechStacks } from '../../lib/db';
import { AppInputError, readGithubUrl } from '../../lib/app-input';

export const POST: APIRoute = async ({ request }) => {
  const user = await getCurrentUser(request, env.JWT_SECRET);
  if (!user || !isAdmin(user, env.ADMIN_GITHUB_USERNAME)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  let githubUrl: string;
  try {
    githubUrl = await readGithubUrl(request);
  } catch (error) {
    if (error instanceof AppInputError) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
    throw error;
  }

  const encryptedToken = await getEncryptedGithubAccessToken(env.DB, user.userId);
  const accessToken = encryptedToken ? await decryptSecret(encryptedToken, env.JWT_SECRET) : null;
  const detectedTech = await detectTechFromGitHub(githubUrl, accessToken ? { accessToken } : {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  });
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
