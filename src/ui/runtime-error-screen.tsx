import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import { getT } from '../i18n';
import type { Lang } from '../types';

// Hors PageContext : l'écran sert aussi à la frontière d'erreur racine, montée
// au-dessus du provider — la langue arrive donc en prop.
export const RuntimeErrorScreen = ({ lang }: { lang: Lang }) => {
  const t = getT(lang);
  return (
    <Empty size="page">
      <EmptyHeader>
        <EmptyTitle>{t('runtimeError.title')}</EmptyTitle>
        <EmptyDescription>{t('runtimeError.body')}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button type="button" onClick={() => window.location.reload()}>
          {t('runtimeError.reload')}
        </Button>
      </EmptyContent>
    </Empty>
  );
};
