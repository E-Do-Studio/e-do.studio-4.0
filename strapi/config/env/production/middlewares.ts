import type { Core } from '@strapi/strapi';

// Default origins always allowed in production. Additional origins (preview
// URLs, self-hosted deploys with random subdomains, etc.) can be appended via
// the CORS_ORIGINS env var as a comma-separated list, e.g.:
//   CORS_ORIGINS=http://abc.sslip.io,https://staging.example.com
// No code change required when the website moves or a new preview URL appears.
const DEFAULT_ORIGINS = [
  'https://e-do.studio',
  'https://www.e-do.studio',
  'https://cms.e-do.studio',
];

const EXTRA_ORIGINS = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = [...DEFAULT_ORIGINS, ...EXTRA_ORIGINS];

const config: Core.Config.Middlewares = [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': [
            "'self'",
            'https://cms.e-do.studio',
            'https://pub-9b79de66b20440cdb7e8bae53605296c.r2.dev',
          ],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'https://pub-9b79de66b20440cdb7e8bae53605296c.r2.dev',
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            'https://pub-9b79de66b20440cdb7e8bae53605296c.r2.dev',
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      origin: ALLOWED_ORIGINS,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
      keepHeaderOnError: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      // See `config/middlewares.ts` for rationale — must stay aligned with the
      // base config because lodash merges this array by index in Strapi 5, so
      // any override here replaces the base entry at the same position.
      formidable: {
        maxFileSize: 256 * 1024 * 1024,
      },
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;
