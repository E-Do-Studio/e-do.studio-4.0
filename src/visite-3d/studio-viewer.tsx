import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n/use-t';
import { captureException } from '../lib/analytics';
import { bcp47 } from '../lib/format';
import { usePageContext } from '../lib/page-context';
import { cn } from '@/lib/utils';
import { MonoLabel } from '../ui/mono-label';
import type { MeasureStep, StudioScene, StudioView } from './studio-scene';
import { ZONES, type ZoneId } from './zones';

interface StudioViewerProps {
  zone: ZoneId | null;
  view: StudioView;
  freeStage: boolean;
  measuring: boolean;
  /** Incrémenté pour effacer les mesures : une commande, pas un état. */
  clearToken: number;
  cut: number;
  onZoneSelect: (id: ZoneId) => void;
  /** La vue Plan relève la coupe au-dessus des machines : la page la reprend. */
  onCutChange: (height: number) => void;
  onMeasureStep: (step: MeasureStep) => void;
  className?: string;
}

/**
 * La maquette 3D du studio, montée dans la boîte que la page lui donne.
 *
 * Un `useEffect` et un import dynamique, et c'est la seule exception du site à
 * la règle « tout passe par les loaders » : il n'y a rien à charger ici côté
 * serveur. WebGL n'existe pas sous Node, et three.js pèse trop pour entrer
 * dans le paquet des autres pages — le serveur rend la boîte et son libellé de
 * chargement, le navigateur y monte la scène.
 */
export const StudioViewer = ({
  zone,
  view,
  freeStage,
  measuring,
  clearToken,
  cut,
  onZoneSelect,
  onCutChange,
  onMeasureStep,
  className,
}: StudioViewerProps) => {
  const t = useT();
  const { lang } = usePageContext();
  const stageRef = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<StudioScene | null>(null);
  const [failed, setFailed] = useState(false);

  // Les rappels changent à chaque rendu de la page ; la scène, elle, n'est
  // montée qu'une fois. Elle lit donc toujours la dernière version par ce
  // relais.
  const handlers = useRef({ onZoneSelect, onMeasureStep });
  handlers.current = { onZoneSelect, onMeasureStep };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let live: StudioScene | null = null;
    let cancelled = false;
    const fail = (error: unknown) => {
      // Visible, journalisée et remontée : une boîte grise sans explication
      // passerait pour une page cassée.
      console.error('[visite-3d]', error);
      captureException(error, { feature: 'studio_tour' });
      if (!cancelled) setFailed(true);
    };
    const meters = new Intl.NumberFormat(bcp47(lang), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const css = getComputedStyle(stage);
    // Les tokens du site sont en oklch, que `THREE.Color` ne lit pas : on fait
    // peindre un pixel par le navigateur et on relit son RGB.
    const probe = document.createElement('canvas').getContext('2d', {
      willReadFrequently: true,
    });
    const rgb = (token: string) => {
      if (!probe) throw new Error('Canvas 2D indisponible');
      probe.fillStyle = css.getPropertyValue(token).trim();
      probe.fillRect(0, 0, 1, 1);
      const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
      return `rgb(${r},${g},${b})`;
    };
    import('./studio-scene')
      .then(({ createStudioScene }) => {
        if (cancelled) return;
        live = createStudioScene({
          stage,
          zones: ZONES.map((z) => ({
            id: z.id,
            pos: z.pos,
            movable: z.movable,
            label: t(`studioTour.zones.${z.id}.name`),
          })),
          modelUrl: '/visite-3d/machines.glb',
          formatMeters: (m) => `${meters.format(m)} m`,
          colors: {
            background: rgb('--muted'),
            ink: rgb('--foreground'),
            accent: rgb('--primary'),
          },
          onZoneSelect: (id) => handlers.current.onZoneSelect(id),
          onMeasureStep: (step) => handlers.current.onMeasureStep(step),
          onError: fail,
        });
        setScene(live);
      })
      .catch(fail);
    return () => {
      cancelled = true;
      live?.dispose();
      setScene(null);
    };
  }, [lang, t]);

  useEffect(() => {
    scene?.setActiveZone(zone);
  }, [scene, zone]);

  // `onCutChange` est un setter d'état : stable, inutile de rejouer la vue.
  // biome-ignore lint/correctness/useExhaustiveDependencies: voir ci-dessus
  useEffect(() => {
    if (!scene) return;
    onCutChange(scene.setView(view));
  }, [scene, view]);

  useEffect(() => {
    scene?.setFreeStage(freeStage);
  }, [scene, freeStage]);

  useEffect(() => {
    scene?.setMeasuring(measuring);
  }, [scene, measuring]);

  useEffect(() => {
    if (clearToken > 0) scene?.clearMeasures();
  }, [scene, clearToken]);

  useEffect(() => {
    scene?.setCut(cut);
  }, [scene, cut]);

  return (
    <div
      ref={stageRef}
      className={cn('relative min-h-0 overflow-hidden bg-muted', className)}
    >
      {!scene && !failed && (
        <MonoLabel
          tone="muted"
          className="absolute inset-0 flex items-center justify-center"
        >
          {t('studioTour.loading')}
        </MonoLabel>
      )}
      {failed && (
        <p
          role="alert"
          className="absolute inset-0 flex items-center justify-center p-pad-cell text-center text-sm text-pretty"
        >
          {t('studioTour.error')}
        </p>
      )}
    </div>
  );
};
