import type { StrapiApp } from '@strapi/strapi/admin';
import { ListPlus } from '@strapi/icons';

export default {
  config: {
    locales: ['fr', 'en'],
  },
  bootstrap(app: StrapiApp) {
    app.addMenuLink({
      to: '/gallery-order',
      icon: ListPlus,
      intlLabel: {
        id: 'gallery-order.menu.label',
        defaultMessage: 'Ordre galerie',
      },
      permissions: [],
      Component: () => import('./pages/GalleryOrder'),
    });
  },
};
