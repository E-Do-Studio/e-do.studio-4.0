const HUBSPOT_API = "https://api.hubapi.com";

interface HubSpotContactProperties {
  email: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  company?: string;
  lifecyclestage?: string;
}

interface HubSpotDealProperties {
  dealname: string;
  amount?: string;
  pipeline?: string;
  dealstage?: string;
  description?: string;
}

async function hubspotFetch(
  token: string,
  path: string,
  method: string,
  body?: unknown,
): Promise<Response> {
  return fetch(`${HUBSPOT_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function findContactByEmail(
  token: string,
  email: string,
): Promise<string | null> {
  const res = await hubspotFetch(token, "/crm/v3/objects/contacts/search", "POST", {
    filterGroups: [{
      filters: [{ propertyName: "email", operator: "EQ", value: email }],
    }],
  });

  if (!res.ok) return null;

  const data = await res.json();
  return data.total > 0 ? data.results[0].id : null;
}

export async function upsertContact(
  token: string,
  properties: HubSpotContactProperties,
): Promise<string> {
  const existingId = await findContactByEmail(token, properties.email);

  if (existingId) {
    const { email: _, ...updateProps } = properties;
    await hubspotFetch(
      token,
      `/crm/v3/objects/contacts/${existingId}`,
      "PATCH",
      { properties: updateProps },
    );
    return existingId;
  }

  const res = await hubspotFetch(token, "/crm/v3/objects/contacts", "POST", {
    properties,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HubSpot create contact failed ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.id;
}

export async function createDeal(
  token: string,
  properties: HubSpotDealProperties,
  contactId: string,
): Promise<string> {
  const res = await hubspotFetch(token, "/crm/v3/objects/deals", "POST", {
    properties,
    associations: [{
      to: { id: contactId },
      types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }],
    }],
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HubSpot create deal failed ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.id;
}

export async function createNote(
  token: string,
  body: string,
  contactId: string,
): Promise<void> {
  const res = await hubspotFetch(token, "/crm/v3/objects/notes", "POST", {
    properties: { hs_note_body: body, hs_timestamp: new Date().toISOString() },
    associations: [{
      to: { id: contactId },
      types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }],
    }],
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`HubSpot create note failed ${res.status}: ${errorBody}`);
  }
}

export interface SyncContactFormParams {
  nom: string;
  email: string;
  telephone: string;
  societe: string;
  sujet: string;
  message: string;
}

export async function syncContactForm(
  token: string,
  params: SyncContactFormParams,
): Promise<void> {
  const nameParts = params.nom.trim().split(/\s+/);
  const firstname = nameParts[0] ?? "";
  const lastname = nameParts.slice(1).join(" ") || undefined;

  const contactId = await upsertContact(token, {
    email: params.email,
    firstname,
    lastname,
    phone: params.telephone || undefined,
    company: params.societe || undefined,
    lifecyclestage: "lead",
  });

  const noteBody = [
    `<strong>Formulaire de contact — ${params.sujet}</strong>`,
    `<br><br>`,
    `<strong>Nom :</strong> ${params.nom}<br>`,
    `<strong>Email :</strong> ${params.email}<br>`,
    params.telephone ? `<strong>Téléphone :</strong> ${params.telephone}<br>` : "",
    params.societe ? `<strong>Société :</strong> ${params.societe}<br>` : "",
    `<br><strong>Message :</strong><br>${params.message}`,
  ].filter(Boolean).join("");

  await createNote(token, noteBody, contactId);
}

export interface SyncBookingParams {
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

export async function syncBooking(
  token: string,
  params: SyncBookingParams,
): Promise<void> {
  const nameParts = params.clientName.trim().split(/\s+/);
  const firstname = nameParts[0] ?? "";
  const lastname = nameParts.slice(1).join(" ") || undefined;

  const contactId = await upsertContact(token, {
    email: params.clientEmail,
    firstname,
    lastname,
    phone: params.clientPhone || undefined,
    company: params.clientCompany || undefined,
    lifecyclestage: "opportunity",
  });

  const description = [
    params.projectType ? `Type : ${params.projectType}` : null,
    params.plateaux.length > 0 ? `Plateau(x) : ${params.plateaux.join(", ")}` : null,
    params.preferredDate ? `Date souhaitée : ${params.preferredDate}` : null,
    params.notes ? `Notes : ${params.notes}` : null,
  ].filter(Boolean).join("\n");

  await createDeal(
    token,
    {
      dealname: `Réservation ${params.reference}`,
      amount: params.totalEstimate != null ? String(params.totalEstimate) : undefined,
      dealstage: "appointmentscheduled",
      description,
    },
    contactId,
  );
}
