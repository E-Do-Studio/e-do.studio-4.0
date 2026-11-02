import { cn } from '@/lib/utils';
import { useT } from '../i18n/use-t';
import type { StudioHours as StudioHoursData } from '../lib/strapi';
import type { Lang } from '../types';
import { HeadlineCell } from './headline-cell';
import { LabelledCell } from './labelled-cell';
import { UnavailableNote } from './unavailable-note';

interface HoursSectionProps {
  lang: Lang;
  hours: StudioHoursData | null;
  className?: string;
}

// Plus de `KeyValueRow` ici : les horaires ne sont pas une paire nom / valeur.
//
// La question qu'on pose à cette cellule est « vous ouvrez quand ? », et la
// réponse est une plage. Les jours la QUALIFIENT, ils ne lui font pas face. En
// tableau, le libellé se collait au bord gauche et la plage au bord droit, avec
// un vide au milieu : dans les 192px utiles du rail, l'œil faisait du ping-pong
// entre deux bords pour rapprocher deux mots qui forment une seule phrase. Et le
// filet entre les rangées découpait en deux enregistrements ce qui est un seul
// fait, l'horaire du studio.
//
// La cellule prend donc la même forme que ses deux voisines : la réponse au
// registre du titre, les nuances en gris dessous.
const HoursSection = ({ lang, hours, className }: HoursSectionProps) => {
  const t = useT();
  const rows = hours?.rows ?? [];
  // La réponse est la première PLAGE. Un statut n'en est pas une : une cellule
  // dont le seul contenu est « sur demande » n'a pas de titre à donner, et ses
  // lignes se lisent alors toutes au même registre.
  const primary = rows.find((row) => row.kind === 'hours');
  const line = (row: (typeof rows)[number]) =>
    [row.label[lang], row.value[lang]].filter(Boolean).join('  ');
  return (
    <section className={cn('bg-background py-6', className)}>
      {rows.length === 0 ? (
        <LabelledCell pad="section" label={t('contact.hours')}>
          <UnavailableNote />
        </LabelledCell>
      ) : primary ? (
        <HeadlineCell
          pad="section"
          label={t('contact.hours')}
          headline={primary.value[lang]}
          details={[primary, ...rows.filter((row) => row !== primary)].map(
            (row) => (
              <span key={row.days.join('-') || row.value.fr} className="block">
                {row === primary ? row.label[lang] : line(row)}
              </span>
            ),
          )}
        />
      ) : (
        <LabelledCell pad="section" label={t('contact.hours')}>
          <div className="text-sm leading-snug text-muted-foreground">
            {rows.map((row) => (
              <span key={row.days.join('-') || row.value.fr} className="block">
                {line(row)}
              </span>
            ))}
          </div>
        </LabelledCell>
      )}
    </section>
  );
};

export { HoursSection };
