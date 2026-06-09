import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import {
  META,
  PRERENDER_ROUTE_PAIRS,
  SITE_ORIGIN,
  escapeHtmlAttr,
} from './src/lib/seo-meta';
import type { Lang } from './src/types';

function gtmTags(gtmId: string | undefined): Plugin {
  return {
    name: 'edo-gtm-tags',
    transformIndexHtml(html) {
      const id = gtmId?.trim();
      if (!id) return html;
      const safeId = id.replace(/"/g, '&quot;');
      const encodedId = encodeURIComponent(safeId);
      const headScript = `<!-- Google Tag Manager -->\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${safeId}');</script>\n<!-- End Google Tag Manager -->`;
      const bodyTag = `<!-- Google Tag Manager (noscript) --><noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${encodedId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript><!-- End Google Tag Manager (noscript) -->`;
      return html
        .replace('</head>', `${headScript}\n</head>`)
        .replace('<body>', `<body>\n${bodyTag}`);
    },
  };
}

interface RouteRenderInput {
  lang: Lang;
  title: string;
  description: string;
  canonicalUrl: string;
  hreflangFr: string;
  hreflangEn: string;
}

// Substitute the per-route SEO surface inside a copy of the built index.html.
// Non-JS crawlers (AI bots, social scrapers) get the correct title, description,
// canonical, hreflang, OG card. The runtime useDocumentMeta hook re-applies the
// same values on hydration so there's no flash and SPA navigation stays in sync.
function applyRouteMeta(html: string, input: RouteRenderInput): string {
  const { lang, title, description, canonicalUrl, hreflangFr, hreflangEn } = input;
  const titleEsc = escapeHtmlAttr(title);
  const descEsc = escapeHtmlAttr(description);
  const ogLocale = lang === 'en' ? 'en_US' : 'fr_FR';
  const ogLocaleAlt = lang === 'en' ? 'fr_FR' : 'en_US';

  let out = html;

  out = out.replace(/<html\s+lang="[^"]*">/i, `<html lang="${lang}">`);
  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${titleEsc}</title>`);

  out = out.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${descEsc}"/>`,
  );

  // Replace the canonical placeholder comment (or insert before </head> if absent).
  const canonicalTag = `<link rel="canonical" href="${canonicalUrl}"/>`;
  if (/<!--[\s\S]*?Canonical is intentionally NOT shipped[\s\S]*?-->/.test(out)) {
    out = out.replace(/<!--[\s\S]*?Canonical is intentionally NOT shipped[\s\S]*?-->/, canonicalTag);
  } else if (!/<link\s+rel="canonical"/i.test(out)) {
    out = out.replace('</head>', `${canonicalTag}\n</head>`);
  } else {
    out = out.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, canonicalTag);
  }

  out = out.replace(
    /<link\s+rel="alternate"\s+hreflang="fr"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="alternate" hreflang="fr" href="${hreflangFr}"/>`,
  );
  out = out.replace(
    /<link\s+rel="alternate"\s+hreflang="en"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="alternate" hreflang="en" href="${hreflangEn}"/>`,
  );
  out = out.replace(
    /<link\s+rel="alternate"\s+hreflang="x-default"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="alternate" hreflang="x-default" href="${hreflangFr}"/>`,
  );

  out = out.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${titleEsc}"/>`,
  );
  out = out.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${descEsc}"/>`,
  );
  out = out.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${canonicalUrl}"/>`,
  );
  out = out.replace(
    /<meta\s+property="og:locale"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:locale" content="${ogLocale}"/>`,
  );
  out = out.replace(
    /<meta\s+property="og:locale:alternate"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:locale:alternate" content="${ogLocaleAlt}"/>`,
  );

  out = out.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${titleEsc}"/>`,
  );
  out = out.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${descEsc}"/>`,
  );

  return out;
}

// Variant of applyRouteMeta for error pages (404, etc.). Bakes noindex into the
// static HTML so non-JS crawlers honor it, and strips canonical + hreflang
// alternates (a noindex page must not self-canonicalize or hint at language
// equivalents — these URLs should stay out of the index).
function applyErrorMeta(html: string, input: { lang: Lang; title: string; description: string }): string {
  const { lang, title, description } = input;
  const titleEsc = escapeHtmlAttr(title);
  const descEsc = escapeHtmlAttr(description);
  const ogLocale = lang === 'en' ? 'en_US' : 'fr_FR';

  let out = html;

  out = out.replace(/<html\s+lang="[^"]*">/i, `<html lang="${lang}">`);
  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${titleEsc}</title>`);

  out = out.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${descEsc}"/>`,
  );

  out = out.replace(
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="robots" content="noindex, nofollow"/>`,
  );

  // Strip canonical placeholder comment + any hreflang alternates.
  out = out.replace(/<!--[\s\S]*?Canonical is intentionally NOT shipped[\s\S]*?-->\s*/i, '');
  out = out.replace(/<link\s+rel="alternate"\s+hreflang="[^"]*"\s+href="[^"]*"\s*\/?>\s*/gi, '');

  out = out.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${titleEsc}"/>`,
  );
  out = out.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${descEsc}"/>`,
  );
  out = out.replace(
    /<meta\s+property="og:locale"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:locale" content="${ogLocale}"/>`,
  );
  out = out.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${titleEsc}"/>`,
  );
  out = out.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${descEsc}"/>`,
  );

  return out;
}

