import { useT } from './i18n/use-t';
import { usePageContext } from './lib/page-context';
import { discoveryPostPath, SCREEN_TO_PATH } from './lib/screens';
import { cn } from './lib/utils';
import { CtaCell } from './ui/cta-cell';
import { SectionIntro } from './ui/section-intro';

// L'article Discovery qui porte la présentation longue du studio : surface,
// quai, parking, loges. Elle était ici en paragraphe, elle vit désormais dans
// Strapi. Le slug est celui de l'article publié, même segment en FR et en EN.
const STUDIO_ARTICLE_SLUG = 'inside-e-do-studio';

/**
 * Le bloc indexable de l'accueil (issue #418) : un titre, deux phrases, et des
 * liens vers les pages qui détaillent l'offre. Le texte long qu'il portait
 * (plateaux, équipements, clients) a quitté l'accueil : il doublonnait les
 * pages plateaux et faisait un pavé en bas de pile. Ce qui a fait monter
 * « studio photo » — le titre et le chapô — reste, avec un lien rendu au
 * serveur vers chaque page.
 *
 * Il n'existe que dans la pile, sous `app`. Au-dessus, le bento est verrouillé
 * sur le viewport et n'a pas la place de ce bloc ; la section reste dans le
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
        size="sm"
        title={t('home.seoTitle')}
        subtitle={t('home.seoIntro')}
        className="bg-background"
      />
      {/* Ces liens sont les seuls de l'accueil vers la location (#422) et le
          studio mannequin (#423) rendus dans le HTML serveur : le tiroir de
          navigation, lui, n'est monté qu'ouvert. */}
      <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-2">
        <CtaCell
          tone="surface"
          title={t('studioRental.h1')}
          href={SCREEN_TO_PATH['studio-rental'](lang)}
        />
        <CtaCell
          tone="surface"
          title={t('onModelPage.title')}
          href={SCREEN_TO_PATH['on-model'](lang)}
        />
        <CtaCell
          tone="surface"
          title={t('home.offers.cyclorama.title')}
          href={SCREEN_TO_PATH.cyclorama(lang)}
        />
        <CtaCell
          tone="surface"
          title={t('common.postProdLong')}
          href={SCREEN_TO_PATH.postprod(lang)}
        />
        <CtaCell
          tone="surface"
          kicker={t('common.discovery')}
          title={t('home.studioArticle')}
          href={discoveryPostPath(lang, STUDIO_ARTICLE_SLUG)}
          className="md:col-span-2"
        />
      </div>
    </section>
  );
};

export { HomeStudioText };
