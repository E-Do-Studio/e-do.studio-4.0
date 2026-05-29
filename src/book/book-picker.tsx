import { useNavigate } from '@tanstack/react-router';
import { usePageContext, SCREEN_TO_PATH } from '../router';
import { PageHeader, buildMainNav, IconArrowRight, cn } from '../ui';
import { useDocumentMeta } from '../lib/use-document-meta';
import { useStructuredData } from '../lib/use-structured-data';
import { buildWebPageSchema, buildBreadcrumbSchema } from '../lib/structured-data';
import { bookPicker, booking } from '../i18n/messages';
import { configuratorPath, manualPath } from './book-routes';
import { ContactRail, ContactRightColumn } from '../contact-page';
import {
  useContact,
  useStudioHours,
  useTeamMembers,
  useSiteBusinessInfo,
} from '../lib/use-strapi';
import type { Lang } from '../types';

interface TileProps {
  index: number;
  label: string;
  description: string;
  variant: 'primary' | 'foreground' | 'surface';
  onClick: () => void;
  lang: Lang;
}

const PickerTile = ({ index, label, description, variant, onClick, lang }: TileProps) => {
  const palette =
    variant === 'primary'
      ? 'bg-white text-foreground hover:bg-muted'
      : variant === 'foreground'
      ? 'bg-edo-gray-50 text-foreground hover:bg-muted'
      : 'bg-muted text-foreground hover:bg-edo-gray-200';
  const labelMutedTone = 'text-muted-foreground';
  const descTone = 'text-muted-foreground';
  const idxTone = 'text-muted-foreground';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'edo-focus-ring group flex flex-1 min-h-40 cursor-pointer flex-col gap-3 border-0 px-6 py-7 text-left transition-[color,background-color,opacity] duration-150 ease-edo-out md:aspect-square md:min-h-0 md:border-t md:border-edo-pure-black md:px-8 md:py-8',
        palette,
      )}
    >
      <div className="flex items-start justify-between">
        <span className={cn('font-mono text-label tracking-meta uppercase', idxTone)}>
          {String(index).padStart(2, '0')}
        </span>
        <IconArrowRight
          className="flex-shrink-0 transition-transform duration-200 ease-edo-out group-hover:translate-x-1.5 group-hover:scale-110"
          width="16"
          height="16"
        />
      </div>
      <div className="mt-auto flex flex-col gap-2">
        <span className={cn('font-mono text-label uppercase tracking-label', labelMutedTone)}>
          {lang === 'fr' ? 'Mode' : 'Mode'}
        </span>
        <span className="text-tile-title font-light tracking-headline leading-tight">{label}</span>
        <span className={cn('text-detail leading-snug tracking-copy-tight', descTone)}>
          {description}
        </span>
      </div>
    </button>
  );
};

const BookPicker = () => {
  const { lang, setLang, openMenu, goto } = usePageContext();
  const navigate = useNavigate();
  useDocumentMeta('book-picker', lang, { noIndex: true });
  const bookPathname = lang === 'fr' ? '/reserver' : '/book';
  useStructuredData('book-picker', [
    buildWebPageSchema({
      lang,
      pathname: bookPathname,
      name: lang === 'fr' ? 'Réserver — E-Do Studio Paris' : 'Book — E-Do Studio Paris',
      description: bookPicker.subtitle[lang],
    }),
    buildBreadcrumbSchema(
      [
        { name: lang === 'fr' ? 'Accueil' : 'Home', pathname: '' },
        { name: lang === 'fr' ? 'Réserver' : 'Book', pathname: bookPathname },
      ],
      lang,
    ),
  ]);

  const contact = useContact();
  const hours = useStudioHours();
  const teamState = useTeamMembers();
  const team = teamState.data ?? [];
  const businessState = useSiteBusinessInfo();
  const closures = businessState.data?.closures ?? [];

  const configHref = configuratorPath(lang, 0);
  const manualHref = manualPath(lang);

  const goConfigurator = () => navigate({ to: configHref });
  const goManual = () => navigate({ to: manualHref });

  return (
    <div className="edo-page-enter grid w-full edo-hairline md:h-full md:grid-cols-contact-shell md:grid-rows-page md:overflow-hidden">
      <PageHeader
        lang={lang}
        title={booking.title[lang]}
        className="col-span-full h-14 md:col-span-full md:row-start-1 md:h-full"
        onMenuClick={openMenu}
        onLogoClick={() => goto('home')}
        onLangToggle={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        actions={buildMainNav({ lang, goto, exclude: 'book' })}
      />

      <main className="flex flex-col overflow-auto bg-white md:col-start-2 md:col-span-2 md:row-start-2">
        <div className="bg-white px-6 py-10 md:px-12 md:py-14">
          <h1 className="m-0 text-hero font-light tracking-display leading-solid text-balance text-foreground">
            {bookPicker.title[lang]}
          </h1>
          <p className="m-0 mt-4 max-w-2xl text-detail text-muted-foreground leading-normal text-pretty">
            {bookPicker.subtitle[lang]}
          </p>
        </div>

        <div className="flex flex-1 flex-col edo-hairline border-t border-hairline md:flex-row md:items-end md:border-t-0">
          <PickerTile
            index={1}
            label={bookPicker.configuratorLabel[lang]}
            description={bookPicker.configuratorDesc[lang]}
            variant="primary"
            onClick={goConfigurator}
            lang={lang}
          />
          <PickerTile
            index={2}
            label={bookPicker.manualLabel[lang]}
            description={bookPicker.manualDesc[lang]}
            variant="foreground"
            onClick={goManual}
            lang={lang}
          />
          <PickerTile
            index={3}
            label={bookPicker.contactLabel[lang]}
            description={bookPicker.contactDesc[lang]}
            variant="surface"
            onClick={() => goto('contact')}
            lang={lang}
          />
        </div>
      </main>

      <ContactRail lang={lang} contact={contact} hours={hours} closures={closures} />

      <ContactRightColumn lang={lang} contact={contact} team={team} />
    </div>
  );
};

export { BookPicker };
