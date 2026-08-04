import { createInstance, type TFunction } from 'i18next';
import type { Lang } from '../types';
import en from './locales/en.json';
import fr from './locales/fr.json';

// Les deux `satisfies` croisés valent une égalité structurelle : une clé ajoutée
// d'un côté et pas de l'autre casse `pnpm typecheck`. C'est la garantie de
// synchro que le `as B` de l'ancien messages.ts n'offrait pas — une assertion
// laisse passer un objet auquel il manque `en`.
const resources = {
  fr: { translation: fr satisfies typeof en },
  en: { translation: en satisfies typeof fr },
};

// Une instance figée par locale, jamais mutée : `changeLanguage` n'est appelé
// nulle part, donc il n'y a rien à isoler par requête. Le rendu serveur est
// mono-process et non streamé (cf. src/server.ts) : un singleton dont on
// changerait la langue laisserait fuiter le français dans une réponse anglaise
// rendue en parallèle. Ici la langue est un choix d'instance, pas un état.
function build(lang: Lang) {
  const i18n = createInstance();
  // Pas de `initReactI18next` : il enregistrerait l'instance comme défaut global
  // de react-i18next et la dernière initialisée gagnerait. Tout passe par
  // <I18nextProvider>, il n'y a aucun défaut global à poser.
  i18n.init({
    lng: lang,
    resources,
    // Un repli ne pourrait que masquer une clé manquante, que le typecheck
    // interdit déjà.
    fallbackLng: false,
    returnNull: false,
    // Ressources en dur + init synchrone : `t` est utilisable au retour, sans
    // callback. Rien d'asynchrone ne doit exister sur le chemin du SSR.
    // (`initImmediate` avant i18next 26.)
    initAsync: false,
    // React échappe déjà tout ce qu'il rend.
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return i18n;
}

const INSTANCES = { fr: build('fr'), en: build('en') } as const;

export function getI18n(lang: Lang) {
  return INSTANCES[lang];
}

/**
 * Accesseur `t` hors composant : head() de route, JSON-LD, helpers non-React.
 * Dans un composant ou un hook, utiliser `useT()`.
 */
export function getT(lang: Lang): TFunction {
  return INSTANCES[lang].t;
}
