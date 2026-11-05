import type { ParseKeys } from 'i18next';
import { Button } from '@/components/ui/button';
import { useT } from './i18n/use-t';
import { manualPath } from './book/book-routes';
import { FaqCell } from './discovery/faq-cell';
import { captureCta } from './lib/analytics';
import { usePageContext } from './lib/page-context';
import { SCREEN_TO_PATH } from './lib/screens';
import {
  PACKSHOT_RATES,
  PACKSHOT_STAGES,
  packshotFaq,
  packshotRates,
} from './packshot/content';
import { fmtEUR } from './lib/format';
import { CtaCell } from './ui/cta-cell';
import { KeyValueList, KeyValueRow } from './ui/key-value-row';
import { PageShell } from './ui/page-shell';
import { SectionIntro } from './ui/section-intro';
import { MAIN_ID } from './ui/skip-link';

// La page « studio packshot » : les plateaux Horizontal, Vertical et Eclipse,
// en phrases, sur le gabarit de la page studio photo mannequin.
//
// Elle ne dit QUE ce que le site publie déjà (#428) : les fiches plateau, la
// FAQ Discovery, la page studio photo mannequin et les tarifs du moteur de
// réservation. Aucun contenu Strapi, donc aucun loader : le texte est complet
// dans le HTML servi même quand le CMS ne répond pas.

interface SectionLink {
  screen: string;
  labelKey: ParseKeys;
}

const SECTIONS: {
  key:
    | 'horizontal'
    | 'vertical'
    | 'eclipse'
    | 'formats'
    | 'team'
    | 'onModel'
    | 'studio';
  links: SectionLink[];
}[] = [
  {
    key: 'horizontal',
    links: [
      {
        screen: 'plateau-horizontal',
        labelKey: 'packshotPage.sections.horizontal.link',
      },
    ],
  },
  {
    key: 'vertical',
    links: [
      {
        screen: 'plateau-vertical',
        labelKey: 'packshotPage.sections.vertical.link',
      },
    ],
  },
  {
    key: 'eclipse',
    links: [
      {
        screen: 'plateau-eclipse',
        labelKey: 'packshotPage.sections.eclipse.link',
      },
    ],
  },
  { key: 'formats', links: [] },
  { key: 'team', links: [] },
  {
    key: 'onModel',
    links: [
      { screen: 'on-model', labelKey: 'packshotPage.sections.onModel.link' },
    ],
  },
  {
    key: 'studio',
    links: [
      {
        screen: 'cyclorama',
        labelKey: 'packshotPage.sections.studio.cyclorama',
      },
      { screen: 'postprod', labelKey: 'packshotPage.sections.studio.postprod' },
    ],
  },
];

export const PackshotPage = () => {
  const t = useT();
  const { lang } = usePageContext();
  const rates = packshotRates(lang);
  const bookHref = manualPath(lang);

  return (
    <PageShell className="app:grid-cols-[var(--spacing-logo)_repeat(3,minmax(0,1fr))] app:grid-rows-[var(--spacing-header)_minmax(0,1fr)]">
      <main id={MAIN_ID} className="contents">
        <article className="flex min-w-0 flex-col gap-px bg-border app:col-start-2 app:col-span-3 app:row-start-2 app:min-h-0 app:overflow-y-auto">
          <SectionIntro
            as="h1"
            title={t('packshotPage.title')}
            subtitle={t('packshotPage.intro')}
            className="bg-background md:px-6"
          />
          {SECTIONS.map(({ key, links }) => (
            <SectionIntro
              key={key}
              as="h2"
              size="sm"
              title={t(`packshotPage.sections.${key}.title`)}
              subtitle={t(`packshotPage.sections.${key}.body`, rates)}
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
            title={t('packshotPage.sections.booking.title')}
            subtitle={t('packshotPage.sections.booking.body')}
            className="bg-background"
          >
            <Button variant="outline" render={<a href={bookHref} />}>
              {t('packshotPage.sections.booking.book')}
            </Button>
            <Button
              variant="outline"
              render={<a href={SCREEN_TO_PATH.contact(lang)} />}
            >
              {t('common.contactUs')}
            </Button>
          </SectionIntro>
          <FaqCell
            title={t('packshotPage.faq.title')}
            entries={packshotFaq(t, lang)}
            className="flex-1"
          />
        </article>
        <div className="flex min-w-0 flex-col bg-background app:col-start-1 app:row-start-2 app:min-h-0">
          <KeyValueList
            pad="tight"
            heading={t('plateau.rates')}
            className="py-3"
          >
            {PACKSHOT_STAGES.map((stage) => (
              <KeyValueRow
                key={stage}
                density="tight"
                numeric
                label={`${PACKSHOT_RATES[stage].label[lang]} · ${t('booking.fullDay')}`}
                value={`${fmtEUR(PACKSHOT_RATES[stage].full, lang)} €`}
              />
            ))}
          </KeyValueList>
          <CtaCell
            title={t('packshotPage.sections.booking.book')}
            href={bookHref}
            onClick={() => captureCta('book_stage', 'packshot')}
            className="app:mt-auto"
          />
        </div>
      </main>
    </PageShell>
  );
};
