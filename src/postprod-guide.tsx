import type { MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SCREEN_TO_PATH } from './lib/screens';
import { usePageContext } from './lib/page-context';
import { useT } from './i18n/use-t';
import { SectionIntro } from './ui/section-intro';

// Le texte éditorial de la page (#417) : c'est lui qui la fait exister sur
// la requête « retouche photo », la page n'ayant sinon que des libellés Strapi.
// Il vit dans l'i18n et non dans le CMS pour être rendu même quand Strapi ne
// répond pas, et il ne dit QUE ce que le site affiche déjà ailleurs — aucun
// délai, aucun tarif chiffré (#428).
const SECTIONS = ['intro', 'location'] as const;

const isPlainClick = (event: MouseEvent) =>
  !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0;

export const PostprodGuide = ({ className }: { className?: string }) => {
  const t = useT();
  const { lang, goto } = usePageContext();

  const link = (screen: 'book' | 'contact', label: string) => (
    <Button
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
    <section className={cn('flex flex-col bg-background', className)}>
      {SECTIONS.map((key) => (
        <SectionIntro
          key={key}
          size="sm"
          as="h2"
          className="px-pad-cell"
          title={t(`postprod.guide.${key}.title`)}
          subtitle={t(`postprod.guide.${key}.body`)}
        />
      ))}
      <SectionIntro
        size="sm"
        as="h2"
        className="px-pad-cell"
        title={t('postprod.guide.booking.title')}
        subtitle={t('postprod.guide.booking.body')}
      >
        {link('book', t('postprod.guide.booking.bookStage'))}
        {link('contact', t('postprod.requestQuote'))}
      </SectionIntro>
    </section>
  );
};
