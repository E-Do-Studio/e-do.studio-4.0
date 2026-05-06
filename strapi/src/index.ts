import type { Core } from '@strapi/strapi';

const ORDERABLE_CONTENT_TYPES = [
  'api::gallery-brand.gallery-brand',
  'api::gallery-category.gallery-category',
  'api::gallery-project.gallery-project',
  'api::machine.machine',
  'api::post-production-type.post-production-type',
];

const PUBLIC_COLLECTION_TYPES = [
  'api::blog-category.blog-category',
  'api::blog-post.blog-post',
  'api::gallery-brand.gallery-brand',
  'api::gallery-category.gallery-category',
  'api::gallery-project.gallery-project',
  'api::machine.machine',
  'api::post-production-type.post-production-type',
];

const PUBLIC_SINGLE_TYPES = [
  'api::cyclorama.cyclorama',
  'api::site-setting.site-setting',
];

const PUBLIC_PLUGIN_ACTIONS = [
  'plugin::users-permissions.user.me',
];

async function ensurePublicReadPermissions(strapi: Core.Strapi) {
  const publicRole = await strapi
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });

  if (!publicRole) {
    strapi.log.warn('[bootstrap] Public role not found; skipping permission sync.');
    return;
  }

  const desiredActions: string[] = [];
  for (const uid of PUBLIC_COLLECTION_TYPES) {
    desiredActions.push(`${uid}.find`, `${uid}.findOne`);
  }
  for (const uid of PUBLIC_SINGLE_TYPES) {
    desiredActions.push(`${uid}.find`);
  }
  desiredActions.push(...PUBLIC_PLUGIN_ACTIONS);

  let granted = 0;
  for (const action of desiredActions) {
    const existing = await strapi
      .query('plugin::users-permissions.permission')
      .findOne({ where: { action, role: publicRole.id } });

    if (existing) continue;

    await strapi.query('plugin::users-permissions.permission').create({
      data: { action, role: publicRole.id },
    });
    granted++;
  }

  if (granted > 0) {
    strapi.log.info(`[bootstrap] Granted ${granted} public permission(s).`);
  }
}

export default {
  register() {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensurePublicReadPermissions(strapi);

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
