export interface SocialLinkDef {
  k: string;
  label: string;
  href: string;
}

export const SOCIAL_LINKS: SocialLinkDef[] = [
  { k: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/edostudio/' },
  { k: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/company/e-do/' },
  { k: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/EdoStudioAgency/' },
  { k: 'tiktok', label: 'TikTok', href: 'https://www.tiktok.com/@edostudio' },
];

export const BRANDS = [
  'JEAN PAUL GAULTIER', 'BALENCIAGA', 'COPERNI', 'CARVEN',
  'THE KOOPLES', 'VUARNET', 'GIAMBATTISTA VALLI', 'NUMÉRO', 'JOHN LOBB', 'HARTFORD',
  'INOUI', 'DIPTYQUE', 'RIMOWA', 'NODALETO',
];

export const CONTACT = {
  phone: '+33 1 44 04 11 49',
  phoneHref: 'tel:+33144041149',
  email: 'contact@e-do.studio',
  emailHref: 'mailto:contact@e-do.studio',
  address: { street: '69 bd Victor Hugo · Bât. 6.7', zip: '93400 Saint-Ouen' },
  etouch: 'https://etouch.e-do.studio',
} as const;

export const STUDIO_HOURS = { fr: 'Lun–Sam · 10—18', en: 'Mon–Sat · 10—18' } as const;
