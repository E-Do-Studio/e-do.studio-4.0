import {
  createStartHandler,
  defaultRenderHandler,
} from '@tanstack/react-start/server';

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
export default { fetch: createStartHandler(defaultRenderHandler) };