// Build-time prerender: writes dist/{route}/index.html for every public FR/EN
// route, each with its own meta/canonical/OG. Caddy is configured to serve the
// nested index.html via `try_files {path} {path}/index.html /index.html`.
function edoPrerender(): Plugin {
  return {
    name: 'edo-prerender',
    apply: 'build',
    enforce: 'post',
    async closeBundle() {
      const distDir = path.resolve('dist');
      const baseHtmlPath = path.join(distDir, 'index.html');
      let baseHtml: string;
      try {
        baseHtml = await fs.readFile(baseHtmlPath, 'utf8');
      } catch {
        return; // dev / no dist
      }

      let written = 0;
      for (const pair of PRERENDER_ROUTE_PAIRS) {
        const meta = META[pair.metaKey];
        if (!meta) continue;
        const hreflangFr = `${SITE_ORIGIN}${pair.fr}`;
        const hreflangEn = `${SITE_ORIGIN}${pair.en}`;

        for (const lang of ['fr', 'en'] as const) {
          const routePath = lang === 'fr' ? pair.fr : pair.en;
          const html = applyRouteMeta(baseHtml, {
            lang,
            title: meta[lang].title,
            description: meta[lang].description,
            canonicalUrl: `${SITE_ORIGIN}${routePath}`,
            hreflangFr,
            hreflangEn,
          });
          const outDir = path.join(distDir, routePath.slice(1));
          const outFile = path.join(outDir, 'index.html');
          await fs.mkdir(outDir, { recursive: true });
          await fs.writeFile(outFile, html, 'utf8');
          written += 1;
        }
      }
      this.info(`edo-prerender: wrote ${written} per-route HTML files`);

      // 404 pages: bilingual prerender with noindex baked in so non-JS crawlers
      // see the right signal. Caddy serves /fr/404.html with status 404 for
      // top-level invalid paths; /404.html is the FR fallback at root.
      const notFoundMeta = META['not-found'];
      if (notFoundMeta) {
        let errorWritten = 0;
        for (const lang of ['fr', 'en'] as const) {
          const html = applyErrorMeta(baseHtml, {
            lang,
            title: notFoundMeta[lang].title,
            description: notFoundMeta[lang].description,
          });
          const outFile = path.join(distDir, lang, '404.html');
          await fs.mkdir(path.dirname(outFile), { recursive: true });
          await fs.writeFile(outFile, html, 'utf8');
          errorWritten += 1;
        }
        const rootHtml = applyErrorMeta(baseHtml, {
          lang: 'fr',
          title: notFoundMeta.fr.title,
          description: notFoundMeta.fr.description,
        });
        await fs.writeFile(path.join(distDir, '404.html'), rootHtml, 'utf8');
        errorWritten += 1;
        this.info(`edo-prerender: wrote ${errorWritten} error HTML files (404)`);
      }

      // Booking entry points: emit a noindex shell so crawlers get an explicit
      // "do not index" signal instead of the SPA fallback's default
      // `robots: index, follow` on an empty body (flagged REMOVE_BLANK_PAGES /
      // MISSING_HTML). Booking is intentionally out of the index, so we reuse
      // applyErrorMeta (bakes noindex, strips canonical + hreflang).
      const bookingMeta = META['book-picker'];
      if (bookingMeta) {
        const bookingRoutes: { lang: Lang; path: string }[] = [
          { lang: 'fr', path: '/fr/reserver' },
          { lang: 'en', path: '/en/book' },
        ];
        let bookingWritten = 0;
        for (const { lang, path: routePath } of bookingRoutes) {
          const html = applyErrorMeta(baseHtml, {
            lang,
            title: bookingMeta[lang].title,
            description: bookingMeta[lang].description,
          });
          const outDir = path.join(distDir, routePath.slice(1));
          await fs.mkdir(outDir, { recursive: true });
          await fs.writeFile(path.join(outDir, 'index.html'), html, 'utf8');
          bookingWritten += 1;
        }
        this.info(`edo-prerender: wrote ${bookingWritten} noindex booking HTML files`);
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), gtmTags(env.VITE_GTM_ID), edoPrerender()],
    server: {
      proxy: {
        '/api': {
          target: 'https://cms.e-do.studio',
          changeOrigin: true,
        },
      },
    },
  };
});
