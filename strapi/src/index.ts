import type { Core } from '@strapi/strapi';

const ORDERABLE_CONTENT_TYPES = [
  'api::gallery-brand.gallery-brand',
  'api::gallery-category.gallery-category',
  'api::gallery-project.gallery-project',
  'api::machine.machine',
  'api::post-production-type.post-production-type',
  'api::team-member.team-member',
  'api::contact-subject.contact-subject',
  'api::legal-section.legal-section',
];

const PUBLIC_COLLECTION_TYPES = [
  'api::blog-category.blog-category',
  'api::blog-post.blog-post',
  'api::gallery-brand.gallery-brand',
  'api::gallery-category.gallery-category',
  'api::gallery-project.gallery-project',
  'api::machine.machine',
  'api::post-production-type.post-production-type',
  'api::team-member.team-member',
  'api::contact-subject.contact-subject',
  'api::legal-section.legal-section',
];

const PUBLIC_SINGLE_TYPES = [
  'api::cyclorama.cyclorama',
  'api::site-setting.site-setting',
];

const PUBLIC_PLUGIN_ACTIONS = [
  'plugin::users-permissions.user.me',
];

/**
 * STRICT_IMAGE_ALT_TEXT: when "true", reject any update to an image upload
 * (mime starts with image/) whose alternativeText is empty. When unset or
 * "false", just warn in logs. Defaults to warn-only so existing data without
 * alt text does not break editor workflow on day 1.
 */
const STRICT_IMAGE_ALT_TEXT = process.env.STRICT_IMAGE_ALT_TEXT === 'true';

function subscribeAltTextLifecycle(strapi: Core.Strapi) {
  // @ts-ignore db.lifecycles is not in the public typings yet
  strapi.db.lifecycles.subscribe({
    models: ['plugin::upload.file'],
    async beforeUpdate(event: any) {
      const data = event.params?.data ?? {};
      const where = event.params?.where ?? {};
      const mime: string | undefined = data.mime ?? (await strapi.db
        .query('plugin::upload.file')
        .findOne({ where }))?.mime;
      if (!mime || !mime.startsWith('image/')) return;
      const altText = data.alternativeText;
      // Only act when alt text is being explicitly set to empty.
      if (altText !== undefined && (altText === null || String(altText).trim() === '')) {
        const message = `[upload] alternativeText is empty for image ${where?.id ?? '?'} (${data.name ?? mime}).`;
        if (STRICT_IMAGE_ALT_TEXT) {
          throw new Error(`${message} Set STRICT_IMAGE_ALT_TEXT=false to disable enforcement.`);
        }
        strapi.log.warn(message);
      }
    },
  });
}

/**
 * Ensure the i18n plugin has the locales the website needs (FR, EN) and that
 * `fr` is the default. Strapi 5 only seeds one locale on first install (the
 * one returned by detect-locale, which often defaults to `en`). The audit
 * I13 flagged that prod was running with `en` as the only locale despite
 * every content-type being localized FR/EN — editors can't create FR
 * entries until the locale exists.
 */
async function ensureLocales(strapi: Core.Strapi) {
  const i18nPlugin = strapi.plugin('i18n');
  if (!i18nPlugin) {
    strapi.log.warn('[bootstrap] i18n plugin not loaded; skipping locale sync.');
    return;
  }
  const localesService = i18nPlugin.service('locales') as
    | undefined
    | {
        find: () => Promise<Array<{ id: number; code: string; name: string; isDefault: boolean }>>;
        create: (data: { code: string; name: string; isDefault?: boolean }) => Promise<unknown>;
        setDefaultLocale: (data: { code: string }) => Promise<unknown>;
      };
  if (!localesService?.find) {
    strapi.log.warn('[bootstrap] i18n locales service unavailable; skipping locale sync.');
    return;
  }

  const desired = [
    { code: 'fr', name: 'French (fr)', shouldBeDefault: true },
    { code: 'en', name: 'English (en)' },
  ];

  let existing: Array<{ code: string; isDefault: boolean }> = [];
  try {
    existing = await localesService.find();
  } catch (err) {
    strapi.log.warn(`[bootstrap] Could not list locales: ${(err as Error).message}`);
    return;
  }

  for (const want of desired) {
    if (existing.some((l) => l.code === want.code)) continue;
    try {
      await localesService.create({
        code: want.code,
        name: want.name,
        isDefault: !!want.shouldBeDefault,
      });
      strapi.log.info(`[bootstrap] Created locale ${want.code}.`);
    } catch (err) {
      strapi.log.warn(`[bootstrap] Could not create locale ${want.code}: ${(err as Error).message}`);
    }
  }

  // Re-read to make sure the default is correct even if FR already existed
  // but wasn't flagged default.
  try {
    const after = await localesService.find();
    const fr = after.find((l) => l.code === 'fr');
    if (fr && !fr.isDefault) {
      await localesService.setDefaultLocale({ code: 'fr' });
      strapi.log.info('[bootstrap] Set fr as the default locale.');
    }
  } catch (err) {
    strapi.log.warn(`[bootstrap] Could not enforce fr as default locale: ${(err as Error).message}`);
  }
}

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
  register({ strapi }: { strapi: Core.Strapi }) {
    subscribeAltTextLifecycle(strapi);
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensureLocales(strapi);
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
