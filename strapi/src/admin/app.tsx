import type { StrapiApp } from '@strapi/strapi/admin';

export default {
  config: {
    locales: ['fr', 'en'],
  },
  bootstrap(_app: StrapiApp) {},
};
