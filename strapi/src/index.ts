import type { Core } from '@strapi/strapi';

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
  'api::site-setting.site-setting',
  'api::home-hero.home-hero',
];

// users-permissions plugin removed (board decision 2026-05-07): the public
// website now reads Strapi via a read-only API token instead of the public
// role. PUBLIC_COLLECTION_TYPES / PUBLIC_SINGLE_TYPES kept for documentation
// purposes only — they no longer drive any bootstrap action.

/**
 * DEPRECATED fields hidden from the Content Manager edit view at boot.
 * Each entry maps a content-type UID to the list of attribute names that
 * have been replaced by a structured component or a renamed field, but
 * cannot be dropped from the schema yet because either the front falls
 * back to them when the new field is empty, or because the data
 * migration has not run on prod. Hiding them keeps the editor UX
 * uncluttered without losing the data.
 */
const HIDDEN_FIELDS_BY_CT: Record<string, string[]> = {
  // `displayOrder` is set exclusively from the "Ordre galerie" admin page
  // (drag-and-drop), never typed by hand — hide it from the edit view.
  'api::gallery-project.gallery-project': ['displayOrder'],
  'api::machine.machine': ['pricing', 'operatorPricing'],
  'api::post-production-type.post-production-type': ['price'],
  'api::site-setting.site-setting': [
    'phoneHref',
    'fullAddress',
    'openingHoursSpec',
    'street',
    'city',
    'postalCode',
    'country',
    'hours',
    'weekendHours',
  ],
};

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

// ensurePublicReadPermissions removed: users-permissions plugin uninstalled.
// The public website now authenticates with a read-only API token instead.
// API tokens are managed in Settings → API Tokens (admin) and grant scoped
// access independently of the public role concept.

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    subscribeAltTextLifecycle(strapi);
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensureLocales(strapi);
    await hideContentManagerFields(strapi);
    registerGalleryOrderRoutes(strapi);
  },
};

/**
 * Register the admin-authenticated endpoints backing the "Ordre galerie" page.
 *
 * They can't live in `src/api/gallery-project/routes/` because Strapi forces
 * every API-folder router to `type: 'content-api'` (see
 * @strapi/core register-routes.js → registerAPIRoutes), which would mount them
 * under `/api` behind a content-API token instead of the admin session.
 * Registering them here as `type: 'admin'` mounts them at the root, protected
 * by the admin auth strategy — exactly what the admin page's fetch client uses.
 */
function registerGalleryOrderRoutes(strapi: Core.Strapi) {
  strapi.server.routes({
    type: 'admin',
    routes: [
      {
        method: 'GET',
        path: '/gallery-projects/order-list',
        handler: 'gallery-project.orderList',
        config: { policies: [] },
        info: { apiName: 'gallery-project' },
      },
      {
        method: 'PUT',
        path: '/gallery-projects/reorder',
        handler: 'gallery-project.reorder',
        config: { policies: [] },
        info: { apiName: 'gallery-project' },
      },
    ],
  });
}

/**
 * Force-hide deprecated fields from the Content Manager edit view at boot.
 * The previous implementation read directly from `strapi.store` and skipped
 * when no config existed yet — but that's exactly the case where the user
 * sees the unwanted field on first admin open. This version uses the
 * content-manager service, which auto-synthesises a default config from the
 * schema when none is stored, so the patch always applies.
 */
async function hideContentManagerFields(strapi: Core.Strapi) {
  for (const [uid, fields] of Object.entries(HIDDEN_FIELDS_BY_CT)) {
    const fieldsToHide = new Set<string>(fields);
    if (fieldsToHide.size === 0) continue;

    try {
      await applyHiddenFields(strapi, uid, fieldsToHide);
    } catch (err) {
      strapi.log.warn(
        `[bootstrap] Could not hide fields on ${uid}: ${(err as Error).message}`,
      );
    }
  }
}

async function applyHiddenFields(
  strapi: Core.Strapi,
  uid: string,
  fieldsToHide: Set<string>,
) {
  const storeKey = `plugin_content_manager_configuration_content_types::${uid}`;
  const stored = await strapi.store.get({ key: storeKey });
  // If nothing is stored yet, synthesise a minimal config that the admin will
  // merge with its schema-derived defaults on first open.
  const config: any = stored
    ? typeof stored === 'string'
      ? JSON.parse(stored)
      : stored
    : {
        uid,
        settings: {},
        metadatas: {},
        layouts: { list: [], edit: [], editRelations: [] },
      };

  config.metadatas = config.metadatas ?? {};
  for (const field of fieldsToHide) {
    const current = config.metadatas[field] ?? {};
    config.metadatas[field] = {
      edit: {
        ...(current.edit ?? {}),
        visible: false,
        // `editable: false` is a belt-and-braces flag: even if some admin
        // build still renders the input, it stays disabled.
        editable: false,
      },
      list: { ...(current.list ?? {}), searchable: false, sortable: false },
    };
  }

  // Strip the field from every stored layout array — edit, editRelations, list.
  for (const layoutKey of ['edit', 'editRelations'] as const) {
    if (Array.isArray(config.layouts?.[layoutKey])) {
      config.layouts[layoutKey] = config.layouts[layoutKey]
        .map((row: any) =>
          Array.isArray(row)
            ? row.filter((f: any) => !fieldsToHide.has(f?.name))
            : row,
        )
        .filter((row: any) => !Array.isArray(row) || row.length > 0);
    }
  }
  if (Array.isArray(config.layouts?.list)) {
    config.layouts.list = config.layouts.list.filter(
      (f: any) => !fieldsToHide.has(typeof f === 'string' ? f : f?.name),
    );
  }

  await strapi.store.set({ key: storeKey, value: config });
  strapi.log.info(
    `[bootstrap] Hidden ${[...fieldsToHide].join(', ')} on ${uid}.`,
  );
}
