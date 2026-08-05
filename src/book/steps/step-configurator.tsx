import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { ReactNode } from 'react';
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useT } from '../../i18n/use-t';
import type {
  BookingSession,
  ConfigGlobal,
  Lang,
} from '../../lib/booking-engine';
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
  findEntry,
} from '../catalog';
import { CfgChoice } from '../shared';

interface StepConfiguratorProps {
  lang: Lang;
  global: ConfigGlobal;
  setGlobal: Dispatch<SetStateAction<ConfigGlobal>>;
  sessions: BookingSession[];
  setSessions: Dispatch<SetStateAction<BookingSession[]>>;
  activeIdx: number;
  setActiveIdx: (idx: number) => void;
  onApply: () => void;
  onSkip: () => void;
  onReset: () => void;
}

interface Question {
  key: string;
  num: string;
  label: string;
  answered: boolean;
  summary: string;
  multi?: boolean;
}

// Produits pour lesquels la question « média » suit directement le choix du
// produit, sans passer par une méthode ni un sous-type.
const DIRECT_MEDIA_PRODUCTS = ['eyewear', 'food', 'cosmetique', 'bijoux'];

const StepConfigurator = ({
  lang,
  global,
  setGlobal,
  sessions,
  setSessions,
  activeIdx,
  setActiveIdx,
  onApply,
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
    const cascades: Record<string, Partial<BookingSession>> = {
      projectType: {
        product: null,
        method: null,
        submethod: null,
        media: [],
        views: [],
        viewsCount: '',
        quantity: '',
        postprod: false,
        postprodVideo: false,
      },
      product: {
        method: null,
        submethod: null,
        media: [],
        views: [],
        viewsCount: '',
        quantity: '',
        postprod: false,
        postprodVideo: false,
      },
      method: {
        submethod: null,
        media: [],
        views: [],
        viewsCount: '',
        quantity: '',
        postprod: false,
        postprodVideo: false,
      },
      submethod: {
        media: [],
        views: [],
        viewsCount: '',
        quantity: '',
        postprod: false,
        postprodVideo: false,
      },
      media: {
        views: [],
        viewsCount: '',
        quantity: '',
        postprod: false,
        postprodVideo: false,
      },
    };
    setSession({ [field]: value, ...(cascades[field] || {}) });
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
  const sessionValid = isSessionValid;
  const S = active;
  const qList: Question[] = [];
  qList.push({
    key: 'projectType',
    num: '00',
    label: t('booking.projectType'),
    answered: !!S.projectType,
    summary: S.projectType
      ? catLabel(
          t,
          PROJECT_TYPES.find((x) => x.k === S.projectType),
        ) || ''
      : '',
  });
  if (S.projectType === 'ecom') {
    qList.push({
      key: 'product',
      num: '01',
      label: t('booking.productType'),
      answered: !!S.product,
      summary: S.product
        ? catLabel(
            t,
            PRODUCTS.find((x) => x.k === S.product),
          ) || ''
        : '',
    });
  }
  if (S.product === 'pap') {
    qList.push({
      key: 'method',
      num: '02',
      label: t('booking.method'),
      answered: !!S.method,
      summary: S.method
        ? catLabel(
            t,
            PAP_METHODS.find((x) => x.k === S.method),
          ) || ''
        : '',
    });
  }
  if (S.product === 'pap' && S.method === 'packshot') {
    qList.push({
      key: 'submethod',
      num: '03',
      label: t('booking.packshotType'),
      answered: !!S.submethod,
      summary: S.submethod
        ? catLabel(
            t,
            PAP_PACKSHOT_SUBS.find((x) => x.k === S.submethod),
          ) || ''
        : '',
    });
  }
  if (S.product === 'accessoires') {
    qList.push({
      key: 'submethod',
      num: '02',
      label: t('booking.accessoryType'),
      answered: !!S.submethod,
      summary: S.submethod
        ? catLabel(
            t,
            ACCESS_SUBS.find((x) => x.k === S.submethod),
          ) || ''
        : '',
    });
  }
  const mediaVisible =
    (S.product === 'pap' && S.method === 'onmodel') ||
    (S.product === 'accessoires' && S.submethod) ||
    DIRECT_MEDIA_PRODUCTS.includes(S.product ?? '');
  if (mediaVisible) {
    const mediaNum =
      S.product === 'pap' ? '03' : S.product === 'accessoires' ? '03' : '02';
    qList.push({
      key: 'media',
      num: mediaNum,
      label: t('booking.media'),
      multi: true,
      answered: (S.media || []).length > 0,
      summary: (S.media || [])
        .map((m) =>
          catLabel(
            t,
            MEDIA_OPTIONS.find((x) => x.k === m),
          ),
        )
        .filter(Boolean)
        .join(' + '),
    });
  }
  if (S.product === 'pap' && S.method === 'packshot' && S.submethod) {
    qList.push({
      key: 'quantity',
      num: '04',
      label: t('booking.numberOfProducts'),
      answered: !!Number(S.quantity),
      summary: S.quantity ? `${S.quantity} ${t('booking.products')}` : '',
    });
  }
  if (S.product === 'pap' && S.method === 'packshot' && S.submethod) {
    qList.push({
      key: 'views',
      num: '05',
      label: t('booking.viewsPerProduct'),
      multi: true,
      answered: (S.views || []).some((v) => v !== 'detail'),
      summary: (S.views || [])
        .map((v) =>
          catLabel(
            t,
            PACKSHOT_VIEWS.find((x) => x.k === v),
          ),
        )
        .filter(Boolean)
        .join(' + '),
    });
  }
  const qvVisible =
    (S.product === 'pap' && S.method === 'onmodel' && (S.media || []).length) ||
    (S.product === 'accessoires' && S.submethod && (S.media || []).length) ||
    (DIRECT_MEDIA_PRODUCTS.includes(S.product ?? '') && (S.media || []).length);
  if (qvVisible) {
    qList.push({
      key: 'qtyViews',
      num:
        S.product === 'pap' ? '04' : S.product === 'accessoires' ? '04' : '03',
      label: t('booking.productsViews'),
      answered: !!Number(S.quantity) && !!Number(S.viewsCount),
      summary:
        S.quantity && S.viewsCount
          ? `${S.quantity} ${t('booking.prod')} × ${S.viewsCount} ${t('booking.views2')}`
          : '',
    });
  }
  const ppVisible = S.projectType === 'ecom' && S.product && sessionValid(S);
  if (ppVisible) {
    qList.push({
      key: 'postprod',
      num: 'pp',
      label: t('common.postProdLong'),
      answered: true,
      summary: S.postprod
        ? S.postprodVideo
          ? t('booking.yesVideo')
          : t('booking.yes')
        : t('booking.no'),
    });
  }
  const firstUnansweredIdx = qList.findIndex((q) => !q.answered);
  const autoOpenKey =
    firstUnansweredIdx >= 0
      ? qList[firstUnansweredIdx].key
      : qList.length
        ? qList[qList.length - 1].key
        : null;
  const currentOpen = openQ !== null ? openQ : autoOpenKey;
  const currentIdx = qList.findIndex((q) => q.key === currentOpen);
  const isOpen = (key: string) => {
    const idx = qList.findIndex((q) => q.key === key);
    if (idx === currentIdx) return true;
    if (qList[idx]?.answered && idx === currentIdx - 1) {
      const nextKey = qList[currentIdx]?.key;
      if (nextKey && !touchedQs.has(nextKey)) return true;
    }
    if (idx === currentIdx + 1) {
      const curr = qList[currentIdx];
      if (curr?.answered && touchedQs.has(curr.key)) return true;
    }
    return false;
  };
  const accQ = (qKey: string, children: ReactNode) => {
    const q = qList.find((x) => x.key === qKey);
    if (!q) return null;
    const open = isOpen(qKey);
    if (!open && q.answered) {
      return (
        <Button
          type="button"
          key={qKey + ':collapsed'}
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
      <div key={qKey + ':open'} onClickCapture={onInteract}>
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
        <>
          <div className="px-6 pt-3.5 pb-1 flex items-baseline justify-between gap-4 flex-wrap">
            <span className="font-mono text-xs font-normal uppercase tracking-widest text-muted-foreground text-primary">
              {t('booking.productSessions')} — {sessions.length}
            </span>
            <Button
              type="button"
              onClick={addSession}
              variant="outline"
              className="h-8 gap-2 px-3.5 py-2 text-xs tracking-widest"
            >
              + {t('booking.addASession')}
            </Button>
          </div>
          <div
            className="grid bg-background border-t border-b border-border"
            style={{
              gridTemplateColumns: `repeat(${sessions.length}, minmax(0,1fr))`,
              gap: 1,
            }}
          >
            {sessions.map((s, i) => {
              const isActive = i === activeIdx;
              const valid = sessionValid(s);
              const label =
                s.projectType === 'cyclorama'
                  ? t('booking.cyclorama')
                  : catLabel(t, findEntry(PRODUCTS, s.product)) ||
                    t('booking.toDefine');
              return (
                <Button
                  type="button"
                  key={i}
                  onClick={() => {
                    setActiveIdx(i);
                    setOpenQ(null);
                    setTouchedQs(new Set());
                  }}
                  className={`${isActive ? 'dark bg-background' : 'bg-background'} text-foreground  px-3.5 py-3 text-left cursor-pointer font-[inherit] flex flex-col gap-1 min-w-0`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-mono text-xs tracking-widest ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      {t('booking.session')} {String(i + 1).padStart(2, '0')}
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSession(i);
                      }}
                      className={`text-sm cursor-pointer px-1 leading-none ${isActive ? 'text-muted-foreground' : 'text-muted-foreground'}`}
                      title={t('booking.remove')}
                    >
                      ×
                    </span>
                  </div>
                  <div className="text-sm font-normal tracking-tight">
                    {label}
                  </div>
                  <div
                    className={`font-mono text-xs tracking-wide text-muted-foreground`}
                  >
                    {valid
                      ? s.projectType === 'cyclorama'
                        ? t('booking.onRequestLower')
                        : `${s.quantity} ${t('booking.products')}`
                      : t('booking.incomplete')}
                  </div>
                </Button>
              );
            })}
          </div>
        </>
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
      {((S.product === 'pap' && S.method === 'onmodel') ||
        (S.product === 'accessoires' && S.submethod) ||
        DIRECT_MEDIA_PRODUCTS.includes(S.product ?? '')) &&
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
      {S.product === 'pap' &&
        S.method === 'packshot' &&
        S.submethod &&
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
      {S.product === 'pap' &&
        S.method === 'packshot' &&
        S.submethod &&
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
      {((S.product === 'pap' &&
        S.method === 'onmodel' &&
        (S.media || []).length > 0) ||
        (S.product === 'accessoires' &&
          S.submethod &&
          (S.media || []).length > 0) ||
        (DIRECT_MEDIA_PRODUCTS.includes(S.product ?? '') &&
          (S.media || []).length > 0)) &&
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
        sessionValid(S) &&
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
      {sessionValid(active) && activeIdx === sessions.length - 1 && (
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
