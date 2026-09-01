import type { DateSelection, SlotState } from '../lib/booking-engine';
import { BOOK_PLATEAUX } from '../lib/booking-engine';
import type { ContactState } from './booking-types';

const formatBookingDate = (d?: DateSelection | null): string =>
  d
    ? `${d.y}-${String(d.m + 1).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
    : '';

/** Les plateaux distincts occupés, dans l'ordre des créneaux. */
const plateauKeysOf = (
  slotIds: string[],
  slots: Record<string, SlotState>,
): string[] =>
  Array.from(new Set(slotIds.map((id) => slots[id]?.plateauKey || id)));

/**
 * Total d'heures facturées, tous créneaux confondus. Le cyclorama se compte en
 * blocs (5 h ou 10 h) et la visite vaut 1 h, quelles que soient les heures
 * stockées sur le créneau.
 */
const sumSlotHours = (
  slotIds: string[],
  slots: Record<string, SlotState>,
): number =>
  slotIds.reduce((sum, id) => {
    const st = slots[id] || {};
    const px = BOOK_PLATEAUX.find((x) => x.k === (st.plateauKey || id));
    const hours = px?.isCyclo
      ? st.cycloMode === 'halfH'
        ? 5
        : 10
      : px?.isVisite
        ? 1
        : st.hours || 0;
    return sum + hours;
  }, 0);

const datesBySlot = (
  slotIds: string[],
  slots: Record<string, SlotState>,
): Record<string, string> => {
  const dates: Record<string, string> = {};
  for (const id of slotIds) {
    const d = formatBookingDate(slots[id]?.date);
    if (d) dates[id] = d;
  }
  return dates;
};

interface BookingFieldsArgs {
  contact: ContactState;
  projectType: string | null;
  urgency: string | null;
  plateau: string | null;
  slotIds: string[];
  slots: Record<string, SlotState>;
  selected: DateSelection | null;
  arrivalHour: number | null;
  rentalHours: number;
  total: number;
}

const bookingContext = (
  {
    plateau,
    slotIds,
    slots,
    selected,
    arrivalHour,
    rentalHours,
    total,
    projectType,
    urgency,
  }: BookingFieldsArgs,
  listSeparator: string,
): Record<string, string> => {
  const slotsHoursTotal = sumSlotHours(slotIds, slots);
  return {
    project_type: projectType || '',
    urgency: urgency || '',
    plateau: plateau || '',
    plateaus: plateauKeysOf(slotIds, slots).join(listSeparator),
    preferred_date: formatBookingDate(selected),
    per_plateau_dates: JSON.stringify(datesBySlot(slotIds, slots)),
    arrival_hour: arrivalHour != null ? String(arrivalHour) : '',
    rental_hours: String(
      slotsHoursTotal > 0 ? slotsHoursTotal : (rentalHours ?? ''),
    ),
    total_ht: String(total ?? 0),
  };
};

const contactFields = (c: ContactState): Record<string, string> => ({
  firstname: c.prenom || '',
  lastname: c.nom || '',
  email: c.email || '',
  phone: c.tel || '',
  company: c.societe || '',
  brand: c.marque || '',
  siren: c.siren || '',
  address: c.adresseFacturation || '',
  message: c.autresInfos || '',
  other_item_type: c.autreType || '',
  quantity_items: c.quantiteArticles || '',
  views_per_item: c.vuesParArticle || '',
  cgv_accepted: c.cgvAccepted ? 'true' : 'false',
});

/**
 * Charge utile de l'API HubSpot Forms, envoyée depuis le navigateur à la
 * soumission pour que le cookie `hubspotutk` du visiteur préserve l'Original
 * Source du contact (cf. src/lib/hubspot-forms.ts).
 *
 * Les noms de champs doivent correspondre aux propriétés internes du formulaire
 * HubSpot : ne pas les renommer sans changer le formulaire en face.
 */
const buildBookingHubspotFields = (
  args: BookingFieldsArgs & {
    mode: 'quote' | 'booking' | 'request';
    reference: string | null;
  },
): Record<string, string> => ({
  ...contactFields(args.contact),
  item_types: (args.contact.typesArticles || []).join(', '),
  booking_mode: args.mode || '',
  booking_reference: args.reference || '',
  ...bookingContext(args, ', '),
});

/**
 * Jeu de champs cachés que Collected Forms ramasse au fil de la saisie.
 *
 * ⚠️ Il diffère volontairement du précédent et les deux ne peuvent pas être
 * fusionnés : `mode` porte ici le mode de la page (`config` / `manual`) et non
 * le mode de soumission, il n'y a pas de référence de réservation — elle
 * n'existe pas encore — et les listes sont jointes sans espace. Toute
 * unification changerait ce qui remonte dans le CRM.
 *
 * `omitContact` vide le bloc coordonnées pendant que l'utilisateur est sur
 * l'étape contact, pour que Collected Forms ne capture pas un formulaire à
 * moitié saisi.
 */
const buildCollectedFormFields = (
  args: BookingFieldsArgs & { mode: string; omitContact: boolean },
): Record<string, string> => ({
  mode: args.mode,
  item_types: (args.contact.typesArticles || []).join(','),
  ...bookingContext(args, ','),
  ...(args.omitContact ? {} : contactFields(args.contact)),
});

export {
  buildBookingHubspotFields,
  buildCollectedFormFields,
  datesBySlot,
  formatBookingDate,
  plateauKeysOf,
  sumSlotHours,
};
export type { BookingFieldsArgs };
