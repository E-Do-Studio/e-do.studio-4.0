import { useState } from 'react';
import type { FormEvent } from 'react';
import { cn } from './ui/cn';
import { PageHeader, buildMainNav } from './ui/page-header';
import { SocialLinksRow } from './ui/social-links-row';
import { CellLabel } from './ui/typography';
import { useLoaderData } from '@tanstack/react-router';
import type {
  ContactInfo,
  StudioHours as StudioHoursData,
  TeamMember as StrapiTeamMember,
  ClosurePeriod,
} from './lib/strapi';
import type { Lang, ContactFormData, Bilingual } from './types';
import { usePageContext } from './lib/page-context';
import { submitContactForm } from './lib/contact';
import { common, contact as contactMsg } from './i18n/messages';
import { ContactForm, ContactSuccess, INITIAL_FORM } from './contact-form';

const UNAVAILABLE: Bilingual = {
  fr: 'Contenu temporairement indisponible',
  en: 'Content temporarily unavailable',
};

const METRO_COLOR_BY_LINE: Record<string, string> = {
  '13': 'bg-metro-13 text-black',
  '14': 'bg-metro-14 text-white',
};

function parseMetroLabel(label: string): { line: string | null; name: string } {
  const m = label.match(/^M(?:[ée]tro)?\.?\s*(\d+)\s*[—–-]\s*(.+)$/i);
  if (m) return { line: m[1], name: m[2].trim() };
  return { line: null, name: label };
}

interface ContactRailProps {
  lang: Lang;
  contact: ContactInfo | null;
  hours: StudioHoursData | null;
}

const ContactRail = ({
  lang,
  contact,
  hours,
  closures,
}: ContactRailProps & { closures: ClosurePeriod[] }) => {
  const today = new Date().toISOString().slice(0, 10);
  const hasClosures = closures.some((c) => c.endsAt >= today);
  return (
    <aside className="flex flex-col overflow-auto bg-white md:col-start-1 md:row-start-2 md:grid md:grid-rows-contact-form md:gap-hairline md:overflow-hidden md:bg-hairline">
      <FindUsSection lang={lang} contact={contact} className="md:row-[1/5]" />
      <HoursSection
        lang={lang}
        hours={hours}
        className={hasClosures ? 'md:row-[5/6]' : 'md:row-[5/7]'}
      />
      <ClosuresSection
        lang={lang}
        closures={closures}
        className="md:row-[6/7]"
      />
      <PhoneSection lang={lang} contact={contact} className="md:row-[7/8]" />
      <div className="flex-1 md:hidden" />
      <SocialLinksRow className="border-t border-hairline md:row-[8/9] md:auto-rows-[2.75rem] md:border-t-0" />
    </aside>
  );
};

interface ClosuresSectionProps {
  lang: Lang;
  closures: ClosurePeriod[];
  className?: string;
}

