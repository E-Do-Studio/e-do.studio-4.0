#!/usr/bin/env node
// One-shot setup for the HubSpot Forms integration (see src/lib/hubspot-forms.ts).
//
// Idempotently creates, in the HubSpot account behind HUBSPOT_PRIVATE_APP_TOKEN:
//   1. a "E-Do — Réservation" contact-property group,
//   2. the custom contact properties the booking form writes to,
//   3. two HubSpot forms (booking + contact) whose fields match exactly what the
//      site submits — the v3 submit endpoint rejects a submission that carries a
//      field the form does not declare, so the form must be a superset.
// Then prints the two form GUIDs + the VITE_HUBSPOT_* lines to paste.
//
// Run:
//   node --env-file=.env scripts/setup-hubspot-forms.mjs
//   HUBSPOT_PRIVATE_APP_TOKEN=xxx node scripts/setup-hubspot-forms.mjs
//   add --dry-run to print the plan without writing anything.
//
// The private app needs these scopes (HubSpot → Settings → Integrations →
// Private Apps → your app → Scopes):
//   forms, crm.schemas.contacts.write, crm.schemas.contacts.read

const TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
const DRY_RUN = process.argv.includes('--dry-run');
const BASE = 'https://api.hubapi.com';

if (!TOKEN) {
  console.error('✗ HUBSPOT_PRIVATE_APP_TOKEN manquant.');
  console.error('  Ajoute-le à .env, ou lance :');
  console.error('  HUBSPOT_PRIVATE_APP_TOKEN=xxx node scripts/setup-hubspot-forms.mjs');
  process.exit(1);
}

async function hs(path, method = 'GET', body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { ok: res.ok, status: res.status, json, text };
}

function fail(ctx, res) {
  if (res.status === 403) {
    console.error(`✗ 403 sur ${ctx} — il manque sûrement un scope sur l'app privée.`);
    console.error('  Requis : forms, crm.schemas.contacts.write, crm.schemas.contacts.read');
    console.error('  HubSpot → Settings → Integrations → Private Apps → (ton app) → Scopes');
  }
  const body = typeof res.json === 'string' ? res.json : JSON.stringify(res.json);
  console.error(`✗ ${ctx} → HTTP ${res.status}: ${body}`);
}

// ── Custom contact properties ──────────────────────────────────────────────
// The real typing lives here (string / number). The form fields (below) stay on
// the few well-known widget types; HubSpot maps widget → property on submit.

const GROUP = { name: 'edo_reservation', label: 'E-Do — Réservation', displayOrder: -1 };

const T = (name, label) => ({ name, label, type: 'string', fieldType: 'text', groupName: GROUP.name });
const N = (name, label) => ({ name, label, type: 'number', fieldType: 'number', groupName: GROUP.name });

const CUSTOM_PROPS = [
  T('brand', 'Marque'),
  T('siren', 'SIREN'),
  T('item_types', "Types d'articles"),
  T('other_item_type', "Autre type d'article"),
  T('quantity_items', "Quantité d'articles"),
  T('views_per_item', 'Vues par article'),
  T('cgv_accepted', 'CGV acceptées'),
  T('booking_mode', 'Type de demande (devis / réservation)'),
  T('booking_reference', 'Référence réservation'),
  T('project_type', 'Type de projet'),
  T('urgency', 'Urgence'),
  T('plateau', 'Plateau principal'),
  T('plateaus', 'Plateaux'),
  T('preferred_date', 'Date souhaitée'),
  T('per_plateau_dates', 'Dates par plateau (JSON)'),
  N('arrival_hour', "Heure d'arrivée"),
  N('rental_hours', 'Heures de location'),
  N('total_ht', 'Total HT (€)'),
];

// ── Form field definitions ─────────────────────────────────────────────────
// objectTypeId "0-1" = contact. Names must match the keys sent by the site
// (buildBookingHubspotFields in src/book-page.tsx / submitContactForm).

const F = (name, label, fieldType = 'single_line_text', required = false) => ({
  objectTypeId: '0-1', name, label, fieldType, required, hidden: false,
});

const BOOKING_FIELDS = [
  F('email', 'Email', 'email', true),
  F('firstname', 'Prénom'),
  F('lastname', 'Nom'),
  F('phone', 'Téléphone', 'phone'),
  F('company', 'Société'),
  F('brand', 'Marque'),
  F('siren', 'SIREN'),
  F('address', 'Adresse de facturation'),
  F('project_type', 'Type de projet'),
  F('urgency', 'Urgence'),
  F('item_types', "Types d'articles"),
  F('other_item_type', "Autre type d'article"),
  F('quantity_items', "Quantité d'articles"),
  F('views_per_item', 'Vues par article'),
  F('plateau', 'Plateau principal'),
  F('plateaus', 'Plateaux'),
  F('preferred_date', 'Date souhaitée'),
  F('per_plateau_dates', 'Dates par plateau'),
  F('arrival_hour', "Heure d'arrivée", 'number'),
  F('rental_hours', 'Heures de location', 'number'),
  F('total_ht', 'Total HT (€)', 'number'),
  F('booking_mode', 'Type de demande'),
  F('booking_reference', 'Référence'),
  F('cgv_accepted', 'CGV acceptées'),
  F('message', 'Message'),
];

