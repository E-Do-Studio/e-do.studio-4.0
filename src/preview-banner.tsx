import { exitPreview, getPreviewState } from './lib/preview-mode';
import type { Lang } from './types';

interface PreviewBannerProps {
  lang: Lang;
}

const LABELS: Record<Lang, { mode: string; status: { draft: string; published: string }; exit: string }> = {
  fr: {
    mode: 'Mode preview',
    status: { draft: 'Brouillon', published: 'Publié' },
    exit: 'Quitter',
  },
  en: {
    mode: 'Preview mode',
    status: { draft: 'Draft', published: 'Published' },
    exit: 'Exit',
  },
};

// Floating banner shown only while the SPA runs inside the Strapi admin
// preview iframe. Kept dependency-free (no Tailwind class merge utils) so it
// renders even if the rest of the app fails to mount.
export function PreviewBanner({ lang }: PreviewBannerProps) {
  const state = getPreviewState();
  if (!state.active) return null;
  const t = LABELS[lang] ?? LABELS.fr;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        zIndex: 9999,
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 12px 8px 16px',
        borderRadius: '9999px',
        background: 'rgba(0, 0, 0, 0.85)',
        color: '#fff',
        font: '500 12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        letterSpacing: '0.04em',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
        pointerEvents: 'auto',
      }}
    >
      <span style={{ textTransform: 'uppercase' }}>{t.mode}</span>
      <span
        style={{
          padding: '2px 8px',
          borderRadius: '9999px',
          background: state.status === 'draft' ? '#f59e0b' : '#10b981',
          color: '#111',
          fontWeight: 600,
        }}
      >
        {state.status === 'draft' ? t.status.draft : t.status.published}
      </span>
      <button
        type="button"
        onClick={exitPreview}
        style={{
          padding: '6px 12px',
          borderRadius: '9999px',
          background: '#fff',
          color: '#111',
          border: 'none',
          font: 'inherit',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {t.exit}
      </button>
    </div>
  );
}
