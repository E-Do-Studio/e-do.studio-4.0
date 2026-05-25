'use strict';

/**
 * Recover gallery-project visuals that were stored on the now-removed
 * `shared.media-item` component and got orphaned by PR #172 (EDO-120).
 *
 * Background
 * ----------
 * Between EDO-115 (#169) and EDO-120 (#172), gallery-project briefly held a
 * SECOND media surface as a repeatable `shared.media-item` component, and
 * the editorial team filled in a week's worth of projects through it. The
 * unify-media migration only renamed the legacy `field='images'` morph rows;
 * it never copied the component-side files. Strapi 5 schema sync removed the
 * component attribute from the content-type but left the link table and the
 * polymorphic file rows in place, so the data is still on disk — just no
 * longer reachable through `populate=media`.
 *
 * Storage layout (Strapi 5)
 *   - `gallery_projects_cmps`        : (entity_id, cmp_id, component_type,
 *                                       field, order) — one row per
 *                                       composant slot on a project.
 *   - `components_shared_media_items`: the composant row itself; holds the
 *                                       `kind` discriminator (image|video).
 *   - `files_related_morphs`         : polymorphic file links. The composant
 *                                       held its own media via
 *                                       `related_type='shared.media-item'`,
 *                                       `field in ('image','video','poster')`.
 *
 * What this migration does (idempotent)
 *   1. Walks `gallery_projects_cmps` to find every project slot pointing at
 *      a `shared.media-item` composant under `field='media'`, ordered by
 *      slot order.
 *   2. For each composant row, picks the underlying file via
 *      `files_related_morphs` — `field='image'` when kind=image,
 *      `field='video'` when kind=video, with `field='poster'` as a last
 *      resort. Poster files are NOT picked over a real image/video.
 *   3. Per project: if the project already has any `field='media'` morph row
 *      on `api::gallery-project.gallery-project`, the project is LEFT ALONE
 *      (the legacy `images` rename or a prior recovery run already filled it
 *      in — we never mix sources, never overwrite). Otherwise the slots are
 *      inserted in order with `field='media'`.
 *   4. Audits every gallery_project row and logs any whose final media count
 *      is not exactly 3. The lifecycle hook only triggers on writes, so
 *      reads keep working until an editor saves; the audit list is what the
 *      editorial team needs to top up before they start editing.
 *
 * The component link rows (`gallery_projects_cmps`) and composant rows
 * (`components_shared_media_items`) themselves are NOT deleted here. They
 * are dead weight but harmless, and leaving them in place keeps a re-run
 * safe: if something goes wrong with the new morph rows, the source data is
 * still readable for a follow-up pass.
 */

const MORPH_TABLE = 'files_related_morphs';
const CMPS_TABLE = 'gallery_projects_cmps';
const ITEMS_TABLE = 'components_shared_media_items';
const ENTRIES_TABLE = 'gallery_projects';
const COMPONENT_TYPE = 'shared.media-item';
const RELATED_TYPE = 'api::gallery-project.gallery-project';
const FIELD = 'media';
const REQUIRED_COUNT = 3;

async function detectColumn(knex, table, candidates) {
  for (const name of candidates) {
    if (await knex.schema.hasColumn(table, name)) return name;
  }
  return null;
}

