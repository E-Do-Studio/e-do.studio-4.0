/**
 * Source JS en ligne d'une fonction `afterFirstPaint(cb)`, pour les amorçages
 * du <head> (polices : routes/__root.tsx, hydratation : src/server.ts) — ils
 * s'exécutent avant tout bundle, d'où une chaîne et non un module.
 *
 * `cb` part au repos une fois réunis l'événement `load` ET la première
 * peinture de contenu, puis une image rendue (double rAF). Aucun des deux
 * seuls ne suffit :
 *   - sur une page sans image au premier écran (contact, légal), `load` tombe
 *     AVANT la première peinture — la police de secours locale se charge elle
 *     aussi de façon asynchrone ;
 *   - l'image LCP peut être peinte une frame après `load`.
 * Ce qui partait avant ces peintures (~200 Ko de JS, ~180 Ko de polices) se
 * disputait la bande passante avec elles sur une 4G lente.
 *
 * Plafond de 5 s pour la peinture : un navigateur sans PerformanceObserver
 * `paint`, ou une page restée vide, ne doit pas priver le visiteur de JS.
 */
export const AFTER_FIRST_PAINT = [
  'function afterFirstPaint(cb){',
  "var l=document.readyState==='complete',",
  "p=performance.getEntriesByName('first-contentful-paint').length>0,s=0;",
  'function t(){if(!l||!p||s)return;s=1;',
  'requestAnimationFrame(function(){requestAnimationFrame(function(){',
  '(self.requestIdleCallback||function(f){setTimeout(f,200)})(cb,{timeout:2000})})})}',
  "if(!l)addEventListener('load',function(){l=1;t()});",
  "if(!p){try{new PerformanceObserver(function(x,o){if(x.getEntriesByName('first-contentful-paint').length){p=1;o.disconnect();t()}}).observe({type:'paint',buffered:true})}catch(e){p=1}",
  'setTimeout(function(){p=1;t()},5000)}',
  't()}',
].join('');
