// Nom d'affichage d'un plateau, par slug.
//
// Pas de forme `Bilingual` : ce sont des noms de plateaux, pas des chaînes
// traduisibles — ils s'écrivent pareil en français et en anglais. La table
// portait auparavant `{ fr, en }` avec les deux côtés identiques, dupliquée
// entre gallery-page.tsx et gallery-lightbox.tsx.
//
// L'ordre des clés fait l'ordre d'affichage des filtres de la galerie.
export const PLATEAU_LABELS: Record<string, string> = {
  cyclorama: 'Cyclorama',
  horizontal: 'Horizontal',
  vertical: 'Vertical',
  eclipse: 'Eclipse',
  live: 'Live',
};

/** Nom d'affichage, ou le slug brut si le plateau n'est pas dans la table. */
export const plateauLabel = (slug: string): string =>
  PLATEAU_LABELS[slug] ?? slug;
