import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';

// Helper to auto-resolve custom domain from CNAME (public/CNAME, ./CNAME) or environment
function resolveCustomDomain() {
  if (process.env.CUSTOM_DOMAIN && process.env.CUSTOM_DOMAIN.trim()) {
    return process.env.CUSTOM_DOMAIN.trim();
  }
  const cnamePaths = ['./public/CNAME', './CNAME'];
  for (const cnamePath of cnamePaths) {
    if (fs.existsSync(cnamePath)) {
      try {
        const content = fs.readFileSync(cnamePath, 'utf-8').trim();
        if (content) return content;
      } catch {
        // ignore read errors
      }
    }
  }
  return null;
}

const customDomain = resolveCustomDomain();
const isCustomDomain = Boolean(customDomain);
const isGitHubActions = Boolean(process.env.GITHUB_ACTIONS);

// GitHub repository info for GitHub Pages subpath (e.g. /erika-portfolio)
const githubRepo = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : 'erika-portfolio';
const githubOwner = process.env.GITHUB_REPOSITORY_OWNER || 'erikavictoriadane';

// Normalize custom domain to full HTTPS URL
const customDomainUrl = customDomain
  ? (customDomain.startsWith('http://') || customDomain.startsWith('https://') ? customDomain : `https://${customDomain}`).replace(/\/+$/, '')
  : null;

// Determine site URL:
// 1. Explicit SITE_URL env var
// 2. Auto-resolved CNAME custom domain (e.g. https://yourdomain.com)
// 3. Fallback GitHub Pages domain (https://<owner>.github.io)
const resolvedSite = process.env.SITE_URL || customDomainUrl || `https://${githubOwner}.github.io`;

// Determine base path:
// 1. Explicit BASE_PATH env var
// 2. If a custom domain is configured or local dev: '/'
// 3. If deploying via GitHub Actions without a custom domain: '/<repo-name>'
const resolvedBase = process.env.BASE_PATH || (isGitHubActions && !isCustomDomain ? `/${githubRepo}` : '/');

// Integration to ensure CNAME is always emitted into dist/ whenever a custom domain is detected
function cnameIntegration() {
  return {
    name: 'cname-sync',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        if (customDomain) {
          const cleanDomain = customDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
          const outCname = new URL('CNAME', dir);
          fs.writeFileSync(outCname, `${cleanDomain}\n`);
        }
      }
    }
  };
}

export default defineConfig({
  site: resolvedSite,
  base: resolvedBase,

  integrations: [svelte(), cnameIntegration()],

  vite: {
    plugins: [
      tailwindcss(),
      {
        name: 'artifact-dev-server',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const { artifactDevMiddleware } = await import('./src/dev/artifactDevMiddleware.mjs');
            return artifactDevMiddleware(req, res, next);
          });
        }
      }
    ]
  }
});