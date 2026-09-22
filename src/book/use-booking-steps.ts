import { useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '../i18n/use-t';
import { capture } from '../lib/analytics';
import type { Lang } from '../lib/booking-engine';
import type { BookingDraft } from '../lib/use-booking-draft';
import type { BookMode } from './book-routes';
import { pathForStep } from './book-routes';
import { STEP, stepName, stepsFor } from './booking-steps';

interface UseBookingStepsArgs {
  draft: BookingDraft | null;
  forcedStep?: number;
  forceManual?: boolean;
  lang: Lang;
  configApplied: boolean;
}

/**
 * L'étape courante et sa mise en correspondance avec l'URL.
 *
 * Deux régimes distincts. En mode configurateur, chaque étape est une route
 * TanStack et `forcedStep` fait foi. En mode manuel, une seule URL
 * (/reserver/manuel) porte l'étape dans `?step=N`, pour qu'un rechargement
 * ramène l'utilisateur là où il était.
 */
function useBookingSteps({
  draft,
  forcedStep,
  forceManual,
  lang,
  configApplied,
}: UseBookingStepsArgs) {
  const t = useT();
  const navigate = useNavigate();

  // Non strict : BookPage rend aussi sur les routes du configurateur, qui ne
  // déclarent pas `step`.
  const { step: manualStepQuery = null } = useSearch({ strict: false }) as {
    step?: number;
  };

  const [step, setStep] = useState<number>(() => {
    if (forceManual && manualStepQuery != null) return manualStepQuery;
    if (forcedStep != null) return forcedStep;
    if (draft) return draft.step;
    return STEP.PLATEAU;
  });

  useEffect(() => {
    if (forcedStep == null) return;
    if (step !== forcedStep) setStep(forcedStep);
  }, [forcedStep]);

  // Les deux effets ci-dessous synchronisent l'URL et l'état dans les deux
  // sens ; ils cessent dès que les deux côtés s'accordent (les gardes
  // d'égalité coupent au second passage).
  useEffect(() => {
    if (!forceManual) return;
    if (manualStepQuery != null && manualStepQuery !== step) {
      setStep(manualStepQuery);
    }
  }, [manualStepQuery, forceManual]);
  useEffect(() => {
    if (!forceManual) return;
    if (step !== manualStepQuery) {
      navigate({ to: '.', search: { step }, replace: true });
    }
  }, [step, forceManual]);

  const goToStep = useCallback(
    (n: number, modeOverride?: BookMode) => {
      setStep(n);
      const nextMode: BookMode =
        modeOverride ??
        (forceManual
          ? 'manual'
          : configApplied || n === STEP.CONFIG
            ? 'config'
            : 'manual');
      const target = pathForStep(lang, nextMode, n);
      if (
        typeof window !== 'undefined' &&
        window.location.pathname !== target
      ) {
        navigate({ to: target });
      }
    },
    [lang, configApplied, forceManual, navigate],
  );

  const mode: BookMode =
    configApplied || step === STEP.CONFIG ? 'config' : 'manual';

  // Un événement par étape affichée, et non le pageview : le mode manuel ne
  // change que `?step=N`, et le funnel doit se lire en noms d'étape identiques
  // dans les deux tunnels. La ref coupe les rendus répétés de la même étape.
  const lastViewed = useRef<string | null>(null);
  useEffect(() => {
    const key = `${mode}:${step}`;
    if (lastViewed.current === key) return;
    lastViewed.current = key;
    capture('booking_step_viewed', {
      funnel: mode,
      step: stepName(step),
      step_index: stepsFor(mode, t).findIndex((s) => s.n === step),
    });
  }, [mode, step, t]);

  return { step, setStep, goToStep, mode, steps: stepsFor(mode, t) };
}

export { useBookingSteps };
