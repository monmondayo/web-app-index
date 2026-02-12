// Maps npm package names to tech stack names and roles
const PACKAGE_MAP: Record<string, { name: string; role: string }> = {
  'react': { name: 'React', role: 'UIレンダリング' },
  'react-dom': { name: 'React', role: 'UIレンダリング' },
  'vue': { name: 'Vue.js', role: 'UIレンダリング' },
  'svelte': { name: 'Svelte', role: 'UIレンダリング' },
  '@sveltejs/kit': { name: 'SvelteKit', role: 'フレームワーク' },
  'astro': { name: 'Astro', role: 'フレームワーク' },
  '@angular/core': { name: 'Angular', role: 'フレームワーク' },
  'next': { name: 'Next.js', role: 'フレームワーク' },
  'nuxt': { name: 'Nuxt.js', role: 'フレームワーク' },
  'preact': { name: 'Preact', role: 'UIレンダリング' },
  'solid-js': { name: 'Solid', role: 'UIレンダリング' },
  'tailwindcss': { name: 'Tailwind CSS', role: 'スタイリング' },
  'bootstrap': { name: 'Bootstrap', role: 'スタイリング' },
  'typescript': { name: 'TypeScript', role: '言語' },
  'vite': { name: 'Vite', role: 'ビルドツール' },
  'webpack': { name: 'Webpack', role: 'ビルドツール' },
  'express': { name: 'Express', role: 'APIサーバー' },
  'fastapi': { name: 'FastAPI', role: 'APIサーバー' },
  'django': { name: 'Django', role: 'フレームワーク' },
  'flask': { name: 'Flask', role: 'APIサーバー' },
  'hono': { name: 'Hono', role: 'APIサーバー' },
  'three': { name: 'Three.js', role: '3D描画' },
  'd3': { name: 'D3.js', role: 'データ可視化' },
  'leaflet': { name: 'Leaflet', role: '地図表示' },
  'maplibre-gl': { name: 'MapLibre', role: '地図表示' },
  'ol': { name: 'OpenLayers', role: '地図表示' },
  'chart.js': { name: 'Chart.js', role: 'データ可視化' },
  'puppeteer': { name: 'Puppeteer', role: 'テスト/自動化' },
  'playwright': { name: 'Playwright', role: 'テスト/自動化' },
  'graphql': { name: 'GraphQL', role: 'API' },
  'prisma': { name: 'Prisma', role: 'ORM' },
  '@prisma/client': { name: 'Prisma', role: 'ORM' },
  'drizzle-orm': { name: 'Drizzle', role: 'ORM' },
  'firebase': { name: 'Firebase', role: 'BaaS' },
  '@supabase/supabase-js': { name: 'Supabase', role: 'BaaS' },
  'eslint': { name: 'ESLint', role: 'リンター' },
  'prettier': { name: 'Prettier', role: 'フォーマッター' },
  'socket.io': { name: 'WebSocket', role: 'リアルタイム通信' },
};

// File-based detection with roles
const FILE_BASED_TECH: Record<string, { name: string; role: string }> = {
  'Node.js': { name: 'Node.js', role: 'ランタイム' },
  'JavaScript': { name: 'JavaScript', role: '言語' },
  'Python': { name: 'Python', role: 'バックエンド言語' },
  'Go': { name: 'Go', role: 'バックエンド言語' },
  'Rust': { name: 'Rust', role: 'バックエンド言語' },
  'Docker': { name: 'Docker', role: 'コンテナ' },
  'Cloudflare': { name: 'Cloudflare', role: 'ホスティング' },
  'FastAPI': { name: 'FastAPI', role: 'APIサーバー' },
  'Django': { name: 'Django', role: 'フレームワーク' },
  'Flask': { name: 'Flask', role: 'APIサーバー' },
};

// Keywords to look for in README files
const README_KEYWORDS: Record<string, string[]> = {
  'React': ['react', 'jsx'],
  'Vue.js': ['vue', 'vuejs'],
  'Svelte': ['svelte'],
  'Astro': ['astro'],
  'Next.js': ['next.js', 'nextjs'],
  'Python': ['python', 'pip install'],
  'Go': ['golang', 'go mod'],
  'Rust': ['rust', 'cargo'],
  'Ruby': ['ruby', 'gem install'],
  'PHP': ['php', 'composer'],
  'Docker': ['docker', 'dockerfile', 'docker-compose'],
  'PostgreSQL': ['postgresql', 'postgres', 'psql'],
  'MySQL': ['mysql'],
  'MongoDB': ['mongodb', 'mongoose'],
  'Redis': ['redis'],
  'AWS': ['aws', 'amazon web services'],
  'Cloudflare': ['cloudflare', 'wrangler'],
  'Vercel': ['vercel'],
  'Netlify': ['netlify'],
};

