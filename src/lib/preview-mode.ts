// Strapi Preview entry for the SPA.
//
// Strapi 5 implements preview by opening an iframe whose URL is built by
// `config/admin.ts` → `preview.handler`. That handler routes the editor to
// `/{lang}/{path}?preview=1&secret=...&status=draft`. This module reads those
// search params on boot, validates the secret, and keeps a flag in
// sessionStorage so the rest of the app can serve draft data for the lifetime
// of the iframe tab.
//
// The token is only validated against VITE_PREVIEW_SECRET, which is baked
// into the bundle at build time — same trust model as VITE_STRAPI_TOKEN.
// It is not a security boundary on its own; the real protection is the Strapi
// preview token's permissions (read draft only).

const STORAGE_KEY = 'edo-preview-mode';

const PREVIEW_SECRET = import.meta.env.VITE_PREVIEW_SECRET || '';

export interface PreviewState {
  active: boolean;
  status: 'draft' | 'published';
}

const INACTIVE: PreviewState = { active: false, status: 'published' };

let cached: PreviewState | null = null;

function readStorage(): PreviewState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return INACTIVE;
    const parsed = JSON.parse(raw) as Partial<PreviewState>;
    if (!parsed.active) return INACTIVE;
    return {
      active: true,
      status: parsed.status === 'published' ? 'published' : 'draft',
    };
  } catch {
    return INACTIVE;
  }
}

function writeStorage(state: PreviewState): void {
  try {
    if (state.active) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Best-effort: if storage is unavailable we still keep the in-memory flag.
  }
}

function readUrlParams(): {
  preview: boolean;
  secret: string;
  status: 'draft' | 'published';
} | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get('preview') !== '1') return null;
  const status = params.get('status') === 'published' ? 'published' : 'draft';
  return { preview: true, secret: params.get('secret') ?? '', status };
}

// Called once from `main.tsx` before the app renders. Sets up the preview
// flag so all Strapi fetches see the correct state on first paint.
export function initPreviewMode(): void {
  const stored = readStorage();
  cached = stored;

  const fromUrl = readUrlParams();
  if (!fromUrl) return;

  if (!PREVIEW_SECRET || fromUrl.secret !== PREVIEW_SECRET) {
    // Wrong/missing secret: ignore the request and clear any stale flag so we
    // never serve drafts to a visitor who just happens to land on `?preview=1`.
    cached = INACTIVE;
    writeStorage(INACTIVE);
    return;
  }

  const next: PreviewState = { active: true, status: fromUrl.status };
  cached = next;
  writeStorage(next);
}

export function getPreviewState(): PreviewState {
  if (cached) return cached;
  cached = readStorage();
  return cached;
}

export function isPreviewActive(): boolean {
  return getPreviewState().active;
}

export function exitPreview(): void {
  cached = INACTIVE;
  writeStorage(INACTIVE);
  // Hard reload onto the same path *without* preview params so fetchers
  // clear their in-memory cache and the SPA repaints with published data.
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.searchParams.delete('preview');
    url.searchParams.delete('secret');
    url.searchParams.delete('status');
    window.location.replace(url.toString());
  }
}
