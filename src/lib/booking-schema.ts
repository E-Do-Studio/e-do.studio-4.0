import { z } from 'zod';

const msgs = {
  fr: {
    required: 'Ce champ est requis',
    email: 'Adresse e-mail invalide',
    tel: 'Numéro de téléphone invalide',
    siren: 'Le SIREN doit contenir 9 chiffres',
    cgv: 'Vous devez accepter les CGV',
    typesArticles: "Sélectionnez au moins un type d’article",
    quantite: "Indiquez la quantité d’articles",
    vues: 'Indiquez le nombre de vues par article',
  },
  en: {
    required: 'This field is required',
    email: 'Invalid email address',
    tel: 'Invalid phone number',
    siren: 'SIREN must be 9 digits',
    cgv: 'You must accept the terms and conditions',
    typesArticles: 'Select at least one item type',
    quantite: 'Enter the number of items',
    vues: 'Enter the number of views per item',
  },
} as const;

export type Lang = 'fr' | 'en';

export function createContactSchema(lang: Lang, opts: { requireProductFields: boolean }) {
  const m = msgs[lang];

  const base = z.object({
    marque: z.string().optional(),
    societe: z.string().min(1, m.required),
    siren: z.string().regex(/^\d{9}$/, m.siren),
    adresseFacturation: z.string().min(1, m.required),
    nom: z.string().min(1, m.required),
    prenom: z.string().min(1, m.required),
    email: z.string().email(m.email),
    tel: z.string().min(6, m.tel).regex(/^[\d\s+\-().]+$/, m.tel),
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
): { success: true; data: z.infer<ReturnType<typeof createContactSchema>> } | { success: false; errors: ContactFormErrors } {
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
