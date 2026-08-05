import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRouterState } from '@tanstack/react-router';
import { type MainNavItem, MAIN_NAV, activeNavId } from '../lib/nav';
import { usePageContext } from '../lib/page-context';
import { Wordmark } from './brand';
import { HoverMarquee } from './hover-marquee';
import { ArrowRight, Menu } from 'lucide-react';
import { useT } from '../i18n/use-t';

interface PageHeaderProps {
  /**
   * Contenu éditorial de la cellule orange, optionnel.
   *
   * Il portait le nom de la page, que chaque appelant écrivait à la main en
   * regard d'un `exclude` qu'il fallait garder d'accord avec — rien ne l'y
   * obligeait, et post-prod affichait « Post-production » à gauche pendant que
   * sa cellule de nav disait « Post-prod ». La page courante est maintenant
   * marquée dans la bande elle-même ; la cellule est libre pour ce qui n'est
   * qu'à cette page : horaires et annonce sur l'accueil, étape du tunnel de
   * réservation, nom de la rubrique sur Discovery. Vide ailleurs — elle reste
   * rendue, c'est elle qui pousse la navigation à droite.
   */
  title?: ReactNode;
  subtitle?: ReactNode;
  // Rendered as its own header cell (with a hairline divider) immediately to
  // the right of the title cell. Used on the home page for the CMS announcement.
  titleAside?: ReactNode;
  className?: string;
  // md+ subgrid placement overrides. Defaults match the plateau/contact
  // layout: title spans cols 2-3 (= the wide content area), right block sits
  // in col 4 (= the narrow descrip-like col). Pages where the body proportions
  // are inverted (e.g. postprod with samples on the right spanning cols 3-4)
  // pass their own classes. Set `subgrid={false}` to skip the grid layout
  // entirely (header stays flex on every breakpoint).
  titleClassName?: string;
  rightBlockClassName?: string;
  subgrid?: boolean;
}

/**
 * La destination que l'URL courante allume, ou `null`.
 *
 * `location` et non `resolvedLocation` : ce dernier est indéfini au premier
 * rendu, côté serveur comme côté client — le même piège qu'à la racine, où il
 * avait fait échouer l'hydratation de toutes les routes anglaises.
 */
const useActiveNavId = () =>
  activeNavId(useRouterState({ select: (s) => s.location.pathname }));

/**
 * Le repère de la cellule orange quand on est déjà dans le tunnel.
 *
 * Un point, pas la flèche : celle-ci promet « aller là », ce qui est faux sur
 * la page où l'on se trouve. Rendu dans une boîte `size-4`, exactement celle
 * de l'icône qu'il remplace — l'état courant ne doit pas changer la largeur
 * d'une cellule, la bande n'a que 48px de marge à 1024.
 */
const ActiveDot = () => (
  <span
    aria-hidden
    data-icon="inline-end"
    className="flex size-4 items-center justify-center"
  >
    <span className="size-1.5 rounded-full bg-current" />
  </span>
);

const NavCell = ({ item, active }: { item: MainNavItem; active: boolean }) => {
  const t = useT();
  const { goto } = usePageContext();
  return (
    <Button
      variant={item.primary ? 'default' : 'header'}
      size="header"
      onClick={() => goto(item.screen)}
      // `aria-current` et non `aria-pressed` : ces cellules sont des
      // destinations, pas des bascules — et `aria-pressed` deviendrait
      // franchement invalide le jour où elles seront de vrais liens.
      aria-current={active ? 'page' : undefined}
      className={cn(
        // Aucune géométrie ici : `size="header"` porte la hauteur, l'écart et
        // le padding, la base du Button porte la police et l'interlettrage.
        'no-underline flex-1 md:flex-none',
        // Les destinations attendent `lg`, mesure à l'appui : en français, la
        // bande complète demande 976px (logo 240, espaceur 49, PLATEAUX 108,
        // POST-PROD 117, GALERIE 100, NOUS CONTACTER 159, RÉSERVER 132, EN 72).
        // À 768 il en manquait deux cents. L'anglais est 84px moins cher :
        // c'est le français qui contraint. La cellule orange, elle, reste
        // visible partout — c'est le seul appel à l'action de la bande.
        !item.primary && 'hidden lg:flex',
      )}
    >
      <HoverMarquee className="min-w-0">{t(item.labelKey)}</HoverMarquee>
      {item.primary &&
        (active ? <ActiveDot /> : <ArrowRight data-icon="inline-end" />)}
    </Button>
  );
};

const DEFAULT_TITLE_CLASS = 'lg:col-start-2';
const DEFAULT_RIGHT_BLOCK_CLASS = 'lg:col-start-3 lg:col-span-2';
// Le filet entre deux cellules du header appartient au conteneur.
//
// Prudence avec `divide-x` : Tailwind l'émet dans `:where(…)`, donc à
// spécificité nulle. Il a déjà fait disparaître ces filets en silence — sans
// rien casser au typecheck ni au build — le jour où une variante posait
// `border-0`. Le sélecteur ci-dessous compile en `.classe > *:not(:last-child)`,
// soit 0,2,0 : il ne dépend d'aucune hypothèse sur les variantes.
const CELL_DIVIDERS =
  '[&>*:not(:last-child)]:border-r [&>*:not(:last-child)]:border-border';

const RIGHT_BLOCK_BASE_CLASS = `flex min-w-0 ${CELL_DIVIDERS}`;

