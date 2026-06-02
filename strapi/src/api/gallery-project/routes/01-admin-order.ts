/**
 * Admin-only routes backing the "Ordre galerie" page. `type: 'admin'` mounts
 * them under the admin namespace (no `/api` prefix) and protects them with the
 * admin authentication strategy, so the logged-in editor's session token grants
 * access — no public API token involved.
 */
export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/gallery-projects/order-list',
      handler: 'gallery-project.orderList',
      config: { policies: [] },
    },
    {
      method: 'PUT',
      path: '/gallery-projects/reorder',
      handler: 'gallery-project.reorder',
      config: { policies: [] },
    },
  ],
};
