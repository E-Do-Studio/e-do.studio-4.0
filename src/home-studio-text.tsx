import { useT } from './i18n/use-t';
import { usePageContext } from './lib/page-context';
import { SCREEN_TO_PATH } from './lib/screens';
import { cn } from './lib/utils';
import { SectionIntro, sectionTitleVariants } from './ui/section-intro';

const OFFERS = [
  { key: 'cyclorama', screen: 'cyclorama' },
  { key: 'live', screen: 'plateau-live' },
  { key: 'eclipse', screen: 'plateau-eclipse' },
  { key: 'horizontal', screen: 'plateau-horizontal' },
  { key: 'vertical', screen: 'plateau-vertical' },
  { key: 'postprod', screen: 'postprod' },
] as const;

/**
 * Le texte indexable de l'accueil (issue #418) : l'offre du studio en phrases,
 * avec un lien vers chaque plateau.
 *
 * Il n'existe que dans la pile, sous `app`. Au-dessus, le bento est verrouillé
 * sur le viewport et n'a pas la place de 300 mots ; la section reste dans le
 * HTML servi, mais masquée. Google indexe la version mobile, où elle est
 * visible, et elle l'est sans JS : rien ici ne dépend d'un effet.
 *
 * Pas d'image : elle vient après tout le reste de la pile, et le LCP de /fr
 * (#401) ne doit rien lui devoir.
 */
const HomeStudioText = ({ className }: { className?: string }) => {
  const t = useT();
  const { lang } = usePageContext();

  return (
    <section
      className={cn('flex flex-col gap-px bg-border app:hidden', className)}
    >
      <SectionIntro
        as="h2"
        title={t('home.seoTitle')}
        subtitle={t('home.seoIntro')}
        className="bg-background"
      />

      <SectionIntro
        as="h2"
        size="sm"
        title={t('home.offersTitle')}
        className="bg-background"
      />
      <ul className="m-0 grid list-none grid-cols-1 gap-px bg-border p-0 md:grid-cols-2">
        {OFFERS.map(({ key, screen }) => (
          <li
            key={key}
            className="flex flex-col gap-2 bg-background px-5 py-6 md:px-6"
          >
            <h3 className={sectionTitleVariants({ size: 'xs' })}>
              <a
                href={SCREEN_TO_PATH[screen](lang)}
                className="text-foreground underline-offset-4 hover:underline"
              >
                {t(`home.offers.${key}.title`)}
              </a>
            </h3>
            <p className="m-0 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
              {t(`home.offers.${key}.body`)}
            </p>
          </li>
        ))}
      </ul>

      <SectionIntro
        as="h2"
        size="sm"
        title={t('home.clientsTitle')}
        subtitle={t('home.clientsBody')}
        className="bg-background"
      />
    </section>
  );
};

export { HomeStudioText };
