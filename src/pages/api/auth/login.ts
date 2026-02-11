import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime.env;
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${env.SITE_URL}/api/auth/callback`,
    scope: 'read:user',
  });

  return Response.redirect(`https://github.com/login/oauth/authorize?${params}`, 302);
};
