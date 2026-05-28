import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import type { Lang } from '../types';
import { mobileNav, resultsCount } from '../i18n/messages';
import { BottomSheet } from './bottom-sheet';
import { cn } from './cn';
import { HoverMarquee } from './hover-marquee';
import { IconArrowRight, IconChevronDown } from './icons';

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
  /** Optional anchor offset — defaults to top-14 to sit under the header. */
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
          'sticky top-14 z-30 flex h-14 items-stretch border-b border-border bg-white md:hidden',
          className,
        )}
        role="toolbar"
        aria-label={ariaLabel}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={sheetId}
          className="edo-focus-ring flex min-h-11 w-full cursor-pointer items-center gap-2 px-4 text-left transition-colors duration-150 ease-edo-out hover:bg-muted"
        >
          <span className="font-mono text-label uppercase tracking-label text-foreground">
            {triggerLabel}
          </span>
          {summary ? (
            <HoverMarquee className="font-mono text-label uppercase tracking-caption text-muted-foreground">
              · {summary}
            </HoverMarquee>
          ) : null}
          <span className="ml-auto flex shrink-0 items-center gap-2">
            {badgeCount > 1 ? (
              <span
                aria-hidden
                className="inline-flex h-5 min-w-5 items-center justify-center bg-primary px-1 font-mono text-micro uppercase tracking-label text-primary-foreground"
              >
                {badgeCount}
              </span>
            ) : null}
            <IconChevronDown
              width={16}
              height={16}
              aria-hidden
              className={cn(
                'text-muted-foreground transition-transform duration-150 ease-edo-out',
                open && 'rotate-180',
              )}
            />
          </span>
        </button>
      </div>

      <BottomSheet
        id={sheetId}
        open={open}
        onClose={handleClose}
        title={triggerLabel}
        ariaLabel={ariaLabel}
        closeLabel={mobileNav.closeFilters[lang]}
        footer={
          <div
            className="flex items-stretch justify-between gap-2 px-3 py-3"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
          >
            {draftHasActive ? (
              <button
                type="button"
                onClick={handleReset}
                className="edo-focus-ring inline-flex min-h-11 cursor-pointer items-center gap-1 border border-border bg-white px-3 font-mono text-label uppercase tracking-button text-foreground transition-colors duration-150 ease-edo-out hover:bg-muted"
              >
                <span aria-hidden>↺</span> {mobileNav.reset[lang]}
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={handleApply}
              className="edo-focus-ring inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 bg-foreground px-4 font-mono text-label uppercase tracking-button text-background transition-colors duration-150 ease-edo-out hover:opacity-90"
            >
              <span>
                {mobileNav.applyFilters[lang]}
                {typeof liveCount === 'number'
                  ? ` · ${resultsCount(liveCount, lang)}`
                  : ''}
              </span>
              <IconArrowRight width={14} height={14} aria-hidden />
            </button>
          </div>
        }
      >
        <div className="flex flex-col">
          {groups.map((group) => {
            const currentValue = draft[group.key] ?? group.value;
            return (
              <fieldset
                key={group.key}
                className="flex flex-col border-b border-border last:border-b-0"
              >
                <legend className="w-full bg-muted px-4 py-2 font-mono text-micro uppercase tracking-label text-muted-foreground">
                  {group.label}
                </legend>
                {group.options.map((option) => {
                  const isActive = currentValue === option.k;
                  const dimmed = option.dimmed ?? false;
                  return (
                    <label
                      key={option.k}
                      className={cn(
                        'edo-focus-ring relative flex min-h-11 cursor-pointer select-none items-center gap-3 border-t border-border px-4 py-3 transition-colors duration-150 ease-edo-out',
                        isActive
                          ? 'bg-foreground text-background'
                          : 'bg-white text-foreground hover:bg-muted',
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
                            : 'border-border bg-white',
                        )}
                      >
                        {isActive ? (
                          <span className="block size-1.5 bg-foreground" />
                        ) : null}
                      </span>
                      <span className="flex-1 font-mono text-detail uppercase tracking-caption">
                        {option.label}
                      </span>
                      {typeof option.count === 'number' ? (
                        <span
                          className={cn(
                            'shrink-0 font-mono text-micro uppercase tracking-label',
                            isActive ? 'text-background' : 'text-muted-foreground',
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
      </BottomSheet>
    </>
  );
};

export { MobileNavStrip };
export type { MobileNavStripProps, StripGroup, StripOption };