async function up(knex) {
  for (const t of [MORPH_TABLE, CMPS_TABLE, ENTRIES_TABLE]) {
    if (!(await knex.schema.hasTable(t))) {
      console.log(`[gallery-media-recover] ${t} not found; nothing to do.`);
      return;
    }
  }

  // Strapi 5 names the slot-order column on component link tables either
  // `order` or `cmp_order` depending on version — detect at runtime.
  const cmpsOrderCol = await detectColumn(knex, CMPS_TABLE, ['order', 'cmp_order']);
  if (!cmpsOrderCol) {
    console.log(`[gallery-media-recover] ${CMPS_TABLE} has no order column; aborting to avoid scrambling slots.`);
    return;
  }
  // Same story on the morph table.
  const morphOrderCol = await detectColumn(knex, MORPH_TABLE, ['order', 'morph_order']);
  if (!morphOrderCol) {
    console.log(`[gallery-media-recover] ${MORPH_TABLE} has no order column; aborting.`);
    return;
  }
  // `field_order` is the per-(related,field) ordering Strapi uses to keep
  // multi-value media stable. Optional — only set when present.
  const morphFieldOrderCol = await detectColumn(knex, MORPH_TABLE, ['field_order']);

  const orphanSlots = await knex(CMPS_TABLE)
    .where('component_type', COMPONENT_TYPE)
    .where('field', FIELD)
    .select('entity_id', 'cmp_id', `${cmpsOrderCol} as slot_order`)
    .orderBy('entity_id')
    .orderBy(cmpsOrderCol);

  if (orphanSlots.length === 0) {
    console.log(`[gallery-media-recover] no orphan '${COMPONENT_TYPE}' slots; nothing to recover.`);
  } else {
    console.log(`[gallery-media-recover] found ${orphanSlots.length} orphan composant slot(s) across ${new Set(orphanSlots.map((s) => s.entity_id)).size} project(s).`);

    const cmpIds = [...new Set(orphanSlots.map((s) => s.cmp_id))];

    // Pull the kind for every composant row we're about to recover.
    const hasItems = await knex.schema.hasTable(ITEMS_TABLE);
    const kindByCmp = new Map();
    if (hasItems) {
      const items = await knex(ITEMS_TABLE).whereIn('id', cmpIds).select('id', 'kind');
      for (const r of items) kindByCmp.set(r.id, r.kind);
    }

    // Pull every file link held by these composant rows.
    const fileLinks = await knex(MORPH_TABLE)
      .where('related_type', COMPONENT_TYPE)
      .whereIn('related_id', cmpIds)
      .select('related_id', 'file_id', 'field');

    const filesByCmp = new Map();
    for (const link of fileLinks) {
      const list = filesByCmp.get(link.related_id) ?? [];
      list.push(link);
      filesByCmp.set(link.related_id, list);
    }

    // Resolve the actual file id we want per composant slot.
    function pickFile(cmpId) {
      const candidates = filesByCmp.get(cmpId) ?? [];
      if (candidates.length === 0) return null;
      const kind = kindByCmp.get(cmpId);
      const byField = (name) => candidates.find((c) => c.field === name);
      if (kind === 'video') {
        return byField('video')?.file_id ?? byField('image')?.file_id ?? byField('poster')?.file_id ?? null;
      }
      // default to image semantics
      return byField('image')?.file_id ?? byField('video')?.file_id ?? byField('poster')?.file_id ?? null;
    }

    // Group orphan slots per project and resolve to file ids in slot order.
    const slotsByProject = new Map();
    for (const slot of orphanSlots) {
      const list = slotsByProject.get(slot.entity_id) ?? [];
      list.push(slot);
      slotsByProject.set(slot.entity_id, list);
    }
    for (const [, list] of slotsByProject) {
      list.sort((a, b) => Number(a.slot_order) - Number(b.slot_order));
    }

    // Per-project guard: never overwrite an entry that already has any
    // `field='media'` row on the gallery-project polymorphic side — that
    // means the legacy rename (or a prior recovery run) already populated
    // it, and mixing sources here would scramble the order.
    const projectIds = [...slotsByProject.keys()];
    const existingMedia = await knex(MORPH_TABLE)
      .where('related_type', RELATED_TYPE)
      .where('field', FIELD)
      .whereIn('related_id', projectIds)
      .pluck('related_id');
    const occupied = new Set(existingMedia);

    let insertedRows = 0;
    let projectsTouched = 0;
    let projectsSkippedOccupied = 0;
    let projectsSkippedNoFiles = 0;

    for (const projectId of projectIds) {
      if (occupied.has(projectId)) {
        projectsSkippedOccupied += 1;
        continue;
      }
      const slots = slotsByProject.get(projectId);
      const rows = [];
      for (let i = 0; i < slots.length; i += 1) {
        const fileId = pickFile(slots[i].cmp_id);
        if (!fileId) continue;
        const row = {
          file_id: fileId,
          related_type: RELATED_TYPE,
          related_id: projectId,
          field: FIELD,
          [morphOrderCol]: i + 1,
        };
        if (morphFieldOrderCol) row[morphFieldOrderCol] = i + 1;
        rows.push(row);
      }
      if (rows.length === 0) {
        projectsSkippedNoFiles += 1;
        continue;
      }
      await knex(MORPH_TABLE).insert(rows);
      insertedRows += rows.length;
      projectsTouched += 1;
    }

    console.log(`[gallery-media-recover] inserted ${insertedRows} morph row(s) across ${projectsTouched} project(s).`);
    if (projectsSkippedOccupied > 0) {
      console.log(`[gallery-media-recover] skipped ${projectsSkippedOccupied} project(s) that already had '${FIELD}' rows (left alone — manual review if needed).`);
    }
    if (projectsSkippedNoFiles > 0) {
      console.log(`[gallery-media-recover] skipped ${projectsSkippedNoFiles} project(s) whose composant rows had no resolvable file links.`);
    }
  }

  // Final audit: list every project whose media count is not exactly 3.
  const grouped = await knex(MORPH_TABLE)
    .where('related_type', RELATED_TYPE)
    .where('field', FIELD)
    .select('related_id')
    .count({ n: '*' })
    .groupBy('related_id');

  const countByEntry = new Map();
  for (const row of grouped) {
    countByEntry.set(row.related_id, Number(row.n));
  }

  const hasSlug = await knex.schema.hasColumn(ENTRIES_TABLE, 'slug');
  const hasLocale = await knex.schema.hasColumn(ENTRIES_TABLE, 'locale');
  const cols = ['id'];
  if (hasSlug) cols.push('slug');
  if (hasLocale) cols.push('locale');

  const entries = await knex(ENTRIES_TABLE).select(cols);
  const incomplete = entries
    .map((e) => ({ ...e, count: countByEntry.get(e.id) ?? 0 }))
    .filter((e) => e.count !== REQUIRED_COUNT);

  if (incomplete.length === 0) {
    console.log(`[gallery-media-recover] all ${entries.length} project row(s) have exactly ${REQUIRED_COUNT} media ✓`);
    return;
  }

  console.log(
    `[gallery-media-recover] ${incomplete.length} project row(s) do NOT have exactly ${REQUIRED_COUNT} media — top up manually before editors trigger the lifecycle:`,
  );
  for (const e of incomplete) {
    const parts = [`id=${e.id}`, `count=${e.count}`];
    if (e.slug) parts.push(`slug=${e.slug}`);
    if (e.locale) parts.push(`locale=${e.locale}`);
    console.log(`    ${parts.join(' ')}`);
  }
}

async function down() {
  console.log('[gallery-media-recover] down is not supported; restore from backup.');
}

module.exports = { up, down };
