import { z } from 'zod';
import { getT } from '../i18n';
import type { ContactFormData, Lang } from '../types';

// La MÊME règle que `contactSchema` dans supabase/functions/send-email : le
// formulaire de contact n'en vérifiait aucune. Un nom, un téléphone ou une
// société laissés vides, ou un message de moins de dix caractères, partaient
// tels quels ; la fonction répondait `invalid_payload`, et le visiteur ne
// lisait qu'« Erreur lors de l'envoi » sans savoir quoi corriger (issue #396).
//
// Recopiée et non importée : la fonction Edge vit sous Deno et ne se déploie
// pas avec le site. Les bornes doivent bouger ensemble — le test les fige.
export const CONTACT_MESSAGE_MIN = 10;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function createContactFormSchema(lang: Lang) {
  const t = getT(lang);
  const required = t('validation.required');
  return z.object({
    nom: z.string().trim().min(1, required).max(100),
    email: z.string().trim().max(254).regex(EMAIL_RE, t('validation.email')),
    telephone: z.string().trim().min(1, required).max(30),
    societe: z.string().trim().min(1, required).max(120),
    message: z
      .string()
      .trim()
      .min(
        CONTACT_MESSAGE_MIN,
        t('validation.messageTooShort', { min: CONTACT_MESSAGE_MIN }),
      )
      .max(4000),
  });
}

export type ContactFieldErrors = Partial<
  Record<'nom' | 'email' | 'telephone' | 'societe' | 'message', string>
>;

/** Les erreurs du formulaire, champ par champ ; un objet vide s'il est valide. */
export function validateContactForm(
  form: ContactFormData,
  lang: Lang,
): ContactFieldErrors {
  const result = createContactFormSchema(lang).safeParse(form);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0]);
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
