import type { APIRoute } from 'astro';
import { findOrCreateUser } from '../../../lib/db';
import {
  clearOAuthStateCookie,
  createToken,
  encryptSecret,
  getOAuthStateFromRequest,
  getSessionCookie,
} from '../../../lib/auth';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = getOAuthStateFromRequest(request);

  if (!code || !state || !expectedState || state !== expectedState) {
    return new Response('Invalid OAuth callback', { status: 400 });
  }

  // Exchange code for access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
  if (!tokenData.access_token) {
    return new Response('Failed to get access token', { status: 400 });
  }

  // Get user info
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'User-Agent': 'web-app-index',
    },
  });

  const githubUser = await userRes.json() as { id: number; login: string; avatar_url: string };
  if (!userRes.ok || !githubUser.id || !githubUser.login) {
    return new Response('Failed to get GitHub user', { status: 400 });
  }

  const encryptedAccessToken = await encryptSecret(tokenData.access_token, env.JWT_SECRET);

  // Create or update user in DB
  const user = await findOrCreateUser(
    env.DB,
    String(githubUser.id),
    githubUser.login,
    githubUser.avatar_url,
    encryptedAccessToken,
  );

  // Create JWT
  const token = await createToken({
    userId: user.id,
    githubUsername: user.github_username,
    avatarUrl: user.avatar_url,
  }, env.JWT_SECRET);

  const headers = new Headers({ 'Location': '/' });
  headers.append('Set-Cookie', getSessionCookie(token));
  headers.append('Set-Cookie', clearOAuthStateCookie());

  return new Response(null, {
    status: 302,
    headers,
  });
};
