import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';

// Check if a custom domain CNAME is present in public/ or root
const hasCname = fs.existsSync('./public/CNAME') || fs.existsSync('./CNAME');
const isCustomDomain = hasCname || Boolean(process.env.CUSTOM_DOMAIN);
const isGitHubActions = Boolean(process.env.GITHUB_ACTIONS);

// Default GitHub repo name for GitHub Pages subpath (e.g. /astro_portfolio)
const repoName = 'astro_portfolio';

export default defineConfig({
  // When deploying to GitHub Pages without a custom domain, base is /<repoName>
  // When a custom domain is added or in local dev, base is '/'
  site: process.env.SITE_URL || (isCustomDomain ? 'https://example.com' : 'https://adamSumi.github.io'),
  base: process.env.BASE_PATH || (isGitHubActions && !isCustomDomain ? `/${repoName}` : '/'),

  integrations: [svelte()],

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