/// <reference types="astro/client" />

type D1Database = import('@cloudflare/workers-types').D1Database;
type R2Bucket = import('@cloudflare/workers-types').R2Bucket;

type Runtime = import('@astrojs/cloudflare').Runtime<{
  DB: D1Database;
  R2: R2Bucket;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_SECRET: string;
  SITE_URL: string;
}>;

declare namespace App {
  interface Locals extends Runtime {}
}
