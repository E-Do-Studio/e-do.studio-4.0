import { useState } from 'react';
import type { FormEvent, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Button, CellLabel, IconArrowRight, PageHeader, SocialIcon, Wordmark, cn } from './ui';
import { useDocumentMeta } from './lib/use-document-meta';
import { useContact, useStudioHours, useTeamMembers, useContactSubjects, useSiteBusinessInfo } from './lib/use-strapi';
import type { ContactInfo, StudioHours as StudioHoursData, TeamMember as StrapiTeamMember, ContactSubject, ClosurePeriod } from './lib/strapi';
import type { Lang, ContactFormData, Bilingual } from './types';
import { usePageContext } from './router';
import { submitContactForm } from './lib/contact';
import { common, contact as contactMsg } from './i18n/messages';

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

type Subject = ContactSubject;

interface SocialLinkEntry {
  k: string;
  label: string;
  href: string;
}


const SOCIAL_LINKS: SocialLinkEntry[] = [
  {k:'instagram',label:'IG',href:'https://www.instagram.com/edostudio/'},
  {k:'linkedin', label:'LI',href:'https://www.linkedin.com/company/e-do/'},
  {k:'facebook', label:'FB',href:'https://www.facebook.com/EdoStudioAgency/'},
  {k:'tiktok', label:'TT',href:'https://www.tiktok.com/@edostudio'},
];

const INITIAL_FORM: ContactFormData = {
  nom: '',
  email: '',
  telephone: '',
  societe: '',
  sujet: 'general',
  message: '',
};

interface ContactRailProps {
  lang: Lang;
  contact: { data: ContactInfo | null; loading: boolean; error: Error | null };
  hours: { data: StudioHoursData | null; loading: boolean; error: Error | null };
}

const ContactRail = ({ lang, contact, hours, closures }: ContactRailProps & { closures: ClosurePeriod[] }) => (
  <aside className="flex flex-col overflow-auto bg-white md:col-start-1 md:row-start-2">
    <FindUsSection lang={lang} contact={contact} />
    <HoursSection lang={lang} hours={hours} />
    <ClosuresSection lang={lang} closures={closures} />
    <PhoneSection lang={lang} contact={contact} />
    <div className="flex-1" />
    <SocialGrid />
  </aside>
);

interface ClosuresSectionProps {
  lang: Lang;
  closures: ClosurePeriod[];
}

function formatClosureDate(iso: string, lang: Lang): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

