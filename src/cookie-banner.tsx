import { Button } from '@/components/ui/button';
import { useCookieConsent } from './lib/use-cookie-consent';
import { Trans } from 'react-i18next';
import { useT } from './i18n/use-t';
import { SCREEN_TO_PATH } from './lib/screens';
import type { MouseEvent } from 'react';
import type { Lang } from './types';
import { MonoLabel } from './ui/mono-label';

interface CookieBannerProps {
  lang: Lang;
  onLegalClick: () => void;
}

const CookieBanner = ({ lang, onLegalClick }: CookieBannerProps) => {
  const t = useT();
  const { consent, ready, accept, reject } = useCookieConsent();
  const legalHref = SCREEN_TO_PATH.legal(lang);

  // Rien tant que le stockage n'est pas lu : le serveur et le premier rendu
  // client s'accordent, et un visiteur ayant déjà répondu ne voit plus la
  // bannière apparaître puis disparaître.
  if (!ready || consent !== null) return null;

  return (
    <div
      role="region"
      aria-label={t('cookieBanner.ariaLabel')}
      // `env(safe-area-inset-bottom)` : collée en bas de l'écran, la rangée
      // Refuser/Accepter passait sous l'indicateur d'accueil iOS.
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background text-foreground"
    >
      {/* La gouttière, et non des bordures posées cellule par cellule. Chaque
          enfant peint son propre fond, le `gap-px` laisse voir le noir du
          conteneur : un seul pixel entre deux voisins, par construction.

          La version précédente empilait trois traits au même endroit —
          `variant="outline"` apporte `border` sur les QUATRE côtés, le
          `className` y ajoutait `border-t border-l`, et le bandeau pose déjà son
          propre `border-t`. Le bouton Refuser sortait encerclé, son bord droit
          collé au bord gauche d'Accepter, et son bord haut doublait celui du
          bandeau. */}
      <div className="flex flex-col gap-px bg-border md:flex-row md:items-stretch">
        <div className="flex flex-1 flex-col gap-1.5 bg-background px-5 py-4 md:px-8 md:py-5">
          <MonoLabel tone="primary">{t('cookieBanner.title')}</MonoLabel>
          {/* Le lien vit dans la traduction : le séparer de la phrase figeait
              sa position en fin de texte, ce qui ne tient pas dans toutes les
              langues. Forme nommée — le lien porte trop de props pour être
              référencé positionnellement.

              `<a href>` et non `<button>` : « politique cookies » mène à une
              page. En bouton, ni Cmd-clic, ni ouverture dans un onglet, ni URL
              au survol — et le rôle annoncé était faux. Le `onClick` garde la
              navigation côté client. */}
          <p className="text-sm leading-relaxed text-muted-foreground">
            <Trans
              i18nKey="cookieBanner.bodyWithLink"
              components={{
                legal: (
                  <Button
                    variant="link"
                    render={<a href={legalHref} />}
                    onClick={(event: MouseEvent) => {
                      if (
                        event.metaKey ||
                        event.ctrlKey ||
                        event.shiftKey ||
                        event.button !== 0
                      )
                        return;
                      event.preventDefault();
                      onLegalClick();
                    }}
                    className="inline h-auto p-0 text-sm normal-case tracking-normal text-foreground underline underline-offset-2"
                  />
                ),
              }}
            />
          </p>
        </div>
        {/* `size="touch"` : sous `md`, la rangée passe en grille et les deux
            boutons ne prenaient plus que la hauteur de leur texte — un bandeau
            de 18px, en bas de l'écran, pour la seule décision de la page. La
            cible tactile est désormais une taille du bouton, plus un `min-h-11`
            recollé ici. Au-dessus de `md` la rangée flex les étire déjà. */}
        <div className="grid grid-cols-2 gap-px bg-border md:flex md:shrink-0">
          {/* `cell` et non `outline` : c'est une cellule bento cliquable, son
              fond est opaque et ses séparateurs viennent de la gouttière. */}
          <Button
            variant="cell"
            size="touch"
            onClick={reject}
            className="h-auto self-stretch px-6 md:px-8"
          >
            {t('cookieBanner.reject')}
          </Button>
          <Button
            variant="default"
            size="touch"
            onClick={accept}
            className="h-auto self-stretch px-6 md:px-8"
          >
            {t('cookieBanner.accept')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export { CookieBanner };
export type { CookieBannerProps };
