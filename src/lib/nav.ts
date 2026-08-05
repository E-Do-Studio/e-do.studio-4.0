import { bothSlugs } from './screens';

// Source de vérité de la navigation : ordre d'affichage, libellés, et le
// chemin qui allume chaque destination.
//
// Vit à côté de screens.ts et non dedans : ce fichier-là s'ouvre sur « toute
// modification ici change une URL publique — vérifier le sitemap et le
// Caddyfile ». L'ordre des cellules et le choix d'un libellé n'engagent rien de
// tel et changeront bien plus souvent. La dépendance est à sens unique.
//
// Sans React, donc testable : vitest tourne en `environment: 'node'` et ne
// ramasse que `src/**/*.test.ts` (un `.test.tsx` ne s'exécuterait jamais).

export type MainNavId = 'stages' | 'postprod' | 'gallery' | 'contact' | 'book';

interface NavEntry {
  /** Écran cible, résolu par SCREEN_TO_PATH. */
  screen: string;
  /** Libellé de la cellule d'en-tête, contraint en largeur. */
  labelKey: string;
  /**
   * Libellé du tiroir, quand la ligne pleine largeur en supporte un autre.
   * Absent = même libellé que l'en-tête.
   *
   * Déclaré ici, à côté du premier, parce que les deux ont déjà divergé : le
   * header disait « Post-prod » quand le tiroir disait « Post-production », et
   * la page elle-même affichait un troisième littéral écrit en dur.
   */
  menuLabelKey?: string;
  /**
   * Préfixes de chemin, préfixe de langue retiré, qui allument cette entrée.
   * `''` désigne la racine, et elle seule.
   */
  match: readonly string[];
}

export interface MainNavItem extends NavEntry {
  id: MainNavId;
  /** La cellule orange. Une seule, en fin de bande. */
  primary?: boolean;
}

export interface MenuNavItem extends NavEntry {
  id: string;
  disabled?: boolean;
}

export const MAIN_NAV: readonly MainNavItem[] = [
  {
    id: 'stages',
    screen: 'plateau-live',
    labelKey: 'common.stages',
    // Les cinq écrans plateau sont une seule destination. Un préfixe les couvre
    // tous, là où énumérer SCREEN_TO_PATH en oublierait un au prochain ajout.
    match: ['/plateau', '/cyclorama'],
  },
  {
    id: 'postprod',
    screen: 'postprod',
    labelKey: 'common.postProd',
    menuLabelKey: 'common.postProdLong',
    match: ['/post-production'],
  },
  {
    id: 'gallery',
    screen: 'gallery',
    labelKey: 'common.gallery',
    match: bothSlugs('gallery'),
  },
  {
    id: 'contact',
    screen: 'contact',
    labelKey: 'common.contactUs',
    menuLabelKey: 'common.contact',
    match: ['/contact'],
  },
  {
    id: 'book',
    screen: 'book',
    labelKey: 'common.book',
    primary: true,
    // Un préfixe sur le sélecteur, pas une énumération de BOOK_PATHS : celle-ci
    // omet `/reserver/contact`, qui a pourtant sa route.
    match: bothSlugs('bookPicker'),
  },
];

const mainItem = (id: MainNavId): MainNavItem => {
  const it = MAIN_NAV.find((i) => i.id === id);
  if (!it) throw new Error(`Destination inconnue : ${id}`);
  return it;
};

/** Le libellé long d'une destination, ou son libellé court à défaut. */
const menuLabel = (id: MainNavId): string => {
  const it = mainItem(id);
  return it.menuLabelKey ?? it.labelKey;
};

// Le tiroir n'est ni un sur-ensemble ni un sous-ensemble de la bande : il porte
// l'accueil, Discovery et les mentions légales, et pas la réservation — celle-ci
// est le bouton d'action de son pied. Seuls les libellés communs sont dérivés,
// pour qu'aucun ne soit réécrit ici.
export const MENU_NAV: readonly MenuNavItem[] = [
  { id: 'home', screen: 'home', labelKey: 'common.home', match: [''] },
  {
    id: 'stages',
    screen: 'plateau-live',
    labelKey: menuLabel('stages'),
    match: mainItem('stages').match,
  },
  {
    id: 'gallery',
    screen: 'gallery',
    labelKey: menuLabel('gallery'),
    match: mainItem('gallery').match,
  },
  {
    id: 'discovery',
    screen: 'discovery',
    labelKey: 'common.discovery',
    match: ['/discovery'],
    disabled: true,
  },
  {
    id: 'postprod',
    screen: 'postprod',
    labelKey: menuLabel('postprod'),
    match: mainItem('postprod').match,
  },
  {
    id: 'contact',
    screen: 'contact',
    labelKey: menuLabel('contact'),
    match: mainItem('contact').match,
  },
  { id: 'legal', screen: 'legal', labelKey: 'common.legal', match: ['/legal'] },
];

/** Retire le préfixe de langue et le slash final. `/fr` et `/fr/` donnent ''. */
const stripLang = (pathname: string) =>
  pathname.replace(/^\/(fr|en)(?=\/|$)/, '').replace(/\/+$/, '');

// Comparaison par segment, et non `startsWith` nu : sans le slash, `/plateau`
// allumerait `/plateaux-loues`. Même précaution que le BY_LENGTH de screens.ts.
//
// Le préfixe vide est traité à part : sa branche `startsWith('/')` allumerait
// l'accueil sur toutes les pages du site.
const covers = (prefix: string, rest: string) =>
  rest === prefix || (prefix !== '' && rest.startsWith(`${prefix}/`));

/** L'entrée de `list` que `pathname` allume, ou `null`. */
export const activeNavIn = <T extends NavEntry & { id: string }>(
  list: readonly T[],
  pathname: string,
): T['id'] | null => {
  const rest = stripLang(pathname);
  return list.find((it) => it.match.some((p) => covers(p, rest)))?.id ?? null;
};

/** La destination de la bande d'en-tête que `pathname` allume, ou `null`. */
export const activeNavId = (pathname: string): MainNavId | null =>
  activeNavIn(MAIN_NAV, pathname);
