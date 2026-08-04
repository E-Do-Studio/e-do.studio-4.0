import type fr from './locales/fr.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof fr };
    // Sans ça, `t()` est typé `string | null` et ne peut plus être rendu en JSX.
    returnNull: false;
  }
}
