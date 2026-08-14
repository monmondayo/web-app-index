import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { findOrCreateUser } from '../../../lib/db';
import {
  clearOAuthStateCookie,
  createToken,
  encryptSecret,
  getOAuthStateFromRequest,
  getSessionCookie,
} from '../../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
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
      redirect_uri: `${env.SITE_URL}/api/auth/callback`,
    }),
  });

  const tokenData = await tokenRes.json() as { access_token?: string; scope?: string; error?: string };
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

  // Persist the token only when private-repository access is explicitly enabled.
  // A default-scope login also clears any broad token stored by an older release.
  const privateRepositoryAccess = String(env.GITHUB_ENABLE_PRIVATE_REPOS) === 'true';
  const grantedScopes = new Set((tokenData.scope || '').split(',').map((scope) => scope.trim()));
  const encryptedAccessToken = privateRepositoryAccess && grantedScopes.has('repo')
    ? await encryptSecret(tokenData.access_token, env.JWT_SECRET)
    : null;

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
  headers.append('Set-Cookie', getSessionCookie(token, request));
  headers.append('Set-Cookie', clearOAuthStateCookie(request));
  headers.set('Cache-Control', 'no-store');

  return new Response(null, {
    status: 302,
    headers,
  });
};
