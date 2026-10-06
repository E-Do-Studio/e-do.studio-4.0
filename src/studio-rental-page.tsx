import type { MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { FaqCell } from './discovery/faq-cell';
import { useT } from './i18n/use-t';
import { captureCta } from './lib/analytics';
import { fmtEUR } from './lib/format';
import { usePageContext } from './lib/page-context';
import { SCREEN_TO_PATH } from './lib/screens';
import { useScrollDepth } from './lib/use-scroll-depth';
import {
  studioRentalFaq,
  studioRentalPrices,
  studioRentalRates,
} from './studio-rental/content';
import { CtaCell } from './ui/cta-cell';
import { KeyValueList, KeyValueRow } from './ui/key-value-row';
import { PageShell } from './ui/page-shell';
import { SectionIntro } from './ui/section-intro';
import { MAIN_ID } from './ui/skip-link';

const isPlainClick = (event: MouseEvent) =>
  !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0;

const STAGES = [
  { key: 'live', screen: 'plateau-live' },
  { key: 'eclipse', screen: 'plateau-eclipse' },
  { key: 'horizontal', screen: 'plateau-horizontal' },
  { key: 'vertical', screen: 'plateau-vertical' },
] as const;

/**
 * La page « location studio photo Paris » (#422) : du texte, rendu serveur,
 * pour une requête où le site n'avait aucune page.
 *
 * Elle ne dit QUE ce que le site affiche déjà ailleurs — adresse et horaires
 * du contact, caractéristiques des pages plateaux, réponses de la FAQ
 * Discovery — et ne cite que deux tarifs, lus dans le moteur de réservation
 * (#428 : aucune information non confirmée).
 *
 * Pas d'image : le texte est le contenu, et le LCP ne doit rien attendre.
 */
const StudioRentalPage = () => {
  const t = useT();
  const { lang, goto } = usePageContext();
  useScrollDepth();
  const prices = studioRentalPrices(lang);

  const link = (screen: string, label: string) => (
    <Button
      key={screen}
      variant="outline"
      render={<a href={SCREEN_TO_PATH[screen](lang)} />}
      onClick={(event: MouseEvent) => {
        if (!isPlainClick(event)) return;
        event.preventDefault();
        goto(screen);
      }}
    >
      {label}
    </Button>
  );

  return (
    /* `<main class="contents">` : voir home-page. Le gabarit de l'article
       Discovery : colonne du logo, puis trois pistes. Le texte en occupe deux
       et défile dans sa cellule au-dessus d'`app` ; sous le palier, la pile
       suit l'ordre du DOM — texte, FAQ, tarifs, réservation. */
    <PageShell className="app:grid-cols-[var(--spacing-logo)_repeat(3,minmax(0,1fr))] app:grid-rows-[var(--spacing-header)_minmax(0,1fr)]">
      <main id={MAIN_ID} className="contents">
        <article className="flex min-w-0 flex-col bg-background app:col-start-2 app:col-span-2 app:row-start-2 app:min-h-0 app:overflow-y-auto">
          <SectionIntro
            title={t('studioRental.h1')}
            subtitle={t('studioRental.intro')}
            // Le retrait des sections `sm` qui suivent : celui de `lg` (48px)
            // décalait le titre de la page par rapport à tous les autres.
            className="md:px-6"
          />
          <SectionIntro
            as="h2"
            size="sm"
            title={t('studioRental.sections.studio.title')}
            subtitle={t('studioRental.sections.studio.body')}
          />
          <SectionIntro
            as="h2"
            size="sm"
            title={t('studioRental.sections.cyclorama.title')}
            subtitle={t('studioRental.sections.cyclorama.body', prices)}
          >
            {link('cyclorama', t('studioRental.sections.cyclorama.link'))}
          </SectionIntro>
          <SectionIntro
            as="h2"
            size="sm"
            title={t('studioRental.sections.stages.title')}
            subtitle={t('studioRental.sections.stages.body', prices)}
          >
            {STAGES.map(({ key, screen }) =>
              link(screen, t(`home.offers.${key}.title`)),
            )}
          </SectionIntro>
          <SectionIntro
            as="h2"
            size="sm"
            title={t('studioRental.sections.team.title')}
            subtitle={t('studioRental.sections.team.body')}
          >
            {link('postprod', t('studioRental.sections.team.link'))}
          </SectionIntro>
          <SectionIntro
            as="h2"
            size="sm"
            title={t('home.clientsTitle')}
            subtitle={t('home.clientsBody')}
          />
          <SectionIntro
            as="h2"
            size="sm"
            title={t('studioRental.sections.booking.title')}
            subtitle={t('studioRental.sections.booking.body')}
          >
            {link('book', t('common.book'))}
            {link('contact', t('common.contactUs'))}
          </SectionIntro>
        </article>

        <FaqCell
          title={t('discoveryPage.faq.title')}
          entries={studioRentalFaq(t, lang)}
          className="app:col-start-4 app:row-start-2 app:min-h-0"
        />

        <div className="flex min-w-0 flex-col bg-background app:col-start-1 app:row-start-2 app:min-h-0">
          <KeyValueList
            pad="tight"
            heading={t('plateau.rates')}
            className="py-3"
          >
            {studioRentalRates(t).map((rate) => (
              <KeyValueRow
                key={rate.name}
                density="tight"
                numeric
                label={rate.name}
                value={`${fmtEUR(rate.price, lang)} €`}
              />
            ))}
          </KeyValueList>
          <CtaCell
            title={t('common.book')}
            href={SCREEN_TO_PATH.book(lang)}
            onClick={() => {
              captureCta('book');
              goto('book');
            }}
            className="app:mt-auto"
          />
        </div>
      </main>
    </PageShell>
  );
};

export { StudioRentalPage };
