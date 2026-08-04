import type { Lang } from '../types';

export type BookMode = 'config' | 'manual';

const FR_PATHS: Record<string, string> = {
  picker: '/fr/reserver',
  configurator: '/fr/reserver/configurateur',
  stage: '/fr/reserver/configurateur/plateau',
  team: '/fr/reserver/configurateur/equipe',
  details: '/fr/reserver/configurateur/coordonnees',
  dates: '/fr/reserver/configurateur/dates',
  manual: '/fr/reserver/manuel',
  confirmation: '/fr/reserver/confirmation',
};

const EN_PATHS: Record<string, string> = {
  picker: '/en/book',
  configurator: '/en/book/configurator',
  stage: '/en/book/configurator/stage',
  team: '/en/book/configurator/team',
  details: '/en/book/configurator/details',
  dates: '/en/book/configurator/dates',
  manual: '/en/book/manual',
  confirmation: '/en/book/confirmation',
};

function pathFor(lang: Lang, key: string): string {
  return lang === 'fr' ? FR_PATHS[key] : EN_PATHS[key];
}

export function bookPickerPath(lang: Lang): string {
  return pathFor(lang, 'picker');
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
  return pathFor(lang, key);
}

export function manualPath(lang: Lang): string {
  return pathFor(lang, 'manual');
}

export function confirmationPath(lang: Lang): string {
  return pathFor(lang, 'confirmation');
}

export function pathForStep(lang: Lang, mode: BookMode, step: number): string {
  if (mode === 'manual') return manualPath(lang);
  if (step === 0 || step === 2 || step === 3 || step === 5 || step === 6) {
    return configuratorPath(lang, step);
  }
  return manualPath(lang);
}
