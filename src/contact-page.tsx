import { useState } from 'react';
import type { FormEvent } from 'react';
import { cn } from '@/lib/utils';
import { PageShell } from './ui/page-shell';
import { MAIN_ID } from './ui/skip-link';
import { SocialLinksRow } from './ui/social-links-row';
import { useLoaderData } from '@tanstack/react-router';
import type {
  ContactInfo,
  StudioHours as StudioHoursData,
  TeamMember as StrapiTeamMember,
  ClosurePeriod,
} from './lib/strapi';
import type { Lang, ContactFormData } from './types';
import { usePageContext } from './lib/page-context';
import { submitContactForm } from './lib/contact';
import { useT } from './i18n/use-t';
import { bcp47 } from './lib/format';
import {
  ContactForm,
  ContactSuccess,
  INITIAL_FORM,
  contactErrorMessage,
} from './contact-form';
import { MonoLabel } from './ui/mono-label';
import { KeyValueList, KeyValueRow } from './ui/key-value-row';
import { LabelledCell } from './ui/labelled-cell';
import { CtaCell } from './ui/cta-cell';
import { ContactMap } from './ui/contact-map';
import { FindUsSection } from './ui/find-us-section';
import { HoursSection } from './ui/hours-section';
import { ReachSection } from './ui/reach-section';

interface ContactRailProps {
  lang: Lang;
  contact: ContactInfo | null;
  hours: StudioHoursData | null;
}

/**
 * L'URL d'itinéraire du pavé de bas de colonne.
 *
 * `googleMapsUrl` est renseigné côté CMS mais n'avait **aucun consommateur dans
 * toute l'application** — d'où le repli construit sur l'adresse : sans lui, le
 * pavé disparaîtrait en silence dès que le champ n'est pas rempli, ce qui est
 * précisément le genre d'absence qu'on ne remarque jamais.
 */
function mapsLink(contact: ContactInfo | null): string | null {
  if (!contact) return null;
  if (contact.googleMapsUrl) return contact.googleMapsUrl;
  const query =
    contact.fullAddress ||
    [contact.address.street, contact.address.zip].filter(Boolean).join(' ');
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
}

// Une colonne flex, et non une grille : la grille figeait des hauteurs
// (`96px_repeat(5,64px)`) devinées sur le contenu d'un jour, avec cinq
// `app:row-[…]` posés à la main. Elle n'alignait rien sur les colonnes voisines —
// le panneau de formulaire a sa propre grille — et elle coûtait deux défauts :
// HORAIRES demandait 136px pour une piste de 64 et débordait sur la couture, et
// TÉLÉPHONE, seule sur la piste `1fr`, absorbait toute la hauteur restante de la
// colonne. Son filet de fermeture tombait 376px sous son numéro.
//
// La hauteur restante appartient à une CALE, jamais à l'intérieur d'une cellule.
// C'est la règle déjà écrite pour les grilles média — le reste devient une bande
// de fond de page à côté de la grille, pas des bandes dans les tuiles — appliquée
// ici à la verticale. Le filet de chaque cellule retombe où son contenu finit.
//
// La cale ne vaut qu'au-dessus du palier : sous lui, l'`<aside>` n'a pas de
// hauteur définie et un `flex-1` n'y a rien à distribuer. Le modificateur était
// exactement à l'envers — `flex-1 app:hidden`, donc inerte des deux côtés.
const ContactRail = ({
  lang,
  contact,
  hours,
  closures,
}: ContactRailProps & { closures: ClosurePeriod[] }) => {
  const t = useT();
  const mapsUrl = mapsLink(contact);
  return (
    <aside className="flex flex-col gap-px overflow-y-auto bg-border app:col-start-1 app:row-start-2">
      <FindUsSection lang={lang} contact={contact} />
      <HoursSection lang={lang} hours={hours} />
      <ClosuresSection lang={lang} closures={closures} />
      <ReachSection contact={contact} />
      <div className="hidden flex-1 bg-background app:block" />
      {/* La colonne se ferme sur une action, pas sur du vide — comme la colonne
          du milieu de la post-prod et comme celle du formulaire. `tone="surface"`
          et non le défaut orange : le formulaire est l'action primaire de la page
          et garde le seul aplat, celle-ci est une sortie discrète. */}
      {mapsUrl && (
        <CtaCell
          tone="surface"
          title={t('contact.directions')}
          href={mapsUrl}
        />
      )}
      {/* `auto-rows` pilote la grille INTERNE de la bande, pas celle du rail : ses
          deux rangées de sigles valent la bande sociale du reste du site. Plus de
          `border-t` en revanche — la gouttière du rail la dessine maintenant à
          toutes les tailles, et deux mécanismes pour une couture en font deux. */}
      <SocialLinksRow
        layout="row"
        className="app:auto-rows-[var(--spacing-band)]"
      />
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
  return d.toLocaleDateString(bcp47(lang), {
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
  const t = useT();
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = closures
    .filter((c) => c.endsAt >= today)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  if (upcoming.length === 0) return null;
  return (
    <section className={cn('bg-background py-6', className)}>
      <LabelledCell pad="section" label={t('contact.closures')}>
        <div className="flex flex-col gap-3 text-xs">
          {upcoming.map((c) => (
            <div
              key={`${c.startsAt}-${c.endsAt}`}
              className="flex flex-col gap-0.5"
            >
              {/* La plage passe à la ligne dans un rail de 240px : à
                  `leading-none` les deux lignes se toucheraient. */}
              <MonoLabel lines="multi">
                {c.startsAt === c.endsAt
                  ? formatClosureDate(c.startsAt, lang)
                  : `${formatClosureDate(c.startsAt, lang)} → ${formatClosureDate(c.endsAt, lang)}`}
              </MonoLabel>
              {c.label && (
                <span className="text-muted-foreground">
                  {c.label[lang] || c.label.fr}
                </span>
              )}
              {/* Plus d'`opacity-50` : il s'appliquait par-dessus
                  `text-muted-foreground` et faisait tomber le contraste sous
                  3:1. Une note qu'on ne peut pas lire ne hiérarchise rien. */}
              {c.note && (
                <span className="text-muted-foreground">
                  {c.note[lang] || c.note.fr}
                </span>
              )}
            </div>
          ))}
        </div>
      </LabelledCell>
    </section>
  );
};

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
}: ContactFormPanelProps) => {
  const t = useT();
  return (
    <main
      id={MAIN_ID}
      className="overflow-hidden bg-background app:col-start-2 app:col-span-2 app:row-start-2"
    >
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
          onNewMessage={() => {
            setSent(false);
            setForm(INITIAL_FORM);
          }}
          onContinue={() => goto('gallery')}
          continueLabel={`${t('contact.seeGallery')} →`}
        />
      )}
    </main>
  );
};

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
  <aside className="grid grid-rows-2 overflow-hidden app:col-start-4 app:row-start-2 min-h-72 app:min-h-0">
    <ContactMap contact={contact} className="border-b border-border" />
    <TeamPanel lang={lang} members={team} />
  </aside>
);

