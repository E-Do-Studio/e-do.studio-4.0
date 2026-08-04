import type { Lang } from '../types';
import { BOOK_PATHS } from '../lib/screens';

export type BookMode = 'config' | 'manual';

// Les chemins localisés viennent de lib/screens.ts. Ils étaient auparavant
// dupliqués ici sous forme de deux tables FR_PATHS/EN_PATHS, troisième copie
// des mêmes URLs.

export function bookPickerPath(lang: Lang): string {
  return BOOK_PATHS.picker(lang);
}

export function configuratorPath(lang: Lang, step: 0 | 2 | 3 | 5 | 6): string {
  const key =
    step === 0
      ? 'configurator'
      : step === 2
        ? 'stage'
        : step === 3
          ? 'team'
          : step === 5
            ? 'details'
            : 'dates';
  return BOOK_PATHS[key](lang);
}

export function manualPath(lang: Lang): string {
  return BOOK_PATHS.manual(lang);
}

export function confirmationPath(lang: Lang): string {
  return BOOK_PATHS.confirmation(lang);
}

export function pathForStep(lang: Lang, mode: BookMode, step: number): string {
  if (mode === 'manual') return manualPath(lang);
  if (step === 0 || step === 2 || step === 3 || step === 5 || step === 6) {
    return configuratorPath(lang, step);
  }
  return manualPath(lang);
}
