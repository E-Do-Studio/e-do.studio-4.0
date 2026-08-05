import type { ParseKeys, TFunction } from 'i18next';

/**
 * Catalogues du configurateur et du formulaire de contact.
 *
 * Constantes de module : elles ne peuvent pas appeler `useT()` et portent donc
 * des clés i18next, résolues au rendu par `catLabel` / `catDesc`.
 *
 * `CatalogEntry` n'a volontairement PAS de signature d'index : une entrée lue
 * en `entry[lang]` — comme le faisaient six sites après la migration de ces
 * catalogues vers des clés i18n, tous silencieusement rendus vides — devient
 * une erreur de typecheck.
 */
interface CatalogEntry {
  k: string;
  label: ParseKeys;
  descKey?: ParseKeys;
}

const catLabel = (t: TFunction, entry?: CatalogEntry): string =>
  entry ? t(entry.label) : '';

const catDesc = (t: TFunction, entry?: CatalogEntry): string =>
  entry?.descKey ? t(entry.descKey) : '';

const PROJECT_TYPES: CatalogEntry[] = [
  {
    k: 'ecom',
    label: 'booking.eCommerce',
    descKey: 'booking.packshotsOnModelProductPagesDesc',
  },
  {
    k: 'cyclorama',
    label: 'booking.cycloramaFreeProduction2',
    descKey: 'booking.cycloStudioCustomNeedsDesc',
  },
];

const PRODUCTS: CatalogEntry[] = [
  {
    k: 'pap',
    label: 'booking.readyToWear',
    descKey: 'booking.clothingWornTextileDesc',
  },
  {
    k: 'accessoires',
    label: 'booking.accessories',
    descKey: 'booking.shoesLeatherGoodsTextileDesc',
  },
  {
    k: 'eyewear',
    label: 'booking.eyewear',
    descKey: 'booking.glassesSunglassesDesc',
  },
  {
    k: 'food',
    label: 'booking.foodSpirits',
    descKey: 'booking.drinksGourmetDesc',
  },
  {
    k: 'cosmetique',
    label: 'booking.cosmetics',
    descKey: 'booking.skincareFragranceMakeupDesc',
  },
  {
    k: 'bijoux',
    label: 'booking.jewelry',
    descKey: 'booking.jewelryWatchesDesc',
  },
];

const PAP_METHODS: CatalogEntry[] = [
  {
    k: 'packshot',
    label: 'booking.packshot',
    descKey: 'booking.unwornProductShootDesc',
  },
  {
    k: 'onmodel',
    label: 'booking.onModel',
    descKey: 'booking.onModelShootDesc',
  },
];

const PAP_PACKSHOT_SUBS: CatalogEntry[] = [
  {
    k: 'pique',
    label: 'booking.pinned',
    descKey: 'booking.pinnedOnVerticalBoardDesc',
  },
  {
    k: 'ghost',
    label: 'booking.ghost',
    descKey: 'booking.invisibleMannequinWornLookDesc',
  },
  {
    k: 'flat',
    label: 'booking.flat',
    descKey: 'booking.laidFlatTopViewDesc',
  },
];

const ACCESS_SUBS: CatalogEntry[] = [
  { k: 'chaussure', label: 'booking.shoes' },
  {
    k: 'maroquinerie',
    label: 'booking.leatherGoods',
    descKey: 'booking.bagsBeltsSmallLeatherGoodsDesc',
  },
  {
    k: 'textile',
    label: 'booking.textileAccessories',
    descKey: 'booking.scarvesHatsGlovesDesc',
  },
];

const MEDIA_OPTIONS: CatalogEntry[] = [
  { k: 'photo', label: 'booking.photo' },
  { k: 'video', label: 'booking.video' },
];

const PACKSHOT_VIEWS: CatalogEntry[] = [
  { k: 'face', label: 'booking.front' },
  { k: 'dos', label: 'booking.back2' },
  { k: '3/4', label: 'booking.34' },
  { k: 'detail', label: 'booking.detail' },
];

const ARTICLE_TYPES: CatalogEntry[] = [
  { k: 'pap', label: 'booking.readyToWear' },
  { k: 'maroquinerie', label: 'booking.leatherGoods' },
  { k: 'chaussures', label: 'booking.shoes' },
  { k: 'accessoires', label: 'booking.accessories' },
  { k: 'eyewear', label: 'booking.eyewear2' },
  { k: 'bijoux', label: 'booking.jewelry' },
  { k: 'cosmetique', label: 'booking.cosmetics' },
  { k: 'food', label: 'booking.foodSpirits2' },
  { k: 'autre', label: 'booking.other' },
];

const findEntry = (
  catalog: CatalogEntry[],
  k: string | null | undefined,
): CatalogEntry | undefined =>
  k ? catalog.find((entry) => entry.k === k) : undefined;

export {
  ACCESS_SUBS,
  ARTICLE_TYPES,
  MEDIA_OPTIONS,
  PACKSHOT_VIEWS,
  PAP_METHODS,
  PAP_PACKSHOT_SUBS,
  PRODUCTS,
  PROJECT_TYPES,
  catDesc,
  catLabel,
  findEntry,
};
export type { CatalogEntry };
