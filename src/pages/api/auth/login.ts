import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createOAuthState, getOAuthStateCookie } from '../../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
  const state = createOAuthState();
  const privateRepositoryAccess = String(env.GITHUB_ENABLE_PRIVATE_REPOS) === 'true';
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${env.SITE_URL}/api/auth/callback`,
    scope: privateRepositoryAccess ? 'read:user repo' : 'read:user',
    state,
  });

  return new Response(null, {
    status: 302,
    headers: {
      'Location': `https://github.com/login/oauth/authorize?${params}`,
      'Set-Cookie': getOAuthStateCookie(state, request),
      'Cache-Control': 'no-store',
    },
  });
};
