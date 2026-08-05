import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { type MainNavItem, MAIN_NAV, activeNavId } from '../lib/nav';
import { usePageContext } from '../lib/page-context';
import { SCREEN_TO_PATH } from '../lib/screens';
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
  /** Placement de la bande dans la grille de la page, rien de plus. */
  className?: string;
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
  const navigate = useNavigate();
  const { lang } = usePageContext();
  const href = SCREEN_TO_PATH[item.screen](lang);
  return (
    <Button
      variant={item.primary ? 'default' : 'header'}
      size="header"
      // Un vrai lien, sur le motif du tiroir : ces cellules étaient des
      // `<button>`, donc les moteurs ne voyaient aucun lien interne depuis
      // l'en-tête de toutes les pages du site, et le clic-molette, le
      // Cmd-clic et « copier l'adresse du lien » ne faisaient rien.
      render={
        <a
          href={href}
          onClick={(e) => {
            e.preventDefault();
            navigate({ to: href });
          }}
        />
      }
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

// Le filet entre deux cellules est une gouttière : le conteneur est noir, les
// cellules peignent leur propre fond, et le `gap-px` laisse voir le noir entre
// elles.
//
// C'est le seul mécanisme qui puisse s'aligner sur les grilles de page, parce
// que c'est celui qu'elles emploient toutes. Une bordure mord à l'intérieur de
// la cellule, une gouttière se pose après : tant que le header dessinait ses
// filets en `border-right`, celui de la cellule logo tombait sur 239-240 quand
// celui de la colonne du corps tombait sur 240-241. Un pixel d'écart, sur
// toutes les pages, à la jonction la plus visible du site.
//
// Corollaire : chaque cellule doit peindre son fond. `variant="header"` et
// `variant="cell"` portent `bg-background`, `variant="default"` porte
// `bg-primary` ; les cellules de titre et d'annonce le posent en dur. Une
// cellule qui l'oublierait laisserait passer le noir.
const CELL_GUTTERS = 'gap-px bg-border';

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
}: PageHeaderProps) => {
  // Ouvrir le tiroir, rentrer à l'accueil, basculer la langue : les onze
  // appelants construisaient ces trois rappels à l'identique et les passaient en
  // props. Ils sont dans le contexte, et le header est rendu dedans partout.
  const t = useT();
  const { lang, setLang, openMenu, goto } = usePageContext();
  const onLangToggle = () => setLang(lang === 'fr' ? 'en' : 'fr');
  const active = useActiveNavId();

  // Cette cellule est aussi l'espaceur : c'est son `flex-1` qui pousse la
  // navigation contre le bord droit, sur toutes les pages et sans que la page
  // ait à le dire. Elle reste donc rendue même vide.
  const titleCell = (
    <div
      className={cn(
        'hidden min-w-0 items-center justify-start bg-background md:flex md:px-6',
        // `flex-1` tant que l'annonce est masquée, `flex-none` quand elle
        // paraît et reprend le rôle d'espaceur : il en faut toujours
        // exactement un, sinon la navigation cesse d'être poussée à droite.
        titleAside ? 'flex-1 xl:flex-none' : 'flex-1',
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
  //
  // Un repère de navigation, et non cinq liens en vrac dans la bannière :
  // `aria-current` ne dit « vous êtes ici » que rapporté à un ensemble de
  // destinations, encore faut-il que l'ensemble soit déclaré. Son libellé le
  // distingue du tiroir, qui est un second repère sur la même page.
  const nav = (
    <nav
      aria-label={t('common.mainNav')}
      className={cn('flex min-w-0 flex-1 md:flex-initial', CELL_GUTTERS)}
    >
      {MAIN_NAV.map((item) => (
        <NavCell key={item.id} item={item} active={item.id === active} />
      ))}
    </nav>
  );

  return (
    // Une bande de cellules, à plat, sur toutes les pages et à toutes les
    // largeurs.
    //
    // Elle se calait auparavant sur la grille de la page par `grid-cols-subgrid`
    // — ce qui la désalignait au lieu de l'aligner. Le bloc de droite était
    // placé dans une piste plus étroite que son contenu, et `justify-end` le
    // faisait déborder vers la gauche, par-dessus le titre et le logo : 127px
    // sur les mentions légales, 409px dans le tunnel de réservation, sans que
    // `scrollWidth` en dise rien. Le subgrid héritait en prime le `gap-px` de
    // la page, si bien qu'au-dessus de `lg` chaque filet devenait un trait noir
    // suivi d'un blanc — la même bande n'avait pas le même trait à 1023 et à
    // 1025px.
    //
    // Depuis que les cinq destinations sont rendues partout, il n'y a plus rien
    // à aligner horizontalement : des enfants identiques dans un flex donnent
    // des filets aux mêmes abscisses, gratuitement. Restait à les dessiner
    // comme les pages dessinent les leurs — cf. CELL_GUTTERS.
    <header
      className={cn(
        // La hauteur de bande appartient au composant, pas aux appels : elle
        // était redéclarée par chacun d'eux, en trois valeurs différentes.
        //
        // Pas de `bg-background` ici : le fond du conteneur *est* le filet.
        'sticky top-0 z-40 flex h-header min-w-0',
        CELL_GUTTERS,
        className,
      )}
    >
      <div
        className={cn(
          // `basis-44` en mobile et non `basis-logo` : à 375px, 240 ne
          // laisserait que 79px à la cellule Réserver, qui en demande 132.
          // L'alignement sur la première colonne des pages n'a besoin de tenir
          // qu'à partir de `md`, là où ces grilles existent.
          'flex h-full flex-none basis-44 md:basis-logo',
          CELL_GUTTERS,
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

      {/* `xl` et non `md` : mesuré, l'accueil déborde de 127px à 1024 dès qu'il
          affiche l'annonce à côté des cinq destinations. Le débordement était
          du genre silencieux — contenu dans la bande, invisible pour le
          défilement du document. L'annonce attend donc d'avoir la place. */}
      {titleAside && (
        <div className="hidden min-w-0 flex-1 items-center justify-start overflow-hidden bg-background px-6 xl:flex">
          {titleAside}
        </div>
      )}

      {nav}

      <LangButton onLangToggle={onLangToggle} />
    </header>
  );
};

export { PageHeader };
export type { PageHeaderProps };
