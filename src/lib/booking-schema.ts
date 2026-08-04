import { z } from 'zod';
import { getT } from '../i18n';
import { isValidSiren } from './booking-engine';
import type { Lang } from '../types';

function messages(lang: Lang) {
  const t = getT(lang);
  return {
    required: t('validation.required'),
    email: t('validation.email'),
    tel: t('validation.tel'),
    siren: t('validation.siren'),
    cgv: t('validation.cgv'),
    typesArticles: t('validation.typesArticles'),
    quantite: t('validation.quantite'),
    vues: t('validation.vues'),
  };
}

// Champs d'identité communs au tunnel de réservation et au formulaire de
// l'assistant. Les extraire évite qu'une règle d'email ou de téléphone diverge
// entre les deux — l'assistant portait sa propre regex email en ligne.
function identityFields(m: ReturnType<typeof messages>) {
  return {
    marque: z.string().optional(),
    societe: z.string().min(1, m.required),
    adresseFacturation: z.string().min(1, m.required),
    nom: z.string().min(1, m.required),
    prenom: z.string().min(1, m.required),
    email: z.string().email(m.email),
    tel: z
      .string()
      .min(6, m.tel)
      .regex(/^[\d\s+\-().]+$/, m.tel),
    autresInfos: z.string().optional(),
  };
}

export function createContactSchema(
  lang: Lang,
  opts: { requireProductFields: boolean },
) {
  const m = messages(lang);

  const base = z.object({
    ...identityFields(m),
    // Le tunnel exige le SIREN : la facturation en dépend.
    siren: z.string().regex(/^\d{9}$/, m.siren),
    typesArticles: opts.requireProductFields
      ? z.array(z.string()).min(1, m.typesArticles)
      : z.array(z.string()),
    quantiteArticles: opts.requireProductFields
      ? z.string().min(1, m.quantite)
      : z.string(),
    vuesParArticle: opts.requireProductFields
      ? z.string().min(1, m.vues)
      : z.string(),
    autresInfos: z.string().optional(),
    cgvAccepted: z.literal(true, { message: m.cgv }),
    autreType: z.string().optional(),
  });

  return base;
}

export type ContactFormErrors = Partial<Record<string, string>>;

// Formulaire de coordonnées de l'assistant : mêmes règles d'identité que le
// tunnel, sans CGV ni champs produit. Le SIREN y est facultatif — fourni, il
// doit passer la clé de Luhn, contrôle plus strict que le `\d{9}` du tunnel
// (divergence héritée, à unifier une fois tranchée côté métier).
export function createIdentitySchema(lang: Lang) {
  const m = messages(lang);
  return z.object({
    ...identityFields(m),
    siren: z
      .string()
      .optional()
      .refine((v) => !v?.trim() || isValidSiren(v), m.siren),
  });
}

export function validateIdentity(
  data: unknown,
  lang: Lang,
):
  | { success: true; data: z.infer<ReturnType<typeof createIdentitySchema>> }
  | { success: false; errors: ContactFormErrors } {
  const result = createIdentitySchema(lang).safeParse(data);
  if (result.success) return { success: true, data: result.data };

  const errors: ContactFormErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (key && !errors[String(key)]) errors[String(key)] = issue.message;
  }
  return { success: false, errors };
}

export function validateContact(
  data: unknown,
  lang: Lang,
  opts: { requireProductFields: boolean },
):
  | { success: true; data: z.infer<ReturnType<typeof createContactSchema>> }
  | { success: false; errors: ContactFormErrors } {
  const schema = createContactSchema(lang, opts);
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: ContactFormErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (key && !errors[String(key)]) {
      errors[String(key)] = issue.message;
    }
  }
  return { success: false, errors };
}
