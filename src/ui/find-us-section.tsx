import { cn } from '@/lib/utils';
import { useT } from '../i18n/use-t';
import { mapsLink } from '../lib/maps-link';
import type { ContactInfo } from '../lib/strapi';
import type { Lang } from '../types';
import { HeadlineCell } from './headline-cell';
import { LabelledCell } from './labelled-cell';
import { UnavailableNote } from './unavailable-note';

const METRO_COLOR_BY_LINE: Record<string, string> = {
  '13': 'bg-metro-13 text-black',
  '14': 'bg-metro-14 text-white',
};

function parseMetroLabel(label: string): { line: string | null; name: string } {
  const m = label.match(/^M(?:[ée]tro)?\.?\s*(\d+)\s*[—–-]\s*(.+)$/i);
  if (m) return { line: m[1], name: m[2].trim() };
  return { line: null, name: label };
}

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
          // L'adresse ouvre l'itinéraire : c'est la seule chose qu'on fait d'une
          // adresse depuis un téléphone.
          headline={
            <address className="not-italic">
              <a
                href={mapsLink(c) ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline decoration-1 underline-offset-4"
              >
                {c?.address.street}
                <br />
                {c?.address.zip}
              </a>
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
        // Carré, y compris pour un numéro de ligne de métro : la RATP les
        // dessine ronds, ce système ne dessine rien de rond. `--radius` vaut 0
        // et `rounded-full` est le seul rayon qui l'ignore, en posant 9999px en
        // dur — deux disques colorés au milieu d'une page entièrement réglée à
        // l'équerre se lisaient comme un emprunt à une autre charte.
        'inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center text-xs font-bold',
        className,
      )}
    >
      {line}
    </span>
    {label}
  </div>
);

export { FindUsSection };