const LangButton = ({ onLangToggle }: { onLangToggle: () => void }) => {
  const t = useT();
  return (
    <Button
      variant="header"
      size="header"
      onClick={onLangToggle}
      // `w-*` et non `basis-*` : `flex-none` est le raccourci `flex: 0 0 auto`,
      // qui remet `flex-basis` à `auto`. La base ne tenait que parce que
      // Tailwind émet `basis-14` après `flex-none` — un ordre sur lequel on ne
      // veut pas parier. Une largeur, elle, n'est pas touchée par le raccourci.
      className="w-14 flex-none px-0 md:w-18"
    >
      {/* Sans enveloppe : la base du Button pose déjà `font-mono text-xs
          tracking-widest` et la variante `header` pose `text-foreground`. Le
          span ne faisait que les redire. */}
      {t('common.langToggleLabel')}
    </Button>
  );
};

const PageHeader = ({
  title,
  subtitle,
  titleAside,
  className,
  titleClassName,
  rightBlockClassName,
  subgrid = true,
}: PageHeaderProps) => {
  // Ouvrir le tiroir, rentrer à l'accueil, basculer la langue : les onze
  // appelants construisaient ces trois rappels à l'identique et les passaient en
  // props. Ils sont dans le contexte, et le header est rendu dedans partout.
  const { lang, setLang, openMenu, goto } = usePageContext();
  const onLangToggle = () => setLang(lang === 'fr' ? 'en' : 'fr');
  const active = useActiveNavId();

  const titleCell = (
    <div
      className={cn(
        'hidden min-w-0 items-center justify-start bg-background md:flex md:px-6',
        titleAside ? 'md:flex-none' : 'flex-1',
        subgrid && (titleClassName ?? DEFAULT_TITLE_CLASS),
      )}
    >
      {title && (
        <div
          className={cn(
            'flex min-w-0 items-baseline overflow-hidden',
            subtitle ? 'gap-3.5' : 'gap-0',
          )}
        >
          <span className="font-mono text-xs uppercase tracking-widest text-primary min-w-0 md:shrink-0">
            <HoverMarquee>{title}</HoverMarquee>
          </span>
          {subtitle && (
            <HoverMarquee className="font-mono text-xs tracking-widest text-muted-foreground">
              {subtitle}
            </HoverMarquee>
          )}
        </div>
      )}
    </div>
  );

  // La bande rend les mêmes destinations, dans le même ordre, sur toutes les
  // pages. Elle en retirait celle où l'on se trouvait : aucune destination
  // n'était jamais deux fois au même endroit, et l'`exclude` qui décidait de
  // la coupe était passé à la main — oublié sur les mentions légales et dans
  // tout le tunnel de réservation, qui affichaient cinq cellules quand les
  // autres en affichaient quatre.
  const nav = MAIN_NAV.map((item) => (
    <NavCell key={item.id} item={item} active={item.id === active} />
  ));

  return (
    <header
      className={cn(
        // La hauteur de bande appartient au composant, pas aux appels : elle
        // était redéclarée par chacun d'eux, en trois valeurs différentes.
        'sticky top-0 z-40 flex h-header min-w-0 bg-background',
        CELL_DIVIDERS,
        subgrid && 'lg:grid lg:grid-cols-subgrid',
        className,
      )}
    >
      <div
        className={cn(
          // `basis-44` en mobile et non `basis-logo` : à 375px, 240 ne
          // laisserait que 79px à la cellule Réserver, qui en demande 132.
          // L'alignement sur la première colonne des pages n'a besoin de tenir
          // qu'à partir de `md`, là où ces grilles existent.
          'flex h-full flex-none basis-44 md:basis-logo lg:col-start-1',
          CELL_DIVIDERS,
        )}
      >
        <Button
          variant="header"
          onClick={openMenu}
          aria-label="Open menu"
          // `lg:hidden` et non `md:hidden` : le burger doit couvrir toute la
          // plage où la bande ne peut pas afficher ses destinations, sinon
          // 768-1023px se retrouve sans burger *et* sans nav — c'était le cas.
          className="h-full basis-14 flex-none px-0 lg:hidden"
        >
          <Menu />
        </Button>
        <Button
          variant="header"
          onClick={() => goto('home')}
          aria-label="E-Do Studio home"
          className="h-full min-w-0 flex-1 p-2"
        >
          <Wordmark size={32} />
        </Button>
      </div>

      {titleCell}

      {titleAside && (
        <div className="hidden min-w-0 flex-1 items-center justify-start overflow-hidden bg-background md:flex md:px-6">
          {titleAside}
        </div>
      )}

      {subgrid ? (
        /* Subgrid mode — actions + lang are wrapped in a single right block
           grid cell whose width matches the body's rightmost column. On mobile
           the wrapper grows so the orange cell fills the space between the logo
           and the language button. */
        <div
          className={cn(
            RIGHT_BLOCK_BASE_CLASS,
            'lg:justify-end flex-1 md:flex-initial',
            rightBlockClassName ?? DEFAULT_RIGHT_BLOCK_CLASS,
          )}
        >
          {nav}
          <LangButton onLangToggle={onLangToggle} />
        </div>
      ) : (
        /* Flex mode — actions + lang are wrapped in a single right block.
           Same mobile-grow behavior. */
        <div className={cn(RIGHT_BLOCK_BASE_CLASS, 'flex-1 md:flex-initial')}>
          {nav}
          <LangButton onLangToggle={onLangToggle} />
        </div>
      )}
    </header>
  );
};

export { PageHeader };
export type { PageHeaderProps };
