import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::gallery-asset.gallery-asset', ({ strapi }) => ({
  async shuffle(ctx) {
    const entries = await strapi.documents('api::gallery-asset.gallery-asset').findMany({
      fields: ['id', 'orderRank'],
      limit: 10000,
    });

    const ids = entries.map((e) => e.documentId);

    // Fisher-Yates shuffle
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }

    // Update orderRank in batches
    let updated = 0;
    for (let i = 0; i < ids.length; i++) {
      await strapi.documents('api::gallery-asset.gallery-asset').update({
        documentId: ids[i],
        data: { orderRank: i + 1 },
      });
      updated++;
    }

    ctx.body = { message: `Shuffled ${updated} gallery assets` };
  },
}));
