import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import type { Lang } from '../types';
import { useT } from '../i18n/use-t';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { HoverMarquee } from './hover-marquee';
import { ArrowRight, ChevronDown, X } from 'lucide-react';

type StripOption = {
  k: string;
  label: string;
  count?: number;
  dimmed?: boolean;
};

type StripGroup = {
  /** Stable key used to identify the group in the draft record. */
  key: string;
  label: string;
  options: StripOption[];
  value: string;
  onSelect: (k: string) => void;
};

interface MobileNavStripProps {
  triggerLabel: string;
  groups: StripGroup[];
  onReset?: () => void;
  hasActive: boolean;
  activeCount?: number;
  summary?: string;
  ariaLabel: string;
  lang?: Lang;
  /** Live count function — returns the number of results for a given draft. */
  countFor?: (draft: Record<string, string>) => number;
  /** Commit URL state at sheet close / apply. If absent, onSelect is fired live. */
  onApply?: (draft: Record<string, string>) => void;
  /** Optional anchor offset — defaults to top-header to sit under the header. */
  className?: string;
}

const buildDraft = (groups: StripGroup[]): Record<string, string> =>
  Object.fromEntries(groups.map((g) => [g.key, g.value]));

const MobileNavStrip = ({
  triggerLabel,
  groups,
  onReset,
  hasActive,
  activeCount,
  summary,
  ariaLabel,
  lang = 'fr',
  countFor,
  onApply,
  className,
}: MobileNavStripProps) => {
  const t = useT();
  const autoId = useId();
  const sheetId = `mobile-nav-strip-${autoId}`;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    buildDraft(groups),
  );

  // Resync draft from props whenever the sheet (re)opens or committed values change.
  useEffect(() => {
    if (!open) {
      setDraft(buildDraft(groups));
    }
  }, [open, groups]);

  const handleSelect = useCallback(
    (group: StripGroup, optionKey: string) => {
      if (onApply) {
        setDraft((prev) => ({ ...prev, [group.key]: optionKey }));
      } else {
        // Live mode — fire upstream immediately.
        group.onSelect(optionKey);
        setDraft((prev) => ({ ...prev, [group.key]: optionKey }));
      }
    },
    [onApply],
  );

  const handleApply = useCallback(() => {
    if (onApply) onApply(draft);
    setOpen(false);
  }, [onApply, draft]);

  const handleReset = useCallback(() => {
    if (onApply) {
      const cleared: Record<string, string> = Object.fromEntries(
        groups.map((g) => [g.key, 'all']),
      );
      setDraft(cleared);
    } else {
      onReset?.();
    }
  }, [onApply, onReset, groups]);

  const handleClose = useCallback(() => {
    if (onApply) {
      // Commit pending draft on tap-out / ESC / swipe-down to match
      // the "single URL update per session" rule from the spec.
      onApply(draft);
    }
    setOpen(false);
  }, [onApply, draft]);

  const liveCount = useMemo(
    () => (countFor ? countFor(draft) : undefined),
    [countFor, draft],
  );

  const draftHasActive = useMemo(
    () => Object.values(draft).some((v) => v && v !== 'all'),
    [draft],
  );

  // Hide the bar entirely if there is nothing to filter on (degraded Strapi state).
  if (groups.length === 0) return null;

  const badgeCount = activeCount ?? (hasActive ? 1 : 0);

  return (
    <>
      <div
        className={cn(
          'sticky top-header z-30 flex h-14 items-stretch border-b border-border bg-background md:hidden',
          className,
        )}
        role="toolbar"
        aria-label={ariaLabel}
      >
        <Button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={sheetId}
          variant="cell"
          size="cell"
          className="min-h-11 w-full flex-row items-center gap-2 bg-transparent px-4"
        >
          <span className="font-mono text-xs uppercase tracking-widest text-foreground">
            {triggerLabel}
          </span>
          {summary ? (
            <HoverMarquee className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              · {summary}
            </HoverMarquee>
          ) : null}
          <span className="ml-auto flex shrink-0 items-center gap-2">
            {badgeCount > 1 ? (
              <span
                aria-hidden
                className="font-mono text-xs uppercase tracking-widest text-primary-foreground inline-flex h-5 min-w-5 items-center justify-center bg-primary px-1"
              >
                {badgeCount}
              </span>
            ) : null}
            <ChevronDown
              width={16}
              height={16}
              aria-hidden
              className={cn(
                'text-muted-foreground transition-transform duration-150 ease-out',
                open && 'rotate-180',
              )}
            />
          </span>
        </Button>
      </div>

      <Drawer
        open={open}
        onOpenChange={(next: boolean) => {
          if (!next) handleClose();
        }}
      >
        <DrawerContent id={sheetId} aria-label={ariaLabel}>
          <DrawerHeader>
            <DrawerTitle>{triggerLabel}</DrawerTitle>
            <DrawerClose
              aria-label={t('mobileNav.closeFilters')}
              render={<Button variant="ghost" size="icon" />}
            >
              <X />
            </DrawerClose>
          </DrawerHeader>
          <div className="flex flex-col overflow-y-auto">
            {groups.map((group) => {
              const currentValue = draft[group.key] ?? group.value;
              return (
                <fieldset
                  key={group.key}
                  className="flex flex-col border-b border-border last:border-b-0"
                >
                  <legend className="font-mono text-xs uppercase tracking-widest text-muted-foreground w-full bg-muted px-4 py-2">
                    {group.label}
                  </legend>
                  {group.options.map((option) => {
                    const isActive = currentValue === option.k;
                    const dimmed = option.dimmed ?? false;
                    return (
                      <label
                        key={option.k}
                        className={cn(
                          'outline-none focus-visible:ring-3 focus-visible:ring-ring/50 relative flex min-h-11 cursor-pointer select-none items-center gap-3 border-t border-border px-4 py-3 transition-colors duration-150 ease-out',
                          isActive
                            ? 'bg-foreground text-background'
                            : 'bg-background text-foreground hover:bg-muted',
                          dimmed && !isActive && 'opacity-40',
                        )}
                      >
                        <input
                          type="radio"
                          name={`${sheetId}-${group.key}`}
                          value={option.k}
                          checked={isActive}
                          onChange={() => handleSelect(group, option.k)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden
                          className={cn(
                            'grid size-4 shrink-0 place-items-center border',
                            isActive
                              ? 'border-background bg-background'
                              : 'border-border bg-background',
                          )}
                        >
                          {isActive ? (
                            <span className="block size-1.5 bg-foreground" />
                          ) : null}
                        </span>
                        <span className="flex-1 font-mono text-sm uppercase tracking-widest">
                          {option.label}
                        </span>
                        {typeof option.count === 'number' ? (
                          <span
                            className={cn(
                              'shrink-0 font-mono text-xs uppercase tracking-widest',
                              isActive
                                ? 'text-background'
                                : 'text-muted-foreground',
                            )}
                          >
                            {option.count}
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </fieldset>
              );
            })}
          </div>
          <DrawerFooter
            className="flex-row items-stretch justify-between gap-2"
            style={{
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
            }}
          >
            {draftHasActive ? (
              <Button
                variant="outline"
                onClick={handleReset}
                className="min-h-11"
              >
                <span aria-hidden>↺</span> {t('mobileNav.reset')}
              </Button>
            ) : (
              <span />
            )}
            <Button
              onClick={handleApply}
              className="min-h-11 flex-1 bg-foreground text-background hover:opacity-90"
            >
              <span>
                {t('mobileNav.applyFilters')}
                {typeof liveCount === 'number'
                  ? ` · ${t('galleryPage.resultsCount', { count: liveCount })}`
                  : ''}
              </span>
              <ArrowRight data-icon="inline-end" aria-hidden />
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export { MobileNavStrip };
export type { MobileNavStripProps, StripGroup, StripOption };
