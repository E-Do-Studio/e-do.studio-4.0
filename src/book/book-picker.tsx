import { useLoaderData, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { usePageContext } from '../lib/page-context';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { PageShell } from '../ui/page-shell';
import { MonoLabel } from '../ui/mono-label';
import { MAIN_ID } from '../ui/skip-link';
import { SectionIntro } from '../ui/section-intro';
import { useT } from '../i18n/use-t';
import { configuratorPath, manualPath } from './book-routes';
import { ContactRail, ContactRightColumn } from '../contact-page';
import type { TeamMember } from '../lib/strapi';

interface TileProps {
  index: number;
  label: string;
  description: string;
  variant: 'primary' | 'foreground' | 'surface';
  onClick: () => void;
}

const PickerTile = ({
  index,
  label,
  description,
  variant,
  onClick,
}: TileProps) => {
  const t = useT();
  // La tuile sombre passe par la portée `dark` et non par `bg-foreground
  // text-background` : c'est l'idiome du dépôt (contact-page, booking-side-panel,
  // home-page…), et lui seul fait résoudre `text-muted-foreground` contre le
  // fond de la cellule au lieu de le laisser calé sur le thème clair.
  const palette =
    variant === 'primary'
      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
      : variant === 'foreground'
        ? 'dark bg-background text-foreground hover:bg-background'
        : 'bg-background text-foreground hover:bg-muted';
  // L'aplat orange n'a pas de portée qui le décrive : `text-muted-foreground`
  // y tombe sur un gris illisible. La teinte discrète s'y dérive du premier
  // plan de la cellule, comme le fait BookCtaCell.
  const subtle =
    variant === 'primary'
      ? 'text-primary-foreground/75'
      : 'text-muted-foreground';
  return (
    <Button
      variant="cell"
      size="cell"
      onClick={onClick}
      className={cn(
        'group min-h-40 flex-1 gap-3 px-6 py-7 app:aspect-square app:min-h-fit app:min-w-0 app:px-8 app:py-8',
        palette,
      )}
    >
      <div className="flex items-start justify-between">
        <MonoLabel tone="inherit" className={subtle}>
          {String(index).padStart(2, '0')}
        </MonoLabel>
        <ArrowRight data-icon="inline-end" />
      </div>
      <div className="mt-auto flex flex-col gap-2">
        <MonoLabel tone="inherit" className={subtle}>
          {t('bookPicker.modeLabel')}
        </MonoLabel>
        <span className="text-xl font-light tracking-tight leading-tight">
          {label}
        </span>
        <span
          className={cn(
            'text-sm leading-snug tracking-tight app:min-h-[2lh]',
            subtle,
          )}
        >
          {description}
        </span>
      </div>
    </Button>
  );
};

const BookPicker = () => {
  const t = useT();
  const { lang, goto, siteData } = usePageContext();
  const navigate = useNavigate();
  const contact = siteData.contact;
  const hours = siteData.studioHours;
  // Servie par deux routes (/reserver en FR, /book en EN) au loader partagé.
  const { teamMembers } = useLoaderData({ strict: false }) as {
    teamMembers: TeamMember[] | null;
  };
  const team = teamMembers ?? [];
  const closures = siteData.businessInfo?.closures ?? [];

  const configHref = configuratorPath(lang, 0);
  const manualHref = manualPath(lang);

  const goConfigurator = () => navigate({ to: configHref });
  const goManual = () => navigate({ to: manualHref });

  return (
    <PageShell className="app:grid-cols-[var(--spacing-logo)_repeat(3,minmax(0,1fr))] app:grid-rows-[var(--spacing-header)_minmax(0,1fr)]">
      <main
        id={MAIN_ID}
        className="flex flex-col overflow-auto bg-background app:col-start-2 app:col-span-2 app:row-start-2"
      >
        <SectionIntro
          title={t('bookPicker.title')}
          subtitle={t('bookPicker.subtitle')}
          className="bg-background"
        />

        {/* Pas de `flex-1` ici : `bg-border` (noir pur) ne peint que les filets
            1px entre tuiles, il ne doit pas peindre la hauteur restante de
            <main>. `mt-auto` ancre le bloc en bas, le vide au-dessus reste
            blanc.

            Le filet supérieur est porté par ce conteneur et non par les tuiles :
            la tuile 02 est une portée `dark`, où `border-border` vaut blanc à
            10 % au lieu du noir pur de la grille. */}
        {/* `md:flex-row` : les trois modes passent côte à côte dès qu'il y a la
            place pour trois cellules, sans attendre le bento. Empilés jusqu'à
            1024, ils demandaient trois écrans de défilement pour un choix qui
            tient sur une ligne. */}
        <div className="flex flex-col gap-px bg-border border-t border-border md:flex-row md:items-stretch app:mt-auto app:items-end">
          <PickerTile
            index={1}
            label={t('bookPicker.configuratorLabel')}
            description={t('bookPicker.configuratorDesc')}
            variant="primary"
            onClick={goConfigurator}
          />
          <PickerTile
            index={2}
            label={t('bookPicker.manualLabel')}
            description={t('bookPicker.manualDesc')}
            variant="foreground"
            onClick={goManual}
          />
          <PickerTile
            index={3}
            label={t('bookPicker.contactLabel')}
            description={t('bookPicker.contactDesc')}
            variant="surface"
            onClick={() => goto('contact')}
          />
        </div>
      </main>

      <ContactRail
        lang={lang}
        contact={contact}
        hours={hours}
        closures={closures}
      />

      <ContactRightColumn lang={lang} contact={contact} team={team} />
    </PageShell>
  );
};

export { BookPicker };
