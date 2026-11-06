import { useT } from '../i18n/use-t';
import { usePageContext } from '../lib/page-context';
import { KeyValueRow } from '../ui/key-value-row';
import { formatDim } from './format-dim';
import type { ZoneDim } from './zones';

/** Une cote relevée sur le scan, « environ » quand elle l'est à vue d'œil. */
export const DimRow = ({ dim }: { dim: ZoneDim }) => {
  const t = useT();
  const { lang } = usePageContext();
  const value = formatDim(dim, lang);
  return (
    <KeyValueRow
      density="tight"
      numeric
      label={t(`studioTour.dims.${dim.key}`)}
      value={dim.approx ? t('studioTour.approx', { value }) : value}
    />
  );
};
