import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { MonoLabel } from './mono-label';
import { Price } from './price';

// Le récapitulatif de devis : des lignes, un total, une mention de TVA. Trois
// versions existaient — le panneau latéral du tunnel, la page de confirmation
// et la carte du chatbot — avec trois typographies de total et deux
// interlettrages pour le même chiffre.
//
// La page de confirmation portait en plus le seul `border-t-2` du site : un
// filet deux fois plus épais que tous les autres, pour séparer un total de ses
// lignes. Le poids se dit par la taille du chiffre, pas par l'épaisseur du
// trait — c'est la règle du reste du système.

const quoteTableVariants = cva('flex flex-col', {
  variants: {
    variant: {
      /** Colonne étroite du tunnel. */
      panel: 'gap-1.5',
      /** Pleine largeur, page de confirmation : le retrait est DANS les
          lignes, pour que les filets aillent d'un bord à l'autre.
          `min-w-0` : sans lui le paragraphe juridique (min-content = la
          ligne entière) élargit la cellule au-delà du viewport. */
      page: 'min-w-0',
      /** Carte compacte dans une bulle de conversation. */
      chat: 'gap-1',
    },
  },
  defaultVariants: { variant: 'panel' },
});

export interface QuoteBreakdownLine {
  /** Le calcul, à gauche : « Face avant — 12 × 7,90 € ». */
  text: string;
  /** Son sous-total, aligné à droite. Absent, la ligne occupe la largeur. */
  value?: string;
}

export interface QuoteRow {
  label: string;
  /** Montant déjà formaté. */
  value: string;
  /**
   * Détail du calcul, sous la ligne.
   *
   * Une LISTE de couples et non une chaîne : le panneau du tunnel ventile un
   * poste en plusieurs vues, chacune avec son propre sous-total aligné à
   * droite. La première version de ce composant demandait un `string`, ce
   * qu'aucun de ses trois sites ne pouvait fournir — c'est pour ça qu'il
   * n'était branché nulle part.
   */
  breakdown?: QuoteBreakdownLine[];
}

interface QuoteTableProps extends VariantProps<typeof quoteTableVariants> {
  rows: QuoteRow[];
  totalLabel: string;
  /** Montant déjà formaté. */
  total: string;
  /**
   * Mention sous le total : « TVA non applicable », « HT ».
   *
   * Une chaîne prend la typographie mono en capitales du système. Un nœud est
   * rendu tel quel, parce que le panneau du tunnel en porte DEUX — la ligne de
   * TVA et une note d'estimation conditionnelle — et qu'une phrase entière en
   * capitales ne se lit pas.
   */
  disclaimer?: ReactNode;
  /**
   * Annonce le total aux lecteurs d'écran quand il change.
   *
   * Réservé au devis VIVANT du tunnel : le montant se recalcule à chaque choix
   * sans qu'un mot le dise, et c'est l'information que l'on suit le plus. La
   * région ne couvre que le total, pas les lignes — annoncer tout le détail à
   * chaque clic reviendrait à ne rien annoncer.
   */
  totalLive?: boolean;
  className?: string;
}

export const QuoteTable = ({
  rows,
  totalLabel,
  total,
  disclaimer,
  totalLive,
  variant,
  className,
}: QuoteTableProps) => (
  <div className={cn(quoteTableVariants({ variant }), className)}>
    <dl className="m-0 flex flex-col">
      {rows.map((row, i) => (
        <div
          key={row.label}
          className={cn(
            'flex min-w-0 flex-col gap-0.5',
            // `page` sépare ses postes d'un filet, pas la dernière ligne : le
            // total en pose déjà un juste en dessous, et deux traits collés
            // font un trait épais.
            variant === 'page'
              ? cn(
                  'px-5 py-1.5 md:px-12',
                  i < rows.length - 1 && 'border-b border-border',
                )
              : 'pb-1.5',
          )}
        >
          <div className="flex w-full min-w-0 max-w-full flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <dt className="min-w-0 text-xs tracking-tight text-muted-foreground">
              {row.label}
            </dt>
            <dd className="m-0 max-w-full text-xs tabular-nums">{row.value}</dd>
          </div>
          {row.breakdown?.map((line) => (
            <MonoLabel
              key={line.text}
              tone="muted"
              lines="multi"
              className="flex items-baseline justify-between gap-2"
            >
              <span className="min-w-0">{line.text}</span>
              {line.value && (
                <span className="shrink-0 tabular-nums">{line.value}</span>
              )}
            </MonoLabel>
          ))}
        </div>
      ))}
    </dl>

    <div
      role={totalLive ? 'status' : undefined}
      aria-live={totalLive ? 'polite' : undefined}
      className={cn(
        'flex w-full min-w-0 max-w-full flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-border',
        variant === 'page' ? 'px-5 py-3 md:px-12' : 'mt-2 pt-2.5',
      )}
    >
      <MonoLabel tone="muted">{totalLabel}</MonoLabel>
      <Price
        value={total}
        size={variant === 'chat' ? 'md' : 'xl'}
        className="max-w-full"
      />
    </div>

    {disclaimer &&
      (typeof disclaimer === 'string' ? (
        <MonoLabel
          tone="muted"
          lines="multi"
          className={cn(
            variant === 'page' ? 'px-5 pb-5 pt-2 md:px-12' : 'mt-1.5',
          )}
        >
          {disclaimer}
        </MonoLabel>
      ) : (
        <div
          className={cn(
            'flex min-w-0 flex-col gap-1.5',
            variant === 'page' ? 'px-5 pb-5 pt-2 md:px-12' : 'mt-1.5',
          )}
        >
          {disclaimer}
        </div>
      ))}
  </div>
);
