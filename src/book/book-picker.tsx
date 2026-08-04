import { useLoaderData, useNavigate } from '@tanstack/react-router';
import { usePageContext } from '../lib/page-context';
import { cn } from '@/lib/utils';
import { IconArrowRight } from '../ui/icons';
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
  const onDark = variant === 'primary' || variant === 'foreground';
  const palette =
    variant === 'primary'
      ? 'bg-primary text-primary-foreground hover:bg-edo-orange/90'
      : variant === 'foreground'
        ? 'bg-edo-black text-edo-white hover:bg-edo-dark'
        : 'bg-white text-foreground hover:bg-edo-gray-50';
  const subtleTone = onDark ? 'text-white/75' : 'text-muted-foreground';
  const labelMutedTone = subtleTone;
  const descTone = subtleTone;
  const idxTone = subtleTone;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'edo-focus-ring group flex flex-1 min-h-40 cursor-pointer flex-col gap-3 border-0 px-6 py-7 text-left transition-[color,background-color,opacity] duration-150 ease-edo-out md:aspect-square md:min-h-fit md:min-w-0 md:border-t md:border-edo-pure-black md:px-8 md:py-8',
        palette,
      )}
    >
      <div className="flex items-start justify-between">
        <span
          className={cn(
            'font-mono text-label tracking-meta uppercase',
            idxTone,
          )}
        >
          {String(index).padStart(2, '0')}
        </span>
        <IconArrowRight
          className="flex-shrink-0 transition-transform duration-200 ease-edo-out group-hover:translate-x-1.5 group-hover:scale-110"
          width="16"
          height="16"
        />
      </div>
      <div className="mt-auto flex flex-col gap-2">
        <span
          className={cn(
            'font-mono text-label uppercase tracking-label',
            labelMutedTone,
          )}
        >
          {t('bookPicker.modeLabel')}
        </span>
        <span className="text-tile-title font-light tracking-headline leading-tight">
          {label}
        </span>
        <span
          className={cn(
            'text-detail leading-snug tracking-copy-tight md:min-h-[2lh]',
            descTone,
          )}
        >
          {description}
        </span>
      </div>
    </button>
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
    <div className="edo-page-enter grid w-full edo-hairline md:h-full md:grid-cols-contact-shell md:grid-rows-page md:overflow-hidden">
      <PageHeader
        lang={lang}
        title={t('booking.title')}
        className="col-span-full h-14 md:col-span-full md:row-start-1 md:h-full"
        onMenuClick={openMenu}
        onLogoClick={() => goto('home')}
        onLangToggle={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        actions={buildMainNav({ lang, goto })}
      />

      <main className="flex flex-col overflow-auto bg-white md:col-start-2 md:col-span-2 md:row-start-2">
        <div className="bg-white px-6 py-10 md:px-12 md:py-14">
          <h1 className="m-0 text-hero font-light tracking-display leading-solid text-balance text-foreground">
            {t('bookPicker.title')}
          </h1>
          <p className="m-0 mt-4 max-w-2xl text-detail text-muted-foreground leading-normal text-pretty">
            {t('bookPicker.subtitle')}
          </p>
        </div>

        <div className="flex flex-1 flex-col edo-hairline border-t border-hairline md:flex-row md:items-end md:border-t-0">
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