const TeamPanel = ({
  lang,
  members,
}: {
  lang: Lang;
  members: StrapiTeamMember[];
}) => {
  const t = useT();
  return (
    <section className="dark bg-background py-6 text-foreground">
      <KeyValueList pad="section" heading={t('contact.team')}>
        {members.map((member) => (
          <TeamMemberRow key={member.id} member={member} lang={lang} />
        ))}
      </KeyValueList>
    </section>
  );
};

interface TeamMemberRowProps {
  member: StrapiTeamMember;
  lang: Lang;
}

// Le libellé est COMPOSITE — nom en sans, rôle en mono en dessous — donc un
// nœud et non une chaîne : l'enfermer dans le `MonoLabel` du composant mettrait
// le nom de la personne en capitales.
const TeamMemberRow = ({ member, lang }: TeamMemberRowProps) => (
  <KeyValueRow
    label={
      <span className="flex flex-col gap-0.5">
        <span className="text-sm tracking-tight text-foreground">
          {member.name[lang]}
        </span>
        <MonoLabel tone="muted">{member.role[lang]}</MonoLabel>
      </span>
    }
    value={
      member.email && member.emailHref ? (
        <a
          href={member.emailHref}
          className="font-mono text-xs tracking-widest text-primary no-underline"
        >
          {member.email}
        </a>
      ) : null
    }
  />
);

const ContactPage = () => {
  const t = useT();
  const { lang, goto, siteData } = usePageContext();
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
      setSendError(contactErrorMessage(err, lang));
    } finally {
      setSending(false);
    }
  };

  return (
    <PageShell
      footer={false}
      className="app:grid-cols-[var(--spacing-logo)_repeat(3,minmax(0,1fr))] app:grid-rows-[var(--spacing-header)_minmax(0,1fr)]"
    >
      {/* Après la bande et non avant : la page n'a pas de titre visible — sa
          première cellule EST le titre —, mais l'ordre annoncé reste celui des
          huit autres pages, bannière puis titre puis contenu. */}
      <h1 className="sr-only">{t('common.contactUs')} — E-Do Studio Paris</h1>
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
    </PageShell>
  );
};

export { ContactPage, ContactRail, ContactRightColumn };
