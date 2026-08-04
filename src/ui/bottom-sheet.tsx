import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from './cn';
import { IconX } from './icons';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  ariaLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Forwarded to the inner panel so triggers can wire aria-controls. */
  id?: string;
  closeLabel?: string;
}

const SWIPE_CLOSE_DISTANCE = 80;
const SWIPE_CLOSE_VELOCITY = 0.5;

const BottomSheet = ({
  open,
  onClose,
  title,
  ariaLabel,
  children,
  footer,
  id,
  closeLabel = 'Close',
}: BottomSheetProps) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const dragStartRef = useRef<{ y: number; t: number } | null>(null);
  const dragDeltaRef = useRef<number>(0);
  const autoId = useId();
  const sheetId = id ?? `bottom-sheet-${autoId}`;
  const titleId = `${sheetId}-title`;

  const [phase, setPhase] = useState<'closed' | 'opening' | 'open' | 'closing'>(
    'closed',
  );

  // Sync the `open` prop with the underlying <dialog> + animation phase.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (phase === 'closed' || phase === 'closing') {
        previouslyFocusedRef.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        if (!dialog.open) {
          try {
            dialog.showModal();
          } catch {
            // showModal can throw if dialog already open in some browsers
          }
        }
        setPhase('opening');
      }
    } else if (phase === 'open' || phase === 'opening') {
      setPhase('closing');
    }
  }, [open, phase]);

  // After "opening", move focus to title and then mark as open.
  useEffect(() => {
    if (phase !== 'opening') return;
    const id = window.requestAnimationFrame(() => {
      titleRef.current?.focus({ preventScroll: true });
      setPhase('open');
    });
    return () => window.cancelAnimationFrame(id);
  }, [phase]);

  // Body scroll lock while open.
  useEffect(() => {
    if (phase === 'closed') return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [phase]);

  const handleAnimationEnd = useCallback(() => {
    if (phase === 'closing') {
      const dialog = dialogRef.current;
      if (dialog?.open) dialog.close();
      setPhase('closed');
      const prev = previouslyFocusedRef.current;
      previouslyFocusedRef.current = null;
      if (prev && document.contains(prev)) {
        try {
          prev.focus({ preventScroll: true });
        } catch {
          // ignore
        }
      }
    }
  }, [phase]);

  // Native cancel (ESC) + safety: forward to onClose.
  const handleCancel = useCallback(
    (event: React.SyntheticEvent<HTMLDialogElement>) => {
      event.preventDefault();
      onClose();
    },
    [onClose],
  );

  // Backdrop click — close when clicking outside the inner panel.
  const handleDialogClick = useCallback(
    (event: React.MouseEvent<HTMLDialogElement>) => {
      if (event.target === dialogRef.current) onClose();
    },
    [onClose],
  );

  // Touch handlers for swipe-down to close.
  const onTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (event.touches.length !== 1) return;
      dragStartRef.current = { y: event.touches[0].clientY, t: Date.now() };
      dragDeltaRef.current = 0;
    },
    [],
  );

  const onTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    const delta = event.touches[0].clientY - start.y;
    if (delta <= 0) {
      dragDeltaRef.current = 0;
      if (panelRef.current) panelRef.current.style.transform = '';
      return;
    }
    dragDeltaRef.current = delta;
    if (panelRef.current) {
      panelRef.current.style.transform = `translateY(${delta}px)`;
      panelRef.current.style.transition = 'none';
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    const start = dragStartRef.current;
    const delta = dragDeltaRef.current;
    dragStartRef.current = null;
    dragDeltaRef.current = 0;
    if (panelRef.current) {
      panelRef.current.style.transform = '';
      panelRef.current.style.transition = '';
    }
    if (!start) return;
    const elapsed = Date.now() - start.t;
    const velocity = elapsed > 0 ? delta / elapsed : 0;
    if (delta >= SWIPE_CLOSE_DISTANCE || velocity > SWIPE_CLOSE_VELOCITY) {
      onClose();
    }
  }, [onClose]);

  if (phase === 'closed') {
    // Render the dialog placeholder so React can attach the ref before we showModal.
    return (
      <dialog
        ref={dialogRef}
        id={sheetId}
        aria-labelledby={titleId}
        aria-label={ariaLabel}
        className="edo-bottom-sheet hidden"
      />
    );
  }

  const isClosing = phase === 'closing';

  return (
    <dialog
      ref={dialogRef}
      id={sheetId}
      aria-labelledby={titleId}
      aria-label={ariaLabel}
      onCancel={handleCancel}
      onClose={() => {
        setPhase('closed');
        previouslyFocusedRef.current = null;
      }}
      onClick={handleDialogClick}
      className={cn(
        'edo-bottom-sheet',
        'fixed inset-0 m-0 h-[100dvh] max-h-[100dvh] w-screen max-w-none border-0 bg-transparent p-0',
        isClosing ? 'edo-bottom-sheet-closing' : 'edo-bottom-sheet-open',
      )}
    >
      <div
        ref={panelRef}
        onAnimationEnd={handleAnimationEnd}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        className={cn(
          'edo-bottom-sheet-panel',
          'absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col bg-white text-foreground',
          'border-t border-border [touch-action:pan-y]',
        )}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="shrink-0 border-b border-border bg-white">
          <div
            aria-hidden
            className="mx-auto mt-2 h-1 w-10 rounded-full bg-border opacity-40"
          />
          <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-2">
            <h2
              ref={titleRef}
              id={titleId}
              tabIndex={-1}
              className="font-mono text-label uppercase tracking-label text-foreground outline-none"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="edo-focus-ring -my-1 -mr-2 grid size-9 shrink-0 cursor-pointer place-items-center text-foreground transition-colors duration-150 ease-edo-out hover:bg-muted"
            >
              <IconX width={18} height={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain [touch-action:pan-y]">
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-border bg-white">
            {footer}
          </div>
        ) : null}
      </div>
    </dialog>
  );
};

export { BottomSheet };
export type { BottomSheetProps };
