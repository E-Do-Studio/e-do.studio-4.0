import type { Core } from '@strapi/strapi';

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
      // Origins are intentionally not hardcoded here. They are set per
      // environment in config/env/<NODE_ENV>/middlewares.ts (lodash merges
      // by index, so the middleware order must stay aligned across files).
      origin: [],
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
      // Lift the multipart parser ceiling so large media uploads (showreel
      // mp4 etc.) are not rejected by formidable before reaching the upload
      // plugin's own `sizeLimit`. Strapi's default is 200 MB; we mirror the
      // upload plugin's 256 MB cap configured in `config/plugins.ts`.
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
