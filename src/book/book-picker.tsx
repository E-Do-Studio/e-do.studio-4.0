import { useNavigate } from '@tanstack/react-router';
import { usePageContext, SCREEN_TO_PATH } from '../router';
import { PageHeader, buildMainNav, IconArrowRight, cn } from '../ui';
import { useDocumentMeta } from '../lib/use-document-meta';
import { useStructuredData } from '../lib/use-structured-data';
import { buildWebPageSchema, buildBreadcrumbSchema } from '../lib/structured-data';
import { bookPicker, booking, common } from '../i18n/messages';
import { configuratorPath, manualPath } from './book-routes';
import type { Lang } from '../types';

interface TileProps {
  index: number;
  label: string;
  description: string;
  href: string;
  variant: 'primary' | 'foreground' | 'surface';
  onClick: () => void;
  lang: Lang;
}

const PickerTile = ({ index, label, description, variant, onClick, lang }: TileProps) => {
  const palette =
    variant === 'primary'
      ? 'bg-primary text-white hover:opacity-90'
      : variant === 'foreground'
      ? 'bg-foreground text-white hover:opacity-90'
      : 'bg-white text-foreground hover:bg-muted';
  const labelMutedTone = variant === 'surface' ? 'text-muted-foreground' : 'text-white/60';
  const descTone = variant === 'surface' ? 'text-muted-foreground' : 'text-white/70';
  const idxTone = variant === 'surface' ? 'text-muted-foreground' : 'text-white/55';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'edo-focus-ring group flex min-h-44 cursor-pointer flex-col gap-3 border-0 px-6 py-7 text-left transition-[color,background-color,opacity] duration-150 ease-edo-out md:min-h-72 md:px-8 md:py-9',
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
  useDocumentMeta('book-picker', lang);
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

  const configHref = configuratorPath(lang, 0);
  const manualHref = manualPath(lang);

  const goConfigurator = () => navigate({ to: configHref });
  const goManual = () => navigate({ to: manualHref });

  return (
    <div className="edo-page-enter grid w-full edo-hairline md:h-full md:grid-rows-app">
      <PageHeader
        lang={lang}
        title={booking.title[lang]}
        className="col-span-full h-14 md:row-start-1 md:h-full"
        subgrid={false}
        onMenuClick={openMenu}
        onLogoClick={() => goto('home')}
        onLangToggle={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        actions={buildMainNav({ lang, goto, exclude: 'book' })}
      />

      <div className="md:row-start-2 md:overflow-y-auto md:min-h-0">
        <div className="bg-white px-6 py-10 md:px-12 md:py-14">
          <h1 className="m-0 text-hero font-light tracking-display leading-solid text-balance text-foreground">
            {bookPicker.title[lang]}
          </h1>
          <p className="m-0 mt-4 max-w-2xl text-detail text-muted-foreground leading-normal text-pretty">
            {bookPicker.subtitle[lang]}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-hairline bg-border md:grid-cols-3">
          <PickerTile
            index={1}
            label={bookPicker.configuratorLabel[lang]}
            description={bookPicker.configuratorDesc[lang]}
            variant="primary"
            href={configHref}
            onClick={goConfigurator}
            lang={lang}
          />
          <PickerTile
            index={2}
            label={bookPicker.manualLabel[lang]}
            description={bookPicker.manualDesc[lang]}
            variant="foreground"
            href={manualHref}
            onClick={goManual}
            lang={lang}
          />
          <PickerTile
            index={3}
            label={bookPicker.contactLabel[lang]}
            description={bookPicker.contactDesc[lang]}
            variant="surface"
            href={SCREEN_TO_PATH.contact(lang)}
            onClick={() => goto('contact')}
            lang={lang}
          />
        </div>

        <div className="bg-white px-6 py-8 md:px-12 md:py-10">
          <span className="font-mono text-label tracking-meta uppercase text-muted-foreground">
            {lang === 'fr' ? 'Réponse sous 24h ouvrées' : 'Reply within 1 business day'}
          </span>
          <span className="ml-3 text-detail text-muted-foreground">
            {lang === 'fr'
              ? `· ${common.bookNow.fr} en quelques minutes.`
              : `· ${common.bookNow.en} in a few minutes.`}
          </span>
        </div>
      </div>
    </div>
  );
};

export { BookPicker };