const CONTACT_FIELDS = [
  F('email', 'Email', 'email', true),
  F('firstname', 'Prénom'),
  F('lastname', 'Nom'),
  F('phone', 'Téléphone', 'phone'),
  F('company', 'Société'),
  F('message', 'Message'),
];

function formBody(name, fields) {
  return {
    name,
    formType: 'hubspot',
    fieldGroups: [{ groupType: 'default_group', richTextType: 'text', fields }],
    configuration: {
      language: 'fr',
      cloneable: true,
      editable: true,
      archivable: true,
      recaptchaEnabled: false,
      notifyContactOwner: false,
      notifyRecipients: [],
      createNewContactForNewEmail: true,
      prePopulateKnownValues: false,
      allowLinkToResetKnownValues: false,
      lifecycleStages: [],
      postSubmitAction: { type: 'thank_you', value: 'Merci, votre demande a bien été reçue.' },
    },
    displayOptions: {
      renderRawHtml: false,
      theme: 'default_style',
      submitButtonText: 'Envoyer',
      cssClass: '',
      style: {},
    },
    legalConsentOptions: { type: 'none' },
  };
}

// ── Operations ─────────────────────────────────────────────────────────────

async function ensureGroup() {
  const get = await hs(`/crm/v3/properties/contacts/groups/${GROUP.name}`);
  if (get.ok) { console.log(`• groupe ${GROUP.name} — déjà présent`); return; }
  if (DRY_RUN) { console.log(`• groupe ${GROUP.name} — à créer`); return; }
  const res = await hs('/crm/v3/properties/contacts/groups', 'POST', GROUP);
  if (res.ok) console.log(`✓ groupe ${GROUP.name} créé`);
  else if (res.status === 409) console.log(`• groupe ${GROUP.name} — déjà présent`);
  else fail('création groupe', res);
}

async function ensureProp(p) {
  const get = await hs(`/crm/v3/properties/contacts/${p.name}`);
  if (get.ok) { console.log(`• propriété ${p.name} — déjà présente`); return; }
  if (DRY_RUN) { console.log(`• propriété ${p.name} — à créer (${p.type})`); return; }
  const res = await hs('/crm/v3/properties/contacts', 'POST', p);
  if (res.ok) console.log(`✓ propriété ${p.name} créée`);
  else if (res.status === 409) console.log(`• propriété ${p.name} — déjà présente`);
  else fail(`propriété ${p.name}`, res);
}

async function ensureForm(name, fields) {
  const list = await hs('/marketing/v3/forms?limit=100');
  if (list.ok && Array.isArray(list.json?.results)) {
    const existing = list.json.results.find((f) => f.name === name);
    if (existing) { console.log(`• form "${name}" — déjà présent (${existing.id})`); return existing.id; }
  } else if (!list.ok) {
    fail('liste des forms', list);
    return null;
  }
  if (DRY_RUN) { console.log(`• form "${name}" — à créer (${fields.length} champs)`); return null; }
  const res = await hs('/marketing/v3/forms', 'POST', formBody(name, fields));
  if (res.ok) { console.log(`✓ form "${name}" créé (${res.json.id})`); return res.json.id; }
  fail(`création form "${name}"`, res);
  return null;
}

async function detectPortalId() {
  const res = await hs('/account-info/v3/details');
  return res.ok && res.json?.portalId ? String(res.json.portalId) : '146117396';
}

// One authenticated read up front, so a bad token / missing scope fails once and
// clearly instead of 20 times.
async function preflight() {
  const res = await hs('/crm/v3/properties/contacts/groups');
  if (res.status === 401) {
    console.error('✗ Token invalide ou manquant (HTTP 401).');
    console.error('  As-tu bien remplacé "xxx" par le vrai token HubSpot ?');
    console.error('  (app privée → onglet Auth → token au format pat-eu1-…)');
    process.exit(1);
  }
  if (res.status === 403) {
    console.error('✗ Token reconnu mais scope manquant (HTTP 403).');
    console.error('  Ajoute à l\'app privée : forms, crm.schemas.contacts.write, crm.schemas.contacts.read');
    console.error('  HubSpot → Settings → Integrations → Private Apps → (ton app) → Scopes → Commit changes');
    process.exit(1);
  }
  if (!res.ok) { fail('vérification du token', res); process.exit(1); }
}

// ── Main ───────────────────────────────────────────────────────────────────

console.log(DRY_RUN ? '· DRY-RUN — aucune écriture\n' : '· Setup HubSpot Forms\n');

await preflight();
await ensureGroup();
for (const p of CUSTOM_PROPS) await ensureProp(p);
console.log('');

const bookingId = await ensureForm('Site — Réservation', BOOKING_FIELDS);
const contactId = await ensureForm('Site — Contact', CONTACT_FIELDS);

const portalId = await detectPortalId();

console.log('\n─────────────────────────────');
if (DRY_RUN) {
  console.log('DRY-RUN terminé. Relance sans --dry-run pour appliquer.');
} else if (bookingId || contactId) {
  console.log('À coller dans .env (local) et dans la config Vercel (prod) :\n');
  console.log(`VITE_HUBSPOT_PORTAL_ID=${portalId}`);
  if (bookingId) console.log(`VITE_HUBSPOT_BOOKING_FORM_ID=${bookingId}`);
  if (contactId) console.log(`VITE_HUBSPOT_CONTACT_FORM_ID=${contactId}`);
} else {
  console.log('Aucun form créé — voir les erreurs ci-dessus.');
  process.exit(1);
}
