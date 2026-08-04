import { z } from 'zod';
import { getT } from '../i18n';
import type { Lang } from '../types';

export function createContactSchema(
  lang: Lang,
  opts: { requireProductFields: boolean },
) {
  const t = getT(lang);
  const m = {
    required: t('validation.required'),
    email: t('validation.email'),
    tel: t('validation.tel'),
    siren: t('validation.siren'),
    cgv: t('validation.cgv'),
    typesArticles: t('validation.typesArticles'),
    quantite: t('validation.quantite'),
    vues: t('validation.vues'),
  };

  const base = z.object({
    marque: z.string().optional(),
    societe: z.string().min(1, m.required),
    siren: z.string().regex(/^\d{9}$/, m.siren),
    adresseFacturation: z.string().min(1, m.required),
    nom: z.string().min(1, m.required),
    prenom: z.string().min(1, m.required),
    email: z.string().email(m.email),
    tel: z
      .string()
      .min(6, m.tel)
      .regex(/^[\d\s+\-().]+$/, m.tel),
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
