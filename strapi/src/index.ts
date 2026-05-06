import type { Core } from '@strapi/strapi';

const ORDERABLE_CONTENT_TYPES = [
  'api::gallery-brand.gallery-brand',
  'api::gallery-category.gallery-category',
  'api::gallery-project.gallery-project',
  'api::machine.machine',
  'api::post-production-type.post-production-type',
];

export default {
  register() {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    for (const uid of ORDERABLE_CONTENT_TYPES) {
      const storeKey = `plugin_content_manager_configuration_content_types::${uid}`;

      try {
        const raw = await strapi.store.get({ key: storeKey });
        if (!raw) continue;

        const config = typeof raw === 'string' ? JSON.parse(raw) : raw;
        let changed = false;

        if (config.metadatas?.rank?.edit?.visible !== false) {
          config.metadatas = config.metadatas ?? {};
          config.metadatas.rank = {
            ...(config.metadatas.rank ?? {}),
            edit: { ...(config.metadatas.rank?.edit ?? {}), visible: false },
          };
          changed = true;
        }

        if (Array.isArray(config.layouts?.edit)) {
          const filtered = config.layouts.edit
            .map((row: any[]) => row.filter((f: any) => f.name !== 'rank'))
            .filter((row: any[]) => row.length > 0);

          if (JSON.stringify(filtered) !== JSON.stringify(config.layouts.edit)) {
            config.layouts.edit = filtered;
            changed = true;
          }
        }

        if (changed) {
          await strapi.store.set({ key: storeKey, value: config });
        }
      } catch {
        // Config may not exist yet for new content types; next restart will catch it
      }
    }
  },
};
