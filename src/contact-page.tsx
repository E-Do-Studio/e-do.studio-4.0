import { useState } from 'react';
import type { FormEvent, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Button, CellLabel, IconArrowRight, IconMenu, PageHeader, SocialIcon, Wordmark, cn } from './ui';
import { useDocumentMeta } from './lib/use-document-meta';
import type { Lang, ContactFormData, Bilingual } from './types';
import { usePageContext } from './router';
import { submitContactForm } from './lib/contact';

interface Subject extends Bilingual {
  k: string;
}

interface TeamMember {
  name: string | Bilingual;
  role: Bilingual;
  mail: string | null;
}

interface SocialLinkEntry {
  k: string;
  label: string;
  href: string;
}

const SUBJECTS: Subject[] = [
  {k:'general', fr:'Question générale', en:'General enquiry'},
  {k:'reserver', fr:'Réserver un plateau', en:'Book a stage'},
  {k:'ecom', fr:'Production e-commerce', en:'E-commerce production'},
  {k:'visite', fr:'Visite du studio', en:'Studio visit'},
];

const TEAM: TeamMember[] = [
  {name:'Thomas Guedj', role:{fr:'Direction & administration',en:'Director & administration'}, mail:null},
  {name:'Benoît Cougny', role:{fr:'Planification & production',en:'Planning & production'}, mail:null},
  {name:'Phan Vo', role:{fr:'Image & post-production',en:'Image & post-production'}, mail:null},
  {name:'Théo Daguier', role:{fr:'Support technique',en:'Technical support'}, mail:null},
  {name:{fr:'Service général',en:'General enquiries'}, role:{fr:'Accueil & informations',en:'Reception & information'}, mail:'contact@e-do.studio'},
];

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
}

const ContactRail = ({ lang }: ContactRailProps) => (
  <aside className="flex flex-col overflow-auto bg-white md:col-start-1 md:row-start-2">
    <FindUsSection lang={lang} />
    <HoursSection lang={lang} />
    <PhoneSection lang={lang} />
    <div className="flex-1" />
    <SocialGrid />
  </aside>
);

const FindUsSection = ({ lang }: { lang: Lang }) => (
  <section className="border-b border-border p-6">
    <CellLabel className="mb-5 block">{lang === 'fr' ? 'Nous trouver' : 'Find us'}</CellLabel>
    <div className="text-detail leading-copy font-normal text-muted-foreground">
      <span className="mb-2 block font-mono text-label uppercase tracking-ui">
        Parc d'activités Victor&nbsp;Hugo · {lang === 'fr' ? 'Bât.' : 'Bldg.'} 6.7
      </span>
      69 boulevard Victor Hugo<br />
      93400 <span className="whitespace-nowrap">Saint-Ouen</span>,<br />France
    </div>
    <div className="mt-5 flex flex-col gap-2.5 font-mono text-label leading-relaxed tracking-ui text-muted-foreground">
      <MetroLine line="13" label="Garibaldi" className="bg-metro-13 text-black" />
      <MetroLine line="14" label="Mairie de Saint-Ouen" className="bg-metro-14 text-white" />
    </div>
  </section>
);

interface MetroLineProps {
  line: string;
  label: string;
  className?: string;
}

const MetroLine = ({ line, label, className }: MetroLineProps) => (
  <div className="flex items-center gap-2 whitespace-nowrap">
    <span className={cn('inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-label font-bold tracking-normal', className)}>
      {line}
    </span>
    {label}
  </div>
);

const HoursSection = ({ lang }: { lang: Lang }) => (
  <section className="border-b border-border p-6">
    <CellLabel className="mb-5 block">{lang === 'fr' ? 'Horaires' : 'Hours'}</CellLabel>
    <div className="flex flex-col gap-3 text-caption">
      <HoursRow label={lang === 'fr' ? 'Lun — Ven' : 'Mon — Fri'} value="10:00 — 18:00" />
      <HoursRow label={lang === 'fr' ? 'Sam — Dim' : 'Sat — Sun'} value={lang === 'fr' ? 'Sur demande' : 'On request'} muted />
    </div>
  </section>
);

interface HoursRowProps {
  label: string;
  value: string;
  muted?: boolean;
}

const HoursRow = ({ label, value, muted = false }: HoursRowProps) => (
  <div className="flex flex-col gap-0.5">
    <span className={cn('text-muted-foreground', muted && 'opacity-55')}>{label}</span>
    <span className={cn('font-mono tracking-ui', muted && 'text-muted-foreground')}>{value}</span>
  </div>
);

const PhoneSection = ({ lang }: { lang: Lang }) => (
  <section className="p-6">
    <CellLabel className="mb-5 block">{lang === 'fr' ? 'Téléphone' : 'Phone'}</CellLabel>
    <a href="tel:+33144041149" className="text-caption font-mono tracking-ui text-foreground no-underline">
      +33 1 44 04 11 49
    </a>
  </section>
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
}

