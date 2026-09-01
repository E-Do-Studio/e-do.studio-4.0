import type { TFunction } from 'i18next';
import { usePageContext } from '../lib/page-context';
import { getT } from './index';

/**
 * `t` du composant, dérivé de la langue de l'URL.
 *
 * On ne passe pas par `useTranslation()` : ce hook conserve `t` dans un état et
 * ne le remplace qu'en effet quand l'instance change. Au bascule FR↔EN la page
 * se serait peinte une frame dans l'ancienne langue. Ici `t` est recalculé à
 * chaque rendu depuis `lang`, donc identique côté serveur et à l'hydratation.
 */
export function useT(): TFunction {
  return getT(usePageContext().lang);
}
