import { useEffect, useState } from 'react';

// Renvoie false au premier rendu — donc toujours côté serveur, où `window`
// n'existe pas — puis la vraie valeur après montage.
//
// Sert à ne pas monter l'assistant (React.lazy) pendant le rendu serveur : le
// rendu n'étant pas streamé, il ne peut pas résoudre une frontière Suspense et
// lèverait une erreur d'hydratation (React #419). Accessoirement, ça évite de
// charger le chunk du chat et Supabase sur mobile, où il est remplacé par un
// bouton flottant.
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isDesktop;
}
