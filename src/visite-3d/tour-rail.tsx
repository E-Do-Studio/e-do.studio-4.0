import { useT } from '../i18n/use-t';
import { Rail, RailCell, RailHeader } from '../ui/rail-cell';
import { CutControl } from './cut-control';
import type { StudioView } from './studio-scene';
import { ZONES, type ZoneId } from './zones';

interface TourRailProps {
  zone: ZoneId;
  onZone: (id: ZoneId) => void;
  view: StudioView;
  onView: (view: StudioView) => void;
  freeStage: boolean;
  onFreeStage: (on: boolean) => void;
  measuring: boolean;
  onMeasuring: (on: boolean) => void;
  onClearMeasures: () => void;
  cut: number;
  onCut: (height: number) => void;
  className?: string;
}

/**
 * La colonne qui commande la maquette : les zones d'abord, puis la vue et les
 * outils. Le même rail que les filtres de la galerie — une liste à gauche, un
 * panneau qu'elle pilote à droite.
 */
export const TourRail = ({
  zone,
  onZone,
  view,
  onView,
  freeStage,
  onFreeStage,
  measuring,
  onMeasuring,
  onClearMeasures,
  cut,
  onCut,
  className,
}: TourRailProps) => {
  const t = useT();
  const cell = (id: ZoneId) => (
    <RailCell
      key={id}
      density="compact"
      label={t(`studioTour.zones.${id}.name`)}
      active={zone === id}
      onSelect={() => onZone(id)}
    />
  );
  return (
    <Rail aria-label={t('studioTour.zonesTitle')} className={className}>
      <RailHeader label={t('common.stages')} />
      {ZONES.filter((z) => z.plateau).map((z) => cell(z.id))}
      <RailHeader label={t('studioTour.spaces')} />
      {ZONES.filter((z) => !z.plateau).map((z) => cell(z.id))}

      <RailHeader label={t('studioTour.view')} />
      <RailCell
        density="compact"
        label={t('studioTour.view3d')}
        active={view === '3d'}
        onSelect={() => onView('3d')}
      />
      <RailCell
        density="compact"
        label={t('studioTour.viewPlan')}
        active={view === 'plan'}
        onSelect={() => onView('plan')}
      />
      <RailCell
        density="compact"
        label={t('studioTour.freeStage')}
        active={freeStage}
        onSelect={() => onFreeStage(!freeStage)}
      />

      <RailHeader label={t('studioTour.tools')} />
      <RailCell
        density="compact"
        label={t('studioTour.measure')}
        active={measuring}
        onSelect={() => onMeasuring(!measuring)}
      />
      {measuring && (
        <RailCell
          density="compact"
          label={t('studioTour.clearMeasures')}
          active={false}
          onSelect={onClearMeasures}
        />
      )}
      <CutControl value={cut} onChange={onCut} />
    </Rail>
  );
};
