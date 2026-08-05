import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { ReactNode } from 'react';
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useT } from '../../i18n/use-t';
import type { BookingSession } from '../../lib/booking-engine';
import { isSessionValid, makeBlankSession } from '../../lib/booking-engine';
import {
  ACCESS_SUBS,
  MEDIA_OPTIONS,
  PACKSHOT_VIEWS,
  PAP_METHODS,
  PAP_PACKSHOT_SUBS,
  PRODUCTS,
  PROJECT_TYPES,
  catDesc,
  catLabel,
} from '../catalog';
import { CfgChoice } from '../shared';
import { SessionTabs } from './session-tabs';
import {
  CASCADES,
  buildQuestions,
  isMediaVisible,
  isPackshotSized,
  openQuestionKeys,
} from './configurator-questions';

interface StepConfiguratorProps {
  sessions: BookingSession[];
  setSessions: Dispatch<SetStateAction<BookingSession[]>>;
  activeIdx: number;
  setActiveIdx: (idx: number) => void;
  onSkip: () => void;
  onReset: () => void;
}

const StepConfigurator = ({
  sessions,
  setSessions,
  activeIdx,
  setActiveIdx,
  onSkip,
  onReset,
}: StepConfiguratorProps) => {
  const t = useT();
  const active = sessions[activeIdx] || sessions[0];
  const [openQ, setOpenQ] = useState<string | null>(null);
  const [touchedQs, setTouchedQs] = useState<Set<string>>(new Set());
  const touchQ = (k: string) =>
    setTouchedQs((prev) => {
      if (prev.has(k)) return prev;
      const next = new Set(prev);
      next.add(k);
      return next;
    });
  const setSession = (patch: Partial<BookingSession>) => {
    setSessions((prev) =>
      prev.map((s, i) => (i === activeIdx ? { ...s, ...patch } : s)),
    );
  };
  const resetFrom = (field: keyof BookingSession, value: unknown) => {
    setSession({ [field]: value, ...(CASCADES[field] || {}) });
    setOpenQ(null);
    setTouchedQs(new Set());
  };
  const addSession = () => {
    setSessions((prev) => [...prev, makeBlankSession()]);
    setActiveIdx(sessions.length);
    setOpenQ(null);
    setTouchedQs(new Set());
  };
  const removeSession = (idx: number) => {
    if (sessions.length <= 1) return;
    setSessions((prev) => prev.filter((_, i) => i !== idx));
    setActiveIdx(Math.max(0, Math.min(activeIdx, sessions.length - 2)));
  };
  const S = active;
  const questions = buildQuestions(S, t);
  const openKeys = openQuestionKeys(questions, openQ, touchedQs);

  const accQ = (qKey: string, children: ReactNode) => {
    const q = questions.find((x) => x.key === qKey);
    if (!q) return null;
    const open = openKeys.has(qKey);
    if (!open && q.answered) {
      return (
        <Button
          type="button"
          key={`${qKey}:collapsed`}
          onClick={() => setOpenQ(qKey)}
          variant="cell"
          size="cell"
          className="min-h-11 w-full flex-row items-center gap-3 border-b border-b-foreground px-5 py-3 md:gap-3.5 md:px-6 md:py-0"
        >
          <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground text-primary shrink-0 w-7">
            {q.num}
          </span>
          <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground text-muted-foreground shrink-0">
            {q.label}
          </span>
          <span className="flex-1 min-w-0 font-mono text-xs tracking-tight text-foreground text-right text-balance">
            {q.summary || '—'}
          </span>
          <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground text-muted-foreground shrink-0">
            {t('booking.edit')}
          </span>
        </Button>
      );
    }
    if (!open) return null;
    const onInteract = () => {
      touchQ(qKey);
      setOpenQ(qKey);
    };
    return (
      <div key={`${qKey}:open`} onClickCapture={onInteract}>
        {children}
      </div>
    );
  };
  return (
    <div className="min-w-0 overflow-y-auto h-full">
      <div className="flex flex-col md:flex-row md:items-stretch md:min-h-11 bg-muted box-border sticky top-0 z-10 border-b border-border">
        <span className="font-mono text-xs tracking-wider uppercase text-muted-foreground px-5 py-3 md:py-0 md:self-center md:pl-5 md:pr-3 flex-1 min-w-0 leading-relaxed">
          {t('booking.ourConfiguratorGuidesYouOr')}
          <span className="text-primary font-semibold">
            {t('booking.pickManually')}
          </span>
        </span>
        <div className="flex items-stretch border-t border-border md:border-t-0 md:flex-none md:w-1/2">
          <Button
            type="button"
            onClick={() => {
              setSessions([makeBlankSession()]);
              setActiveIdx(0);
              setOpenQ(null);
              setTouchedQs(new Set());
              if (onReset) onReset();
            }}
            className="flex-1 bg-transparent border-l border-border px-5 py-3 md:py-0 cursor-pointer font-mono text-xs tracking-wider uppercase text-foreground whitespace-nowrap leading-normal inline-flex items-center justify-center transition-colors duration-150 hover:bg-background"
          >
            ↻ {t('mobileNav.reset')}
          </Button>
          <Button
            type="button"
            onClick={onSkip}
            className="h-auto flex-1 border-l border-border px-5 py-3 text-xs font-semibold tracking-wider md:py-0"
          >
            {t('booking.chooseManually')} →
          </Button>
        </div>
      </div>
      {sessions.length > 1 && (
        <SessionTabs
          sessions={sessions}
          activeIdx={activeIdx}
          onSelect={(idx) => {
            setActiveIdx(idx);
            setOpenQ(null);
            setTouchedQs(new Set());
          }}
          onAdd={addSession}
          onRemove={removeSession}
        />
      )}
      {accQ(
        'projectType',
        <>
          <div className="px-5 sm:px-6 border-b border-border flex items-center min-h-11 py-4 sm:py-0 gap-3 box-border">
            <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground text-primary">
              00 · {t('booking.projectType')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-border border-b border-border">
            {PROJECT_TYPES.map((pt, i) => (
              <CfgChoice
                key={pt.k}
                idx={i + 1}
                on={S.projectType === pt.k}
                onClick={() => resetFrom('projectType', pt.k)}
                label={catLabel(t, pt)}
                desc={catDesc(t, pt)}
              />
            ))}
          </div>
        </>,
      )}
      {S.projectType === 'ecom' &&
        accQ(
          'product',
          <>
            <div className="px-5 sm:px-6 border-b border-border flex items-center min-h-11 py-4 sm:py-0 gap-3 box-border">
              <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground text-primary">
                01 · {t('booking.productType')}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border border-b border-border">
              {PRODUCTS.map((p, i) => (
                <CfgChoice
                  key={p.k}
                  idx={i + 1}
                  on={S.product === p.k}
                  onClick={() => resetFrom('product', p.k)}
                  label={catLabel(t, p)}
                  desc={catDesc(t, p)}
                />
              ))}
            </div>
          </>,
        )}
      {S.product === 'pap' &&
        accQ(
          'method',
          <>
            <div className="px-5 sm:px-6 border-b border-border flex items-center min-h-11 py-4 sm:py-0 gap-3 box-border">
              <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground text-primary">
                02 · {t('booking.method')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-border border-b border-border">
              {PAP_METHODS.map((m, i) => (
                <CfgChoice
                  key={m.k}
                  idx={i + 1}
                  on={S.method === m.k}
                  onClick={() => resetFrom('method', m.k)}
                  label={catLabel(t, m)}
                  desc={catDesc(t, m)}
                />
              ))}
            </div>
          </>,
        )}
      {S.product === 'pap' &&
        S.method === 'packshot' &&
        accQ(
          'submethod',
          <>
            <div className="px-5 sm:px-6 border-b border-border flex items-center min-h-11 py-4 sm:py-0 gap-3 box-border">
              <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground text-primary">
                03 · {t('booking.packshotType')}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border border-b border-border">
              {PAP_PACKSHOT_SUBS.map((sub, i) => (
                <CfgChoice
                  key={sub.k}
                  idx={i + 1}
                  on={S.submethod === sub.k}
                  onClick={() => resetFrom('submethod', sub.k)}
                  label={catLabel(t, sub)}
                  desc={catDesc(t, sub)}
                />
              ))}
            </div>
          </>,
        )}
      {S.product === 'accessoires' &&
        accQ(
          'submethod',
          <>
            <div className="px-5 sm:px-6 border-b border-border flex items-center min-h-11 py-4 sm:py-0 gap-3 box-border">
              <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground text-primary">
                02 · {t('booking.accessoryType')}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border border-b border-border">
              {ACCESS_SUBS.map((sub, i) => (
                <CfgChoice
                  key={sub.k}
                  idx={i + 1}
                  on={S.submethod === sub.k}
                  onClick={() => resetFrom('submethod', sub.k)}
                  label={catLabel(t, sub)}
                  desc={catDesc(t, sub)}
                />
              ))}
            </div>
          </>,
        )}
      {isMediaVisible(S) &&
        accQ(
          'media',
          <>
            <div className="px-5 sm:px-6 border-b border-border flex items-center min-h-11 py-4 sm:py-0 gap-3 box-border flex-wrap">
              <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground text-primary">
                {S.product === 'pap'
                  ? '03'
                  : S.product === 'accessoires'
                    ? '03'
                    : '02'}{' '}
                · {t('booking.media')}
              </span>
              <span className="font-mono text-xs tracking-wide text-muted-foreground ml-3">
                {t('booking.oneOrBoth')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-border border-b border-border">
              {MEDIA_OPTIONS.map((m, i) => {
                const cur = Array.isArray(S.media)
                  ? S.media
                  : S.media
                    ? [S.media]
                    : [];
                const on = cur.includes(m.k);
                return (
                  <CfgChoice
                    key={m.k}
                    idx={i + 1}
                    on={on}
                    onClick={() => {
                      const next = on
                        ? cur.filter((x) => x !== m.k)
                        : [...cur, m.k];
                      setSession({ media: next });
                    }}
                    label={catLabel(t, m)}
                    desc={catDesc(t, m)}
                  />
                );
              })}
            </div>
          </>,
        )}
      {isPackshotSized(S) &&
        accQ(
          'quantity',
          <>
            <div className="px-5 sm:px-6 border-b border-border flex items-center min-h-11 py-4 sm:py-0 gap-3 box-border">
              <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground text-primary">
                04 · {t('booking.numberOfProducts')}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-px bg-border border-b border-border">
              <div className="bg-background px-4 sm:px-3 py-4 sm:py-2.5 flex flex-col gap-2 min-w-0">
                <div className="flex items-center gap-1.5 max-w-xs min-w-0">
                  <Input
                    value={S.quantity}
                    onChange={(e) =>
                      setSession({
                        quantity: e.target.value.replace(/\D/g, ''),
                      })
                    }
                    placeholder="—"
                    inputMode="numeric"
                    className="h-auto min-w-0 flex-1 rounded-none border-border bg-background px-3.5 py-2.5 text-center font-mono text-base tracking-tight"
                  />
                </div>
              </div>
            </div>
          </>,
        )}
      {isPackshotSized(S) &&
        accQ(
          'views',
          <>
            <div className="px-5 sm:px-6 border-b border-border flex items-center min-h-11 py-4 sm:py-0 gap-3 box-border flex-wrap">
              <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground text-primary">
                05 · {t('booking.viewsPerProduct')}
              </span>
              <span className="font-mono text-xs tracking-wide text-muted-foreground ml-3">
                {t('booking.multiSelect')}
              </span>
            </div>
            <div className="grid gap-px bg-border border-b border-border grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
              {PACKSHOT_VIEWS.filter(
                (v) => v.k !== '3/4' || S.submethod === 'ghost',
              ).map((v, i) => {
                const on = (S.views || []).includes(v.k);
                return (
                  <Button
                    type="button"
                    key={v.k}
                    onClick={() => {
                      const cur = S.views || [];
                      setSession({
                        views: cur.includes(v.k)
                          ? cur.filter((x) => x !== v.k)
                          : [...cur, v.k],
                      });
                    }}
                    className={`${on ? 'dark bg-background' : 'bg-background'} text-foreground  px-4 sm:px-3 py-4 sm:py-2.5 text-left cursor-pointer font-[inherit] flex flex-col gap-1.5 min-h-22 sm:min-h-18 min-w-0`}
                  >
                    <span
                      className={`font-mono text-xs tracking-widest uppercase text-muted-foreground`}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-normal tracking-tight">
                      {catLabel(t, v)}
                    </span>
                    {on && (
                      <span className="text-primary text-xs mt-auto">●</span>
                    )}
                  </Button>
                );
              })}
            </div>
          </>,
        )}
      {isMediaVisible(S) &&
        (S.media || []).length > 0 &&
        accQ(
          'qtyViews',
          <>
            <div className="px-5 sm:px-6 border-b border-border flex items-center min-h-11 py-4 sm:py-0 gap-3 box-border">
              <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground text-primary">
                {S.product === 'pap'
                  ? '04'
                  : S.product === 'accessoires'
                    ? '04'
                    : '03'}{' '}
                · {t('booking.productsViews')}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border-b border-border">
              <div className="bg-background px-4 sm:px-3 py-4 sm:py-2.5 flex flex-col gap-2 min-w-0">
                <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground text-muted-foreground">
                  {t('booking.numberOfProducts')}
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <Input
                    value={S.quantity}
                    onChange={(e) =>
                      setSession({
                        quantity: e.target.value.replace(/\D/g, ''),
                      })
                    }
                    placeholder="—"
                    inputMode="numeric"
                    className="flex-1 min-w-0 w-full bg-background border border-border outline-none px-3.5 py-2.5 font-mono text-base tracking-tight text-foreground text-center"
                  />
                </div>
              </div>
              <div className="bg-background px-4 sm:px-3 py-4 sm:py-2.5 flex flex-col gap-2 min-w-0">
                <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground text-muted-foreground">
                  {t('booking.viewsPerProduct')}
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <Input
                    value={S.viewsCount}
                    onChange={(e) =>
                      setSession({
                        viewsCount: e.target.value.replace(/\D/g, ''),
                      })
                    }
                    placeholder="—"
                    inputMode="numeric"
                    className="flex-1 min-w-0 w-full bg-background border border-border outline-none px-3.5 py-2.5 font-mono text-base tracking-tight text-foreground text-center"
                  />
                </div>
              </div>
            </div>
          </>,
        )}
      {S.projectType === 'ecom' &&
        S.product &&
        isSessionValid(S) &&
        accQ(
          'postprod',
          <>
            <div className="px-5 sm:px-6 border-b border-border flex items-center min-h-11 py-4 sm:py-0 gap-3 box-border">
              <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground text-primary">
                {t('common.postProdLong')}
              </span>
            </div>
            <div
              className="grid gap-px bg-border border-b border-border"
              style={{
                gridTemplateColumns:
                  (S.media || []).includes('video') && S.postprod
                    ? '1fr 1fr'
                    : '1fr',
              }}
            >
              <div className="bg-background px-4 sm:px-3.5 py-4 sm:py-2.5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium tracking-tight">
                    {t('booking.postProductionByEDo')}
                  </div>
                  <div
                    className={`font-mono text-xs text-muted-foreground mt-0.5`}
                  >
                    {t('booking.estimatedPriceShownAdjustedAfter')}
                  </div>
                </div>
                <Switch
                  checked={!!S.postprod}
                  onCheckedChange={() =>
                    setSession({
                      postprod: !S.postprod,
                      postprodVideo: S.postprod ? false : S.postprodVideo,
                    })
                  }
                />
              </div>
              {(S.media || []).includes('video') && S.postprod && (
                <div className="bg-background px-4 sm:px-3.5 py-4 sm:py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium tracking-tight">
                      {t('booking.videoEditing2')}
                    </div>
                    <div
                      className={`font-mono text-xs text-muted-foreground mt-0.5`}
                    >
                      {t('booking.onlyForVideoProjects')}
                    </div>
                  </div>
                  <Switch
                    checked={!!S.postprodVideo}
                    onCheckedChange={() =>
                      setSession({ postprodVideo: !S.postprodVideo })
                    }
                  />
                </div>
              )}
            </div>
          </>,
        )}
      {S.projectType === 'cyclorama' && (
        <div className="bg-muted p-5 border-t border-b border-border text-center">
          <div className="text-base font-normal tracking-tight mb-2">
            {t('booking.cycloramaFreeProduction')}
          </div>
          <div className="text-sm text-muted-foreground max-w-xl mx-auto leading-normal">
            {t('booking.customNeedsWeLlPrepare')}
          </div>
        </div>
      )}
      {isSessionValid(active) && activeIdx === sessions.length - 1 && (
        <div className="px-6 py-1.5 flex justify-center items-center bg-background">
          <Button
            type="button"
            onClick={addSession}
            variant="outline"
            className="h-7 gap-2 px-4 py-1.5 text-xs tracking-widest"
          >
            + {t('booking.addAnotherProductSession')}
          </Button>
        </div>
      )}
      <div className="h-4 bg-background" />
    </div>
  );
};

export { StepConfigurator };
export type { StepConfiguratorProps };
