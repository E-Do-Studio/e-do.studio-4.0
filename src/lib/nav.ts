import type { ParseKeys } from 'i18next';
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

// Les clés que `t()` accepte, dérivées de fr.json par l'augmentation de module
// de i18n/i18next.d.ts. Une clé inexistante devient une erreur de compilation,
// là où `t()` se contenterait de rendre la clé brute à l'écran.
type LabelKey = ParseKeys;

interface NavEntry {
  /** Écran cible, résolu par SCREEN_TO_PATH. */
  screen: string;
  /** Libellé de la cellule d'en-tête, contraint en largeur. */
  labelKey: LabelKey;
  /**
   * Libellé du tiroir, quand la ligne pleine largeur en supporte un autre.
   * Absent = même libellé que l'en-tête.
   *
   * Déclaré ici, à côté du premier, parce que les deux ont déjà divergé : le
   * header disait « Post-prod » quand le tiroir disait « Post-production », et
   * la page elle-même affichait un troisième littéral écrit en dur.
   */
  menuLabelKey?: LabelKey;
  /**
   * Préfixes de chemin, préfixe de langue retiré, qui allument cette entrée.
   * `''` désigne la racine, et elle seule.
   */
  match: readonly string[];
}

export interface MainNavItem extends NavEntry {
  /** La cellule orange. Une seule, en fin de bande. */
  primary?: boolean;
  /**
   * Rendue dès `md`, quand la bande n'a pas encore la place des cinq.
   *
   * Trois crans de visibilité, pas deux : `primary` partout, `compact` à partir
   * de 768, le reste à partir de `app` (1024). Entre les deux la bande avait
   * jusqu'à 577px de vide, portant quatorze caractères de mono gris — le mou
   * d'une cellule élastique qui n'avait rien à absorber d'autre.
   *
   * Deux, et pas trois : PLATEAUX 107 + POST-PROD 116 + RÉSERVER 131 font 354,
   * qui avec le logo 240 et la langue 72 laissent 95px au milieu à 768 et 350px
   * à 1023. GALERIE en coûte 99 de plus, et à 768 il n'y en a pas 99.
   */
  compact?: boolean;
  id: MainNavId;
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
    compact: true,
    // Les cinq écrans plateau sont une seule destination. Un préfixe les couvre
    // tous, là où énumérer SCREEN_TO_PATH en oublierait un au prochain ajout.
    match: ['/plateau', '/cyclorama'],
  },
  {
    id: 'postprod',
    screen: 'postprod',
    labelKey: 'common.postProd',
    menuLabelKey: 'common.postProdLong',
    compact: true,
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
const menuLabel = (id: MainNavId): LabelKey => {
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

/**
 * Le nom de la page que `pathname` désigne, ou `null` hors des chemins connus.
 *
 * Dérivé, et non passé : chaque page l'écrivait à la main dans la cellule
 * éditoriale de la bande, et il a dérivé — « Post-prod » dans l'en-tête,
 * « Post-production » dans le tiroir, un troisième littéral en dur dans la page.
 * C'est la même dérive que `menuLabelKey` a réglée pour le tiroir, réglée de la
 * même façon : une seule table, lue deux fois.
 *
 * Le tiroir d'abord — il porte l'accueil, Discovery et les mentions légales, que
 * la bande ne connaît pas — puis la bande, seule à porter la réservation. Et le
 * libellé long : la cellule n'a pas la contrainte de largeur qui a fait abréger
 * « Post-production » dans la navigation.
 *
 * L'accueil est la seule exception, et c'est le sigle qui la fait : il est posé
 * juste à gauche de la cellule et dit déjà où l'on est. « Accueil » à côté de
 * « E-DO STUDIO » ne nomme pas une page, il remplit une case — et sur cette
 * page-là, la cellule voisine a mieux à dire (annonce, horaires). Le tiroir, lui,
 * garde son entrée : la liste des destinations ne peut pas en sauter une.
 */
export const pageLabelKey = (pathname: string): LabelKey | null => {
  const menuId = activeNavIn(MENU_NAV, pathname);
  if (menuId === 'home') return null;
  const menu = MENU_NAV.find((it) => it.id === menuId);
  if (menu) return menu.labelKey;
  const main = MAIN_NAV.find((it) => it.id === activeNavId(pathname));
  return main ? (main.menuLabelKey ?? main.labelKey) : null;
};
