import type { ContactFormData } from '../types';
import { submitHubspotForm, HUBSPOT_CONTACT_FORM_ID } from './hubspot-forms';

export async function submitContactForm(data: ContactFormData): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) throw new Error('Supabase URL not configured');

  // Best-effort HubSpot form submission, from the browser so the visitor's
  // hubspotutk cookie preserves the contact's Original Source. `nom` is a single
  // full-name field — split first token / rest to match firstname / lastname.
  const nameParts = data.nom.trim().split(/\s+/);
  void submitHubspotForm(
    HUBSPOT_CONTACT_FORM_ID,
    {
      firstname: nameParts[0] ?? '',
      lastname: nameParts.slice(1).join(' '),
      email: data.email,
      phone: data.telephone,
      company: data.societe,
      message: data.message,
    },
    { pageName: 'Contact' },
  );

  // Built field by field rather than spread, so form-local state stays local
  // and the anti-spam signals are sent in the shape the edge function expects.
  const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'contact',
      nom: data.nom,
      email: data.email,
      telephone: data.telephone,
      societe: data.societe,
      message: data.message,
      website: data.website ?? '',
      elapsedMs: data.formLoadedAt ? Date.now() - data.formLoadedAt : undefined,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    // The edge function answers with machine codes ('rate_limited',
    // 'invalid_payload', …); callers localize them via contactErrorMessage.
    throw new Error(body.error ?? `Email send failed (${res.status})`);
  }
}
