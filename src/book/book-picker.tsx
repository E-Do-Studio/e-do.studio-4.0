import { useLoaderData, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { usePageContext } from '../lib/page-context';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { PageHeader, buildMainNav } from '../ui/page-header';
import { useT } from '../i18n/use-t';
import { configuratorPath, manualPath } from './book-routes';
import { ContactRail, ContactRightColumn } from '../contact-page';
import type { TeamMember } from '../lib/strapi';
import type { Lang } from '../types';

interface TileProps {
  index: number;
  label: string;
  description: string;
  variant: 'primary' | 'foreground' | 'surface';
  onClick: () => void;
  lang: Lang;
}

const PickerTile = ({
  index,
  label,
  description,
  variant,
  onClick,
  lang,
}: TileProps) => {
  const t = useT();
  const palette =
    variant === 'primary'
      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
      : variant === 'foreground'
        ? 'bg-foreground text-background hover:bg-foreground'
        : 'bg-background text-foreground hover:bg-muted';
  return (
    <Button
      variant="cell"
      size="cell"
      onClick={onClick}
      className={cn(
        'group min-h-40 flex-1 gap-3 px-6 py-7 md:aspect-square md:min-h-fit md:min-w-0 md:border-t md:border-border md:px-8 md:py-8',
        palette,
      )}
    >
      <div className="flex items-start justify-between">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {String(index).padStart(2, '0')}
        </span>
        <ArrowRight
          data-icon="inline-end"
          className="transition-transform duration-200 ease-out group-hover:translate-x-1.5 group-hover:scale-110"
        />
      </div>
      <div className="mt-auto flex flex-col gap-2">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {t('bookPicker.modeLabel')}
        </span>
        <span className="text-xl font-light tracking-tight leading-tight">
          {label}
        </span>
        <span className="text-sm leading-snug tracking-tight text-muted-foreground md:min-h-[2lh]">
          {description}
        </span>
      </div>
    </Button>
  );
};

const BookPicker = () => {
  const t = useT();
  const { lang, setLang, openMenu, goto, siteData } = usePageContext();
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
    <div className="animate-in fade-in duration-300 grid w-full gap-px bg-border md:h-full md:grid-cols-[var(--spacing-logo)_repeat(3,minmax(0,1fr))] md:grid-rows-[var(--spacing-header)_minmax(0,1fr)] md:overflow-hidden">
      <PageHeader
        lang={lang}
        title={t('booking.title')}
        className="col-span-full md:row-start-1"
        onMenuClick={openMenu}
        onLogoClick={() => goto('home')}
        onLangToggle={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        actions={buildMainNav({ lang, goto })}
      />

      <main className="flex flex-col overflow-auto bg-background md:col-start-2 md:col-span-2 md:row-start-2">
        <div className="bg-background px-6 py-10 md:px-12 md:py-14">
          <h1 className="m-0 text-5xl font-light tracking-tighter leading-none text-balance text-foreground">
            {t('bookPicker.title')}
          </h1>
          <p className="m-0 mt-4 max-w-2xl text-sm text-muted-foreground leading-normal text-pretty">
            {t('bookPicker.subtitle')}
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-px bg-border border-t border-border md:flex-row md:items-end md:border-t-0">
          <PickerTile
            index={1}
            label={t('bookPicker.configuratorLabel')}
            description={t('bookPicker.configuratorDesc')}
            variant="primary"
            onClick={goConfigurator}
            lang={lang}
          />
          <PickerTile
            index={2}
            label={t('bookPicker.manualLabel')}
            description={t('bookPicker.manualDesc')}
            variant="foreground"
            onClick={goManual}
            lang={lang}
          />
          <PickerTile
            index={3}
            label={t('bookPicker.contactLabel')}
            description={t('bookPicker.contactDesc')}
            variant="surface"
            onClick={() => goto('contact')}
            lang={lang}
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
    </div>
  );
};

export { BookPicker };
