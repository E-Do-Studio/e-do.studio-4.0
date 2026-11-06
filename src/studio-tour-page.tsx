import { useState } from 'react';
import { useLoaderData, useNavigate, useSearch } from '@tanstack/react-router';
import { useT } from './i18n/use-t';
import type { PlateauSpec } from './lib/strapi';
import { MonoLabel } from './ui/mono-label';
import { PageShell } from './ui/page-shell';
import { SegmentGroup, SegmentItem } from './ui/segment-group';
import { SelectionDrawer } from './ui/selection-drawer';
import { MAIN_ID } from './ui/skip-link';
import { CUT_RANGE } from './visite-3d/cut-range';
import type { MeasureStep, StudioView } from './visite-3d/studio-scene';
import { StudioViewer } from './visite-3d/studio-viewer';
import { TourRail } from './visite-3d/tour-rail';
import { ZoneSheet } from './visite-3d/zone-sheet';
import { parseZone, ZONES, type ZoneId } from './visite-3d/zones';

/**
 * La visite 3D du studio : la maquette au centre, le rail des zones et des
 * outils à gauche, la fiche de la zone choisie à droite. La même grille que la
 * galerie — une liste qui pilote un panneau.
 *
 * La zone vit dans l'URL (`?zone=live`) : un lien peut ouvrir la visite sur un
 * plateau, et le retour arrière ramène à la zone précédente. Le reste — vue,
 * coupe, mesures — est l'état d'une session de manipulation, pas une adresse.
 */
const StudioTourPage = () => {
  const t = useT();
  // Servie par deux routes (/visite-3d en FR, /3d-tour en EN), d'où l'accès non
  // strict, comme la galerie.
  const search = useSearch({ strict: false }) as { zone?: string };
  const { plateaux } = useLoaderData({ strict: false }) as {
    plateaux: Record<string, PlateauSpec> | null;
  };
  const navigate = useNavigate();
  const zone = parseZone(search.zone);
  // Choisir la zone déjà active la désélectionne : la fiche revient au studio
  // entier.
  const setZone = (id: ZoneId | null) =>
    navigate({
      to: '.',
      search: (prev: { zone?: string }) => {
        const { zone: current, ...rest } = prev;
        return id && id !== current ? { ...rest, zone: id } : rest;
      },
      replace: true,
    });

  const [view, setView] = useState<StudioView>('3d');
  const [freeStage, setFreeStage] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [measureStep, setMeasureStep] = useState<MeasureStep>('off');
  const [clearToken, setClearToken] = useState(0);
  const [cut, setCut] = useState<number>(CUT_RANGE.initial);

  const hint =
    measureStep === 'first'
      ? t('studioTour.hintFirst')
      : measureStep === 'second'
        ? t('studioTour.hintSecond')
        : t('studioTour.hintIdle');

  return (
    <PageShell className="app:grid-rows-[var(--spacing-header)_minmax(0,1fr)]">
      <main id={MAIN_ID} className="contents">
        {/* `sr-only` : la cellule de la bande nomme déjà la page, et la
            maquette en est le titre — voir `section-intro.tsx`. */}
        <h1 className="sr-only">{t('studioTour.h1')}</h1>

        <div className="grid grid-cols-1 gap-px bg-border app:col-span-full app:row-start-2 app:min-h-0 app:overflow-hidden app:grid-cols-[var(--spacing-logo)_repeat(3,minmax(0,1fr))]">
          <SelectionDrawer
            title={t('studioTour.zonesTitle')}
            items={ZONES.map((z) => ({
              key: z.id,
              label: t(`studioTour.zones.${z.id}.name`),
            }))}
            activeKey={zone ?? ''}
            onSelect={(key) => setZone(parseZone(key))}
            numbered={false}
            closeLabel={t('common.close')}
          />

          <div className="hidden bg-background app:block app:min-h-0 app:overflow-x-hidden app:overflow-y-auto">
            <TourRail
              zone={zone}
              onZone={setZone}
              view={view}
              onView={setView}
              freeStage={freeStage}
              onFreeStage={setFreeStage}
              measuring={measuring}
              onMeasuring={setMeasuring}
              onClearMeasures={() => setClearToken((n) => n + 1)}
              cut={cut}
              onCut={setCut}
            />
          </div>

          {/* Sous le palier, la page défile : la maquette prend une hauteur
              d'écran moins la bande et la barre de zones, pour que la fiche
              commence juste en dessous. */}
          <div className="relative h-[calc(100svh-var(--spacing-header)-4rem)] min-h-96 app:col-span-2 app:h-auto app:min-h-0">
            <StudioViewer
              zone={zone}
              view={view}
              freeStage={freeStage}
              measuring={measuring}
              clearToken={clearToken}
              cut={cut}
              onZoneSelect={setZone}
              onCutChange={setCut}
              onMeasureStep={setMeasureStep}
              className="absolute inset-0"
            />
            {/* En bas : en vue Plan, la cote du mur du haut touche le bord
                supérieur de la maquette. */}
            <MonoLabel
              tone="muted"
              lines="multi"
              className="pointer-events-none absolute bottom-3 left-3 z-[2] hidden max-w-[calc(100%-1.5rem)] bg-background px-3 py-2 app:block"
            >
              {hint}
            </MonoLabel>
            <SegmentGroup
              label={t('studioTour.view')}
              className="absolute bottom-3 left-3 z-[2] border border-border app:hidden"
            >
              <SegmentItem
                selected={view === '3d'}
                onSelect={() => setView('3d')}
              >
                {t('studioTour.view3d')}
              </SegmentItem>
              <SegmentItem
                selected={view === 'plan'}
                onSelect={() => setView('plan')}
              >
                {t('studioTour.viewPlan')}
              </SegmentItem>
              <SegmentItem
                selected={freeStage}
                onSelect={() => setFreeStage(!freeStage)}
              >
                {t('studioTour.freeStage')}
              </SegmentItem>
            </SegmentGroup>
          </div>

          <ZoneSheet
            zone={zone}
            plateaux={plateaux}
            className="app:col-start-4"
          />
        </div>
      </main>
    </PageShell>
  );
};

export { StudioTourPage };
