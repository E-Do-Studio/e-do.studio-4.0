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
import { ContactForm, ContactSuccess, INITIAL_FORM } from './contact-form';
import { MonoLabel } from './ui/mono-label';
import { KeyValueList, KeyValueRow } from './ui/key-value-row';
import { LabelledCell } from './ui/labelled-cell';
import { HeadlineCell } from './ui/headline-cell';
import { CtaCell } from './ui/cta-cell';

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

interface FindUsSectionProps {
  lang: Lang;
  contact: ContactInfo | null;
  className?: string;
}

const FindUsSection = ({ lang, contact, className }: FindUsSectionProps) => {
  const t = useT();
  const c = contact;
  const showFallback = !c;
  // Une entrée par LIGNE, et non un `label + adresse` par entrée joint par
  // « — ». Cette chaîne-là n'était pas une phrase : c'étaient des valeurs qu'une
  // machine avait assemblées faute de savoir comment les disposer, et en
  // capitales letterspacées dans un rail de 240px. Même règle que pour le « · »
  // (voir CLAUDE.md) : chaque valeur reçoit son élément, la mise en page sépare.
  //
  // Complément de voie et pays sont les MÊMES lignes d'une même adresse : la
  // précision qui suit le nom de rue. Ils vivaient dans deux blocs séparés, de
  // part et d'autre du titre, ce qui donnait trois groupes dans une cellule qui
  // n'a qu'une chose à dire.
  const addressDetails = [
    ...(c?.entries && c.entries.length > 0
      ? c.entries.map((e) =>
          [e.label, e.address].filter(Boolean).join(' ').trim(),
        )
      : [c?.address.complement || 'Parc d’activités Victor Hugo, Bât. 6.7']),
    c?.address.country,
  ].filter(Boolean);
  return (
    // Le premier bloc du rail couvre exactement les quatre premières rangées de
    // la colonne du formulaire — bande d'en-tête plus trois rangées de champ,
    // gouttières comprises. C'est ce qui fait tomber sa couture de fermeture à la
    // même hauteur que celle du formulaire, à deux colonnes d'ici : elle en était
    // à SIX pixels, l'écart qui se lit comme une erreur plutôt que comme deux
    // colonnes indépendantes.
    //
    // Le calcul est celui de la grille voisine, écrit avec les mêmes tokens : ni
    // l'une ni l'autre ne porte plus le nombre en clair.
    <section
      className={cn(
        'bg-background py-6',
        'app:min-h-[calc(var(--spacing-col-head)+3*var(--spacing-col-row)+3px)]',
        className,
      )}
    >
      {showFallback ? (
        <LabelledCell pad="section" label={t('contact.findUs')}>
          <UnavailableNote />
        </LabelledCell>
      ) : (
        // L'ADRESSE EST LA RÉPONSE DE LA CELLULE, et le seul libellé est celui
        // que `HeadlineCell` pose déjà.
        //
        // Le complément de voie et le pays étaient en `MonoLabel` : du CONTENU
        // habillé en étiquette. `MonoLabel` nomme des libellés — catégories,
        // intitulés de cellule, en-têtes — et « Parc d'activités Victor Hugo,
        // Bât. 6.7 » n'en est pas un. Trois blocs mono gris se succédaient donc
        // dans une cellule qui n'a qu'une seule chose à dire, et la capitale
        // letterspacée rendait illisible la ligne la plus longue du rail.
        <HeadlineCell
          pad="section"
          label={t('contact.findUs')}
          // `xs` et non `sm` : à 24px l'adresse prend trois lignes de 24 et la
          // cellule dépasse de six pixels le module de la colonne voisine, donc
          // sa couture tombe à côté. À 20px elle rentre, avec six pixels de marge
          // — et les deux « réponses » du rail, l'adresse et le téléphone,
          // partagent alors un seul registre.
          size="xs"
          headline={
            <address className="not-italic">
              {c?.address.street}
              <br />
              {c?.address.zip}
            </address>
          }
          details={addressDetails.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        >
          {/* Transport et parking sont la MÊME question — comment on arrive —
              donc le même bloc. Le nom de station est une valeur, donc en sans
              comme toutes les valeurs du site : en mono grise letterspacée, la
              pastille (la décoration) était l'élément le plus fort de la cellule
              et le nom propre qu'elle désigne le plus faible. */}
          {(c?.transport?.length || c?.parking) && (
            <div className="flex flex-col gap-2 text-sm leading-snug">
              {c?.transport?.map((entry) => {
                const { line, name } = parseMetroLabel(entry.label);
                if (!line)
                  return (
                    <div key={entry.label} className="text-foreground">
                      {entry.label}
                    </div>
                  );
                return (
                  <MetroLine
                    key={entry.label}
                    line={line}
                    label={name}
                    className={
                      METRO_COLOR_BY_LINE[line] ?? 'bg-muted text-foreground'
                    }
                  />
                );
              })}
              {/* `parking` vivait dans le payload du CMS sans un seul
                  consommateur dans l'app. Pour un studio où l'on vient décharger
                  du matériel, c'est l'info pratique qui manquait. */}
              {c?.parking && (
                <p className="m-0 text-muted-foreground">{c.parking[lang]}</p>
              )}
            </div>
          )}
        </HeadlineCell>
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
        'inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-xs font-bold',
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

// Plus de `KeyValueRow` ici : les horaires ne sont pas une paire nom / valeur.
//
// La question qu'on pose à cette cellule est « vous ouvrez quand ? », et la
// réponse est une plage. Les jours la QUALIFIENT, ils ne lui font pas face. En
// tableau, le libellé se collait au bord gauche et la plage au bord droit, avec
// un vide au milieu : dans les 192px utiles du rail, l'œil faisait du ping-pong
// entre deux bords pour rapprocher deux mots qui forment une seule phrase. Et le
// filet entre les rangées découpait en deux enregistrements ce qui est un seul
// fait, l'horaire du studio.
//
// La cellule prend donc la même forme que ses deux voisines : la réponse au
// registre du titre, les nuances en gris dessous.
const HoursSection = ({ lang, hours, className }: HoursSectionProps) => {
  const t = useT();
  const rows = hours?.rows ?? [];
  // La réponse est la première PLAGE. Un statut n'en est pas une : une cellule
  // dont le seul contenu est « sur demande » n'a pas de titre à donner, et ses
  // lignes se lisent alors toutes au même registre.
  const primary = rows.find((row) => row.kind === 'hours');
  const line = (row: (typeof rows)[number]) =>
    [row.label[lang], row.value[lang]].filter(Boolean).join('  ');
  return (
    <section className={cn('bg-background py-6', className)}>
      {rows.length === 0 ? (
        <LabelledCell pad="section" label={t('contact.hours')}>
          <UnavailableNote />
        </LabelledCell>
      ) : primary ? (
        <HeadlineCell
          pad="section"
          label={t('contact.hours')}
          headline={primary.value[lang]}
          details={[primary, ...rows.filter((row) => row !== primary)].map(
            (row) => (
              <span key={row.days.join('-') || row.value.fr} className="block">
                {row === primary ? row.label[lang] : line(row)}
              </span>
            ),
          )}
        />
      ) : (
        <LabelledCell pad="section" label={t('contact.hours')}>
          <div className="text-sm leading-snug text-muted-foreground">
            {rows.map((row) => (
              <span key={row.days.join('-') || row.value.fr} className="block">
                {line(row)}
              </span>
            ))}
          </div>
        </LabelledCell>
      )}
    </section>
  );
};

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

// `lines="multi"` : la phrase passe à la ligne dans un rail de 240px. Et plus
// d'`opacity-50` par-dessus `text-muted-foreground` — la note tombait sous 3:1,
// donc la seule chose que la page avait à dire quand la donnée manque était
// justement la moins lisible.
const UnavailableNote = () => {
  const t = useT();
  return (
    <MonoLabel tone="muted" lines="multi" className="block">
      {t('contact.temporarilyUnavailable')}
    </MonoLabel>
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
  contact: ContactInfo | null;
  className?: string;
}

const ContactMap = ({ contact, className }: ContactMapProps) => {
  const t = useT();
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
    <section
      className={cn(
        'relative overflow-hidden bg-[oklch(0.91_0.03_82)]',
        className,
      )}
    >
      {showFallback ? (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <UnavailableNote />
        </div>
      ) : (
        <iframe
          src={embedUrl}
          className="absolute inset-0 h-full w-full "
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={t('contact.mapTitle')}
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
      setSendError(err instanceof Error ? err.message : t('contact.errorSend'));
    } finally {
      setSending(false);
    }
  };

  return (
    <PageShell className="app:grid-cols-[var(--spacing-logo)_repeat(3,minmax(0,1fr))] app:grid-rows-[var(--spacing-header)_minmax(0,1fr)]">
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
