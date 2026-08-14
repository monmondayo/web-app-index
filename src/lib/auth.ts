export interface JWTPayload {
  userId: number;
  githubUsername: string;
  avatarUrl: string | null;
  exp: number;
}

const COOKIE_NAME = 'session';
const TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days
const OAUTH_STATE_COOKIE_NAME = 'oauth_state';

// Simple JWT implementation using Web Crypto API (available in Cloudflare Workers)
async function createHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  );
}

function base64UrlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array<ArrayBuffer> {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function createToken(payload: Omit<JWTPayload, 'exp'>, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, exp: now + TOKEN_EXPIRY };

  const enc = new TextEncoder();
  const headerB64 = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(fullPayload)));

  const key = await createHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(`${headerB64}.${payloadB64}`));

  return `${headerB64}.${payloadB64}.${base64UrlEncode(signature)}`;
}

export async function verifyToken(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    const key = await createHmacKey(secret);
    const enc = new TextEncoder();
    const valid = await crypto.subtle.verify(
      'HMAC', key, base64UrlDecode(signatureB64), enc.encode(`${headerB64}.${payloadB64}`)
    );
    if (!valid) return null;

    const payload: JWTPayload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

function secureCookieAttribute(request: Request): string {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  return new URL(request.url).protocol === 'https:' || forwardedProto === 'https' ? '; Secure' : '';
}

export function getSessionCookie(token: string, request: Request): string {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TOKEN_EXPIRY}${secureCookieAttribute(request)}`;
}

export function clearSessionCookie(request: Request): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookieAttribute(request)}`;
}

export function getTokenFromRequest(request: Request): string | null {
  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

export function createOAuthState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return base64UrlEncode(bytes);
}

export function getOAuthStateCookie(state: string, request: Request): string {
  return `${OAUTH_STATE_COOKIE_NAME}=${state}; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=600${secureCookieAttribute(request)}`;
}

export function clearOAuthStateCookie(request: Request): string {
  return `${OAUTH_STATE_COOKIE_NAME}=; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=0${secureCookieAttribute(request)}`;
}

export function getOAuthStateFromRequest(request: Request): string | null {
  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(new RegExp(`${OAUTH_STATE_COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

async function createEncryptionKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** Encrypts server-side credentials before persisting them in D1. */
export async function encryptSecret(value: string, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await createEncryptionKey(secret);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(value),
  );
  return `v1.${base64UrlEncode(iv)}.${base64UrlEncode(encrypted)}`;
}

export async function decryptSecret(value: string, secret: string): Promise<string | null> {
  try {
    const [version, iv, encrypted] = value.split('.');
    if (version !== 'v1' || !iv || !encrypted) return null;
    const key = await createEncryptionKey(secret);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64UrlDecode(iv) },
      key,
      base64UrlDecode(encrypted),
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

export async function getCurrentUser(request: Request, jwtSecret: string): Promise<JWTPayload | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token, jwtSecret);
}

export function isAdmin(user: JWTPayload | null, adminUsername: string): boolean {
  return !!user && user.githubUsername === adminUsername;
}
