// React 18 ne reconnaît pas la prop camelCase `fetchPriority` et émet un
// avertissement à chaque rendu — côté serveur comme navigateur depuis le
// passage au SSR. L'attribut DOM réel est `fetchpriority` en minuscules, que
// React transmet tel quel sans broncher.
//
// À remplacer par `fetchPriority` natif le jour du passage à React 19, qui le
// gère directement.
export const fetchPriority = (high?: boolean): Record<string, string> => ({
  fetchpriority: high ? 'high' : 'auto',
});
