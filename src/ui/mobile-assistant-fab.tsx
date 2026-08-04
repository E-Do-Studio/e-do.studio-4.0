import { lazy, Suspense, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CellLabel } from './typography';
import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Lang } from '../types';
import { useT } from '../i18n/use-t';

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
      <Button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('assistant.label')}
        size="icon"
        className="fixed bottom-3 right-3 z-50 size-10 border border-foreground/40 bg-foreground/85 text-white shadow-sm backdrop-blur-sm hover:bg-foreground hover:shadow-md md:hidden"
      >
        <MessageCircle width="16" height="16" />
      </Button>

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('assistant.label')}
        aria-hidden={open ? undefined : true}
        {...({ inert: open ? undefined : '' } as Record<string, unknown>)}
        className={cn(
          'fixed inset-0 z-50 flex flex-col bg-background transition-opacity duration-200 md:hidden',
          open
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0',
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <CellLabel>{t('assistant.label')}</CellLabel>
          <Button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t('common.close')}
            variant="ghost"
            size="icon"
            className="size-10"
          >
            <X width="20" height="20" />
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <Suspense
            fallback={<div aria-hidden className="flex-1 bg-background" />}
          >
            {open && <AssistantChat lang={lang} className="h-full w-full" />}
          </Suspense>
        </div>
      </div>
    </>
  );
};