const ContactFormPanel = ({ lang, form, sent, sending, sendError, setForm, setSent, submit, goto }: ContactFormPanelProps) => (
  <main className="overflow-hidden bg-white md:col-start-2 md:col-span-2 md:row-start-2">
    {!sent ? (
      <ContactForm lang={lang} form={form} setForm={setForm} submit={submit} sending={sending} sendError={sendError} />
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
}

const ContactForm = ({ lang, form, setForm, submit, sending, sendError }: ContactFormProps) => (
  <form
    onSubmit={submit}
    className="grid grid-cols-2 grid-rows-contact-form gap-px bg-border"
  >
    <div className="col-span-2 flex flex-col justify-center bg-white px-5 py-2.5">
      <span className="edo-cell-label text-primary">{lang === 'fr' ? 'Écrivez-nous' : 'Write to us'}</span>
      <h1 className="m-0 mt-0.5 text-tile-large font-light leading-none tracking-display text-foreground">
        {lang === 'fr' ? 'Un projet, une visite ?' : 'A project, a visit?'}
      </h1>
    </div>

    {SUBJECTS.map((subject, index) => (
      <SubjectButton
        key={subject.k}
        subject={subject}
        index={index}
        lang={lang}
        active={form.sujet === subject.k}
        onClick={() => setForm({...form, sujet: subject.k})}
      />
    ))}

    <ContactInput required value={form.nom} onChange={(value) => setForm({...form, nom: value})} placeholder={lang === 'fr' ? 'Nom*' : 'Name*'} className="col-start-1 row-start-4" />
    <ContactInput required type="tel" value={form.telephone} onChange={(value) => setForm({...form, telephone: value})} placeholder={lang === 'fr' ? 'Téléphone*' : 'Phone*'} className="col-start-2 row-start-4" />
    <ContactInput required type="email" value={form.email} onChange={(value) => setForm({...form, email: value})} placeholder="Email*" className="col-span-2 row-start-5" />
    <ContactInput required value={form.societe} onChange={(value) => setForm({...form, societe: value})} placeholder={lang === 'fr' ? 'Société · Marque*' : 'Company · Brand*'} className="col-span-2 row-start-6" />
    <ContactTextarea required value={form.message} onChange={(value) => setForm({...form, message: value})} placeholder={lang === 'fr' ? 'Votre message*' : 'Your message*'} />

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
        ? (lang === 'fr' ? 'Envoi en cours…' : 'Sending…')
        : <>{lang === 'fr' ? 'Envoyer' : 'Send'} <IconArrowRight width="16" height="16" /></>
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
    <span className="edo-cell-label text-primary">✓ {lang === 'fr' ? 'Message envoyé' : 'Message sent'}</span>
    <h1 className="m-0 max-w-lg text-page-title font-light leading-tight tracking-display text-foreground">
      {lang === 'fr' ? 'Merci — à très vite.' : 'Thanks — talk soon.'}
    </h1>
    <p className="m-0 max-w-md text-detail leading-normal text-muted-foreground">
      {lang === 'fr'
        ? 'Notre équipe vous répond sous 24 h ouvrées. En attendant, vous pouvez parcourir la galerie ou explorer les plateaux.'
        : 'Our team replies within 1 business day. In the meantime, browse the gallery or explore the stages.'}
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
        {lang === 'fr' ? 'Nouveau message' : 'Another message'}
      </Button>
      <Button
        size="lg"
        onClick={() => goto('gallery')}
      >
        {lang === 'fr' ? 'Voir la galerie' : 'See gallery'} →
      </Button>
    </div>
  </div>
);

const ContactRightColumn = ({ lang }: { lang: Lang }) => (
  <aside className="grid grid-rows-2 gap-px overflow-hidden bg-hairline md:col-start-4 md:row-start-2 min-h-72 md:min-h-0">
    <ContactMap lang={lang} />
    <TeamPanel lang={lang} />
  </aside>
);

const MAPS_EMBED_URL = 'https://www.google.com/maps?q=69+Boulevard+Victor+Hugo,+93400+Saint-Ouen,+France&z=15&output=embed';
const MAPS_DIRECTIONS_URL = 'https://www.google.com/maps/dir/?api=1&destination=69+Boulevard+Victor+Hugo,+93400+Saint-Ouen,+France';

const ContactMap = ({ lang }: { lang: Lang }) => (
  <section className="relative overflow-hidden bg-edo-warm">
    <iframe
      src={MAPS_EMBED_URL}
      className="absolute inset-0 h-full w-full border-0"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      title={lang === 'fr' ? 'Carte du studio E-Do' : 'E-Do studio map'}
    />

    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 bg-white/95 px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-detail font-medium tracking-copy-tight text-foreground">69 bd Victor Hugo · Bât. 6.7</div>
        <div className="font-mono text-label uppercase tracking-caption text-muted-foreground">93400 SAINT-OUEN · M°13 GARIBALDI / M°14 MAIRIE ST-OUEN</div>
      </div>
      <a
        href={MAPS_DIRECTIONS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 font-mono text-label uppercase tracking-meta text-primary no-underline"
      >
        {lang === 'fr' ? 'Itinéraire →' : 'Directions →'}
      </a>
    </div>
  </section>
);

const TeamPanel = ({ lang }: { lang: Lang }) => (
  <section className="flex flex-col gap-3.5 bg-foreground p-6 text-white">
    <span className="edo-cell-label text-white/70">{lang === 'fr' ? "L'équipe" : 'The team'}</span>
    <div className="flex flex-col gap-2.5">
      {TEAM.map((member, index) => (
        <TeamMemberRow key={index} member={member} lang={lang} />
      ))}
    </div>
  </section>
);

interface TeamMemberRowProps {
  member: TeamMember;
  lang: Lang;
}

const TeamMemberRow = ({ member, lang }: TeamMemberRowProps) => (
  <div className="grid grid-cols-fluid-auto gap-2 border-b border-white/10 py-2">
    <div className="flex flex-col gap-0.5">
      <span className="text-detail tracking-copy-tight text-white">{typeof member.name === 'string' ? member.name : member.name[lang]}</span>
      <span className="font-mono text-micro uppercase tracking-ui text-white/55">{member.role[lang]}</span>
    </div>
    {member.mail && (
      <a href={`mailto:${member.mail}`} className="self-center font-mono text-label tracking-caption text-primary no-underline">
        {member.mail}
      </a>
    )}
  </div>
);

const ContactPage = () => {
  const { lang, setLang, openMenu, goto } = usePageContext();
  useDocumentMeta('contact', lang);
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
      setSendError(err instanceof Error ? err.message : lang === 'fr' ? 'Erreur lors de l\'envoi' : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="edo-page-enter grid w-full gap-px overflow-y-auto bg-hairline md:h-full md:grid-cols-plateau md:grid-rows-page md:overflow-hidden">
      {/* Mobile header */}
      <PageHeader
        lang={lang}
        title={lang === 'fr' ? 'Nous contacter' : 'Contact us'}
        className="col-span-full h-14 md:hidden"
        onMenuClick={openMenu}
        onLogoClick={() => goto('home')}
        onLangToggle={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        actions={[
          { id: 'book', label: lang === 'fr' ? 'Réserver' : 'Book', onClick: () => goto('book'), variant: 'primary' },
        ]}
      />

      {/* Desktop col 1 – logo */}
      <div className="hidden md:flex h-full gap-px bg-foreground md:col-start-1 md:row-start-1">
        <button onClick={openMenu} aria-label="Open menu" className="edo-focus-ring flex h-full basis-header flex-none cursor-pointer items-center justify-center border-0 bg-background text-foreground transition-colors hover:bg-muted">
          <IconMenu width="18" height="18" />
        </button>
        <button onClick={() => goto('home')} aria-label="E-Do Studio home" className="edo-focus-ring flex h-full min-w-0 flex-1 cursor-pointer items-center justify-center border-0 bg-background p-2 transition-colors hover:bg-muted">
          <Wordmark size={32} />
        </button>
      </div>

      {/* Desktop col 2 – title */}
      <div className="hidden md:flex h-full min-w-0 items-center bg-background px-6 md:col-start-2 md:row-start-1">
        <CellLabel className="shrink-0 text-primary">{lang === 'fr' ? 'Nous contacter' : 'Contact us'}</CellLabel>
      </div>

      {/* Desktop col 3 – stages */}
      <button onClick={() => goto('plateau-live')} className="edo-focus-ring hidden md:flex h-full cursor-pointer items-center justify-center gap-2 border-0 bg-background px-5 font-mono text-label tracking-ui uppercase text-foreground no-underline transition-colors hover:bg-muted md:col-start-3 md:row-start-1">
        <span className="whitespace-nowrap">{lang === 'fr' ? 'Plateaux' : 'Stages'}</span>
        <IconArrowRight width={12} height={12} />
      </button>

      {/* Desktop col 4 – book + lang toggle */}
      <div className="hidden md:flex h-full items-center gap-px bg-foreground md:col-start-4 md:row-start-1">
        <button onClick={() => goto('book')} className="edo-focus-ring flex h-full flex-1 cursor-pointer items-center justify-center gap-2 border-0 bg-primary px-5 font-mono text-label tracking-ui uppercase text-white no-underline transition-colors hover:bg-foreground">
          <span className="whitespace-nowrap">{lang === 'fr' ? 'Réserver' : 'Book'}</span>
          <IconArrowRight width={12} height={12} />
        </button>
        <button onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} className="edo-focus-ring flex h-full basis-header flex-none cursor-pointer items-center justify-center border-0 bg-background p-0 transition-colors hover:bg-muted">
          <span className="font-mono text-label tracking-meta text-foreground">{lang === 'fr' ? 'EN' : 'FR'}</span>
        </button>
      </div>
      <ContactRail lang={lang} />
      <ContactFormPanel lang={lang} form={form} sent={sent} sending={sending} sendError={sendError} setForm={setForm} setSent={setSent} submit={submit} goto={goto} />
      <ContactRightColumn lang={lang} />
    </div>
  );
};

export { ContactPage };
