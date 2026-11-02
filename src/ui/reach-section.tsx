import { cn } from '@/lib/utils';
import { useT } from '../i18n/use-t';
import type { ContactInfo } from '../lib/strapi';
import { HeadlineCell } from './headline-cell';
import { LabelledCell } from './labelled-cell';
import { UnavailableNote } from './unavailable-note';

interface ReachSectionProps {
  contact: ContactInfo | null;
  className?: string;
}

// Une cellule, deux façons de nous joindre. Le téléphone avait la sienne et
// l'email n'était affiché NULLE PART sur la page — sur une page de contact, et
// alors que `email` / `emailHref` sont dans le payload depuis toujours.
//
// Le numéro monte au registre `text-xl` : c'est l'action la plus directe de la
// colonne, et il se lisait à la même taille que la mention d'horaires. Il reste
// sous l'adresse dans la hiérarchie — le formulaire, à deux colonnes d'ici, est
// l'action primaire de la page et garde le seul aplat orange.
//
// `min-h-tap` sur les deux : un numéro et un mail sont des cibles tactiles, et
// c'étaient des `<a>` en ligne de 20px de haut.
const ReachSection = ({ contact, className }: ReachSectionProps) => {
  const t = useT();
  const c = contact;
  return (
    <section className={cn('bg-background py-6', className)}>
      {!c ? (
        <LabelledCell pad="section" label={t('contact.reachUs')}>
          <UnavailableNote />
        </LabelledCell>
      ) : (
        // Le lien n'emporte que sa couleur : corps, graisse et interlettrage lui
        // viennent du registre que la cellule pose, donc rien n'est recopié.
        //
        // La cible tactile passe par une zone de clic étendue et non par
        // `min-h-tap` : un plancher de 44px pour 20px de texte centre le texte et
        // laisse 12px de blanc de chaque côté, qui s'AJOUTAIENT au `gap` de la
        // cellule. Le rail affichait 22px puis 21px là où ses deux voisines
        // affichent 14 puis 8. Le pseudo-élément, lui, ne déplace rien : le lien
        // occupe la largeur de la colonne et son `-inset-y-1` porte la cible à
        // 28px sans toucher au rythme. C'est l'idiome de `switch.tsx`.
        <HeadlineCell
          pad="section"
          label={t('contact.reachUs')}
          size="xs"
          headline={
            <a
              href={c.phoneHref}
              className="relative block text-primary no-underline after:absolute after:-inset-x-3 after:-inset-y-1"
            >
              {c.phone}
            </a>
          }
          details={
            c.email && (
              <a
                href={c.emailHref}
                className="relative block break-all tracking-tight text-primary no-underline after:absolute after:-inset-x-3 after:-inset-y-1"
              >
                {c.email}
              </a>
            )
          }
        />
      )}
    </section>
  );
};

export { ReachSection };
