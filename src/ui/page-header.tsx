import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import {
  type MainNavItem,
  MAIN_NAV,
  activeNavId,
  pageLabelKey,
} from '../lib/nav';
import { usePageContext } from '../lib/page-context';
import { SCREEN_TO_PATH } from '../lib/screens';
import { useRoutePreload } from '../lib/use-route-preload';
import { Wordmark } from './brand';
import { HoverMarquee } from './hover-marquee';
import { ArrowRight, Menu } from 'lucide-react';
import { useT } from '../i18n/use-t';

interface PageHeaderProps {
  /**
   * Une ligne courte, dans la cellule qui suit le sigle — **à la place du nom
   * de page**, sur une page qui ne se nomme pas. Visible dès `md`.
   *
   * Courte, et c'est une contrainte de place, pas de style : à 1024 les cinq
   * destinations prennent 614px et il ne reste que 95px à cette cellule. Les
   * horaires de l'accueil y tiennent tout juste ; une phrase y est illisible.
   */
  note?: ReactNode;
  /**
   * Le propos long, dans sa propre cellule, et seulement à partir de `xl`.
   *
   * Mesuré : l'accueil débordait de 127px à 1024 dès qu'il affichait l'annonce
   * du CMS à côté des cinq destinations — un débordement silencieux, contenu
   * dans la bande, invisible pour le défilement du document. Elle attend donc
   * d'avoir la place, quand `note` s'affiche partout.
   */
  aside?: ReactNode;
  /** Placement de la bande dans la grille de la page, rien de plus. */
  className?: string;
}

/**
 * Le chemin vers lequel on va. Il bascule dès le clic, avant que le loader de
 * la route d'arrivée ait rendu quoi que ce soit.
 */
const usePendingPathname = () =>
  useRouterState({ select: (s) => s.location.pathname });

/**
 * Le chemin effectivement à l'écran. Il bascule avec le contenu.
 *
 * Mesuré sur une navigation vers la galerie : `location` passe à 44ms, le corps
 * de la page à 715ms, `resolvedLocation` à 757ms. Lire `location` pour nommer
 * la page faisait donc annoncer la galerie pendant 671ms au-dessus de la page
 * de post-production — l'en-tête mentait le temps du réseau.
 *
 * Le repli n'est pas une prudence : `resolvedLocation` est indéfini au premier
 * rendu, côté serveur comme côté client. Lu nu, il avait fait échouer
 * l'hydratation de toutes les routes anglaises depuis la racine (cf. le
 * commentaire de `LangLayout` dans routes/__root.tsx). Le repli rend la même
 * valeur des deux côtés.
 */
