// Un onglet ouvert AVANT un déploiement réclame, au premier import différé,
// un morceau de l'ancien build : le conteneur neuf ne l'a plus, le chargement
// échoue (« Importing a module script failed » sous Safari, « Failed to fetch
// dynamically imported module » ailleurs — issue #405). Le chat de l'accueil,
// chargé à la demande, en était la cible habituelle.
//
// Vite signale ces échecs par `vite:preloadError`. La page est rechargée : le
// HTML neuf pointe vers les morceaux du build courant.
//
// Pas plus d'une fois par minute : si le morceau manque aussi après
// rechargement, le problème n'est pas un build périmé, et une boucle de
// rechargements serait pire que l'erreur — elle remonte alors normalement.
const KEY = 'edo-stale-chunk-reload';
const MIN_INTERVAL_MS = 60_000;

export function reloadOnStaleChunk(): void {
  window.addEventListener('vite:preloadError', (event) => {
    let last = 0;
    try {
      last = Number(sessionStorage.getItem(KEY)) || 0;
      if (Date.now() - last < MIN_INTERVAL_MS) return;
      sessionStorage.setItem(KEY, String(Date.now()));
    } catch {
      // Sans stockage, aucun moyen de borner les rechargements : on laisse
      // l'erreur suivre son cours plutôt que de risquer une boucle.
      return;
    }
    event.preventDefault();
    window.location.reload();
  });
}