const README_ROLES: Record<string, string> = {
  'React': 'UIレンダリング',
  'Vue.js': 'UIレンダリング',
  'Svelte': 'UIレンダリング',
  'Astro': 'フレームワーク',
  'Next.js': 'フレームワーク',
  'Python': 'バックエンド言語',
  'Go': 'バックエンド言語',
  'Rust': 'バックエンド言語',
  'Ruby': 'バックエンド言語',
  'PHP': 'バックエンド言語',
  'Docker': 'コンテナ',
  'PostgreSQL': 'データベース',
  'MySQL': 'データベース',
  'MongoDB': 'データベース',
  'Redis': 'キャッシュ/DB',
  'AWS': 'ホスティング',
  'Cloudflare': 'ホスティング',
  'Vercel': 'ホスティング',
  'Netlify': 'ホスティング',
};

export interface DetectedTech {
  name: string;
  role: string;
}

interface GitHubFile {
  content: string;
  encoding: string;
}

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

async function fetchGitHubFile(owner: string, repo: string, path: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'web-app-index' },
    });
    if (!res.ok) return null;
    const data = await res.json() as GitHubFile;
    if (data.encoding === 'base64') {
      return atob(data.content.replace(/\n/g, ''));
    }
    return data.content;
  } catch {
    return null;
  }
}

export async function detectTechFromGitHub(githubUrl: string): Promise<DetectedTech[]> {
  const parsed = parseGitHubUrl(githubUrl);
  if (!parsed) return [];

  const detected = new Map<string, string>(); // name -> role

  // Try package.json
  const packageJson = await fetchGitHubFile(parsed.owner, parsed.repo, 'package.json');
  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson);
      const deps = pkg.dependencies || {};
      const devDeps = pkg.devDependencies || {};
      const allDeps = { ...deps, ...devDeps };
      for (const [pkgName, tech] of Object.entries(PACKAGE_MAP)) {
        if (allDeps[pkgName]) {
          const isDevOnly = !deps[pkgName] && devDeps[pkgName];
          const role = isDevOnly ? 'ビルド/開発ツール' : tech.role;
          if (!detected.has(tech.name)) {
            detected.set(tech.name, role);
          }
        }
      }
      // Node.js project
      detected.set('Node.js', FILE_BASED_TECH['Node.js'].role);
      detected.set('JavaScript', FILE_BASED_TECH['JavaScript'].role);
    } catch { /* ignore parse errors */ }
  }

  // Try requirements.txt (Python)
  const requirements = await fetchGitHubFile(parsed.owner, parsed.repo, 'requirements.txt');
  if (requirements) {
    detected.set('Python', FILE_BASED_TECH['Python'].role);
    if (requirements.includes('fastapi')) detected.set('FastAPI', FILE_BASED_TECH['FastAPI'].role);
    if (requirements.includes('django')) detected.set('Django', FILE_BASED_TECH['Django'].role);
    if (requirements.includes('flask')) detected.set('Flask', FILE_BASED_TECH['Flask'].role);
  }

  // Try go.mod
  const goMod = await fetchGitHubFile(parsed.owner, parsed.repo, 'go.mod');
  if (goMod) detected.set('Go', FILE_BASED_TECH['Go'].role);

  // Try Cargo.toml
  const cargoToml = await fetchGitHubFile(parsed.owner, parsed.repo, 'Cargo.toml');
  if (cargoToml) detected.set('Rust', FILE_BASED_TECH['Rust'].role);

  // Try README.md
  const readme = await fetchGitHubFile(parsed.owner, parsed.repo, 'README.md');
  if (readme) {
    const lower = readme.toLowerCase();
    for (const [tech, keywords] of Object.entries(README_KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        if (!detected.has(tech)) {
          detected.set(tech, README_ROLES[tech] || '');
        }
      }
    }
  }

  // Check for Dockerfile
  const dockerfile = await fetchGitHubFile(parsed.owner, parsed.repo, 'Dockerfile');
  if (dockerfile) detected.set('Docker', FILE_BASED_TECH['Docker'].role);

  // Check for wrangler.toml (Cloudflare)
  const wrangler = await fetchGitHubFile(parsed.owner, parsed.repo, 'wrangler.toml');
  if (wrangler) detected.set('Cloudflare', FILE_BASED_TECH['Cloudflare'].role);

  return Array.from(detected.entries()).map(([name, role]) => ({ name, role }));
}
