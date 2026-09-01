import { useT } from '../i18n/use-t';

/** Cible du lien d'évitement. Le `<main>` de chaque page la porte. */
const MAIN_ID = 'contenu';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Premier élément focusable du document. Sans lui, atteindre le contenu
 * demandait de traverser tout l'en-tête collant à chaque page : logo, burger,
 * jusqu'à cinq destinations, le sélecteur de langue.
 *
 * Le focus est déplacé à la main plutôt que laissé au saut d'ancre : la grille
 * bento oblige l'en-tête et le contenu à être frères dans le même conteneur, le
 * `<main>` est donc en `display: contents` — sans boîte, il ne peut pas
 * recevoir le focus, même avec `tabindex="-1"`. Vérifié : l'ancre seule change
 * le hash et laisse le focus sur `<body>`.
 */
const SkipLink = () => {
  const t = useT();
  return (
    <a
      href={`#${MAIN_ID}`}
      onClick={(event) => {
        const main = document.getElementById(MAIN_ID);
        const target = main?.querySelector<HTMLElement>(FOCUSABLE);
        if (!target) return;
        event.preventDefault();
        target.focus();
        target.scrollIntoView({ block: 'start' });
      }}
      className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-0 focus-visible:top-0 focus-visible:z-50 focus-visible:flex focus-visible:h-header focus-visible:items-center focus-visible:bg-foreground focus-visible:px-5 focus-visible:font-mono focus-visible:text-xs focus-visible:uppercase focus-visible:tracking-widest focus-visible:text-background focus-visible:no-underline"
    >
      {t('common.skipToContent')}
    </a>
  );
};

export { SkipLink, MAIN_ID };
