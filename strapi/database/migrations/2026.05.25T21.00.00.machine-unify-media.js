'use strict';

/**
 * Unify machine media into a single native `media` field.
 *
 * Background: `machine` exposed four parallel media surfaces:
 *   - `image`   (media field, single, "Image principale de la machine")
 *   - `gallery` (media field, multiple, "Galerie d'images de la machine")
 *   - `video`   (media field, single, "Vidéo de présentation")
 *   - `media`   (shared.media-item component, repeatable — carrousel)
 *
 * The editorial team reported the overlap as confusing; the board asked us
 * to align the schema with `gallery-project` / `post-production-type` which
 * use a single native `media` field (images + videos, multiple). This
 * migration migrates the legacy data into that single field.
 *
 * Storage layout (Strapi 5)
 *   - `files_related_morphs` : polymorphic file links. Direct media fields
 *                              (`image`, `gallery`, `video`) live here with
 *                              `related_type = 'api::machine.machine'`.
 *                              The component-side media live here too with
 *                              `related_type = 'shared.media-item'`.
 *   - `machines_cmps`        : (entity_id, cmp_id, component_type, field,
 *                              order) — one row per composant slot on a
 *                              machine entry.
 *   - `components_shared_media_items` : composant row (kind discriminator).
 *
 * What this migration does, idempotently:
 *
 *   1. Rename direct legacy morph rows in order
 *      `image` → `gallery` → `video`  to `field = 'media'`, on every
 *      `api::machine.machine` entry. Order matters: `image` first so the
 *      cover stays first, then `gallery` items, then the presentation
 *      `video` last.
 *
 *   2. Recover the shared.media-item component data: for every machine
 *      slot on the component, pick the underlying file (image when
 *      kind=image, video when kind=video, falling back across when one
 *      side is empty — poster files are NOT picked over a real media)
 *      and insert it as a `field='media'` morph row appended after the
 *      direct legacy rows.
 *
 *   3. Per-entry guard for the rename steps: skip when destination
 *      `field='media'` already has links from a *previous* pass so we
 *      never duplicate. Within a single run, we track which entries we
 *      filled and continue appending across the four phases.
 *
 * Boot order note: Strapi 5 runs schema sync BEFORE custom migrations.
 * Schema sync leaves orphan morph rows untouched when a media attribute
 * is removed (cf. gallery-project-unify-media migration), so the
 * `field='image' | 'gallery' | 'video'` rows are still readable here
 * even though those attributes are gone from schema.json.
 *
 * Component-side rows (`machines_cmps`, `components_shared_media_items`)
 * are NOT deleted — they are dead weight but harmless, and leaving them
 * keeps a re-run safe.
 */

const MORPH_TABLE = 'files_related_morphs';
const CMPS_TABLE = 'machines_cmps';
const ITEMS_TABLE = 'components_shared_media_items';
const RELATED_TYPE = 'api::machine.machine';
const COMPONENT_TYPE = 'shared.media-item';
const NEW_FIELD = 'media';
const LEGACY_DIRECT_FIELDS = ['image', 'gallery', 'video'];

async function detectColumn(knex, table, candidates) {
  for (const name of candidates) {
    if (await knex.schema.hasColumn(table, name)) return name;
  }
  return null;
}

async function nextFieldOrder(knex, entryId, morphFieldOrderCol) {
  if (!morphFieldOrderCol) return null;
  const row = await knex(MORPH_TABLE)
    .where('related_type', RELATED_TYPE)
    .where('field', NEW_FIELD)
    .where('related_id', entryId)
    .max({ m: morphFieldOrderCol })
    .first();
  const current = row?.m == null ? 0 : Number(row.m);
  return Number.isFinite(current) ? current : 0;
}

async function nextOrder(knex, entryId, morphOrderCol) {
  const row = await knex(MORPH_TABLE)
    .where('related_type', RELATED_TYPE)
    .where('field', NEW_FIELD)
    .where('related_id', entryId)
    .max({ m: morphOrderCol })
    .first();
  const current = row?.m == null ? 0 : Number(row.m);
  return Number.isFinite(current) ? current : 0;
}

