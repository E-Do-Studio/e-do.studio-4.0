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
 *
 * Always-hidden globally:
 *   `rank` — managed by the drag-and-drop plugin, not editable directly.
 */
const HIDDEN_FIELDS_BY_CT: Record<string, string[]> = {
  'api::blog-post.blog-post': ['cta_text', 'cta_label', 'cta_url', 'seo_title', 'seo_description', 'seo_image'],
  'api::cyclorama.cyclorama': ['pricing'],
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
    await ensureGalleryProjectListColumns(strapi);
  },
};

/**
 * Make `media` a visible column in the Content Manager list view of
 * `gallery-project`, inserted right after `slug`. The collection is large (70+
 * entries) and pure text columns (id / slug / stage / available_in / status)
 * make it impossible to recognise a project at a glance; Strapi 5 renders a
 * thumbnail strip for `media` cells natively, so the cheapest fix is to push
 * the column into the stored list layout and let Strapi render the preview.
 *
 * Uses the content-manager `content-types` service when available because it
 * returns the schema-derived default config merged with whatever is stored —
 * that way we never overwrite the full list with a config that only has our
 * column. Falls back to a direct `strapi.store` write for resilience.
 */
async function ensureGalleryProjectListColumns(strapi: Core.Strapi) {
  const uid = 'api::gallery-project.gallery-project';
  const contentType = strapi.contentType(uid as any);
  if (!contentType) {
    strapi.log.warn(`[bootstrap] Content type ${uid} not found; skipping media list column.`);
    return;
  }

  try {
    const ctService = strapi.plugin('content-manager')?.service('content-types') as
      | undefined
      | {
          findConfiguration: (ct: any) => Promise<any>;
          updateConfiguration: (ct: any, config: any) => Promise<any>;
        };

    if (ctService?.findConfiguration && ctService?.updateConfiguration) {
      const configuration = await ctService.findConfiguration(contentType);
      const next = withMediaListColumn(configuration);
      if (next) {
        await ctService.updateConfiguration(contentType, next);
        strapi.log.info(
          `[bootstrap] Added media column to ${uid} list view (via content-manager service).`,
        );
      }
      return;
    }
  } catch (err) {
    strapi.log.warn(
      `[bootstrap] content-manager update failed for ${uid}: ${(err as Error).message}. Falling back to store.`,
    );
  }

  try {
    const storeKey = `plugin_content_manager_configuration_content_types::${uid}`;
    const stored = await strapi.store.get({ key: storeKey });
    const baseConfig: any = stored
      ? typeof stored === 'string'
        ? JSON.parse(stored)
        : stored
      : {
          uid,
          settings: {},
          metadatas: {},
          layouts: { list: [], edit: [], editRelations: [] },
        };
    const next = withMediaListColumn(baseConfig);
    if (!next) return;
    await strapi.store.set({ key: storeKey, value: next });
    strapi.log.info(`[bootstrap] Added media column to ${uid} list view (via store).`);
  } catch (err) {
    strapi.log.warn(
      `[bootstrap] Could not add media column to ${uid}: ${(err as Error).message}`,
    );
  }
}

/**
 * Return a clone of the configuration with `media` inserted after `slug` in
 * the list layout, plus list metadata for the column. Returns `null` when
 * `media` is already present so the caller can skip the write.
 */
function withMediaListColumn(configuration: any): any | null {
  const getName = (entry: any): string | undefined =>
    typeof entry === 'string' ? entry : entry?.name;

  const next = { ...configuration };
  next.layouts = { ...(configuration.layouts ?? {}) };
  const list: any[] = Array.isArray(next.layouts.list) ? [...next.layouts.list] : [];

  if (list.some((f) => getName(f) === 'media')) {
    return null;
  }

  const slugIdx = list.findIndex((f) => getName(f) === 'slug');
  const insertIdx = slugIdx >= 0 ? slugIdx + 1 : Math.min(2, list.length);
  list.splice(insertIdx, 0, 'media');
  next.layouts.list = list;

  next.metadatas = { ...(configuration.metadatas ?? {}) };
  const existingMediaMeta = next.metadatas.media ?? {};
  next.metadatas.media = {
    edit: { ...(existingMediaMeta.edit ?? {}) },
    list: {
      ...(existingMediaMeta.list ?? {}),
      label: existingMediaMeta.list?.label ?? 'Aperçu',
      // Media fields are neither searchable as text nor sortable in any
      // meaningful way, so disable both to avoid broken UI affordances.
      searchable: false,
      sortable: false,
    },
  };

  return next;
}

/**
 * Force-hide `rank` (and any deprecated fields) from the Content Manager edit
 * view. The previous implementation read directly from `strapi.store` and
 * skipped when no config existed yet — but that's exactly the case where the
 * user sees the unwanted field on first admin open. This version uses the
 * content-manager service, which auto-synthesises a default config from the
 * schema when none is stored, so the patch always applies.
 */
async function hideContentManagerFields(strapi: Core.Strapi) {
  const allCtUids = new Set<string>([
    ...ORDERABLE_CONTENT_TYPES,
    ...Object.keys(HIDDEN_FIELDS_BY_CT),
  ]);

  for (const uid of allCtUids) {
    const fieldsToHide = new Set<string>([
      ...(ORDERABLE_CONTENT_TYPES.includes(uid) ? ['rank'] : []),
      ...(HIDDEN_FIELDS_BY_CT[uid] ?? []),
    ]);
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
