import { factories } from '@strapi/strapi';

const UID = 'api::gallery-project.gallery-project';

type ReorderItem = { documentId: string; displayOrder: number };

export default factories.createCoreController(UID, ({ strapi }) => ({
  /**
   * Flat list consumed by the "Ordre galerie" admin page: one row per project
   * with just what a thumbnail card needs, sorted by the current display order.
   * `status: 'draft'` returns every document (a draft version exists even for
   * published-only entries), so the editor can order the full catalogue.
   */
  async orderList(ctx) {
    // The generated content-type types (types/generated/contentTypes.d.ts) are
    // stale — they still list the long-removed title/slug/images fields — so the
    // strict Document Service generics reject the real `displayOrder` sort and
    // `media` populate. The options are valid at runtime against the current
    // schema; cast to sidestep the outdated generics.
    const entries = await strapi.documents(UID).findMany({
      status: 'draft',
      sort: 'displayOrder:asc',
      limit: 200,
      populate: ['media', 'brand', 'category'],
    } as any);

    ctx.body = entries.map((p: any) => {
      const cover = Array.isArray(p.media) ? p.media[0] : undefined;
      const isVideo = cover?.mime?.startsWith('video/');
      const coverUrl = cover
        ? (!isVideo && cover.formats?.medium?.url) || cover.url
        : null;
      return {
        documentId: p.documentId,
        displayOrder: p.displayOrder ?? 0,
        brand: p.brand?.name ?? '',
        category: p.category?.slug ?? '',
        year: p.year != null ? String(p.year) : '',
        stage: p.stage ?? '',
        coverUrl,
        coverIsVideo: !!isVideo,
      };
    });
  },

  /**
   * Persist a new display order. Writes `display_order` per `document_id` so
   * draft and published versions stay in sync (the front reads the published
   * one) — same low-level approach as the rank migrations.
   */
  async reorder(ctx) {
    const { items } = (ctx.request.body ?? {}) as { items?: ReorderItem[] };
    const valid =
      Array.isArray(items) &&
      items.every(
        (i) =>
          i != null &&
          typeof i.documentId === 'string' &&
          Number.isInteger(i.displayOrder),
      );
    if (!valid) {
      return ctx.badRequest(
        'Body must be { items: Array<{ documentId: string, displayOrder: integer }> }.',
      );
    }

    const knex = strapi.db.connection;
    for (const { documentId, displayOrder } of items as ReorderItem[]) {
      await knex('gallery_projects')
        .where('document_id', documentId)
        .update({ display_order: displayOrder });
    }

    ctx.body = { ok: true, updated: (items as ReorderItem[]).length };
  },
}));
