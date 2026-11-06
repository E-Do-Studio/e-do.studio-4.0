// Les zones du plan 3D : position sur la maquette, et ce que la fiche en dit.
//
// Sans React ni three.js : la scène, le rail et la fiche lisent la même table,
// et le fichier reste testable sous vitest (`environment: 'node'`).
//
// Repère de la maquette : origine au centre du plan, x vers la droite, z vers le
// mur du bas, en mètres. Les positions viennent du relevé du scan Polycam.

type StageZoneId = 'cyclorama' | 'live' | 'eclipse' | 'horizontal' | 'vertical';

/** Les zones sans plateau : leur texte vient des traductions, pas du CMS. */
export type SpaceZoneId =
  | 'loge'
  | 'table'
  | 'lounge'
  | 'livraison'
  | 'entree'
  | 'entree2'
  | 'wc';

export type ZoneId = StageZoneId | SpaceZoneId;

export type ZoneDimKey = 'surface' | 'width' | 'height';

export type ZoneFactId =
  | 'makeup'
  | 'fitting'
  | 'kitchen'
  | 'comfort'
  | 'dock'
  | 'parking'
  | 'access';

export interface ZoneDim {
  key: ZoneDimKey;
  /** Une longueur, ou deux pour une emprise « largeur × profondeur ». */
  meters?: number | readonly [number, number];
  /** Une surface en m². */
  squareMeters?: number;
  /** Mesuré sur le scan, à quelques centimètres près. */
  approx?: boolean;
}

export interface Zone {
  id: ZoneId;
  /** Position de l'étiquette sur la maquette : [x, z]. */
  pos: readonly [number, number];
  /**
   * Le plateau Strapi que la zone représente. Sa fiche lit alors la tagline,
   * les caractéristiques, le tarif et la photo du CMS — la même source que la
   * page plateau, pour qu'une surface ne puisse pas différer d'une page à
   * l'autre.
   */
  plateau?: StageZoneId;
  /**
   * Ce que la fiche d'un espace sans plateau en dit, ligne par ligne. Les
   * textes reprennent ceux du site et vivent dans les traductions
   * (`studioTour.facts`).
   */
  facts?: readonly ZoneFactId[];
  /** Masquée en mode plateau libre, avec le mobilier qu'elle désigne. */
  movable?: boolean;
}

export const ZONES: readonly Zone[] = [
  { id: 'cyclorama', pos: [3.4, 6.45], plateau: 'cyclorama' },
  { id: 'live', pos: [4.0, -2.5], plateau: 'live' },
  { id: 'eclipse', pos: [0.2, -8.3], plateau: 'eclipse' },
  { id: 'horizontal', pos: [4.9, -7.95], plateau: 'horizontal' },
  { id: 'vertical', pos: [-4.8, -7.6], plateau: 'vertical' },
  { id: 'loge', pos: [4.3, 0.7], facts: ['makeup', 'fitting'] },
  { id: 'table', pos: [-3.6, 1.6], facts: ['kitchen'] },
  { id: 'lounge', pos: [-2.3, -2.75], movable: true, facts: ['comfort'] },
  { id: 'livraison', pos: [-3.4, 6.9], facts: ['dock', 'parking'] },
  { id: 'entree', pos: [-5.6, -2.97], facts: ['access'] },
  { id: 'entree2', pos: [-5.1, 4.4] },
  { id: 'wc', pos: [-5.75, -0.4] },
];

/**
 * Le studio entier, relevé sur le scan. La fiche d'un espace les rappelle sous
 * ses propres lignes : sans photo de CMS, elle n'en aurait sinon qu'une ou deux.
 */
export const STUDIO_DIMS: readonly ZoneDim[] = [
  { key: 'surface', squareMeters: 240, approx: true },
  { key: 'width', meters: [12.42, 19.13] },
  { key: 'height', meters: 5.6, approx: true },
];

export const DEFAULT_ZONE: ZoneId = 'cyclorama';

const IDS = new Set<string>(ZONES.map((z) => z.id));

/** La zone désignée par un paramètre d'URL, ou la zone par défaut. */
export const parseZone = (value: unknown): ZoneId =>
  typeof value === 'string' && IDS.has(value)
    ? (value as ZoneId)
    : DEFAULT_ZONE;

export const zoneById = (id: ZoneId): Zone => {
  const zone = ZONES.find((z) => z.id === id);
  if (!zone) throw new Error(`Zone inconnue : ${id}`);
  return zone;
};
