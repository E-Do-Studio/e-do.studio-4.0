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
  'api::gallery-project.gallery-project': ['stage'],
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
    await ensurePublicReadPermissions(strapi);

    // Build the set of CT UIDs we want to clean up: orderable ones (to hide
    // `rank`) plus any CT that has DEPRECATED fields to hide.
    const allCtUids = new Set<string>([
      ...ORDERABLE_CONTENT_TYPES,
      ...Object.keys(HIDDEN_FIELDS_BY_CT),
    ]);

    for (const uid of allCtUids) {
      const storeKey = `plugin_content_manager_configuration_content_types::${uid}`;
      const fieldsToHide = new Set<string>([
        ...(ORDERABLE_CONTENT_TYPES.includes(uid) ? ['rank'] : []),
        ...(HIDDEN_FIELDS_BY_CT[uid] ?? []),
      ]);

      try {
        const raw = await strapi.store.get({ key: storeKey });
        if (!raw) continue;

        const config = typeof raw === 'string' ? JSON.parse(raw) : raw;
        let changed = false;

        for (const field of fieldsToHide) {
          if (config.metadatas?.[field]?.edit?.visible !== false) {
            config.metadatas = config.metadatas ?? {};
            config.metadatas[field] = {
              ...(config.metadatas[field] ?? {}),
              edit: { ...(config.metadatas[field]?.edit ?? {}), visible: false },
            };
            changed = true;
          }
        }

        if (Array.isArray(config.layouts?.edit)) {
          const filtered = config.layouts.edit
            .map((row: any[]) => row.filter((f: any) => !fieldsToHide.has(f.name)))
            .filter((row: any[]) => row.length > 0);

          if (JSON.stringify(filtered) !== JSON.stringify(config.layouts.edit)) {
            config.layouts.edit = filtered;
            changed = true;
          }
        }

        if (changed) {
          await strapi.store.set({ key: storeKey, value: config });
          strapi.log.info(`[bootstrap] Hidden ${fieldsToHide.size} field(s) on ${uid}.`);
        }
      } catch {
        // Config may not exist yet for new content types; next restart will catch it
      }
    }
  },
};
