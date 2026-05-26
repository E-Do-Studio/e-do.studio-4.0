import type { Core } from '@strapi/strapi';

// Routes the public website exposes, keyed by the locale segment Strapi
// passes us. Mirrors `SCREEN_TO_PATH` in `src/router.tsx` so editors land
// on the right page when they click "Open preview" in the Strapi admin.
const PATH_BY_UID: Record<string, (lang: string, slug?: string) => string> = {
  'api::home-hero.home-hero': (l) => `/${l}`,
  'api::site-setting.site-setting': (l) => `/${l}`,
  'api::machine.machine': (l, slug) => (slug ? (slug === 'cyclorama' ? `/${l}/cyclorama` : `/${l}/plateau/${slug}`) : `/${l}`),
  'api::post-production-type.post-production-type': (l) => `/${l}/post-production`,
  'api::gallery-project.gallery-project': (l) => `/${l}/galerie`,
  'api::gallery-category.gallery-category': (l) => `/${l}/galerie`,
  'api::gallery-brand.gallery-brand': (l) => `/${l}/galerie`,
  'api::blog-post.blog-post': (l) => `/${l}/discovery`,
  'api::blog-category.blog-category': (l) => `/${l}/discovery`,
  'api::contact-subject.contact-subject': (l) => `/${l}/contact`,
  'api::team-member.team-member': (l) => `/${l}/contact`,
  'api::legal-section.legal-section': (l) => `/${l}/legal`,
};

// UIDs that carry a per-entry slug we want in the preview URL.
const SLUGGED_UIDS = new Set(['api::machine.machine']);

const SUPPORTED_LOCALES = new Set(['fr', 'en']);

function normalizeLocale(locale: string | undefined): string {
  if (!locale) return 'fr';
  const short = locale.toLowerCase().split('-')[0];
  return SUPPORTED_LOCALES.has(short) ? short : 'fr';
}

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Admin => {
  // CLIENT_URL can be a comma-separated list so previews work on prod,
  // staging, and any Vercel preview deploy without code changes.
  const clientUrls = env('CLIENT_URL', 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const previewSecret = env('PREVIEW_SECRET', '');

  return {
    auth: {
      secret: env('ADMIN_JWT_SECRET'),
    },
    apiToken: {
      salt: env('API_TOKEN_SALT'),
    },
    transfer: {
      token: {
        salt: env('TRANSFER_TOKEN_SALT'),
      },
    },
    secrets: {
      encryptionKey: env('ENCRYPTION_KEY'),
    },
    flags: {
      nps: env.bool('FLAG_NPS', false),
      promoteEE: env.bool('FLAG_PROMOTE_EE', false),
    },
    preview: {
      enabled: env.bool('PREVIEW_ENABLED', !!previewSecret),
      config: {
        allowedOrigins: clientUrls,
        async handler(uid, { documentId, locale, status }) {
          const resolve = PATH_BY_UID[uid];
          if (!resolve) return null;
          const lang = normalizeLocale(locale);
          let slug: string | undefined;
          if (SLUGGED_UIDS.has(uid) && documentId) {
            try {
              const entry = await strapi.documents(uid as never).findOne({
                documentId,
                locale,
                status,
                fields: ['slug'],
              } as never);
              const value = (entry as { slug?: string } | null)?.slug;
              if (typeof value === 'string' && value.length > 0) slug = value;
            } catch {
              // Fall through — handler returns the section root without a slug.
            }
          }
          const path = resolve(lang, slug);
          const base = clientUrls[0] ?? '';
          const url = new URL(path, base || 'http://localhost:5173');
          url.searchParams.set('preview', '1');
          url.searchParams.set('status', status === 'published' ? 'published' : 'draft');
          if (previewSecret) url.searchParams.set('secret', previewSecret);
          return url.toString();
        },
      },
    },
  };
};

export default config;
