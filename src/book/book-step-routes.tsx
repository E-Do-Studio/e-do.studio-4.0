import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { BookPage } from './book-page';
import { usePageContext } from '../lib/page-context';
import { loadDraft } from '../lib/use-booking-draft';
import { configuratorPath } from './book-routes';

function useConfigPrereq(minStep: 2 | 3 | 5 | 6) {
  const { lang } = usePageContext();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const draft = loadDraft();
    if (!draft || !draft.configApplied) {
      navigate({ to: configuratorPath(lang, 0), replace: true });
      return;
    }
    const seen = draft.step || 0;
    if (seen < minStep) {
      const fallback =
        seen === 0 ? 0 : seen === 2 ? 2 : seen === 3 ? 3 : seen === 5 ? 5 : 6;
      navigate({ to: configuratorPath(lang, fallback), replace: true });
      return;
    }
    setReady(true);
  }, [lang, minStep, navigate]);

  return ready;
}

export const ConfigStep0 = () => <BookPage forcedStep={0} />;

export const ConfigStep2 = () => {
  const ready = useConfigPrereq(2);
  if (!ready) return null;
  return <BookPage forcedStep={2} />;
};

export const ConfigStep3 = () => {
  const ready = useConfigPrereq(3);
  if (!ready) return null;
  return <BookPage forcedStep={3} />;
};

export const ConfigStep5 = () => {
  const ready = useConfigPrereq(5);
  if (!ready) return null;
  return <BookPage forcedStep={5} />;
};

export const ConfigStep6 = () => {
  const ready = useConfigPrereq(6);
  if (!ready) return null;
  return <BookPage forcedStep={6} />;
};

export const ManualBook = () => <BookPage forceManual forcedStep={1} />;
