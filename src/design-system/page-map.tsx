import { cva, type VariantProps } from 'class-variance-authority';

// La miniature d'une coquille de page. Elle ne redessine pas la grille : elle
// la RÉTRÉCIT. Le conteneur intérieur mesure 1440×900 — la taille de référence
// où toutes les mesures de ce dépôt ont été prises — porte les gabarits tels
// qu'ils sont écrits dans la page, et un `scale` le ramène à la vignette.
//
// C'est la seule forme qui ne peut pas mentir. Un schéma dessiné à la main
// serait une copie de plus : il divergerait le jour où le gabarit change, et
// personne ne le verrait puisqu'il n'est vérifié par rien. Ici, `1.58fr` produit
// une bande 1,58 fois plus haute qu'une bande de `1fr`, parce que c'est le
// moteur de grille qui la calcule.
//
// `var(--spacing-logo)` et `var(--spacing-header)` sont lus tels quels : la
// première colonne d'une vignette fait donc bien 240px de large sur 1440, soit
// la même fraction qu'à l'écran.

const REF_W = 1440;
const REF_H = 900;
const SCALE = 0.2;

const regionVariants = cva(
  // `break-words` : la colonne du rail fait 240px de la vignette, où « coordonnées »
  // ne tient pas d'une seule ligne. Un mot replié se lit ; un mot coupé ment.
  'flex items-center justify-center overflow-hidden px-2 text-center leading-tight break-words',
  {
    variants: {
      // Cinq rôles, pas cinq couleurs choisies : ce sont les cinq natures de
      // cellule qui reviennent d'une page à l'autre. C'est ce que la vignette
      // sert à faire voir — que la même nature occupe la même place.
      tone: {
        band: 'bg-neutral-800 text-neutral-100',
        rail: 'bg-neutral-500 text-neutral-50',
        panel: 'bg-neutral-100 text-neutral-600',
        aside: 'bg-neutral-300 text-neutral-700',
        cta: 'bg-primary text-primary-foreground',
      },
    },
    defaultVariants: { tone: 'panel' },
  },
);

interface Region extends VariantProps<typeof regionVariants> {
  label: string;
  /** `row-start / col-start / row-end / col-end`, tel qu'écrit dans la page. */
  area: string;
  /**
   * Seulement pour une piste en `auto`, dont la largeur vient de la cellule
   * elle-même — la mosaïque de post-production la déduit de la hauteur d'écran.
   * Sans elle, la piste sortirait à zéro dans la vignette comme à l'écran.
   */
  width?: string;
}

interface PageMapProps {
  title: string;
  cols?: string;
  rows: string;
  regions: Region[];
  /** Ce que la page écrit vraiment, sous la vignette. */
  note?: string;
}

export const PageMap = ({ title, cols, rows, regions, note }: PageMapProps) => (
  <figure className="m-0 flex min-w-0 flex-col gap-2">
    <div
      className="overflow-hidden border border-neutral-300"
      style={{ width: REF_W * SCALE, height: REF_H * SCALE }}
    >
      <div
        className="grid gap-px bg-neutral-400"
        style={{
          width: REF_W,
          height: REF_H,
          transform: `scale(${SCALE})`,
          transformOrigin: 'top left',
          gridTemplateColumns: cols,
          gridTemplateRows: rows,
          // 40px rendus à 0,2 font 8px : la vignette reste lisible sans que le
          // texte force la largeur d'une piste.
          fontSize: 40,
        }}
      >
        {regions.map((r) => (
          <div
            key={r.area + r.label}
            className={regionVariants({ tone: r.tone })}
            style={{ gridArea: r.area, width: r.width }}
          >
            {r.label}
          </div>
        ))}
      </div>
    </div>
    <figcaption className="flex min-w-0 flex-col gap-0.5">
      <span className="font-mono text-[11px] uppercase tracking-widest text-foreground">
        {title}
      </span>
      <code className="break-all font-mono text-[10px] leading-relaxed text-neutral-500">
        {cols ? `cols: ${cols}` : 'cols: — (les deux cellules enjambent tout)'}
        <br />
        {`rows: ${rows}`}
      </code>
      {note && (
        <span className="text-[11px] leading-snug text-neutral-600">
          {note}
        </span>
      )}
    </figcaption>
  </figure>
);
