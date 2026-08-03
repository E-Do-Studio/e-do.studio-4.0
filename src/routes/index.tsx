import { createFileRoute, redirect } from '@tanstack/react-router';
import type { Lang } from '../types';

// La racine redirige vers la langue mémorisée. Caddy fait déjà un 301 `/` → `/fr`
// en production ; cette route couvre la navigation interne et le dev.
function detectLang(): Lang {
  if (typeof localStorage === 'undefined') return 'fr';
  try {
    const stored = localStorage.getItem('edo-lang');
    if (stored === 'fr' || stored === 'en') return stored;
  } catch {}
  return 'fr';
}

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/$lang', params: { lang: detectLang() } });
  },
  component: () => null,
});
