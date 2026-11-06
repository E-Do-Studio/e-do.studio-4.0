import { useId } from 'react';
import { useT } from '../i18n/use-t';
import { bcp47 } from '../lib/format';
import { usePageContext } from '../lib/page-context';
import { monoLabelVariants } from '../ui/mono-label';
import { CUT_RANGE } from './cut-range';

interface CutControlProps {
  value: number;
  onChange: (height: number) => void;
}

/**
 * La coupe horizontale de la maquette : tout ce qui dépasse cette hauteur est
 * arasé, pour voir l'intérieur des cabines et des machines par-dessus.
 *
 * Un `<input type="range">` natif : le site n'a pas de curseur dans `ui/`, et
 * c'est le seul endroit qui en demande un. Sa hauteur suit le palier `compact`
 * du rail qu'il termine.
 */
export const CutControl = ({ value, onChange }: CutControlProps) => {
  const t = useT();
  const { lang } = usePageContext();
  const id = useId();
  const meters = new Intl.NumberFormat(bcp47(lang), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (
    <div className="flex min-h-rail-default flex-none flex-col justify-center gap-2 border-b border-b-border px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={monoLabelVariants({ tone: 'muted' })}>
          {t('studioTour.cut')}
        </label>
        <output htmlFor={id} className="font-mono text-xs tabular-nums">
          {meters.format(value)} m
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={CUT_RANGE.min}
        max={CUT_RANGE.max}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer accent-primary"
      />
    </div>
  );
};
