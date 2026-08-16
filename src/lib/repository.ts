/** Hosts accepted for an app's repository URL (stored in the legacy `github_url` column). */

export type RepositoryHostId = 'github' | 'huggingface';

export interface ParsedRepository {
  host: RepositoryHostId;
  label: string;
  owner: string;
  repo: string;
}

interface RepositoryHost {
  id: RepositoryHostId;
  label: string;
  hostnames: string[];
  /** Read owner/repo from the path segments, or null when they do not name a repository. */
  parsePath: (segments: string[]) => { owner: string; repo: string } | null;
}

const HOSTS: RepositoryHost[] = [
  {
    id: 'github',
    label: 'GitHub',
    hostnames: ['github.com'],
    parsePath: (segments) =>
      segments.length >= 2 ? { owner: segments[0], repo: segments[1] } : null,
  },
  {
    id: 'huggingface',
    label: 'Hugging Face',
    hostnames: ['huggingface.co', 'hf.co'],
    // spaces/{owner}/{name}, datasets/{owner}/{name}, models/{owner}/{name} or {owner}/{name}
    parsePath: (segments) => {
      const rest = ['spaces', 'datasets', 'models'].includes(segments[0])
        ? segments.slice(1)
        : segments;
      return rest.length >= 2 ? { owner: rest[0], repo: rest[1] } : null;
    },
  },
];

export const REPOSITORY_HOST_LABELS = HOSTS.map((host) => host.label).join(' / ');

/** Identify the host of a repository URL, or null when it is not a supported repository. */
export function parseRepositoryUrl(value?: string | null): ParsedRepository | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    const host = HOSTS.find((entry) => entry.hostnames.includes(hostname));
    if (!host) return null;

    const parsed = host.parsePath(url.pathname.split('/').filter(Boolean));
    if (!parsed) return null;

    return { host: host.id, label: host.label, owner: parsed.owner, repo: parsed.repo.replace(/\.git$/, '') };
  } catch {
    return null;
  }
}

export function isRepositoryUrl(value?: string | null): boolean {
  return parseRepositoryUrl(value) !== null;
}

export function isGitHubRepositoryUrl(value?: string | null): boolean {
  return parseRepositoryUrl(value)?.host === 'github';
}

/** Link label for a stored repository URL. */
export function getRepositoryLabel(value?: string | null): string {
  return parseRepositoryUrl(value)?.label ?? 'リポジトリ';
}