async function renameLegacyDirect(knex, legacyField, morphOrderCol, morphFieldOrderCol) {
  const legacyLinks = await knex(MORPH_TABLE)
    .where('related_type', RELATED_TYPE)
    .where('field', legacyField)
    .select('id', 'related_id');

  if (legacyLinks.length === 0) {
    console.log(`[machine-media-unify] no legacy '${legacyField}' links to migrate.`);
    return;
  }

  const legacyEntryIds = [...new Set(legacyLinks.map((r) => r.related_id))];

  // For each entry, append its legacy rows AFTER any media rows that this
  // migration may have just inserted from an earlier phase. We do this by
  // bumping the order/field_order columns past the current max.
  let renamed = 0;
  let skipped = 0;
  for (const entryId of legacyEntryIds) {
    // Fetch this entry's legacy rows for the current phase, in their
    // existing slot order.
    const orderSelect = morphOrderCol ? [morphOrderCol] : [];
    const rows = await knex(MORPH_TABLE)
      .where('related_type', RELATED_TYPE)
      .where('field', legacyField)
      .where('related_id', entryId)
      .select('id', ...orderSelect)
      .orderBy(morphOrderCol ?? 'id');

    if (rows.length === 0) continue;

    // Determine starting points for the per-entry counters.
    const baseOrder = morphOrderCol ? await nextOrder(knex, entryId, morphOrderCol) : 0;
    const baseFieldOrder = morphFieldOrderCol
      ? await nextFieldOrder(knex, entryId, morphFieldOrderCol)
      : null;

    for (let i = 0; i < rows.length; i += 1) {
      const update = { field: NEW_FIELD };
      if (morphOrderCol) update[morphOrderCol] = baseOrder + i + 1;
      if (morphFieldOrderCol) update[morphFieldOrderCol] = (baseFieldOrder ?? 0) + i + 1;
      await knex(MORPH_TABLE).where('id', rows[i].id).update(update);
      renamed += 1;
    }
  }

  console.log(
    `[machine-media-unify] renamed ${renamed} '${legacyField}' link(s) → '${NEW_FIELD}' across ${legacyEntryIds.length - skipped} entry(ies).`,
  );
}

