import { isAppCategory, isAppStatus, type AppCategory, type AppStatus } from './catalog';
import { normalizeYouTubeUrl } from './video';

const MAX_JSON_BYTES = 64 * 1024;

export class AppInputError extends Error {}

interface TechEntryInput {
  id: number;
  usage_role?: string;
}

export interface AppInput {
  id?: number;
  title: string;
  description?: string;
  site_url?: string;
  github_url?: string;
  video_url?: string;
  thumbnail_url?: string;
  thumbnail_type: 'auto' | 'manual' | 'none';
  is_private: boolean;
  category: AppCategory;
  status: AppStatus;
  tech_ids?: number[];
  tech_entries?: TechEntryInput[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown, field: string, max: number): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.length > max) {
    throw new AppInputError(`${field} is invalid`);
  }
  return value.trim();
}

function webUrl(value: unknown, field: string): string | undefined {
  const text = optionalString(value, field, 2048);
  if (!text) return undefined;
  try {
    const parsed = new URL(text);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error();
    if (parsed.username || parsed.password) throw new Error();
    return parsed.toString();
  } catch {
    throw new AppInputError(`${field} must be an http(s) URL`);
  }
}

function videoUrl(value: unknown): string | undefined {
  const text = optionalString(value, 'video_url', 2048);
  if (!text) return undefined;
  const normalized = normalizeYouTubeUrl(text);
  if (!normalized) {
    throw new AppInputError('紹介動画には有効なYouTube URLを入力してください');
  }
  return normalized;
}

function githubUrl(value: unknown): string | undefined {
  const parsed = webUrl(value, 'github_url');
  if (!parsed) return undefined;
  const url = new URL(parsed);
  const segments = url.pathname.split('/').filter(Boolean);
  if (url.hostname.toLowerCase() !== 'github.com' || segments.length < 2) {
    throw new AppInputError('github_url must point to a GitHub repository');
  }
  return parsed;
}

function positiveInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new AppInputError(`${field} must be a positive integer`);
  }
  return value;
}

function idList(value: unknown): number[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 200) throw new AppInputError('tech_ids is invalid');
  return [...new Set(value.map((id) => positiveInteger(id, 'tech_ids[]')))];
}

function techEntries(value: unknown): TechEntryInput[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 200) throw new AppInputError('tech_entries is invalid');
  const entries = value.map((entry) => {
    if (!isObject(entry)) throw new AppInputError('tech_entries[] is invalid');
    return {
      id: positiveInteger(entry.id, 'tech_entries[].id'),
      usage_role: optionalString(entry.usage_role, 'tech_entries[].usage_role', 200),
    };
  });
  if (new Set(entries.map((entry) => entry.id)).size !== entries.length) {
    throw new AppInputError('tech_entries contains duplicate ids');
  }
  return entries;
}

async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new AppInputError('Content-Type must be application/json');
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_JSON_BYTES) {
    throw new AppInputError('Request body is too large');
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new AppInputError('Request body must be valid JSON');
  }
  if (!isObject(value)) throw new AppInputError('Request body must be an object');
  return value;
}

export async function readAppInput(request: Request, requireId = false): Promise<AppInput> {
  const value = await readJsonObject(request);
  const title = optionalString(value.title, 'title', 100);
  if (!title) throw new AppInputError('title is required');
  if (value.is_private !== undefined && typeof value.is_private !== 'boolean') {
    throw new AppInputError('is_private must be a boolean');
  }

  const thumbnailType = value.thumbnail_type ?? 'auto';
  if (thumbnailType !== 'auto' && thumbnailType !== 'manual' && thumbnailType !== 'none') {
    throw new AppInputError('thumbnail_type is invalid');
  }

  const category = isAppCategory(value.category) ? value.category : 'other';
  const status = isAppStatus(value.status) ? value.status : 'live';
  const id = value.id === undefined ? undefined : positiveInteger(value.id, 'id');
  if (requireId && id === undefined) throw new AppInputError('id is required');

  const thumbnailUrlValue = optionalString(value.thumbnail_url, 'thumbnail_url', 2048);
  const thumbnailUrl = thumbnailUrlValue?.startsWith('/r2/thumbnails/')
    ? thumbnailUrlValue
    : webUrl(thumbnailUrlValue, 'thumbnail_url');

  return {
    id,
    title,
    description: optionalString(value.description, 'description', 2_000),
    site_url: webUrl(value.site_url, 'site_url'),
    github_url: githubUrl(value.github_url),
    video_url: videoUrl(value.video_url),
    thumbnail_url: thumbnailUrl,
    thumbnail_type: thumbnailType,
    is_private: value.is_private === true,
    category,
    status,
    tech_ids: idList(value.tech_ids),
    tech_entries: techEntries(value.tech_entries),
  };
}

export async function readGithubUrl(request: Request): Promise<string> {
  const value = await readJsonObject(request);
  const parsed = githubUrl(value.github_url);
  if (!parsed) throw new AppInputError('github_url is required');
  return parsed;
}
