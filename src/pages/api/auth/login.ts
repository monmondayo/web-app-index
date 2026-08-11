import type { APIRoute } from 'astro';
import { createOAuthState, getOAuthStateCookie } from '../../../lib/auth';

export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime.env;
  const state = createOAuthState();
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${env.SITE_URL}/api/auth/callback`,
    scope: 'read:user repo',
    state,
  });

  return new Response(null, {
    status: 302,
    headers: {
      'Location': `https://github.com/login/oauth/authorize?${params}`,
      'Set-Cookie': getOAuthStateCookie(state),
    },
  });
};
