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
      origin: [
        'https://e-do.studio',
        'https://www.e-do.studio',
        'https://cms.e-do.studio',
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
      keepHeaderOnError: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;
