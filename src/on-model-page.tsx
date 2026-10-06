import type { ParseKeys } from 'i18next';
import { Button } from '@/components/ui/button';
import { useT } from './i18n/use-t';
import { manualPath } from './book/book-routes';
import { FaqCell } from './discovery/faq-cell';
import { captureCta } from './lib/analytics';
import { usePageContext } from './lib/page-context';
import { SCREEN_TO_PATH } from './lib/screens';
import { LIVE_RATES, liveRates, onModelFaq } from './on-model/content';
import { fmtEUR } from './lib/format';
import { CtaCell } from './ui/cta-cell';
import { KeyValueList, KeyValueRow } from './ui/key-value-row';
import { PageShell } from './ui/page-shell';
import { SectionIntro } from './ui/section-intro';
import { MAIN_ID } from './ui/skip-link';

// La page « studio photo mannequin » (#423) : le plateau Live, en phrases.
//
// Elle ne dit QUE ce que le site publie déjà (#428) — la fiche du plateau Live,
// le texte de l'accueil, la FAQ Discovery — et les tarifs du moteur de
// réservation. Le live shopping n'y figure pas : rien sur le site ne dit que le
// plateau diffuse en direct, et l'accueil a déjà dû retirer cette promesse.
//
// Aucun contenu Strapi, donc aucun loader : le texte est complet dans le HTML
// servi même quand le CMS ne répond pas. Pas d'image non plus — le LCP est le
// titre.
interface SectionLink {
  screen: string;
  labelKey: ParseKeys;
}

const SECTIONS: {
  key: 'stage' | 'equipment' | 'mannequin' | 'team' | 'studio' | 'rates';
  links: SectionLink[];
}[] = [
  {
    key: 'stage',
    links: [
      { screen: 'plateau-live', labelKey: 'onModelPage.sections.stage.link' },
    ],
  },
  { key: 'equipment', links: [] },
  {
    key: 'mannequin',
    links: [
      {
        screen: 'plateau-vertical',
        labelKey: 'onModelPage.sections.mannequin.link',
      },
    ],
  },
  { key: 'team', links: [] },
  {
    key: 'studio',
    links: [
      {
        screen: 'cyclorama',
        labelKey: 'onModelPage.sections.studio.cyclorama',
      },
      { screen: 'postprod', labelKey: 'onModelPage.sections.studio.postprod' },
    ],
  },
  { key: 'rates', links: [] },
];

const RATE_ROWS = [
  ['hour', 'booking.hourly'],
  ['half', 'booking.halfDay'],
  ['full', 'booking.fullDay'],
] as const;

export const OnModelPage = () => {
  const t = useT();
  const { lang } = usePageContext();
  const rates = liveRates(lang);
  const bookHref = `${manualPath(lang)}?plateau=live`;

  return (
    /* Le gabarit de l'article Discovery : la colonne du logo porte l'action,
       les trois pistes suivantes se lisent et défilent. Sous `app`, la pile
       suit l'ordre du DOM — le texte d'abord, les tarifs et le pavé ensuite. */
    <PageShell className="app:grid-cols-[var(--spacing-logo)_repeat(3,minmax(0,1fr))] app:grid-rows-[var(--spacing-header)_minmax(0,1fr)]">
      <main id={MAIN_ID} className="contents">
        <article className="flex min-w-0 flex-col gap-px bg-border app:col-start-2 app:col-span-3 app:row-start-2 app:min-h-0 app:overflow-y-auto">
          {/* `md:px-6` : le retrait de `lg` (48px) décalerait le titre de page
              par rapport aux sections `sm` qui le suivent dans la même colonne. */}
          <SectionIntro
            as="h1"
            title={t('onModelPage.title')}
            subtitle={t('onModelPage.intro')}
            className="bg-background md:px-6"
          />

          {SECTIONS.map(({ key, links }) => (
            <SectionIntro
              key={key}
              as="h2"
              size="sm"
              title={t(`onModelPage.sections.${key}.title`)}
              subtitle={t(`onModelPage.sections.${key}.body`, rates)}
              className="bg-background"
            >
              {links.length > 0 &&
                links.map(({ screen, labelKey }) => (
                  <Button
                    key={screen}
                    variant="outline"
                    render={<a href={SCREEN_TO_PATH[screen](lang)} />}
                  >
                    {t(labelKey)}
                  </Button>
                ))}
            </SectionIntro>
          ))}

          <SectionIntro
            as="h2"
            size="sm"
            title={t('onModelPage.sections.booking.title')}
            subtitle={t('onModelPage.sections.booking.body')}
            className="bg-background"
          >
            <Button variant="outline" render={<a href={bookHref} />}>
              {t('onModelPage.sections.booking.book')}
            </Button>
            <Button
              variant="outline"
              render={<a href={SCREEN_TO_PATH.contact(lang)} />}
            >
              {t('common.contactUs')}
            </Button>
          </SectionIntro>

          {/* `flex-1` : la dernière cellule remplit la piste quand le texte est
              plus court qu'elle, sinon le fond noir de la colonne apparaîtrait
              sous la FAQ. */}
          <FaqCell
            title={t('onModelPage.faq.title')}
            entries={onModelFaq(t, lang)}
            className="flex-1"
          />
        </article>

        <div className="flex min-w-0 flex-col bg-background app:col-start-1 app:row-start-2 app:min-h-0">
          <KeyValueList
            pad="tight"
            heading={t('plateau.rates')}
            className="py-3"
          >
            {RATE_ROWS.map(([rate, label]) => (
              <KeyValueRow
                key={rate}
                density="tight"
                numeric
                label={t(label)}
                value={`${fmtEUR(LIVE_RATES[rate], lang)} €`}
              />
            ))}
          </KeyValueList>
          {/* Un vrai lien vers le tunnel, plateau coché : il fonctionne sans
              JavaScript, et un robot le suit. */}
          <CtaCell
            title={t('onModelPage.sections.booking.book')}
            href={bookHref}
            onClick={() => captureCta('book_stage', 'live')}
            className="app:mt-auto"
          />
        </div>
      </main>
    </PageShell>
  );
};
