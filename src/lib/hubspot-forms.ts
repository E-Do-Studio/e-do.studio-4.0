// Client-side submission to the HubSpot Forms API.
//
// Why not reuse the server-side CRM write (supabase/functions/_shared/hubspot.ts):
// a contact created through the CRM API gets `Original Source = Offline / API`,
// which loses the real acquisition channel (SEO, Ads, referral…). Submitting
// through a real HubSpot form WITH the visitor's `hubspotutk` cookie lets HubSpot
// attribute the true Original Source and record the submission as a conversion.
//
// The v3 integration submit endpoint is public (portalId + formGuid, no token),
// so it is safe to call from the browser. CSP already allows api.hsforms.com.
//
// Inert until VITE_HUBSPOT_PORTAL_ID + the relevant form id are configured, so a
// missing form never breaks a booking or a contact submission.

const PORTAL_ID = import.meta.env.VITE_HUBSPOT_PORTAL_ID as string | undefined;

export const HUBSPOT_BOOKING_FORM_ID = import.meta.env
  .VITE_HUBSPOT_BOOKING_FORM_ID as string | undefined;
export const HUBSPOT_CONTACT_FORM_ID = import.meta.env
  .VITE_HUBSPOT_CONTACT_FORM_ID as string | undefined;

export type HubspotFields = Record<string, string | number | boolean | null | undefined>;

function readHubspotUtk(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(/(?:^|;\s*)hubspotutk=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

// Fire-and-forget. Never throws: a CRM hiccup must not break the user flow.
export async function submitHubspotForm(
  formId: string | undefined,
  fields: HubspotFields,
  opts: { pageName?: string } = {},
): Promise<void> {
  if (!PORTAL_ID || !formId) return;

  const payloadFields = Object.entries(fields)
    .map(([name, value]) => [name, value == null ? '' : String(value)] as const)
    .filter(([, value]) => value.trim() !== '')
    .map(([name, value]) => ({ name, value }));

  if (payloadFields.length === 0) return;

  const context: Record<string, string> = {};
  const hutk = readHubspotUtk();
  if (hutk) context.hutk = hutk;
  if (typeof window !== 'undefined') {
    context.pageUri = window.location.href;
    context.pageName = opts.pageName ?? document.title;
  }

  try {
    const res = await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${PORTAL_ID}/${formId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: payloadFields, context }),
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`HubSpot form submit failed ${res.status}: ${body}`);
    }
  } catch (err) {
    console.error('HubSpot form submit error:', err);
  }
}
