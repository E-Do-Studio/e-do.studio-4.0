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

export async function syncHubspotBooking(
  token: string,
  b: HubspotBooking,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const [firstname = '', ...rest] = b.clientName.trim().split(/\s+/);
  const properties = {
    email: b.clientEmail,
    firstname,
    lastname: rest.join(' ') || undefined,
    phone: b.clientPhone || undefined,
    company: b.clientCompany || undefined,
    lifecyclestage: 'opportunity',
  };

  const found = await call<{ total: number; results: { id: string }[] }>(
    token,
    '/crm/v3/objects/contacts/search',
    'POST',
    { filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: b.clientEmail }] }] },
    fetchImpl,
  );
  let contactId = found.total > 0 ? found.results[0].id : null;
  if (contactId) {
    const { email: _email, ...update } = properties;
    await call(token, `/crm/v3/objects/contacts/${contactId}`, 'PATCH', { properties: update }, fetchImpl);
  } else {
    contactId = (
      await call<{ id: string }>(token, '/crm/v3/objects/contacts', 'POST', { properties }, fetchImpl)
    ).id;
  }

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
