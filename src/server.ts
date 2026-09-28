import {
  createStartHandler,
  defaultRenderHandler,
} from '@tanstack/react-start/server';
import { AFTER_FIRST_PAINT } from './lib/after-first-paint-inline';

// Entrée serveur applicative, en rendu **non-streaming**.
//
// Par défaut Start utilise `defaultStreamHandler`. Son transformateur de flux
// cherche la fin du <body> puis met en tampon tout ce que React émet ensuite,
// pour y injecter l'état déshydraté du routeur — avec un plafond de 64 Ko
// (MAX_TAIL_CHARS dans @tanstack/router-core).
//
// Nos composants de route sont tous en `lazyRouteComponent`, donc sous Suspense.
// Sous la latence de production, React envoie la coquille d'abord et diffuse le
// contenu après la balise de fermeture : sur une page lourde comme /fr/galerie
// (~316 Ko de HTML), la queue dépassait 64 Ko et faisait tomber le rendu — puis
// le process. Le site redémarrait en boucle.
//
// Le streaming ne nous apportait rien : toutes les données sont résolues dans
// les loaders **avant** le rendu, il n'y a aucun chargement progressif à
// diffuser. Le seul Suspense est celui du code-splitting.
// Exporté sous la forme `{ fetch }`, et non comme la fonction nue que renvoie
// `createStartHandler`. C'est le contrat que documente et qu'attend le plugin de
// dev de Start, qui appelle `(await import(entry)).default.fetch(request)` — une
// fonction nue lui faisait lever « .default.fetch is not a function » et rendait
// `pnpm dev` inutilisable sur toutes les routes.
//
// La production n'est pas affectée : server.mjs accepte déjà les deux formes.
const startHandler = createStartHandler(defaultRenderHandler);

const PRELOAD_RE = /<link rel="modulepreload" href="([^"]+)"\/>/g;
const ENTRY_RE = /<script type="module" async="" src="([^"]+)"><\/script>/;

// Le JavaScript part après l'affichage, pas avec lui.
//
// La page est entièrement rendue côté serveur : le JS ne sert qu'à la rendre
// interactive. Mais Start émet ses `modulepreload` et son entrée dès le <head>,
// en priorité haute, et ~200 Ko de JavaScript se disputaient la bande passante
// avec l'image LCP et les polices : sur mobile (4G lente simulée par
// Lighthouse), le LCP passait de ~2,4 s sans JS à 3,7–5 s avec.
//
// On retire donc préchargements et entrée du HTML, et un amorçage en ligne les
// réinjecte une fois la page chargée ET peinte (cf. AFTER_FIRST_PAINT) — ou à
// la première interaction si elle vient avant : un visiteur qui touche l'écran
// tôt déclenche l'hydratation sans attendre la fin des images. Les liens restent de vrais <a href> rendus par
// le serveur : avant l'hydratation, un clic navigue normalement.
//
// En production seulement : en dev, l'entrée est celle de Vite (HMR).
// Start n'expose aucune option pour cela ; le rendu n'étant pas streamé, la
// réponse est déjà complète — aucun tampon supplémentaire.
function deferHydration(html: string): string {
  const entry = html.match(ENTRY_RE)?.[1];
  if (!entry) return html;
  const preloads = [...html.matchAll(PRELOAD_RE)].map((m) => m[1]);
  const boot =
    `(function(p,e){var d=0,v=['pointerdown','keydown','touchstart'];` +
    `function go(){if(d)return;d=1;v.forEach(function(t){removeEventListener(t,go,true)});` +
    `p.forEach(function(h){var l=document.createElement('link');l.rel='modulepreload';l.href=h;document.head.appendChild(l)});` +
    `var s=document.createElement('script');s.type='module';s.src=e;document.head.appendChild(s)}` +
    `v.forEach(function(t){addEventListener(t,go,{capture:true,passive:true})});` +
    `afterFirstPaint(go);${AFTER_FIRST_PAINT}` +
    `})(${JSON.stringify(preloads)},${JSON.stringify(entry)})`;
  return html
    .replace(PRELOAD_RE, '')
    .replace(ENTRY_RE, `<script>${boot}</script>`);
}

async function rewriteHtml(response: Response) {
  if (
    !import.meta.env.PROD ||
    !response.headers.get('content-type')?.includes('text/html')
  ) {
    return response;
  }
  const html = deferHydration(await response.text());
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  fetch: async (...args: Parameters<typeof startHandler>) =>
    rewriteHtml(await startHandler(...args)),
};
