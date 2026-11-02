import { useT } from '../i18n/use-t';
import { MonoLabel } from './mono-label';

// `lines="multi"` : la phrase passe à la ligne dans un rail de 240px. Et plus
// d'`opacity-50` par-dessus `text-muted-foreground` — la note tombait sous 3:1,
// donc la seule chose que la page avait à dire quand la donnée manque était
// justement la moins lisible.
const UnavailableNote = () => {
  const t = useT();
  return (
    <MonoLabel tone="muted" lines="multi" className="block">
      {t('contact.temporarilyUnavailable')}
    </MonoLabel>
  );
};

export { UnavailableNote };