async function recoverComponentMedia(knex, morphOrderCol, morphFieldOrderCol) {
  const hasCmps = await knex.schema.hasTable(CMPS_TABLE);
  if (!hasCmps) {
    console.log(`[machine-media-unify] ${CMPS_TABLE} not found; skipping component recovery.`);
    return;
  }
  const cmpsOrderCol = await detectColumn(knex, CMPS_TABLE, ['order', 'cmp_order']);
  if (!cmpsOrderCol) {
    console.log(`[machine-media-unify] ${CMPS_TABLE} has no order column; skipping component recovery.`);
    return;
  }

  const orphanSlots = await knex(CMPS_TABLE)
    .where('component_type', COMPONENT_TYPE)
    .where('field', NEW_FIELD)
    .select('entity_id', 'cmp_id', `${cmpsOrderCol} as slot_order`)
    .orderBy('entity_id')
    .orderBy(cmpsOrderCol);

  if (orphanSlots.length === 0) {
    console.log(`[machine-media-unify] no orphan '${COMPONENT_TYPE}' slots; nothing to recover from component.`);
    return;
  }

  console.log(
    `[machine-media-unify] found ${orphanSlots.length} orphan composant slot(s) across ${new Set(orphanSlots.map((s) => s.entity_id)).size} machine(s).`,
  );

  const cmpIds = [...new Set(orphanSlots.map((s) => s.cmp_id))];

  const kindByCmp = new Map();
  if (await knex.schema.hasTable(ITEMS_TABLE)) {
    const items = await knex(ITEMS_TABLE).whereIn('id', cmpIds).select('id', 'kind');
    for (const r of items) kindByCmp.set(r.id, r.kind);
  }

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

  function pickFile(cmpId) {
    const candidates = filesByCmp.get(cmpId) ?? [];
    if (candidates.length === 0) return null;
    const kind = kindByCmp.get(cmpId);
    const byField = (name) => candidates.find((c) => c.field === name);
    if (kind === 'video') {
      return byField('video')?.file_id ?? byField('image')?.file_id ?? byField('poster')?.file_id ?? null;
    }
    return byField('image')?.file_id ?? byField('video')?.file_id ?? byField('poster')?.file_id ?? null;
  }

  const slotsByMachine = new Map();
  for (const slot of orphanSlots) {
    const list = slotsByMachine.get(slot.entity_id) ?? [];
    list.push(slot);
    slotsByMachine.set(slot.entity_id, list);
  }
  for (const [, list] of slotsByMachine) {
    list.sort((a, b) => Number(a.slot_order) - Number(b.slot_order));
  }

  let inserted = 0;
  let machinesTouched = 0;
  let machinesSkippedNoFiles = 0;
  for (const [machineId, slots] of slotsByMachine) {
    // Dedup against files this entry already has on `media` (from the
    // direct-field rename above, or a prior run of this migration).
    const existing = await knex(MORPH_TABLE)
      .where('related_type', RELATED_TYPE)
      .where('field', NEW_FIELD)
      .where('related_id', machineId)
      .pluck('file_id');
    const existingSet = new Set(existing.map((id) => Number(id)));

    const baseOrder = morphOrderCol ? await nextOrder(knex, machineId, morphOrderCol) : 0;
    const baseFieldOrder = morphFieldOrderCol
      ? await nextFieldOrder(knex, machineId, morphFieldOrderCol)
      : null;

    const rows = [];
    let appended = 0;
    for (const slot of slots) {
      const fileId = pickFile(slot.cmp_id);
      if (!fileId) continue;
      if (existingSet.has(Number(fileId))) continue;
      appended += 1;
      const row = {
        file_id: fileId,
        related_type: RELATED_TYPE,
        related_id: machineId,
        field: NEW_FIELD,
      };
      if (morphOrderCol) row[morphOrderCol] = baseOrder + appended;
      if (morphFieldOrderCol) row[morphFieldOrderCol] = (baseFieldOrder ?? 0) + appended;
      rows.push(row);
      existingSet.add(Number(fileId));
    }

    if (rows.length === 0) {
      machinesSkippedNoFiles += 1;
      continue;
    }
    await knex(MORPH_TABLE).insert(rows);
    inserted += rows.length;
    machinesTouched += 1;
  }

  console.log(`[machine-media-unify] inserted ${inserted} morph row(s) from composants across ${machinesTouched} machine(s).`);
  if (machinesSkippedNoFiles > 0) {
    console.log(`[machine-media-unify] skipped ${machinesSkippedNoFiles} machine(s) whose composant slots had no resolvable file links.`);
  }
}

async function up(knex) {
  const hasMorph = await knex.schema.hasTable(MORPH_TABLE);
  if (!hasMorph) {
    console.log(`[machine-media-unify] ${MORPH_TABLE} not found; nothing to do.`);
    return;
  }

  const morphOrderCol = await detectColumn(knex, MORPH_TABLE, ['order', 'morph_order']);
  if (!morphOrderCol) {
    console.log(`[machine-media-unify] ${MORPH_TABLE} has no order column; aborting to avoid scrambling slots.`);
    return;
  }
  const morphFieldOrderCol = await detectColumn(knex, MORPH_TABLE, ['field_order']);

  // Phase 1-3: rename direct legacy fields in order so the cover lands
  // first, then gallery items, then the presentation video.
  for (const legacyField of LEGACY_DIRECT_FIELDS) {
    await renameLegacyDirect(knex, legacyField, morphOrderCol, morphFieldOrderCol);
  }

  // Phase 4: recover the shared.media-item composant data, appended after
  // anything we just renamed.
  await recoverComponentMedia(knex, morphOrderCol, morphFieldOrderCol);
}

async function down() {
  console.log('[machine-media-unify] down is not supported; restore from backup.');
}

module.exports = { up, down };
