/**
 * Exécute `fn` une fois la page chargée (événement `load`), au repos.
 *
 * Pour ce que la page n'a pas besoin d'afficher : SDK de mesure, vidéos de
 * fond. Lancés à l'hydratation, ils partaient en même temps que l'image LCP et
 * les polices, et se partageaient la bande passante avec elles — sur une 4G
 * lente, 190 Ko de vidéo et 93 Ko de SDK suffisaient à repousser le LCP de
 * plusieurs secondes.
 *
 * `requestIdleCallback` avec un plafond : sur un téléphone chargé, le fil
 * principal peut ne jamais se libérer. Safari ne l'a pas : un délai fixe y
 * tient lieu de repos.
 */
export function afterLoad(fn: () => void): () => void {
  let cancelled = false;
  let idleId: number | undefined;
  let timeoutId: number | undefined;
  const run = () => {
    if (cancelled) return;
    if (typeof window.requestIdleCallback === 'function')
      idleId = window.requestIdleCallback(fn, { timeout: 3000 });
    else timeoutId = window.setTimeout(fn, 1500);
  };
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener('load', run);
    if (idleId !== undefined) window.cancelIdleCallback(idleId);
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  };
}
