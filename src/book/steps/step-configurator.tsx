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
import { SelectTile } from '@/ui/select-tile';
import { ordinal } from '@/lib/format';
import { SessionTabs } from './session-tabs';
import {
  CASCADES,
  buildQuestions,
  isMediaVisible,
  isPackshotSized,
  openQuestionKeys,
} from './configurator-questions';
import { StepHeading } from '@/ui/step-heading';
import { MonoLabel } from '@/ui/mono-label';
import { BookingModeBanner } from '../booking-mode-banner';
import { FormCell, FormCellInput } from '@/ui/form-cell';

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
          className="min-h-11 w-full flex-row items-center gap-3 border-b border-b-foreground px-pad-cell py-3 md:gap-3.5 md:py-0"
        >
          <StepHeading tone="muted" number={q.num} title={q.label} />
          <span className="min-w-0 flex-1 text-balance text-right font-mono text-xs tracking-tight text-foreground">
            {q.summary}
          </span>
          <MonoLabel tone="muted" className="shrink-0">
            {t('booking.edit')}
          </MonoLabel>
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
      <BookingModeBanner
        hint={t('booking.ourConfiguratorGuidesYouOr')}
        switchLabel={t('booking.chooseManually')}
        direction="forward"
        className="sticky top-0 z-10"
        onReset={() => {
          setSessions([makeBlankSession()]);
          setActiveIdx(0);
          setOpenQ(null);
          setTouchedQs(new Set());
          if (onReset) onReset();
        }}
        onSwitch={onSkip}
      />
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
          <div className="px-pad-cell border-b border-border flex items-center min-h-11 py-4 sm:py-0 gap-3 box-border">
            <StepHeading number="00" title={t('booking.projectType')} />
          </div>
          <div className="grid grid-cols-1 @sm:grid-cols-2 gap-px bg-border border-b border-border">
            {PROJECT_TYPES.map((pt, i) => (
              <SelectTile
                key={pt.k}
                number={ordinal(i)}
                title={catLabel(t, pt)}
                desc={catDesc(t, pt)}
                selected={S.projectType === pt.k}
                onSelect={() => resetFrom('projectType', pt.k)}
              />
            ))}
          </div>
        </>,
      )}
      {S.projectType === 'ecom' &&
        accQ(
          'product',
          <>
            <div className="px-pad-cell border-b border-border flex items-center min-h-11 py-4 sm:py-0 gap-3 box-border">
              <StepHeading number="01" title={t('booking.productType')} />
            </div>
            <div className="grid grid-cols-1 @sm:grid-cols-2 @2xl:grid-cols-3 gap-px bg-border border-b border-border">
              {PRODUCTS.map((p, i) => (
                <SelectTile
                  key={p.k}
                  number={ordinal(i)}
                  title={catLabel(t, p)}
                  desc={catDesc(t, p)}
                  selected={S.product === p.k}
                  onSelect={() => resetFrom('product', p.k)}
                />
              ))}
            </div>
          </>,
        )}
      {S.product === 'pap' &&
        accQ(
          'method',
          <>
            <div className="px-pad-cell border-b border-border flex items-center min-h-11 py-4 sm:py-0 gap-3 box-border">
              <StepHeading number="02" title={t('booking.method')} />
            </div>
            <div className="grid grid-cols-1 @sm:grid-cols-2 gap-px bg-border border-b border-border">
              {PAP_METHODS.map((m, i) => (
                <SelectTile
                  key={m.k}
                  number={ordinal(i)}
                  title={catLabel(t, m)}
                  desc={catDesc(t, m)}
                  selected={S.method === m.k}
                  onSelect={() => resetFrom('method', m.k)}
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
            <div className="px-pad-cell border-b border-border flex items-center min-h-11 py-4 sm:py-0 gap-3 box-border">
              <StepHeading number="03" title={t('booking.packshotType')} />
            </div>
            <div className="grid grid-cols-1 @xl:grid-cols-3 gap-px bg-border border-b border-border">
              {PAP_PACKSHOT_SUBS.map((sub, i) => (
                <SelectTile
                  key={sub.k}
                  number={ordinal(i)}
                  title={catLabel(t, sub)}
                  desc={catDesc(t, sub)}
                  selected={S.submethod === sub.k}
                  onSelect={() => resetFrom('submethod', sub.k)}
                />
              ))}
            </div>
          </>,
        )}
      {S.product === 'accessoires' &&
        accQ(
          'submethod',
          <>
            <div className="px-pad-cell border-b border-border flex items-center min-h-11 py-4 sm:py-0 gap-3 box-border">
              <StepHeading number="02" title={t('booking.accessoryType')} />
            </div>
            <div className="grid grid-cols-1 @xl:grid-cols-3 gap-px bg-border border-b border-border">
              {ACCESS_SUBS.map((sub, i) => (
                <SelectTile
                  key={sub.k}
                  number={ordinal(i)}
                  title={catLabel(t, sub)}
                  desc={catDesc(t, sub)}
                  selected={S.submethod === sub.k}
                  onSelect={() => resetFrom('submethod', sub.k)}
                />
              ))}
            </div>
          </>,
        )}
      {isMediaVisible(S) &&
        accQ(
          'media',
          <>
            <div className="px-pad-cell border-b border-border flex items-center min-h-11 py-4 sm:py-0 gap-3 box-border flex-wrap">
              <StepHeading
                number={
                  S.product === 'pap' || S.product === 'accessoires'
                    ? '03'
                    : '02'
                }
                title={t('booking.media')}
              />
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
                  <SelectTile
                    key={m.k}
                    number={ordinal(i)}
                    title={catLabel(t, m)}
                    desc={catDesc(t, m)}
                    selected={on}
                    onSelect={() => {
                      const next = on
                        ? cur.filter((x) => x !== m.k)
                        : [...cur, m.k];
                      setSession({ media: next });
                    }}
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
            <div className="px-pad-cell border-b border-border flex items-center min-h-11 py-4 sm:py-0 gap-3 box-border">
              <StepHeading number="04" title={t('booking.numberOfProducts')} />
            </div>
            <div className="grid grid-cols-1 gap-px bg-border border-b border-border">
              <div className="bg-background px-pad-cell py-4 sm:py-2.5 flex flex-col gap-2 min-w-0">
                <div className="flex items-center gap-1.5 max-w-xs min-w-0">
                  {/* Le seul repère est l'intitulé de section, dans un div
                      voisin : le champ n'a que `aria-label` pour se nommer. */}
                  <Input
                    aria-label={t('booking.numberOfProducts')}
                    value={S.quantity}
                    onChange={(e) =>
                      setSession({
                        quantity: e.target.value.replace(/\D/g, ''),
                      })
                    }
                    placeholder="12"
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
            <div className="px-pad-cell border-b border-border flex items-center min-h-11 py-4 sm:py-0 gap-3 box-border flex-wrap">
              <StepHeading number="05" title={t('booking.viewsPerProduct')} />
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
                  <SelectTile
                    key={v.k}
                    size="sm"
                    number={ordinal(i)}
                    title={catLabel(t, v)}
                    selected={on}
                    onSelect={() => {
                      const cur = S.views || [];
                      setSession({
                        views: cur.includes(v.k)
                          ? cur.filter((x) => x !== v.k)
                          : [...cur, v.k],
                      });
                    }}
                  />
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
            <div className="px-pad-cell border-b border-border flex items-center min-h-11 py-4 sm:py-0 gap-3 box-border">
              <StepHeading
                number={
                  S.product === 'pap' || S.product === 'accessoires'
                    ? '04'
                    : '03'
                }
                title={t('booking.productsViews')}
              />
            </div>
            <div className="grid grid-cols-1 @sm:grid-cols-2 gap-px bg-border border-b border-border">
              <FormCell label={t('booking.numberOfProducts')} className="gap-2">
                <FormCellInput
                  value={S.quantity}
                  onChange={(v) =>
                    setSession({ quantity: v.replace(/\D/g, '') })
                  }
                  placeholder="12"
                  inputMode="numeric"
                  // Bordure propre : `FormCell` ne neutralise que les
                  // décorations d'ÉTAT de ses contrôles, pas leur cadre. Un
                  // chiffre centré dans un rectangle, c'est ce qui distingue
                  // une saisie de quantité d'une ligne de texte.
                  className="w-full min-w-0 flex-1 border border-border bg-background px-3.5 py-2.5 text-center font-mono text-base tracking-tight"
                />
              </FormCell>
              <FormCell label={t('booking.viewsPerProduct')} className="gap-2">
                <FormCellInput
                  value={S.viewsCount}
                  onChange={(v) =>
                    setSession({ viewsCount: v.replace(/\D/g, '') })
                  }
                  placeholder="3"
                  inputMode="numeric"
                  className="w-full min-w-0 flex-1 border border-border bg-background px-3.5 py-2.5 text-center font-mono text-base tracking-tight"
                />
              </FormCell>
            </div>
          </>,
        )}
      {S.projectType === 'ecom' &&
        S.product &&
        isSessionValid(S) &&
        accQ(
          'postprod',
          <>
            <div className="px-pad-cell border-b border-border flex items-center min-h-11 py-4 sm:py-0 gap-3 box-border">
              <MonoLabel tone="primary">{t('common.postProdLong')}</MonoLabel>
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
              <div className="bg-background px-pad-cell.5 py-4 sm:py-2.5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm tracking-tight">
                    {t('booking.postProductionByEDo')}
                  </div>
                  <div
                    className={`font-mono text-xs text-muted-foreground mt-0.5`}
                  >
                    {t('booking.estimatedPriceShownAdjustedAfter')}
                  </div>
                </div>
                {/* Le titre est un `<div>` voisin : sans `aria-label`,
                    l'interrupteur s'annonce « switch, non coché », sans dire
                    de quoi. */}
                <Switch
                  aria-label={t('booking.postProductionByEDo')}
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
                <div className="bg-background px-pad-cell.5 py-4 sm:py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm tracking-tight">
                      {t('booking.videoEditing2')}
                    </div>
                    <div
                      className={`font-mono text-xs text-muted-foreground mt-0.5`}
                    >
                      {t('booking.onlyForVideoProjects')}
                    </div>
                  </div>
                  <Switch
                    aria-label={t('booking.videoEditing2')}
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
        <div className="px-pad-cell py-1.5 flex justify-center items-center bg-background">
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