const ClosuresSection = ({ lang, closures }: ClosuresSectionProps) => {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = closures
    .filter((c) => c.endsAt >= today)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  if (upcoming.length === 0) return null;
  return (
    <section className="border-b border-border p-6">
      <CellLabel className="mb-5 block">
        {lang === 'fr' ? 'Fermetures' : 'Closures'}
      </CellLabel>
      <div className="flex flex-col gap-3 text-detail leading-copy">
        {upcoming.map((c) => (
          <div key={`${c.startsAt}-${c.endsAt}`} className="flex flex-col gap-0.5">
            <span className="font-mono tracking-ui break-words">
              {c.startsAt === c.endsAt
                ? formatClosureDate(c.startsAt, lang)
                : `${formatClosureDate(c.startsAt, lang)} → ${formatClosureDate(c.endsAt, lang)}`}
            </span>
            {c.label && (
              <span className="text-muted-foreground">{c.label[lang] || c.label.fr}</span>
            )}
            {c.note && (
              <span className="opacity-55 text-muted-foreground">{c.note[lang] || c.note.fr}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

interface FindUsSectionProps {
  lang: Lang;
  contact: { data: ContactInfo | null; loading: boolean; error: Error | null };
}

const FindUsSection = ({ lang, contact }: FindUsSectionProps) => {
  const c = contact.data;
  const showFallback = !contact.loading && (contact.error || !c);
  return (
    <section className="border-b border-border p-6">
      <CellLabel className="mb-5 block">{contactMsg.findUs[lang]}</CellLabel>
      {showFallback ? (
        <UnavailableNote lang={lang} />
      ) : (
        <>
          {c?.entries && c.entries.length > 0 && (
            <div className="mb-3 font-mono text-caption uppercase tracking-ui text-muted-foreground break-words">
              {c.entries.map((e, i) => (
                <span key={i}>
                  {i > 0 && ' · '}
                  {e.label}
                  {e.address ? ` ${e.address}` : ''}
                </span>
              ))}
            </div>
          )}
          <div className="text-detail leading-copy font-normal text-muted-foreground">
            {c?.address.street}<br />
            {c?.address.postalCode} <span className="whitespace-nowrap">{c?.address.city}</span>
            {c?.address.country ? <>,<br />{c.address.country}</> : null}
          </div>
          {c?.transport && c.transport.length > 0 && (
            <div className="mt-4 flex flex-col gap-2.5 text-detail leading-copy text-muted-foreground">
              {c.transport.map((t, i) => {
                const { line, name } = parseMetroLabel(t.label);
                if (!line) return <div key={i} className="break-words">{t.label}</div>;
                return (
                  <MetroLine
                    key={i}
                    line={line}
                    label={name}
                    className={METRO_COLOR_BY_LINE[line] ?? 'bg-muted text-foreground'}
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
  <div className="flex items-start gap-2">
    <span className={cn('mt-0.5 inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full font-mono text-label font-bold tracking-normal', className)}>
      {line}
    </span>
    <span className="min-w-0 break-words">{label}</span>
  </div>
);

interface HoursSectionProps {
  lang: Lang;
  hours: { data: StudioHoursData | null; loading: boolean; error: Error | null };
}

const HoursSection = ({ lang, hours }: HoursSectionProps) => {
  const h = hours.data;
  const showFallback = !hours.loading && (hours.error || !h);
  return (
    <section className="border-b border-border p-6">
      <CellLabel className="mb-5 block">{contactMsg.hours[lang]}</CellLabel>
      {showFallback ? (
        <UnavailableNote lang={lang} />
      ) : (
        <div className="flex flex-col gap-3 text-detail leading-copy">
          <HoursRow label={contactMsg.monFri[lang]} value={h?.weekday[lang] || '—'} />
          <HoursRow label={contactMsg.satSun[lang]} value={h?.weekend[lang] || common.onRequest[lang]} muted />
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
  <div className="flex flex-col gap-0.5">
    <span className={cn('text-muted-foreground', muted && 'opacity-55')}>{label}</span>
    <span className={cn('font-mono tracking-ui break-words', muted && 'text-muted-foreground')}>{value}</span>
  </div>
);

interface PhoneSectionProps {
  lang: Lang;
  contact: { data: ContactInfo | null; loading: boolean; error: Error | null };
}

const PhoneSection = ({ lang, contact }: PhoneSectionProps) => {
  const c = contact.data;
  const showFallback = !contact.loading && (contact.error || !c);
  return (
    <section className="p-6">
      <CellLabel className="mb-5 block">{contactMsg.phone[lang]}</CellLabel>
      {showFallback ? (
        <UnavailableNote lang={lang} />
      ) : c?.phone ? (
        <a href={c.phoneHref} className="text-detail font-mono tracking-ui text-foreground no-underline break-words">
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

const SocialGrid = () => (
  <div className="grid grid-cols-2 gap-px border-t border-border bg-border">
    {SOCIAL_LINKS.map((social) => (
      <a
        key={social.k}
        href={social.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between bg-white px-6 py-4 text-foreground no-underline transition-colors hover:bg-muted"
      >
        <SocialIcon kind={social.k} size={12} />
        <span className="font-mono text-micro tracking-meta">{social.label}</span>
      </a>
    ))}
  </div>
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
  subjects: Subject[];
}

const ContactFormPanel = ({ lang, form, sent, sending, sendError, setForm, setSent, submit, goto, subjects }: ContactFormPanelProps) => (
  <main className="overflow-hidden bg-white md:col-start-2 md:col-span-2 md:row-start-2">
    {!sent ? (
      <ContactForm lang={lang} form={form} setForm={setForm} submit={submit} sending={sending} sendError={sendError} subjects={subjects} />
    ) : (
      <ContactSuccess lang={lang} setForm={setForm} setSent={setSent} goto={goto} />
    )}
  </main>
);

interface ContactFormProps {
  lang: Lang;
  form: ContactFormData;
  setForm: (form: ContactFormData) => void;
  submit: (event: FormEvent) => void;
  sending: boolean;
  sendError: string | null;
  subjects: Subject[];
}

const ContactForm = ({ lang, form, setForm, submit, sending, sendError, subjects }: ContactFormProps) => (
  <form
    onSubmit={submit}
    className="grid h-full grid-cols-2 grid-rows-contact-form gap-px bg-border"
  >
    <div className="col-span-2 flex flex-col justify-center bg-white px-5 py-2.5">
      <span className="edo-cell-label text-primary">{contactMsg.writeToUs[lang]}</span>
      <h1 className="m-0 mt-0.5 text-tile-large font-light leading-none tracking-display text-foreground">
        {contactMsg.projectVisit[lang]}
      </h1>
    </div>

    {subjects.slice(0, 4).map((subject, index) => (
      <SubjectButton
        key={subject.k}
        subject={subject}
        index={index}
        lang={lang}
        active={form.sujet === subject.k}
        onClick={() => setForm({...form, sujet: subject.k})}
      />
    ))}

    <ContactInput required value={form.nom} onChange={(value) => setForm({...form, nom: value})} placeholder={contactMsg.name[lang]} className="col-start-1 row-start-4" />
    <ContactInput required type="tel" value={form.telephone} onChange={(value) => setForm({...form, telephone: value})} placeholder={contactMsg.phonePlaceholder[lang]} className="col-start-2 row-start-4" />
    <ContactInput required type="email" value={form.email} onChange={(value) => setForm({...form, email: value})} placeholder="Email*" className="col-span-2 row-start-5" />
    <ContactInput required value={form.societe} onChange={(value) => setForm({...form, societe: value})} placeholder={contactMsg.companyBrand[lang]} className="col-span-2 row-start-6" />
    <ContactTextarea required value={form.message} onChange={(value) => setForm({...form, message: value})} placeholder={contactMsg.yourMessage[lang]} />

    {sendError && (
      <div className="col-span-2 flex items-center bg-red-50 px-5 py-2 text-sm text-red-600">
        {sendError}
      </div>
    )}

    <button
      type="submit"
      disabled={sending}
      className="edo-focus-ring col-span-2 row-start-8 flex cursor-pointer items-center justify-center gap-3.5 border-0 bg-primary font-mono text-caption uppercase tracking-label text-white transition-colors hover:bg-foreground hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {sending
        ? common.sending[lang]
        : <>{common.send[lang]} <IconArrowRight width="16" height="16" /></>
      }
    </button>
  </form>
);

interface SubjectButtonProps {
  subject: Subject;
  index: number;
  lang: Lang;
  active: boolean;
  onClick: () => void;
}

const SubjectButton = ({ subject, index, lang, active, onClick }: SubjectButtonProps) => {
  const placements = [
    'col-start-1 row-start-2',
    'col-start-2 row-start-2',
    'col-start-1 row-start-3',
    'col-start-2 row-start-3',
  ];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        placements[index],
        'edo-focus-ring flex min-h-14 cursor-pointer items-center gap-3 border-0 px-5 py-2.5 text-left font-sans transition-colors',
        active ? 'bg-foreground text-white' : 'bg-white text-foreground hover:bg-muted'
      )}
    >
      <span className={cn('font-mono text-caption tracking-meta', active ? 'text-white/60' : 'text-muted-foreground')}>
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="text-detail font-normal tracking-copy-tight">{subject[lang]}</span>
    </button>
  );
};

const inputClassName = 'edo-bento-input w-full border-0 bg-white px-5 font-sans text-cell font-light tracking-copy-tight text-foreground outline-none transition-colors focus:bg-muted';

interface ContactInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

const ContactInput = ({ value, onChange, className, type = 'text', ...props }: ContactInputProps) => (
  <input
    type={type}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className={cn(inputClassName, className)}
    {...props}
  />
);

interface ContactTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

const ContactTextarea = ({ value, onChange, ...props }: ContactTextareaProps) => (
  <textarea
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className={cn(inputClassName, 'col-span-2 row-start-7 h-full min-h-36 resize-none py-4 leading-normal')}
    {...props}
  />
);

interface ContactSuccessProps {
  lang: Lang;
  setForm: (form: ContactFormData) => void;
  setSent: (sent: boolean) => void;
  goto: (screen: string) => void;
}

const ContactSuccess = ({ lang, setForm, setSent, goto }: ContactSuccessProps) => (
  <div className="flex h-full flex-col items-start justify-center gap-4 bg-white px-7 py-8">
    <span className="edo-cell-label text-primary">✓ {contactMsg.messageSent[lang]}</span>
    <h1 className="m-0 max-w-lg text-page-title font-light leading-tight tracking-display text-foreground">
      {contactMsg.thanksSoon[lang]}
    </h1>
    <p className="m-0 max-w-md text-detail leading-normal text-muted-foreground">
      {contactMsg.replyTime[lang]}
    </p>
    <div className="mt-3 flex flex-wrap gap-2.5">
      <Button
        variant="outline"
        size="lg"
        onClick={() => {
          setSent(false);
          setForm(INITIAL_FORM);
        }}
      >
        {contactMsg.newMessage[lang]}
      </Button>
      <Button
        size="lg"
        onClick={() => goto('gallery')}
      >
        {contactMsg.seeGallery[lang]} →
      </Button>
    </div>
  </div>
);

interface ContactRightColumnProps {
  lang: Lang;
  contact: { data: ContactInfo | null; loading: boolean; error: Error | null };
  team: StrapiTeamMember[];
}

const ContactRightColumn = ({ lang, contact, team }: ContactRightColumnProps) => (
  <aside className="grid grid-rows-2 gap-px overflow-hidden bg-hairline md:col-start-4 md:row-start-2 min-h-72 md:min-h-0">
    <ContactMap lang={lang} contact={contact} />
    <TeamPanel lang={lang} members={team} />
  </aside>
);

function buildMapsEmbedFallback(fullAddress?: string, street?: string, postalCode?: string, city?: string): string {
  const q = fullAddress || [street, postalCode, city].filter(Boolean).join(', ');
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed`;
}

function buildMapsDirections(fullAddress?: string, street?: string, postalCode?: string, city?: string): string {
  const q = fullAddress || [street, postalCode, city].filter(Boolean).join(', ');
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}

interface ContactMapProps {
  lang: Lang;
  contact: { data: ContactInfo | null; loading: boolean; error: Error | null };
}

const ContactMap = ({ lang, contact }: ContactMapProps) => {
  const c = contact.data;
  const showFallback = !contact.loading && (contact.error || !c);
  const embedUrl = c?.mapsEmbedUrl
    || buildMapsEmbedFallback(c?.fullAddress, c?.address.street, c?.address.postalCode, c?.address.city);
  const directionsUrl = c?.googleMapsUrl
    || buildMapsDirections(c?.fullAddress, c?.address.street, c?.address.postalCode, c?.address.city);
  return (
    <section className="relative overflow-hidden bg-edo-warm">
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

      {!showFallback && c && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 bg-white/95 px-3 py-2.5">
          <div className="min-w-0">
            <div className="text-detail font-medium tracking-copy-tight text-foreground">
              {c.address.street}
              {c.entries && c.entries.length > 0 ? ` · ${c.entries.map(e => `${e.label}${e.address ? ' ' + e.address : ''}`).join(' · ')}` : ''}
            </div>
            <div className="font-mono text-label uppercase tracking-caption text-muted-foreground">
              {c.address.postalCode} {c.address.city?.toUpperCase()}
              {c.transport && c.transport.length > 0 ? ` · ${c.transport.map(t => t.label.toUpperCase()).join(' / ')}` : ''}
            </div>
          </div>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 font-mono text-label uppercase tracking-meta text-primary no-underline"
          >
            {contactMsg.directions[lang]}
          </a>
        </div>
      )}
    </section>
  );
};

const TeamPanel = ({ lang, members }: { lang: Lang; members: StrapiTeamMember[] }) => (
  <section className="flex flex-col gap-3.5 bg-foreground p-6 text-white">
    <span className="edo-cell-label text-white/70">{contactMsg.team[lang]}</span>
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
      <span className="text-detail tracking-copy-tight text-white">{member.name[lang]}</span>
      <span className="font-mono text-micro uppercase tracking-ui text-white/55">{member.role[lang]}</span>
    </div>
    {member.email && member.emailHref && (
      <a href={member.emailHref} className="self-center font-mono text-label tracking-caption text-primary no-underline">
        {member.email}
      </a>
    )}
  </div>
);

const ContactPage = () => {
  const { lang, setLang, openMenu, goto } = usePageContext();
  useDocumentMeta('contact', lang);
  const contact = useContact();
  const hours = useStudioHours();
  const teamState = useTeamMembers();
  const team = teamState.data ?? [];
  const subjectsState = useContactSubjects();
  const subjects = subjectsState.data ?? [];
  const businessState = useSiteBusinessInfo();
  const closures = businessState.data?.closures ?? [];
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
      setSendError(err instanceof Error ? err.message : contactMsg.errorSend[lang]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="edo-page-enter grid w-full gap-px overflow-y-auto bg-hairline md:h-full md:grid-cols-plateau md:grid-rows-page md:overflow-hidden">
      {/* Mobile header */}
      <PageHeader
        lang={lang}
        title={common.contactUs[lang]}
        className="col-span-full h-14 md:hidden"
        onMenuClick={openMenu}
        onLogoClick={() => goto('home')}
        onLangToggle={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        actions={[
          { id: 'book', label: common.book[lang], onClick: () => goto('book'), variant: 'primary' },
        ]}
      />

      {/* Desktop col 1 – logo */}
      <div className="hidden md:flex h-full gap-px bg-foreground md:col-start-1 md:row-start-1">
        <button onClick={() => goto('home')} aria-label="E-Do Studio home" className="edo-focus-ring flex h-full min-w-0 flex-1 cursor-pointer items-center justify-center border-0 bg-background p-2 transition-colors hover:bg-muted">
          <Wordmark size={32} />
        </button>
      </div>

      {/* Desktop col 2 – title */}
      <div className="hidden md:flex h-full min-w-0 items-center bg-background px-6 md:col-start-2 md:row-start-1">
        <CellLabel className="shrink-0 text-primary">{common.contactUs[lang]}</CellLabel>
      </div>

      {/* Desktop col 3 – stages */}
      <button onClick={() => goto('plateau-live')} className="edo-focus-ring hidden md:flex h-full cursor-pointer items-center justify-center gap-2 border-0 bg-background px-5 font-mono text-label tracking-ui uppercase text-foreground no-underline transition-colors hover:bg-muted md:col-start-3 md:row-start-1">
        <span className="whitespace-nowrap">{common.stages[lang]}</span>
        <IconArrowRight width={12} height={12} />
      </button>

      {/* Desktop col 4 – book + lang toggle */}
      <div className="hidden md:flex h-full items-center gap-px bg-foreground md:col-start-4 md:row-start-1">
        <button onClick={() => goto('book')} className="edo-focus-ring flex h-full flex-1 cursor-pointer items-center justify-center gap-2 border-0 bg-primary px-5 font-mono text-label tracking-ui uppercase text-white no-underline transition-colors hover:bg-foreground">
          <span className="whitespace-nowrap">{common.book[lang]}</span>
          <IconArrowRight width={12} height={12} />
        </button>
        <button onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} className="edo-focus-ring flex h-full basis-header flex-none cursor-pointer items-center justify-center border-0 bg-background p-0 transition-colors hover:bg-muted">
          <span className="font-mono text-label tracking-meta text-foreground">{common.langToggleLabel[lang]}</span>
        </button>
      </div>
      <ContactRail lang={lang} contact={contact} hours={hours} closures={closures} />
      <ContactFormPanel lang={lang} form={form} sent={sent} sending={sending} sendError={sendError} setForm={setForm} setSent={setSent} submit={submit} goto={goto} subjects={subjects} />
      <ContactRightColumn lang={lang} contact={contact} team={team} />
    </div>
  );
};

export { ContactPage };
