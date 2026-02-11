// Maps npm package names to tech stack names (matching seed.sql)
const PACKAGE_MAP: Record<string, string> = {
  'react': 'React',
  'react-dom': 'React',
  'vue': 'Vue.js',
  'svelte': 'Svelte',
  '@sveltejs/kit': 'SvelteKit',
  'astro': 'Astro',
  '@angular/core': 'Angular',
  'next': 'Next.js',
  'nuxt': 'Nuxt.js',
  'preact': 'Preact',
  'solid-js': 'Solid',
  'tailwindcss': 'Tailwind CSS',
  'bootstrap': 'Bootstrap',
  'typescript': 'TypeScript',
  'vite': 'Vite',
  'webpack': 'Webpack',
  'express': 'Express',
  'fastapi': 'FastAPI',
  'django': 'Django',
  'flask': 'Flask',
  'hono': 'Hono',
  'three': 'Three.js',
  'd3': 'D3.js',
  'leaflet': 'Leaflet',
  'maplibre-gl': 'MapLibre',
  'ol': 'OpenLayers',
  'chart.js': 'Chart.js',
  'puppeteer': 'Puppeteer',
  'playwright': 'Playwright',
  'graphql': 'GraphQL',
  'prisma': 'Prisma',
  '@prisma/client': 'Prisma',
  'drizzle-orm': 'Drizzle',
  'firebase': 'Firebase',
  '@supabase/supabase-js': 'Supabase',
  'eslint': 'ESLint',
  'prettier': 'Prettier',
  'socket.io': 'WebSocket',
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

export async function detectTechFromGitHub(githubUrl: string): Promise<string[]> {
  const parsed = parseGitHubUrl(githubUrl);
  if (!parsed) return [];

  const detected = new Set<string>();

  // Try package.json
  const packageJson = await fetchGitHubFile(parsed.owner, parsed.repo, 'package.json');
  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const [pkgName, techName] of Object.entries(PACKAGE_MAP)) {
        if (allDeps[pkgName]) detected.add(techName);
      }
      // Node.js project
      detected.add('Node.js');
      detected.add('JavaScript');
    } catch { /* ignore parse errors */ }
  }

  // Try requirements.txt (Python)
  const requirements = await fetchGitHubFile(parsed.owner, parsed.repo, 'requirements.txt');
  if (requirements) {
    detected.add('Python');
    if (requirements.includes('fastapi')) detected.add('FastAPI');
    if (requirements.includes('django')) detected.add('Django');
    if (requirements.includes('flask')) detected.add('Flask');
  }

  // Try go.mod
  const goMod = await fetchGitHubFile(parsed.owner, parsed.repo, 'go.mod');
  if (goMod) detected.add('Go');

  // Try Cargo.toml
  const cargoToml = await fetchGitHubFile(parsed.owner, parsed.repo, 'Cargo.toml');
  if (cargoToml) detected.add('Rust');

  // Try README.md
  const readme = await fetchGitHubFile(parsed.owner, parsed.repo, 'README.md');
  if (readme) {
    const lower = readme.toLowerCase();
    for (const [tech, keywords] of Object.entries(README_KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        detected.add(tech);
      }
    }
  }

  // Check for Dockerfile
  const dockerfile = await fetchGitHubFile(parsed.owner, parsed.repo, 'Dockerfile');
  if (dockerfile) detected.add('Docker');

  // Check for wrangler.toml (Cloudflare)
  const wrangler = await fetchGitHubFile(parsed.owner, parsed.repo, 'wrangler.toml');
  if (wrangler) detected.add('Cloudflare');

  return Array.from(detected);
}
