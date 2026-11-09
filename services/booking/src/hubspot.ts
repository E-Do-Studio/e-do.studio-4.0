// Contact + affaire HubSpot pour une réservation du site, comme le faisait
// send-email (supabase/functions/_shared/hubspot.ts, syncBooking).
const HUBSPOT_API = 'https://api.hubapi.com';

export interface HubspotBooking {
  reference: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  clientCompany: string | null;
  projectType: string | null;
  totalEstimate: number | null;
  preferredDate: string | null;
  notes: string | null;
  plateaux: string[];
}

async function call<T>(
  token: string,
  path: string,
  method: string,
  body: unknown,
  fetchImpl: typeof fetch,
): Promise<T> {
  const res = await fetchImpl(`${HUBSPOT_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`HubSpot ${method} ${path} : ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

async function upsertContact(
  token: string,
  properties: {
    email: string;
    firstname: string;
    lastname?: string;
    phone?: string;
    company?: string;
    lifecyclestage: string;
  },
  fetchImpl: typeof fetch,
): Promise<string> {
  const found = await call<{ total: number; results: { id: string }[] }>(
    token,
    '/crm/v3/objects/contacts/search',
    'POST',
    { filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: properties.email }] }] },
    fetchImpl,
  );
  const existing = found.total > 0 ? found.results[0].id : null;
  if (existing) {
    const { email: _email, ...update } = properties;
    await call(token, `/crm/v3/objects/contacts/${existing}`, 'PATCH', { properties: update }, fetchImpl);
    return existing;
  }
  return (await call<{ id: string }>(token, '/crm/v3/objects/contacts', 'POST', { properties }, fetchImpl)).id;
}

const splitName = (name: string) => {
  const [firstname = '', ...rest] = name.trim().split(/\s+/);
  return { firstname, lastname: rest.join(' ') || undefined };
};

const esc = (v: string) =>
  v.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

/** Le formulaire de contact : un contact « lead » et une note avec le message. */
export async function syncHubspotContact(
  token: string,
  c: { nom: string; email: string; telephone: string; societe: string; message: string },
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const contactId = await upsertContact(
    token,
    {
      email: c.email,
      ...splitName(c.nom),
      phone: c.telephone || undefined,
      company: c.societe || undefined,
      lifecyclestage: 'lead',
    },
    fetchImpl,
  );
  const body = [
    '<strong>Formulaire de contact</strong><br><br>',
    `<strong>Nom :</strong> ${esc(c.nom)}<br>`,
    `<strong>Email :</strong> ${esc(c.email)}<br>`,
    c.telephone ? `<strong>Téléphone :</strong> ${esc(c.telephone)}<br>` : '',
    c.societe ? `<strong>Société :</strong> ${esc(c.societe)}<br>` : '',
    `<br><strong>Message :</strong><br>${esc(c.message)}`,
  ].join('');
  await call(
    token,
    '/crm/v3/objects/notes',
    'POST',
    {
      properties: { hs_note_body: body, hs_timestamp: new Date().toISOString() },
      associations: [
        { to: { id: contactId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }] },
      ],
    },
    fetchImpl,
  );
}

export async function syncHubspotBooking(
  token: string,
  b: HubspotBooking,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const contactId = await upsertContact(
    token,
    {
      email: b.clientEmail,
      ...splitName(b.clientName),
      phone: b.clientPhone || undefined,
      company: b.clientCompany || undefined,
      lifecyclestage: 'opportunity',
    },
    fetchImpl,
  );

  const description = [
    b.projectType ? `Type : ${b.projectType}` : null,
    b.plateaux.length > 0 ? `Plateau(x) : ${b.plateaux.join(', ')}` : null,
    b.preferredDate ? `Date souhaitée : ${b.preferredDate}` : null,
    b.notes ? `Notes : ${b.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  await call(
    token,
    '/crm/v3/objects/deals',
    'POST',
    {
      properties: {
        dealname: `Réservation ${b.reference}`,
        amount: b.totalEstimate != null ? String(b.totalEstimate) : undefined,
        dealstage: 'appointmentscheduled',
        description,
      },
      associations: [
        {
          to: { id: contactId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }],
        },
      ],
    },
    fetchImpl,
  );
}