function formatClosureDate(iso: string, lang: Lang): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
  return d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const ClosuresSection = ({
  lang,
  closures,
  className,
}: ClosuresSectionProps) => {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = closures
    .filter((c) => c.endsAt >= today)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  if (upcoming.length === 0) return null;
  return (
    <section
      className={cn(
        'border-b border-border bg-white p-6 md:border-b-0',
        className,
      )}
    >
      <CellLabel className="mb-5 block">
        {lang === 'fr' ? 'Fermetures' : 'Closures'}
      </CellLabel>
      <div className="flex flex-col gap-3 text-caption">
        {upcoming.map((c) => (
          <div
            key={`${c.startsAt}-${c.endsAt}`}
            className="flex flex-col gap-0.5"
          >
            <span className="font-mono tracking-ui">
              {c.startsAt === c.endsAt
                ? formatClosureDate(c.startsAt, lang)
                : `${formatClosureDate(c.startsAt, lang)} → ${formatClosureDate(c.endsAt, lang)}`}
            </span>
            {c.label && (
              <span className="text-muted-foreground">
                {c.label[lang] || c.label.fr}
              </span>
            )}
            {c.note && (
              <span className="opacity-55 text-muted-foreground">
                {c.note[lang] || c.note.fr}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

interface FindUsSectionProps {
  lang: Lang;
  contact: ContactInfo | null;
  className?: string;
}

const FindUsSection = ({ lang, contact, className }: FindUsSectionProps) => {
  const c = contact;
  const showFallback = !c;
  const eyebrowFromEntries =
    c?.entries && c.entries.length > 0
      ? c.entries
          .map((e) => `${e.label}${e.address ? ` ${e.address}` : ''}`)
          .join(' · ')
      : null;
  const eyebrow =
    eyebrowFromEntries ||
    c?.address.complement ||
    'Parc d’activités Victor Hugo · Bât. 6.7';
  return (
    <section
      className={cn(
        'border-b border-border bg-white p-6 md:overflow-auto md:border-b-0',
        className,
      )}
    >
      <CellLabel className="mb-5 block">{contactMsg.findUs[lang]}</CellLabel>
      {showFallback ? (
        <UnavailableNote lang={lang} />
      ) : (
        <>
          <div className="text-detail leading-copy font-medium text-foreground">
            <span className="mb-2 block font-mono text-label font-normal uppercase tracking-ui text-muted-foreground">
              {eyebrow}
            </span>
            {c?.address.street}
            <br />
            {c?.address.postalCode}{' '}
            <span className="whitespace-nowrap">{c?.address.city}</span>
            {c?.address.country ? (
              <>
                ,<br />
                {c.address.country}
              </>
            ) : null}
          </div>
          {c?.transport && c.transport.length > 0 && (
            <div className="mt-5 flex flex-col gap-2.5 font-mono text-label leading-relaxed tracking-ui text-muted-foreground">
              {c.transport.map((t, i) => {
                const { line, name } = parseMetroLabel(t.label);
                if (!line)
                  return (
                    <div key={i} className="whitespace-nowrap">
                      {t.label}
                    </div>
                  );
                return (
                  <MetroLine
                    key={i}
                    line={line}
                    label={name}
                    className={
                      METRO_COLOR_BY_LINE[line] ?? 'bg-muted text-foreground'
                    }
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
};

interface MetroLineProps {
  line: string;
  label: string;
  className?: string;
}

const MetroLine = ({ line, label, className }: MetroLineProps) => (
  <div className="flex items-center gap-2 whitespace-nowrap">
    <span
      className={cn(
        'inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-label font-bold tracking-normal',
        className,
      )}
    >
      {line}
    </span>
    {label}
  </div>
);

interface HoursSectionProps {
  lang: Lang;
  hours: StudioHoursData | null;
  className?: string;
}

const HoursSection = ({ lang, hours, className }: HoursSectionProps) => {
  const h = hours;
  const showFallback = !h;
  return (
    <section
      className={cn(
        'border-b border-border bg-white p-6 md:border-b-0',
        className,
      )}
    >
      <CellLabel className="mb-5 block">{contactMsg.hours[lang]}</CellLabel>
      {showFallback ? (
        <UnavailableNote lang={lang} />
      ) : (
        <div className="flex flex-col gap-3 text-caption">
          <HoursRow
            label={contactMsg.monFri[lang]}
            value={h?.weekday[lang] || '—'}
          />
          <HoursRow
            label={contactMsg.satSun[lang]}
            value={h?.weekend[lang] || common.onRequest[lang]}
            muted
          />
        </div>
      )}
    </section>
  );
};

interface HoursRowProps {
  label: string;
  value: string;
  muted?: boolean;
}

const HoursRow = ({ label, value, muted = false }: HoursRowProps) => (
  <div className="flex items-baseline justify-between gap-3 whitespace-nowrap">
    <span className="text-muted-foreground">{label}</span>
    <span
      className={cn(
        'text-caption',
        muted ? 'text-muted-foreground' : 'font-mono text-foreground',
      )}
    >
      {value}
    </span>
  </div>
);

interface PhoneSectionProps {
  lang: Lang;
  contact: ContactInfo | null;
  className?: string;
}

const PhoneSection = ({ lang, contact, className }: PhoneSectionProps) => {
  const c = contact;
  const showFallback = !c;
  return (
    <section className={cn('bg-white p-6', className)}>
      <CellLabel className="mb-5 block">{contactMsg.phone[lang]}</CellLabel>
      {showFallback ? (
        <UnavailableNote lang={lang} />
      ) : c?.phone ? (
        <a
          href={c.phoneHref}
          className="text-detail font-medium tracking-copy-tight text-primary no-underline"
        >
          {c.phone}
        </a>
      ) : null}
    </section>
  );
};

const UnavailableNote = ({ lang }: { lang: Lang }) => (
  <span className="block font-mono text-micro uppercase tracking-meta text-muted-foreground opacity-55">
    {UNAVAILABLE[lang]} · offline
  </span>
);

interface ContactFormPanelProps {
  lang: Lang;
  form: ContactFormData;
  sent: boolean;
  sending: boolean;
  sendError: string | null;
  setForm: (form: ContactFormData) => void;
  setSent: (sent: boolean) => void;
  submit: (event: FormEvent) => void;
  goto: (screen: string) => void;
}

const ContactFormPanel = ({
  lang,
  form,
  sent,
  sending,
  sendError,
  setForm,
  setSent,
  submit,
  goto,
}: ContactFormPanelProps) => (
  <main className="overflow-hidden bg-white md:col-start-2 md:col-span-2 md:row-start-2">
    {!sent ? (
      <ContactForm
        lang={lang}
        form={form}
        setForm={setForm}
        submit={submit}
        sending={sending}
        sendError={sendError}
      />
    ) : (
      <ContactSuccess
        lang={lang}
        onNewMessage={() => {
          setSent(false);
          setForm(INITIAL_FORM);
        }}
        onContinue={() => goto('gallery')}
        continueLabel={`${contactMsg.seeGallery[lang]} →`}
      />
    )}
  </main>
);

interface ContactRightColumnProps {
  lang: Lang;
  contact: ContactInfo | null;
  team: StrapiTeamMember[];
}

const ContactRightColumn = ({
  lang,
  contact,
  team,
}: ContactRightColumnProps) => (
  <aside className="grid grid-rows-2 overflow-hidden md:col-start-4 md:row-start-2 min-h-72 md:min-h-0">
    <ContactMap
      lang={lang}
      contact={contact}
      className="border-b border-hairline"
    />
    <TeamPanel lang={lang} members={team} />
  </aside>
);

function buildMapsEmbedFallback(
  fullAddress?: string,
  street?: string,
  postalCode?: string,
  city?: string,
): string {
  const q =
    fullAddress || [street, postalCode, city].filter(Boolean).join(', ');
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=17&output=embed`;
}

// Le type de carte est encodé dans le token `!5eN` d'un embed Google Maps
// (0 = plan, 1 = satellite, 2 = relief). On force la vue plan quel que soit
// l'embed copié dans Strapi.
function forceMapPlanView(url: string): string {
  return url.replace(/!5e[12]/, '!5e0');
}

interface ContactMapProps {
  lang: Lang;
  contact: ContactInfo | null;
  className?: string;
}

const ContactMap = ({ lang, contact, className }: ContactMapProps) => {
  const c = contact;
  const showFallback = !c;
  const embedUrl = forceMapPlanView(
    c?.mapsEmbedUrl ||
      buildMapsEmbedFallback(
        c?.fullAddress,
        c?.address.street,
        c?.address.postalCode,
        c?.address.city,
      ),
  );
  return (
    <section className={cn('relative overflow-hidden bg-edo-warm', className)}>
      {showFallback ? (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <UnavailableNote lang={lang} />
        </div>
      ) : (
        <iframe
          src={embedUrl}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={contactMsg.mapTitle[lang]}
        />
      )}
    </section>
  );
};

const TeamPanel = ({
  lang,
  members,
}: {
  lang: Lang;
  members: StrapiTeamMember[];
}) => (
  <section className="flex flex-col gap-3.5 bg-foreground p-6 text-white">
    <span className="edo-cell-label text-white/70">
      {contactMsg.team[lang]}
    </span>
    <div className="flex flex-col gap-2.5">
      {members.map((member) => (
        <TeamMemberRow key={member.id} member={member} lang={lang} />
      ))}
    </div>
  </section>
);

interface TeamMemberRowProps {
  member: StrapiTeamMember;
  lang: Lang;
}

const TeamMemberRow = ({ member, lang }: TeamMemberRowProps) => (
  <div className="grid grid-cols-fluid-auto gap-2 border-b border-white/10 py-2">
    <div className="flex flex-col gap-0.5">
      <span className="text-detail tracking-copy-tight text-white">
        {member.name[lang]}
      </span>
      <span className="font-mono text-micro uppercase tracking-ui text-white/55">
        {member.role[lang]}
      </span>
    </div>
    {member.email && member.emailHref && (
      <a
        href={member.emailHref}
        className="self-center font-mono text-label tracking-caption text-primary no-underline"
      >
        {member.email}
      </a>
    )}
  </div>
);

const ContactPage = () => {
  const { lang, setLang, openMenu, goto, siteData } = usePageContext();
  const contact = siteData.contact;
  const hours = siteData.studioHours;
  const { teamMembers } = useLoaderData({ from: '/$lang/contact' });
  const team = teamMembers ?? [];
  const closures = siteData.businessInfo?.closures ?? [];
  const [form, setForm] = useState<ContactFormData>(INITIAL_FORM);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    setSendError(null);
    try {
      await submitContactForm(form);
      setSent(true);
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : contactMsg.errorSend[lang],
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="edo-page-enter grid w-full edo-hairline md:h-full md:grid-cols-contact-shell md:grid-rows-page md:overflow-hidden">
      <h1 className="sr-only">{common.contactUs[lang]} — E-Do Studio Paris</h1>
      {/* Unified header — compact right-aligned actions on all breakpoints */}
      <PageHeader
        lang={lang}
        title={common.contactUs[lang]}
        className="col-span-full h-14 md:col-span-full md:row-start-1 md:h-full"
        onMenuClick={openMenu}
        onLogoClick={() => goto('home')}
        onLangToggle={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        actions={buildMainNav({ lang, goto, exclude: 'contact' })}
      />
      <ContactFormPanel
        lang={lang}
        form={form}
        sent={sent}
        sending={sending}
        sendError={sendError}
        setForm={setForm}
        setSent={setSent}
        submit={submit}
        goto={goto}
      />
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

export { ContactPage, ContactRail, ContactRightColumn };
