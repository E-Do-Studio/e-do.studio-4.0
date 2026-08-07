import { lazy, Suspense, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent } from '@/components/ui/sheet';
import { MessageCircle, X } from 'lucide-react';
import type { Lang } from '../types';
import { useT } from '../i18n/use-t';
import { MonoLabel } from './mono-label';

const AssistantChat = lazy(() => import('../assistant-chat'));

interface MobileAssistantFabProps {
  lang: Lang;
}

// Floating chat button + full-screen dialog used on mobile.
// Pages that render <AssistantChat> inline on desktop should hide that
// instance below md and mount this FAB instead, so the chat never pushes
// page content down on small screens.
export const MobileAssistantFab = ({ lang }: MobileAssistantFabProps) => {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 44×44 et non 40 : cible tactile flottante, seule de sa catégorie.
          Le `bottom` intègre la safe area — au ras du bord, le bouton
          tombait sur l'indicateur d'accueil iOS. */}
      <Button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('assistant.label')}
        aria-expanded={open}
        size="icon"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
        }}
        // `app:hidden` et non `md:hidden` : le palier doit être EXACTEMENT celui
        // où l'accueil peint sa cellule d'assistant, sinon la bande entre les
        // deux se retrouve sans cellule et sans bouton — l'assistant y devient
        // injoignable. C'était le cas de 768 à 1024.
        className="fixed right-3 z-50 size-11 border border-foreground/40 bg-foreground/85 text-background shadow-sm backdrop-blur-sm hover:bg-foreground hover:shadow-md app:hidden"
      >
        <MessageCircle width="18" height="18" />
      </Button>

      {/* Était un `<div role="dialog" aria-modal="true">` fait main : il
          annonçait une modalité qu'il n'avait pas — ni piège de focus, ni
          Échap, ni restauration du focus au bouton, et le fond restait
          navigable au Tab derrière l'overlay. Le `Sheet` de Base UI apporte
          les quatre, exactement comme le menu de navigation. */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          aria-label={t('assistant.label')}
          className="flex h-dvh flex-col app:hidden"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <MonoLabel tone="muted">{t('assistant.label')}</MonoLabel>
            <SheetClose
              aria-label={t('common.close')}
              render={<Button type="button" variant="ghost" size="icon" />}
              className="size-11"
            >
              <X width="20" height="20" aria-hidden="true" />
            </SheetClose>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <Suspense
              fallback={<div aria-hidden className="flex-1 bg-background" />}
            >
              {open && <AssistantChat lang={lang} className="h-full w-full" />}
            </Suspense>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
