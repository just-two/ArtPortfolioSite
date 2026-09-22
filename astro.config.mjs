import { defineConfig } from 'astro/config';

// Environment-aware config. DEPLOY_ENV is set by the GitHub Actions workflow:
//   - 'prod' (or unset): production site served at the domain root.
//   - 'dev': staging site served under the /dev/ subpath of the same domain.
// Both environments share one GitHub Pages deployment (one repo, one Pages site),
// so they share an origin and differ only by base path.
const DEPLOY_ENV = process.env.DEPLOY_ENV || 'prod';
const isDev = DEPLOY_ENV === 'dev';

const SITE = 'https://tahsinloqman.com';

export default defineConfig({
  site: SITE,
  base: isDev ? '/dev' : '/',
});
