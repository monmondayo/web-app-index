import type { APIRoute } from 'astro';
import { findOrCreateUser } from '../../../lib/db';
import { createToken, getSessionCookie } from '../../../lib/auth';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response('Missing code parameter', { status: 400 });
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

  // Create or update user in DB
  const user = await findOrCreateUser(
    env.DB,
    String(githubUser.id),
    githubUser.login,
    githubUser.avatar_url
  );

  // Create JWT
  const token = await createToken({
    userId: user.id,
    githubUsername: user.github_username,
    avatarUrl: user.avatar_url,
  }, env.JWT_SECRET);

  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/',
      'Set-Cookie': getSessionCookie(token),
    },
  });
};