const useRenderedPathname = () =>
  useRouterState({
    select: (s) => s.resolvedLocation?.pathname ?? s.location.pathname,
  });

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
  const preload = useRoutePreload(href);
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
          // Le loader de la destination part au survol, pas au clic : sans lui
          // la page reste figée sur l'ancienne le temps du réseau.
          {...preload}
        />
      }
      // `aria-current` et non `aria-pressed` : ces cellules sont des
      // destinations, pas des bascules — et `aria-pressed` deviendrait
      // franchement invalide le jour où elles seront de vrais liens.
      aria-current={active ? 'page' : undefined}
      className={cn(
        // Aucune géométrie ici : `size="header"` porte la hauteur, l'écart et
        // le padding, la base du Button porte la police et l'interlettrage.
        //
        // Sans `flex-1` : elle était la seule cellule élastique de la bande sous
        // 768 et absorbait donc tout le mou — 266px à 500, 405px à 639, 533px à
        // 767. Elle prend maintenant sa largeur intrinsèque partout, le mou
        // allant à la marque sous `sm` puis à la cellule du milieu.
        //
        // Le défaut de flex suffit (`0 1 auto`) : largeur du contenu, mais elle
        // peut encore rétrécir, ce qui sauve les viewports sous 375 où la somme
        // des largeurs intrinsèques dépasse la bande. `sm:flex-none` la fige
        // là où la cellule du milieu peut céder à sa place.
        'no-underline sm:flex-none',
        // Trois crans, déclarés dans MAIN_NAV. Les quatre destinations
        // attendaient `app` toutes ensemble, mesure à l'appui : en français, la
        // bande complète demande 976px (logo 240, espaceur 49, PLATEAUX 108,
        // POST-PROD 117, GALERIE 100, NOUS CONTACTER 159, RÉSERVER 132, EN 72).
        // À 768 il en manquait deux cents. L'anglais est 84px moins cher :
        // c'est le français qui contraint.
        //
        // C'est CETTE mesure qui fixe `--breakpoint-app` : la bande était montée
        // seule pendant que les grilles restaient à 768, laissant 768–1023px en
        // grille de bureau sous un en-tête mobile.
        //
        // Deux d'entre elles n'ont pas besoin des 976 et montent à `md` : sans
        // elles, 768–1023 laissait un vide qui allait jusqu'à 577px.
        !item.primary && (item.compact ? 'hidden md:flex' : 'hidden app:flex'),
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

const PageHeader = ({ note, aside, className }: PageHeaderProps) => {
  // Ouvrir le tiroir, rentrer à l'accueil, basculer la langue : les onze
  // appelants construisaient ces trois rappels à l'identique et les passaient en
  // props. Ils sont dans le contexte, et le header est rendu dedans partout.
  const t = useT();
  const { lang, setLang, openMenu, goto } = usePageContext();
  const onLangToggle = () => setLang(lang === 'fr' ? 'en' : 'fr');
  // Deux chemins, et c'est délibéré : le repère de navigation accuse réception
  // du clic — il s'allume sur la destination visée, tout de suite —, le nom
  // décrit ce qui est à l'écran. Les unifier revient à choisir entre une bande
  // qui ne répond pas au clic et une bande qui annonce une page qu'on ne voit
  // pas encore.
  //
  // Deux sélecteurs et non un objet : `useRouterState` compare ce que rend le
  // `select`, et un objet neuf à chaque changement d'état re-rendrait la bande
  // en permanence. Deux comparaisons de chaînes ne coûtent rien.
  const active = activeNavId(usePendingPathname());
  const pageLabel = pageLabelKey(useRenderedPathname());

  // La cellule qui suit le sigle est aussi l'espaceur : son `flex-1` pousse la
  // navigation contre le bord droit. Elle reste donc rendue même vide — la 404,
  // et elle seule.
  //
  // Elle porte le nom de la page, ou à défaut la note de la page. Les deux ne
  // se rencontrent jamais : l'accueil est la seule page qui passe une note, et
  // c'est justement celle qui ne se nomme pas. Lui donner sa propre cellule
  // laissait un vide de 322 à 454px à droite du sigle entre 768 et 1280 — la
  // cellule du nom, vide, et rendue quand même parce qu'elle est l'espaceur.
  //
  // Le nom est dérivé et non passé : chaque page l'écrivait à la main, et il
  // avait dérivé de celui de la navigation. Trois appelants sur douze le
  // passaient encore, pour trois choses différentes — horaires, nom de
  // rubrique, tag de statut — et neuf pages n'affichaient rien du tout.
  //
  // Ni mono, ni capitales, ni orange : les trois disent autre chose dans cette
  // bande — le mono capitale est la langue des destinations, l'orange celle de
  // l'action et du « vous êtes ici ». Sur la galerie, le nom repris de la
  // navigation donnait deux fois le même mot, dans la même casse et la même
  // couleur, à deux mètres l'un de l'autre. En sans et en bas de casse, il se
  // lit comme ce qu'il est : une étiquette.
  const titleCell = (
    <div
      className={cn(
        // `whitespace-nowrap` est une garantie du composant et non l'affaire de
        // l'appelant : les horaires de l'accueil se pliaient sur trois lignes
        // qui débordaient d'une bande haute de 56px. Une cellule d'en-tête tient
        // sur une ligne ou ne s'affiche pas, elle ne s'empile pas.
        //
        // `sm` et non `md` : c'est cette cellule qui absorbe le mou, et sous 768
        // il n'y avait qu'elle à ne pas être là — le mou tombait alors sur la
        // cellule orange, qui atteignait 533px à 767.
        'hidden min-w-0 items-center justify-start overflow-hidden whitespace-nowrap bg-background sm:flex',
        // Pas de retrait sur une cellule vide : 48px de blanc entre deux filets
        // se lisent comme un trou, pas comme une marge.
        (pageLabel || note) && 'sm:px-6',
        // `flex-1` tant que l'aside est masquée, `flex-none` quand elle paraît
        // et reprend le rôle d'espaceur : il en faut toujours exactement un,
        // sinon la navigation cesse d'être poussée à droite.
        aside ? 'flex-1 xl:flex-none' : 'flex-1',
        // La cellule se déclare conteneur pour que son contenu puisse consulter
        // SA largeur, seule mesure qui décide s'il tient. Aucun palier de
        // viewport ne la connaît : elle est le reste d'une soustraction, et elle
        // s'effondre à chaque fois qu'un lot de destinations paraît — 401px à
        // 767 puis 97 à 768, 352 à 1023 puis 95 à 1024.
        //
        // Sauf à `xl`, où elle est `flex-none` : sa largeur vient alors de son
        // contenu, et le confinement en ligne la ramènerait à zéro. Là elle est
        // taillée sur mesure, donc rien n'y est jamais tronqué.
        'sm:@container xl:@container-normal',
      )}
    >
      {/* Ou ça tient en entier, ou ça ne s'affiche pas. Le seuil est mesuré :
          le plus long des contenus est celui de l'accueil, 118px d'horaires plus
          48px de retrait, soit 166px ; « Post-production » en demande 165. Un
          fragment comme « LUN-SAM, 1… » n'apprend rien à personne — c'est la
          même faute que le tiret cadratin posé dans une valeur vide.

          Un seuil unique taillé pour le plus long masque « Légal » (87px) dans
          une plage où il aurait tenu. C'est le prix à payer, et il est juste :
          la cellule y est de toute façon un espaceur.

          `xl:flex` court-circuite la requête là où le confinement est coupé. */}
      <span className="hidden min-w-0 @min-[10.5rem]:flex xl:flex">
        {pageLabel ? (
          // HoverMarquee reste, pour le jour où un libellé dépassera le seuil —
          // une destination de plus, une traduction plus longue. Aujourd'hui il
          // n'a rien à dérouler, et c'est le but.
          <HoverMarquee className="min-w-0 text-lg font-light leading-none tracking-tighter text-foreground">
            {t(pageLabel)}
          </HoverMarquee>
        ) : (
          note
        )}
      </span>
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
      // Jamais élastique : son fond EST le filet, donc tout pixel qu'il prend
      // au-delà de ses cellules se voit en noir. Il l'était sous `sm`, du temps
      // où sa cellule unique s'étirait pour le remplir ; elle ne s'étire plus,
      // et le mou lui laissait une barre noire entre le bouton et la langue.
      className="flex min-w-0 gap-px bg-border"
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
    // comme les pages dessinent les leurs, par la gouttière `gap-px bg-border`.
    <header
      className={cn(
        // La hauteur de bande appartient au composant, pas aux appels : elle
        // était redéclarée par chacun d'eux, en trois valeurs différentes.
        //
        // Pas de `bg-background` ici : le fond du conteneur *est* le filet.
        'sticky top-0 z-40 flex h-header min-w-0',
        'gap-px bg-border',
        className,
      )}
    >
      <div
        className={cn(
          // `basis-44` en mobile et non `basis-logo` : à 375px, 240 ne
          // laisserait que 79px à la cellule Réserver, qui en demande 132.
          // L'alignement sur la première colonne des pages n'a besoin de tenir
          // qu'à partir de `md`, là où ces grilles existent.
          //
          // C'est la marque qui prend le mou sous `sm`, faute de cellule du
          // milieu pour le faire : sans cela il tombait sur la cellule orange,
          // seule élastique, qui atteignait 266px à 500 et 405px à 639 — un
          // pavé pour un bouton. Une cellule de marque large se lit comme une
          // en-tête de papier ; une cellule d'action large crie.
          //
          // `grow` et non `flex-1` : `flex-1` est `flex: 1 1 0%`, qui remet la
          // base à zéro et annulerait `basis-44` selon l'ordre où Tailwind les
          // émet — le même piège que `flex-none` plus bas. `grow` ne touche
          // qu'une propriété.
          // `min-w-0` : un élément flex a `min-width: auto`, donc un plancher à
          // sa taille de contenu minimale. Sans lui, le bloc refusait de
          // descendre sous 219px et la bande débordait de 31px à 320 et de 4px
          // à 375 — un débordement silencieux, contenu dans la bande.
          'flex h-full min-w-0 grow basis-44 sm:grow-0 md:basis-logo',
          'gap-px bg-border',
        )}
      >
        <Button
          variant="header"
          size="header"
          onClick={openMenu}
          aria-label="Open menu"
          // `app:hidden` : le burger couvre exactement la plage où la bande ne
          // peut pas afficher ses destinations, sinon 768-1023px se retrouve
          // sans burger *et* sans nav — c'était le cas.
          //
          // `w-14` et non `basis-14`, comme sur le bouton de langue :
          // `flex-none` est le raccourci `flex: 0 0 auto`, qui remet
          // `flex-basis` à `auto`. Une largeur, elle, y survit.
          className="w-14 flex-none px-0 app:hidden"
        >
          <Menu />
        </Button>
        <Button
          variant="header"
          size="header"
          onClick={() => goto('home')}
          aria-label="E-Do Studio home"
          // `p-2` l'emporte sur le `px-5` de `size="header"` : la carte de
          // conflits de tailwind-merge va de `p` vers `px`, pas l'inverse.
          className="min-w-0 flex-1 p-2"
        >
          <Wordmark size={32} />
        </Button>
      </div>

      {titleCell}

      {aside && (
        <div className="hidden min-w-0 flex-1 items-center justify-start overflow-hidden whitespace-nowrap bg-background px-6 xl:@container xl:flex">
          {/* Même règle que la cellule du nom, et le même seuil de bon sens :
              sous 14rem une cellule éditoriale ne porte pas une phrase, elle en
              porte un moignon. À 1280 elle ne fait que 184px quand l'annonce en
              demande 216 — « ● STUDIO CLIMA… » n'apprend rien.

              Ce seuil-ci ne garantit rien, contrairement à celui du nom : le
              propos vient du CMS et sa longueur est libre. C'est HoverMarquee,
              posé par l'appelant, qui rend consultable ce qui dépasse — l'ellipse
              d'un `truncate`, elle, se contente d'annoncer qu'on cache. */}
          <span className="hidden min-w-0 @min-[14rem]:flex">{aside}</span>
        </div>
      )}

      {nav}

      <LangButton onLangToggle={onLangToggle} />
    </header>
  );
};

export { PageHeader };
export type { PageHeaderProps };
