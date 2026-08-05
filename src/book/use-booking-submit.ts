import { useNavigate } from '@tanstack/react-router';
import type { TFunction } from 'i18next';
import type { RefObject } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { clearAvailabilityCache } from '../lib/availability';
import type { BookPlateau, Lang, PriceBreakdown } from '../lib/booking-engine';
import { BOOK_PLATEAUX, buildSessionsData } from '../lib/booking-engine';
import type { ContactFormErrors } from '../lib/booking-schema';
import { validateContact } from '../lib/booking-schema';
import { createBooking } from '../lib/bookings';
import {
  HUBSPOT_BOOKING_FORM_ID,
  submitHubspotForm,
} from '../lib/hubspot-forms';
import { clearDraft } from '../lib/use-booking-draft';
import type { BookMode } from './book-routes';
import { STEP } from './booking-steps';
import type { ConfirmationSessionSlot } from './confirmation-snapshot';
import { confirmationPath } from './book-routes';
import { saveConfirmation } from './confirmation-snapshot';
import { buildBookingHubspotFields } from './hubspot-fields';
import type { BookingState } from './use-booking-state';

type SubmitMode = 'quote' | 'booking' | 'request';

interface UseBookingSubmitArgs {
  state: BookingState;
  plateau: BookPlateau;
  rentalHours: number;
  priceBreakdown: PriceBreakdown;
  goToStep: (n: number, mode?: BookMode) => void;
  formRef: RefObject<HTMLFormElement | null>;
  lang: Lang;
  t: TFunction;
}

function useBookingSubmit({
  state,
  plateau: p,
  rentalHours,
  priceBreakdown,
  goToStep,
  formRef,
  lang,
  t,
}: UseBookingSubmitArgs) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [availRefreshKey, setAvailRefreshKey] = useState(0);
  const [contactErrors, setContactErrors] = useState<ContactFormErrors>({});

  const {
    contact,
    configApplied,
    configGlobal,
    configSessions,
    plateau,
    slotIds,
    slots,
    selected,
    arrivalHour,
  } = state;

  // Une seule validation par changement d'état, partagée par la garde de
  // navigation et par la soumission. `canNext()` est appelé une dizaine de fois
  // par rendu (rail d'étapes, nav mobile, barre d'actions) : sans mémo, chaque
  // appel relançait le schéma Zod. Dépend de `p.isCyclo`/`p.isVisite` et non de
  // `p` — `p` est un objet neuf à chaque rendu quand aucun plateau ne
  // correspond, ce qui annulerait le mémo.
  const contactValidation = useMemo(
    () =>
      validateContact(contact, lang, {
        requireProductFields: !p.isCyclo && !p.isVisite && !configApplied,
      }),
    [p.isCyclo, p.isVisite, configApplied, contact, lang],
  );

  const runContactValidation = useCallback(() => {
    if (!contactValidation.success) {
      setContactErrors(contactValidation.errors);
      return false;
    }
    setContactErrors({});
    return true;
  }, [contactValidation]);

  const handleSubmit = useCallback(
    async (submitMode: SubmitMode) => {
      if (!runContactValidation()) {
        // La soumission part de l'étape date, mais les erreurs de contact (CGV
        // comprise) s'affichent à l'étape contact. On y renvoie, sinon le
        // bouton a l'air de ne rien faire.
        goToStep(STEP.CONTACT);
        return;
      }
      formRef.current?.requestSubmit();
      setSaving(true);
      setSaveError(null);
      try {
        const sessionsData = buildSessionsData({
          slotIds,
          plateau,
          slots,
          configApplied,
          configSessions,
          fallbackQuantity: Number(contact.quantiteArticles) || 0,
          selected,
          arrivalHour: arrivalHour ?? null,
        });
        // En multi-créneaux il n'y a pas de date globale : on retient la
        // première date posée, c'est elle que porte la réservation.
        const firstDate =
          selected ??
          slotIds.map((id) => slots[id]?.date).find(Boolean) ??
          null;

        const result = await createBooking({
          mode: submitMode,
          contact,
          projectType: configGlobal.projectType || null,
          urgency: configGlobal.urgency || null,
          sessions: sessionsData,
          quote: { rows: priceBreakdown.rows, total: priceBreakdown.total },
          preferredDate: firstDate,
          arrivalHour: arrivalHour ?? null,
        });

        // Soumission HubSpot au mieux, depuis le navigateur pour que le cookie
        // `hubspotutk` du visiteur préserve l'Original Source du contact. Jamais
        // attendue : un incident CRM ne doit pas bloquer la confirmation.
        void submitHubspotForm(
          HUBSPOT_BOOKING_FORM_ID,
          buildBookingHubspotFields({
            mode: submitMode,
            reference: result.reference ?? null,
            contact,
            projectType: configGlobal.projectType || null,
            urgency: configGlobal.urgency || null,
            plateau,
            slotIds,
            slots,
            selected: firstDate,
            arrivalHour: arrivalHour ?? null,
            rentalHours,
            total: priceBreakdown.total,
          }),
          { pageName: 'Booking' },
        );

        const sessions: ConfirmationSessionSlot[] = sessionsData.map((s) => {
          const px = BOOK_PLATEAUX.find((x) => x.k === s.plateauKey);
          return {
            plateauKey: s.plateauKey,
            plateauName: {
              fr: px?.fr ?? s.plateauKey,
              en: px?.en ?? s.plateauKey,
            },
            date: s.date,
            arrivalHour: s.arrivalHour,
            hours: s.cycloMode
              ? s.cycloMode === 'halfH'
                ? 5
                : 10
              : s.hours || 1,
          };
        });
        saveConfirmation({
          mode: submitMode,
          savedRef: result.reference ?? null,
          plateauKey: p.k || null,
          plateauName: { fr: p.fr, en: p.en },
          selected: firstDate,
          arrivalHour: arrivalHour ?? null,
          rentalHours,
          slotIds,
          slots: slots as Record<string, unknown>,
          sessions,
          contact: contact as unknown as Record<string, unknown>,
          total: priceBreakdown.total,
          rows: priceBreakdown.rows as unknown[],
          isCyclo: !!p.isCyclo,
        });
        clearDraft();
        navigate({ to: confirmationPath(lang) });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        // Créneau pris entre-temps : le cache d'availability ment, on le vide
        // et on force un rechargement du calendrier.
        if (msg.includes('réservé') || msg.includes('already booked')) {
          clearAvailabilityCache();
          setAvailRefreshKey((k) => k + 1);
        }
        setSaveError(msg || t('booking.saveError'));
      } finally {
        setSaving(false);
      }
    },
    [
      runContactValidation,
      configApplied,
      configSessions,
      contact,
      configGlobal,
      priceBreakdown,
      selected,
      slotIds,
      slots,
      arrivalHour,
      lang,
      p,
      plateau,
      rentalHours,
      navigate,
      goToStep,
      formRef,
      t,
    ],
  );

  return {
    saving,
    saveError,
    setSaveError,
    availRefreshKey,
    contactErrors,
    contactValid: contactValidation.success,
    runContactValidation,
    handleSubmit,
  };
}

export { useBookingSubmit };
export type { SubmitMode };
